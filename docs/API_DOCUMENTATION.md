# NyayaFlow – REST API Specification

This document outlines the API contracts for the Express.js Backend and the FastAPI AI Service.

---

## 1. Express Backend Endpoints (`http://localhost:5001/api`)

### 1.1 Authentication & Profile (`/auth`)
- `POST /api/auth/register`
  - Body: `{ email, password, full_name, role, phone, bar_council_id, organization }`
  - Response: `{ user: { id, email, full_name, role }, token }`
- `POST /api/auth/login`
  - Body: `{ email, password }`
  - Response: `{ user: { id, email, full_name, role, organization }, token }`
- `GET /api/auth/me`
  - Headers: `Authorization: Bearer <jwt>`
  - Response: Current user object with active case counts.
- `PUT /api/auth/profile`
  - Body: `{ full_name, phone, organization, bar_council_id }`
  - Response: Updated user profile.

### 1.2 Case Management (`/cases`)
- `GET /api/cases`
  - Query params: `search`, `status`, `category`, `priority`, `page`, `limit`
  - Response: `{ cases: [...], total, page, totalPages }`
- `POST /api/cases`
  - Body: `{ case_number, title, description, category, priority, court_name, court_type, judge_name, filing_date, next_hearing_date }`
  - Response: Created case record.
- `GET /api/cases/:id`
  - Response: Case detail object joined with `case_members`, `case_parties`, `hearings`, `legal_documents` count.
- `PUT /api/cases/:id`
  - Body: Case fields to update.
  - Response: Updated case record.
- `DELETE /api/cases/:id`
  - Response: `{ message: "Case and associated resources deleted successfully" }`
- `POST /api/cases/:id/members`
  - Body: `{ user_id, role_in_case, can_edit, can_upload, can_chat }`
  - Response: Created member link.
- `DELETE /api/cases/:id/members/:userId`
  - Response: Member removed.
- `POST /api/cases/:id/parties`
  - Body: `{ name, party_type, contact_email, contact_phone, party_role, advocate_name, legal_counsel_firm }`
  - Response: Linked party record.

### 1.3 Legal Document Management (`/documents`)
- `GET /api/documents`
  - Query params: `case_id`, `category`, `search`
  - Response: Array of document metadata objects.
- `POST /api/documents/upload`
  - Form-data: `file` (PDF), `case_id`, `title`, `document_category`
  - Response: Created document record, initiates background AI ingestion pipeline.
- `GET /api/documents/:id`
  - Response: Document metadata, processing status, and AI summary.
- `GET /api/documents/:id/download`
  - Headers: `Authorization: Bearer <jwt>`
  - Response: Binary PDF stream.
- `DELETE /api/documents/:id`
  - Response: Deletes document file and database record (cascading to chunks & facts).
- `POST /api/documents/:id/summarize`
  - Response: Generates/regenerates structured AI summary.

### 1.4 Extracted Facts (`/facts`)
- `GET /api/facts`
  - Query params: `case_id`, `document_id`, `fact_type`, `is_verified`
  - Response: Array of extracted facts with confidence scores, citations, and excerpts.
- `POST /api/facts`
  - Body: Manual fact addition `{ case_id, document_id, fact_type, key_field, fact_value, source_page, excerpt }`
  - Response: Created fact.
- `PUT /api/facts/:id/verify`
  - Body: `{ is_verified: true, corrected_value?: string }`
  - Response: Verified fact record with verifier timestamp.
- `DELETE /api/facts/:id`
  - Response: Deleted fact.

### 1.5 Hearing Calendar & Timeline (`/hearings`)
- `GET /api/hearings`
  - Query params: `case_id`, `from_date`, `to_date`, `status`
  - Response: Chronological list of court hearings.
- `POST /api/hearings`
  - Body: `{ case_id, hearing_date, hearing_time, court_room, purpose, presiding_judge, outcome_summary, next_steps, status }`
  - Response: Created hearing.
- `PUT /api/hearings/:id`
  - Response: Updated hearing record.
- `DELETE /api/hearings/:id`
  - Response: Deleted hearing.

