import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.services.pdf_extractor import PDFExtractor
from app.services.chunker import TextChunker
from app.services.embeddings import EmbeddingService
from app.services.fact_extractor import LegalFactExtractor
from app.services.summarizer import LegalSummarizer
from app.core.database import save_document_chunks, get_db_connection

logger = logging.getLogger("nyayaflow.ai.routers.document")
router = APIRouter(tags=["Document Ingestion & Analysis"])

class ProcessDocumentRequest(BaseModel):
    document_id: str
    file_path: str
    case_id: str

class SummarizeRequest(BaseModel):
    document_id: str
    text_content: Optional[str] = None

class ExtractFactsRequest(BaseModel):
    document_id: str
    case_id: str

@router.post("/process-document")
async def process_document(req: ProcessDocumentRequest):
    """
    Complete ingestion pipeline:
    1. Extract pages (PyMuPDF + OCR fallback)
    2. Chunk text
    3. Generate 384-dim embeddings
    4. Persist chunks in pgvector
    5. Extract legal facts & persist
    6. Generate summary & persist
    """
    logger.info(f"Initiating full ingestion pipeline for document {req.document_id}")

    try:
        # 1. Extract text page by page
        pages = PDFExtractor.extract_pages(req.file_path)
        total_pages = len(pages)
        any_ocr = any(p.get("ocr_applied", False) for p in pages)

        # Update document page count & ocr flag
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """UPDATE legal_documents 
                           SET total_pages = %s, ocr_applied = %s, processing_status = 'processing' 
                           WHERE id = %s""",
                        (total_pages, any_ocr, req.document_id)
                    )
                conn.commit()
        except Exception as db_err:
            logger.warning(f"Failed to update document page count: {db_err}")

        # 2. Chunk text
        chunks = TextChunker.chunk_pages(pages, chunk_size=400, chunk_overlap=50)

        # 3. Generate embeddings
        chunk_texts = [c["content"] for c in chunks]
        embeddings = EmbeddingService.encode_batch(chunk_texts)

        for c, emb in zip(chunks, embeddings):
            c["embedding"] = emb

        # 4. Save chunks with embeddings in pgvector
        save_document_chunks(req.document_id, chunks)

        # 5. Extract and persist legal facts
        facts = LegalFactExtractor.extract_from_pages(pages, req.case_id, req.document_id)
        LegalFactExtractor.persist_facts(facts, req.case_id, req.document_id)

        # 6. Generate summary
        summary_res = await LegalSummarizer.generate_summary(pages, facts)
        summary_text = summary_res["summary"]

        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """UPDATE legal_documents 
                           SET summary_text = %s, summary_generated_at = CURRENT_TIMESTAMP, processing_status = 'completed'
                           WHERE id = %s""",
                        (summary_text, req.document_id)
                    )
                conn.commit()
        except Exception as db_err:
            logger.warning(f"Failed to update document summary: {db_err}")

        return {
            "status": "completed",
            "document_id": req.document_id,
            "total_pages": total_pages,
            "ocr_applied": any_ocr,
            "chunks_created": len(chunks),
            "facts_extracted": len(facts),
            "summary_preview": summary_text[:200] + "..."
        }

    except Exception as e:
        logger.error(f"Error processing document {req.document_id}: {e}", exc_info=True)
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE legal_documents SET processing_status = 'failed' WHERE id = %s",
                        (req.document_id,)
                    )
                conn.commit()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"Document processing failed: {str(e)}")

@router.post("/summarize")
async def summarize(req: SummarizeRequest):
    """
    Generates or regenerates structured summary for a document.
    """
    try:
        # Load document from DB
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT file_path, case_id FROM legal_documents WHERE id = %s",
                    (req.document_id,)
                )
                row = cur.fetchone()
                if not row:
                    raise HTTPException(status_code=404, detail="Document not found")
                file_path, case_id = row

                # Also get existing facts
                cur.execute(
                    "SELECT fact_type, key_field, fact_value FROM extracted_facts WHERE document_id = %s",
                    (req.document_id,)
                )
                fact_rows = cur.fetchall()
                facts = [{"fact_type": r[0], "key_field": r[1], "fact_value": r[2]} for r in fact_rows]

        pages = PDFExtractor.extract_pages(file_path)
        summary_res = await LegalSummarizer.generate_summary(pages, facts)

        return {
            "document_id": req.document_id,
            "summary": summary_res["summary"],
            "generator": summary_res.get("generator")
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/extract-facts")
async def extract_facts(req: ExtractFactsRequest):
    """
    Extracts structured facts from a document.
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT file_path FROM legal_documents WHERE id = %s",
                    (req.document_id,)
                )
                row = cur.fetchone()
                if not row:
                    raise HTTPException(status_code=404, detail="Document not found")
                file_path = row[0]

        pages = PDFExtractor.extract_pages(file_path)
        facts = LegalFactExtractor.extract_from_pages(pages, req.case_id, req.document_id)
        LegalFactExtractor.persist_facts(facts, req.case_id, req.document_id)

        return {
            "document_id": req.document_id,
            "facts_count": len(facts),
            "facts": facts
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
