import unittest
from unittest.mock import patch, MagicMock
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.pdf_extractor import PDFExtractor

class TestPDFExtractorStorage(unittest.TestCase):
    def test_clean_extracted_text(self):
        sample = "Section 66 of the Informa-\ntion Technology Act  2000.\n\n\n\nOrder of interim relief."
        cleaned = PDFExtractor.clean_extracted_text(sample)
        self.assertIn("Information", cleaned)
        self.assertNotIn("Informa-\ntion", cleaned)
        self.assertNotIn("\n\n\n", cleaned)

    @patch("httpx.Client")
    def test_extract_from_remote_signed_url_stream(self, mock_httpx_client):
        """Verify that remote signed HTTPS URLs stream directly to PyMuPDF in memory."""
        # Create minimal valid PDF bytes in memory
        try:
            import fitz
            doc = fitz.open()
            page = doc.new_page()
            page.insert_text((50, 72), "High Court of Delhi. Writ Petition 8841/2024. Interim stay granted.")
            pdf_bytes = doc.tobytes()
            doc.close()
        except ImportError:
            self.skipTest("PyMuPDF not available in test environment")

        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.content = pdf_bytes

        mock_instance = MagicMock()
        mock_instance.get.return_value = mock_resp
        mock_instance.__enter__.return_value = mock_instance
        mock_instance.__exit__.return_value = False
        mock_httpx_client.return_value = mock_instance

        # Test extraction using mock signed URL
        signed_url = "https://xyzcompany.supabase.co/storage/v1/object/sign/legal-documents/cases/c1/test.pdf?token=abc123"
        pages = PDFExtractor.extract_pages(signed_url)

        self.assertEqual(len(pages), 1)
        self.assertEqual(pages[0]["page_number"], 1)
        self.assertIn("Writ Petition 8841/2024", pages[0]["text"])
        self.assertFalse(pages[0]["ocr_applied"])

    def test_missing_local_file_raises_not_found(self):
        with self.assertRaises(FileNotFoundError):
            PDFExtractor.extract_pages("/non/existent/path/file.pdf")

if __name__ == '__main__':
    unittest.main()

