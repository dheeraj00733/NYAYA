# NyayaFlow – System Architecture & Technical Specification

## 1. High-Level Architecture Overview

NyayaFlow employs a decoupled, multi-tier micro-service architecture optimized for high-security legal workflows, deterministic RAG (Retrieval-Augmented Generation), and fast reactive UI updates.

```
                           +----------------------------------------+
                           |           React Frontend (SPA)         |
                           |  (Vite + Tailwind CSS + Lucide Icons)  |
                           +-------------------+--------------------+
                                               |
                                     REST APIs / JWT Auth
                                               |
                                               v
                           +----------------------------------------+
                           |          Express.js Backend            |
                           |  - Authentication & RBAC (Lawyer/User) |
                           |  - Case & Document Management (CRUD)   |
                           |  - Audit Activity Logging              |
                           |  - HTTP Client Gateway to AI Service   |
                           +--------+----------------------+--------+
                                    |                      |
                            Pool / pg Queries         HTTP REST APIs
                                    |                      |
                                    v                      v
        +-----------------------------+     +-------------------------------+
        |   PostgreSQL 16 + pgvector  |     |      FastAPI AI Service       |
        |  - Relational Normalized DB |<----+  - PyMuPDF Text Extraction    |
        |  - 12 Core Tables           |     |  - Tesseract OCR Fallback     |
        |  - HNSW Vector Indexing     |     |  - Sentence-Transformers      |
        |  - ACID Transactions        |     |  - Ollama LLM RAG Pipeline    |
        +-----------------------------+     +---------------+---------------+
                                                            |
                                                   Local Model Inference
                                                            |
                                                            v
                                            +-------------------------------+
                                            |       Local Ollama Daemon     |
                                            |  - Model: Qwen2.5 / llama3    |
                                            |  - Port 11434 (Host / Docker) |
                                            +-------------------------------+
```

---

## 2. Core Service Responsibilities

### 2.1 React Frontend (Client Layer)
- **Role**: Delivers a SaaS interface built for legal practitioners.
- **Tech Stack**: React 18, Vite, Tailwind CSS, Lucide React icons, Recharts, React Router v6, Axios.
- **Key Modules**:
  - Protected routing with role-based component rendering (`Lawyer`, `Client`, `Admin`).
  - Interactive split-screen legal document reader (PDF view synced with extracted fact annotations and AI summaries).
  - Conversational AI interface with expandable, clickable citations (document name, page number, confidence, and grounded excerpt).
  - Visual Hearing Timeline with calendar alerts.
  - Case analytics dashboard powered by Recharts (Status breakdowns, activity volume).
  - Comprehensive fact verification portal allowing lawyers to approve or correct extracted facts.

### 2.2 Express.js Backend (Application & Business Logic Layer)
- **Role**: Coordinates business rules, authentication, role-based authorization, case boundaries, document uploads, and audit logging.
- **Tech Stack**: Node.js 20+, Express.js, `pg` (PostgreSQL client pool), `bcryptjs`, `jsonwebtoken`, `multer`, `cors`, `helmet`.
- **Security Principles**:
  - Stateless JWT token authentication with configurable expiration.
  - Multi-tenant case-level authorization middleware (`checkCaseAccess` verifies if the requester is an admin, lead counsel, or assigned case member).
  - Parameterized SQL queries preventing SQL injection across all endpoints.
  - Document file security: Documents are stored with sanitized unique UUID filenames on local volume; only authorized users can download or view.

