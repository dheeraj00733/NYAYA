-- ==============================================================================
-- NyayaFlow Database Migration: 001_initial_schema.sql
-- PostgreSQL 16 + pgvector Full Normalized Relational Schema (1NF to 5NF)
-- ==============================================================================

-- Enable UUID extension and Vector extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'lawyer' CHECK (role IN ('lawyer', 'client', 'admin')),
    phone VARCHAR(50),
    bar_council_id VARCHAR(100),
    organization VARCHAR(255),
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. CASES TABLE
CREATE TABLE IF NOT EXISTS cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_number VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'civil', 'criminal', 'corporate', 'constitutional', 
        'family', 'tax', 'ipr', 'labor', 'arbitration', 'other'
    )),
    status VARCHAR(50) NOT NULL DEFAULT 'filed' CHECK (status IN (
        'filed', 'pending', 'hearing', 'decided', 'closed', 'archived'
    )),
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN (
        'low', 'medium', 'high', 'urgent'
    )),
    court_name VARCHAR(255) NOT NULL,
    court_type VARCHAR(100) NOT NULL DEFAULT 'High Court',
    judge_name VARCHAR(255),
    filing_date DATE,
    next_hearing_date DATE,
    closure_date DATE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. CASE_MEMBERS TABLE (M:N Access Control between Users and Cases)
CREATE TABLE IF NOT EXISTS case_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_in_case VARCHAR(50) NOT NULL DEFAULT 'lead_counsel' CHECK (role_in_case IN (
        'lead_counsel', 'co_counsel', 'legal_assistant', 'client_observer'
    )),
    can_edit BOOLEAN NOT NULL DEFAULT TRUE,
    can_upload BOOLEAN NOT NULL DEFAULT TRUE,
    can_chat BOOLEAN NOT NULL DEFAULT TRUE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_case_member UNIQUE (case_id, user_id)
);

-- 4. PARTIES TABLE (Normalized Registry of Legal Entities)
CREATE TABLE IF NOT EXISTS parties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    party_type VARCHAR(50) NOT NULL DEFAULT 'individual' CHECK (party_type IN (
        'individual', 'corporation', 'government_body', 'ngo', 'trust', 'other'
    )),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    address TEXT,
    tax_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. CASE_PARTIES TABLE (M:N Junction associating Parties with Cases and Roles)
CREATE TABLE IF NOT EXISTS case_parties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    party_id UUID NOT NULL REFERENCES parties(id) ON DELETE RESTRICT,
    party_role VARCHAR(50) NOT NULL CHECK (party_role IN (
        'petitioner', 'respondent', 'appellant', 'appellee', 
        'plaintiff', 'defendant', 'intervenor', 'other'
    )),
    advocate_name VARCHAR(255),
    legal_counsel_firm TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_case_party_role UNIQUE (case_id, party_id, party_role)
);

-- 6. LEGAL_DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS legal_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
    document_category VARCHAR(50) NOT NULL DEFAULT 'other' CHECK (document_category IN (
        'petition', 'judgment', 'order', 'evidence', 
        'affidavit', 'contract', 'notice', 'pleading', 'other'
    )),
    total_pages INTEGER DEFAULT 0,
    processing_status VARCHAR(50) NOT NULL DEFAULT 'uploaded' CHECK (processing_status IN (
        'uploaded', 'processing', 'completed', 'failed'
    )),
    ocr_applied BOOLEAN NOT NULL DEFAULT FALSE,
    summary_text TEXT,
    summary_generated_at TIMESTAMPTZ,
    checksum_sha256 VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. DOCUMENT_CHUNKS TABLE (RAG Text Chunks with 384-dimensional Vector Embeddings)
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES legal_documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    page_number INTEGER NOT NULL DEFAULT 1,
    content TEXT NOT NULL,
    token_count INTEGER NOT NULL DEFAULT 0,
    embedding vector(384),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_document_chunk UNIQUE (document_id, chunk_index)
);

-- 8. EXTRACTED_FACTS TABLE (Structured Key Legal Entities and Citations)
CREATE TABLE IF NOT EXISTS extracted_facts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES legal_documents(id) ON DELETE CASCADE,
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    fact_type VARCHAR(50) NOT NULL CHECK (fact_type IN (
        'petitioner', 'respondent', 'advocate', 'court', 
        'case_number', 'filing_date', 'hearing_date', 'legal_section', 
        'event', 'outcome', 'directive', 'other'
    )),
    key_field VARCHAR(100) NOT NULL,
    fact_value TEXT NOT NULL,
    confidence_score FLOAT NOT NULL DEFAULT 1.0 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
    source_page INTEGER DEFAULT 1,
    excerpt TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. CHATS TABLE (Conversation Threads)
CREATE TABLE IF NOT EXISTS chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    document_id UUID REFERENCES legal_documents(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL DEFAULT 'Legal Query Session',
    model_name VARCHAR(100) DEFAULT 'qwen2.5:latest',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10. MESSAGES TABLE (Grounded Dialogue Turns with Verifiable Citations)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    citations JSONB DEFAULT '[]'::jsonb,
    retrieved_chunk_ids JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 11. HEARINGS TABLE (Court Calendar & Event Timeline)
CREATE TABLE IF NOT EXISTS hearings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    hearing_date DATE NOT NULL,
    hearing_time TIME,
    court_room VARCHAR(100),
    purpose VARCHAR(100) NOT NULL DEFAULT 'preliminary' CHECK (purpose IN (
        'preliminary', 'framing_of_issues', 'evidence', 'final_argument', 
        'judgment', 'status_conference', 'bail_hearing', 'admission'
    )),
    presiding_judge VARCHAR(255),
    outcome_summary TEXT,
    next_steps TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled' CHECK (status IN (
        'scheduled', 'completed', 'adjourned', 'cancelled'
    )),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 12. ACTIVITY_LOGS TABLE (Immutable Audit Trail)
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
        'create', 'update', 'delete', 'view', 'upload', 
        'summarize', 'chat', 'export', 'verify'
    )),
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN (
        'case', 'document', 'fact', 'hearing', 'chat', 'user'
    )),
    entity_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- PERFORMANCE & INTEGRITY INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_cases_created_by ON cases(created_by);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_category ON cases(category);
CREATE INDEX IF NOT EXISTS idx_case_members_user_case ON case_members(user_id, case_id);
CREATE INDEX IF NOT EXISTS idx_case_parties_case_id ON case_parties(case_id);
CREATE INDEX IF NOT EXISTS idx_legal_documents_case_id ON legal_documents(case_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_doc_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_extracted_facts_case_id ON extracted_facts(case_id);
CREATE INDEX IF NOT EXISTS idx_extracted_facts_doc_id ON extracted_facts(document_id);
CREATE INDEX IF NOT EXISTS idx_hearings_case_date ON hearings(case_id, hearing_date);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_case_id ON activity_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);

-- HNSW Vector Index for Fast Cosine Similarity Retrieval
-- ef_construction = 64, m = 16 (Optimal balance between index build time and query recall)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'idx_document_chunks_embedding_hnsw'
    ) THEN
        CREATE INDEX idx_document_chunks_embedding_hnsw 
        ON document_chunks 
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64);
    END IF;
END $$;
