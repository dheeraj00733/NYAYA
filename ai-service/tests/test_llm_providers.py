import unittest
from unittest.mock import patch, AsyncMock
import sys
import os
import asyncio

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.config import Settings
from app.services.rag_engine import RAGEngine
from app.services.summarizer import LegalSummarizer

class TestLLMProviders(unittest.IsolatedAsyncioTestCase):
    
    async def test_groq_rag_query_success(self):
        """Test RAG engine synthesis using Groq provider."""
        mock_chunks = [
            {
                "chunk_id": "chunk-001",
                "document_id": "doc-001",
                "document_title": "Writ Petition 8841/2024",
                "file_name": "petition.pdf",
                "page_number": 1,
                "content": "The High Court ordered interim stay on coercive recovery under Section 66.",
                "similarity_score": 0.89
            }
        ]

        with patch("app.services.rag_engine.settings") as mock_settings, \
             patch("app.services.rag_engine.search_similar_chunks", return_value=mock_chunks), \
             patch("app.services.rag_engine.EmbeddingService.encode", return_value=[0.1] * 384), \
             patch("app.services.rag_engine.RAGEngine._query_groq", new_callable=AsyncMock) as mock_groq:
            
            mock_settings.LLM_PROVIDER = "groq"
            mock_settings.GROQ_MODEL = "openai/gpt-oss-120b"
            mock_settings.GROQ_API_KEY = "dummy-key"
            mock_settings.OLLAMA_MODEL = "qwen2.5:latest"
            mock_groq.return_value = "According to Writ Petition 8841/2024 (Page 1), the High Court ordered interim stay."

            result = await RAGEngine.answer_query(
                query="What was ordered by the court?",
                case_id="case-100",
                top_k=1
            )

            mock_groq.assert_awaited_once()
            self.assertEqual(result["confidence"], "high")
            self.assertEqual(result["model_used"], "openai/gpt-oss-120b")
            self.assertIn("According to Writ Petition", result["answer"])
            self.assertEqual(len(result["citations"]), 1)
            self.assertEqual(result["citations"][0]["document_id"], "doc-001")
            self.assertEqual(result["citations"][0]["page_number"], 1)
            self.assertIn("disclaimer", result)

    async def test_ollama_rag_query_success(self):
        """Test RAG engine synthesis using Ollama provider."""
        mock_chunks = [
            {
                "chunk_id": "chunk-002",
                "document_id": "doc-002",
                "document_title": "Order Dated 12-10-2024",
                "file_name": "order.pdf",
                "page_number": 3,
                "content": "Notice issued returnable on 24th November 2024.",
                "similarity_score": 0.92
            }
        ]

        with patch("app.services.rag_engine.settings") as mock_settings, \
             patch("app.services.rag_engine.search_similar_chunks", return_value=mock_chunks), \
             patch("app.services.rag_engine.EmbeddingService.encode", return_value=[0.1] * 384), \
             patch("app.services.rag_engine.RAGEngine._query_ollama", new_callable=AsyncMock) as mock_ollama:
            
            mock_settings.LLM_PROVIDER = "ollama"
            mock_settings.OLLAMA_MODEL = "qwen2.5:latest"
            mock_ollama.return_value = "Notice has been issued returnable on 24th November 2024 (Order, Page 3)."

            result = await RAGEngine.answer_query(
                query="When is the next returnable date?",
                case_id="case-100",
                top_k=1
            )

            mock_ollama.assert_awaited_once()
            self.assertEqual(result["confidence"], "high")
            self.assertEqual(result["model_used"], "qwen2.5:latest")
            self.assertIn("24th November 2024", result["answer"])
            self.assertEqual(len(result["citations"]), 1)

    async def test_groq_fallback_to_ollama_then_deterministic(self):
        """Test that when Groq fails, Ollama is attempted, and if both fail, deterministic fallback answers."""
        mock_chunks = [
            {
                "chunk_id": "chunk-003",
                "document_id": "doc-003",
                "document_title": "FIR No 45/2024",
                "file_name": "fir.pdf",
                "page_number": 1,
                "content": "Investigation transferred to Special Crime Unit.",
                "similarity_score": 0.85
            }
        ]

        with patch("app.services.rag_engine.settings") as mock_settings, \
             patch("app.services.rag_engine.search_similar_chunks", return_value=mock_chunks), \
             patch("app.services.rag_engine.EmbeddingService.encode", return_value=[0.1] * 384), \
             patch("app.services.rag_engine.RAGEngine._query_groq", new_callable=AsyncMock) as mock_groq, \
             patch("app.services.rag_engine.RAGEngine._query_ollama", new_callable=AsyncMock) as mock_ollama:
            
            mock_settings.LLM_PROVIDER = "groq"
            mock_settings.GROQ_MODEL = "openai/gpt-oss-120b"
            mock_settings.OLLAMA_MODEL = "qwen2.5:latest"
            # Both remote and local return None (network/service down)
            mock_groq.return_value = None
            mock_ollama.return_value = None

            result = await RAGEngine.answer_query(
                query="Who is investigating?",
                case_id="case-100",
                top_k=1
            )

            mock_groq.assert_awaited_once()
            mock_ollama.assert_awaited_once()
            self.assertEqual(result["confidence"], "medium")
            self.assertEqual(result["model_used"], "NyayaFlow Local Grounded Synthesizer")
            self.assertIn("FIR No 45/2024", result["answer"])

    async def test_summarizer_groq_provider(self):
        """Test document summarization using Groq."""
        pages = [{"page_number": 1, "text": "High Court of Delhi. Writ Petition 8841/2024."}]
        
        with patch("app.services.summarizer.settings") as mock_settings, \
             patch("app.services.summarizer.LegalSummarizer._query_groq", new_callable=AsyncMock) as mock_groq:
            
            mock_settings.LLM_PROVIDER = "groq"
            mock_settings.GROQ_MODEL = "openai/gpt-oss-120b"
            mock_groq.return_value = {
                "summary": "### 1. Case Header\n- Court: High Court of Delhi",
                "generator": "Groq (openai/gpt-oss-120b)"
            }

            result = await LegalSummarizer.generate_summary(pages)
            mock_groq.assert_awaited_once()
            self.assertEqual(result["generator"], "Groq (openai/gpt-oss-120b)")
            self.assertIn("High Court of Delhi", result["summary"])

    async def test_summarizer_ollama_provider(self):
        """Test document summarization using Ollama."""
        pages = [{"page_number": 1, "text": "High Court of Delhi. Writ Petition 8841/2024."}]
        
        with patch("app.services.summarizer.settings") as mock_settings, \
             patch("app.services.summarizer.LegalSummarizer._query_ollama", new_callable=AsyncMock) as mock_ollama:
            
            mock_settings.LLM_PROVIDER = "ollama"
            mock_settings.OLLAMA_MODEL = "qwen2.5:latest"
            mock_ollama.return_value = {
                "summary": "### 1. Case Header\n- Court: High Court of Delhi",
                "generator": "Ollama (qwen2.5:latest)"
            }

            result = await LegalSummarizer.generate_summary(pages)
            mock_ollama.assert_awaited_once()
            self.assertEqual(result["generator"], "Ollama (qwen2.5:latest)")

if __name__ == '__main__':
    unittest.main()