### 1.6 AI Chat & Conversations (`/chats`)
- `GET /api/chats`
  - Query params: `case_id`, `document_id`
  - Response: List of conversations for the user/case.
- `POST /api/chats`
  - Body: `{ case_id, document_id, title }`
  - Response: New conversation session.
- `GET /api/chats/:id/messages`
  - Response: Message history for chat session.
- `POST /api/chats/:id/messages`
  - Body: `{ message: "What are the relief claims in this petition?" }`
  - Response: Assistant reply with grounding citations, retrieved chunks, and source pages.
- `DELETE /api/chats/:id`
  - Response: Conversation deleted.

### 1.7 Analytics & Dashboard (`/analytics`)
- `GET /api/analytics/dashboard`
  - Response:
    ```json
    {
      "counts": {
        "total_cases": 12,
        "active_cases": 8,
        "closed_cases": 4,
        "total_documents": 35,
        "upcoming_hearings": 3
      },
      "status_distribution": [
        { "status": "filed", "count": 2 },
        { "status": "pending", "count": 3 },
        { "status": "hearing", "count": 3 },
        { "status": "decided", "count": 4 }
      ],
      "category_distribution": [
        { "category": "civil", "count": 5 },
        { "category": "corporate", "count": 4 },
        { "category": "criminal", "count": 3 }
      ],
      "recent_documents": [...],
      "upcoming_hearings": [...],
      "recent_activities": [...]
    }
    ```

---

## 2. FastAPI AI Service Endpoints (`http://localhost:8000`)

### 2.1 System & Health (`/`)
- `GET /health`
  - Response: `{ status: "healthy", model: "all-MiniLM-L6-v2", ollama_status: "connected" }`
- `GET /models`
  - Response: `{ available_models: ["qwen2.5:latest", "llama3.2:latest", "mistral"], active_model: "qwen2.5:latest" }`

### 2.2 Document Processing & Ingestion (`/process-document`)
- `POST /process-document`
  - Body: `{ document_id: "uuid", file_path: "string", case_id: "uuid" }`
  - Actions:
    1. PyMuPDF extracts text page by page.
    2. Runs Tesseract OCR on blank/scanned pages.
    3. Chunks text using sliding window (400 tokens / 50 overlap).
    4. Computes 384-dimensional embeddings via `SentenceTransformer`.
    5. Inserts chunks directly into `document_chunks` table in Postgres.
    6. Extracts legal facts and updates `extracted_facts`.
    7. Generates document summary and stores in `legal_documents`.
  - Response: `{ status: "completed", total_pages: 14, chunks_created: 38, facts_extracted: 12 }`

### 2.3 Document Summarization (`/summarize`)
- `POST /summarize`
  - Body: `{ document_id: "uuid", text_content?: "string" }`
  - Response: Structured summary JSON identifying Case Name/No, Court, Parties, Dates, Issues, Arguments, Facts, and Final Outcome.

### 2.4 Legal Fact Extraction (`/extract-facts`)
- `POST /extract-facts`
  - Body: `{ document_id: "uuid", case_id: "uuid" }`
  - Response: Array of extracted fact objects `{ fact_type, key_field, fact_value, confidence_score, source_page, excerpt }`

### 2.5 RAG Query & Question Answering (`/rag/query`)
- `POST /rag/query`
  - Body:
    ```json
    {
      "query": "What grounds did the appellant cite for quashing the order?",
      "case_id": "uuid",
      "document_id": "uuid (optional)",
      "top_k": 4,
      "model": "qwen2.5:latest"
    }
    ```
  - Response:
    ```json
    {
      "answer": "The appellant argued that the statutory authority failed to adhere to principles of natural justice and did not serve notice as required under Section 13(2)...",
      "citations": [
        {
          "document_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
          "document_title": "Civil Appeal Petition 2024.pdf",
          "page_number": 4,
          "excerpt": "...the respondent authority proceeded ex-parte without issuance of requisite notice under Section 13(2)...",
          "similarity_score": 0.864
        }
      ],
      "retrieved_chunk_ids": ["uuid-1", "uuid-2"],
      "confidence": "high",
      "disclaimer": "This analysis is generated from retrieved case documents for informational assistance and does not constitute formal legal counsel."
    }
    ```
