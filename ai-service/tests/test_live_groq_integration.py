import unittest
import sys
import os
import asyncio

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.config import settings
from app.services.rag_engine import RAGEngine
from app.services.summarizer import LegalSummarizer

class TestLiveGroqIntegration(unittest.IsolatedAsyncioTestCase):
    async def test_live_groq_rag_query(self):
        """Live call to Groq API with RAG prompt synthesis."""
        if not settings.GROQ_API_KEY:
            self.skipTest("GROQ_API_KEY not configured, skipping live test.")

        system_instruction = (
            "You are NyayaFlow, an elite legal intelligence assistant. "
            "Answer using ONLY the provided excerpt. Be concise and cite the document and page."
        )
        prompt = (
            "DOCUMENT EXCERPTS:\n"
            "[Source 1: Order in Writ Petition 8841/2024 | Page 2]\n"
            "The High Court held that no coercive recovery measures shall be initiated against the Petitioner pending final hearing.\n\n"
            "USER QUESTION:\n"
            "Did the High Court grant an interim stay against coercive measures?\n\n"
            "GROUNDED LEGAL ANSWER:"
        )

        response = await RAGEngine._query_groq(
            system_instruction=system_instruction,
            prompt=prompt,
            model=settings.GROQ_MODEL
        )

        self.assertIsNotNone(response, "Groq should return a non-empty response")
        self.assertTrue("Page" in response and "coercive" in response.lower())
        print("\n[Live Groq RAG Response]:", response)

    async def test_live_groq_summarizer(self):
        """Live call to Groq API with Legal Summarizer."""
        if not settings.GROQ_API_KEY:
            self.skipTest("GROQ_API_KEY not configured, skipping live test.")

        sample_text = (
            "IN THE HIGH COURT OF DELHI AT NEW DELHI\n"
            "W.P.(C) 1042/2024\n"
            "ABC INFOTECH LTD vs UNION OF INDIA\n"
            "The petitioner challenges the cancellation order issued under Section 43A of IT Act.\n"
            "Court observed that adequate opportunity of hearing was not provided.\n"
            "The impugned cancellation order is stayed till next date of hearing on 15.01.2025."
        )

        result = await LegalSummarizer._query_groq(sample_text)
        self.assertIsNotNone(result, "Groq summarizer should return structured summary")
        self.assertIn("summary", result)
        self.assertIn("Groq (openai/gpt-oss-120b)", result["generator"])
        print("\n[Live Groq Summary Output]:\n", result["summary"])

if __name__ == '__main__':
    unittest.main()
