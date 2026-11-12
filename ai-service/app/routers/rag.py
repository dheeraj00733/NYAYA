import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.services.rag_engine import RAGEngine

logger = logging.getLogger("nyayaflow.ai.routers.rag")
router = APIRouter(tags=["Retrieval-Augmented Generation (RAG)"])

class RAGQueryRequest(BaseModel):
    query: str
    case_id: str
    document_id: Optional[str] = None
    top_k: Optional[int] = 4
    model: Optional[str] = None

@router.post("/rag/query")
async def rag_query(req: RAGQueryRequest):
    """
    RAG Query Endpoint:
    Embeds query -> Retrieves top-k chunks with pgvector -> Prompts Ollama with strict grounding -> Returns grounded answer with citations.
    """
    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="Query string is required.")
    if not req.case_id:
        raise HTTPException(status_code=400, detail="case_id is required to maintain case-level boundary.")

    try:
        result = await RAGEngine.answer_query(
            query=req.query.strip(),
            case_id=req.case_id,
            document_id=req.document_id,
            top_k=req.top_k or 4,
            model=req.model
        )
        return result
    except Exception as e:
        logger.error(f"Error executing RAG query: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"RAG query execution failed: {str(e)}")
