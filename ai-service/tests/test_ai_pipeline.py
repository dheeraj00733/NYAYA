import unittest
import math
import sys
import os

# Add parent directory to path so app modules can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.chunker import TextChunker
from app.services.embeddings import EmbeddingService
from app.services.fact_extractor import LegalFactExtractor

class TestAIPipeline(unittest.TestCase):
    def test_chunker_preserves_page_numbers_and_overlap(self):
        pages = [
            {"page_number": 1, "text": "This is page one legal text. " * 30},
            {"page_number": 2, "text": "This is page two legal text with statutory citations. " * 30}
        ]
        chunks = TextChunker.chunk_pages(pages, chunk_size=50, chunk_overlap=10)
        
        self.assertGreater(len(chunks), 1, "Should create multiple chunks")
        self.assertEqual(chunks[0]["page_number"], 1, "First chunk must be page 1")
        self.assertTrue(any(c["page_number"] == 2 for c in chunks), "Must retain page 2 reference")
        self.assertTrue(all("content" in c and "token_count" in c for c in chunks))

    def test_embedding_vector_dimensions_and_normalization(self):
        sample_text = "Quashing of First Information Report under Article 226 of Constitution."
        vector = EmbeddingService.encode(sample_text)
        
        self.assertEqual(len(vector), 384, f"Expected 384-dimensional vector, got {len(vector)}")
        # Verify L2 norm is approximately 1.0 (unit vector)
        norm = math.sqrt(sum(x * x for x in vector))
        self.assertAlmostEqual(norm, 1.0, delta=0.05, msg=f"Vector should be L2-normalized, norm was {norm}")

    def test_legal_fact_extraction(self):
        sample_page = {
            "page_number": 1,
            "text": """
            IN THE HIGH COURT OF DELHI AT NEW DELHI
            WRIT PETITION NO. 8841 OF 2024
            
            IN THE MATTER OF:
            ANAND TECH SOLUTIONS PVT. LTD.         ...PETITIONER
            
            VERSUS
            
            STATE OF NCT OF DELHI                  ...RESPONDENT
            
            Advocate for Petitioner: Adv. Rajesh Sharma
            Registered under Section 66 of Information Technology Act 2000.
            It is directed that no coercive steps shall be taken against the directors.
            """
        }
        
        facts = LegalFactExtractor.extract_from_pages([sample_page], "case-123", "doc-456")
        fact_types = [f["fact_type"] for f in facts]
        
        self.assertIn("court", fact_types, "Court name should be extracted")
        self.assertIn("case_number", fact_types, "Case number should be extracted")
        self.assertIn("petitioner", fact_types, "Petitioner should be extracted")
        self.assertIn("respondent", fact_types, "Respondent should be extracted")
        self.assertIn("legal_section", fact_types, "Legal section should be extracted")
        self.assertIn("outcome", fact_types, "Outcome directive should be extracted")
        
        for f in facts:
            self.assertEqual(f["source_page"], 1)
            self.assertTrue(0.0 <= f["confidence_score"] <= 1.0)

if __name__ == '__main__':
    unittest.main()