### 2.3 Python FastAPI AI Service (Inference & RAG Engine)
- **Role**: High-performance asynchronous AI microservice executing document parsing, chunking, embedding generation, vector search, fact extraction, and grounded RAG.
- **Tech Stack**: Python 3.9+, FastAPI, Uvicorn, PyMuPDF (`fitz`), PyTesseract (OCR fallback), Sentence-Transformers (`all-MiniLM-L6-v2`), PyTorch (CPU-optimized), HTTPX.
- **Key Capabilities**:
  - **PyMuPDF Document Extraction**: Extracts raw text page by page with coordinate preservation.
  - **OCR Fallback**: If a page has minimal or zero text layer (scanned court order or petition), it invokes Tesseract OCR.
  - **Sliding-Window Chunker**: Splits text into 400-token chunks with 50-token overlaps, preserving page boundaries.
  - **Local Embedding Generation**: Generates 384-dimensional dense vectors using `sentence-transformers/all-MiniLM-L6-v2` locally (no external API calls or billing).
  - **Direct pgvector Search**: Performs cosine distance vector similarity queries directly on the `document_chunks` table.
  - **Ollama Integration**: Connects to locally running Ollama LLM (`Qwen2.5` or `llama3`) via `http://host.docker.internal:11434` or local socket. Includes fallback rule-based extractors if Ollama is paused.

### 2.4 PostgreSQL 16 + pgvector (Data & Vector Store)
- **Role**: Unified ACID-compliant transactional and vector storage.
- **Key Capabilities**:
  - Stores all relational data across 12 normalized tables.
  - `vector(384)` column for dense semantic embeddings.
  - HNSW vector index (`vector_cosine_ops`) for sub-second nearest-neighbor retrieval.
  - Strict foreign key constraints with cascade rules and uniqueness guarantees.

---

## 3. End-to-End RAG Pipeline Flow

```
[User uploads legal PDF] 
         │
         ▼
[Express handles upload -> stores file in /storage/uploads]
         │
         ▼
[Express notifies FastAPI /process-document]
         │
         ▼
[PyMuPDF extracts text page by page (Tesseract fallback for scanned pages)]
         │
         ▼
[Sliding-window chunker divides into ~400 token chunks with page tracking]
         │
         ▼
[all-MiniLM-L6-v2 produces 384-dim vector for each chunk]
         │
         ▼
[Direct INSERT into document_chunks table with vector & metadata]
         │
         ▼
[FastAPI triggers background Legal Fact Extraction & Summarization]
         │
         ▼
[Extracted facts stored in extracted_facts; summary saved in legal_documents]

════════════════════════════════════════════════════════════════════════════════

[User enters prompt in AI Chat: "What was the reason for dismissing the petition?"]
         │
         ▼
[Express verifies user has case_member access -> forwards to FastAPI /rag/query]
         │
         ▼
[FastAPI encodes question into 384-dim embedding]
         │
         ▼
[Vector search in PostgreSQL using <=> cosine distance, filtered by case_id/document_id]
         │
         ▼
[Top-k (e.g. k=4) most relevant chunks retrieved with page numbers & scores]
         │
         ▼
[System Prompt assembled: Instructions + Strict Context + Verifiable Citation Rule]
         │
         ▼
[Sent to local Ollama (e.g. Qwen2.5) with temperature=0.1 for high fidelity]
         │
         ▼
[FastAPI formats response: text + structured citations {doc_name, page_no, excerpt}]
         │
         ▼
[Express records turn in messages table -> delivers to React client UI]
```

---

## 4. Security & Privacy Guarantees

1. **Zero External Data Leakage**: Document embeddings, text chunks, and LLM inferences occur entirely within local infrastructure or self-hosted Docker containers. No client data is sent to OpenAI, Google Cloud, or Anthropic.
2. **Access Control (RBAC & CBAC)**:
   - System Roles: `admin` (global maintenance), `lawyer` (manages cases, documents, facts, hearings), `client` (read-only observer access to assigned cases).
   - Case-Based Access Control (CBAC): Non-admin users can strictly access only cases where their `user_id` exists in `case_members`.
3. **Audit Trails**: All modifications (document uploads, fact edits, summary requests, chat interactions) generate immutable records in `activity_logs`.
4. **Input Sanitization**: File uploads are restricted to `.pdf` with MIME check and file-size ceilings (50MB). Form inputs are validated with express-validator and Pydantic.
