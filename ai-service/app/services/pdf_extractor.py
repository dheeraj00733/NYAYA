import os
import re
import logging
from typing import List, Dict, Any

logger = logging.getLogger("nyayaflow.ai.pdf_extractor")

class PDFExtractor:
    @staticmethod
    def extract_pages(file_path: str) -> List[Dict[str, Any]]:
        """
        Extracts text from PDF page by page.
        Supports both local filesystem paths and secure remote signed URLs (Supabase Storage).
        Returns a list of dicts: [ { 'page_number': 1, 'text': '...', 'ocr_applied': False } ]
        """
        extracted_pages = []

        # Try PyMuPDF (fitz)
        try:
            import fitz

            if file_path.startswith("http://") or file_path.startswith("https://"):
                logger.info("Retrieving PDF from secure remote storage URL...")
                import httpx
                with httpx.Client(timeout=60.0, follow_redirects=True) as client:
                    res = client.get(file_path)
                    if res.status_code != 200:
                        raise FileNotFoundError(f"Failed to fetch PDF from remote storage (HTTP {res.status_code})")
                    pdf_bytes = res.content
                doc = fitz.open(stream=pdf_bytes, filetype="pdf")
                logger.info(f"Extracting {len(doc)} pages using PyMuPDF from remote storage stream")
            else:
                if not os.path.exists(file_path):
                    raise FileNotFoundError(f"PDF file does not exist at path: {file_path}")
                doc = fitz.open(file_path)
                logger.info(f"Extracting {len(doc)} pages using PyMuPDF from local file: {file_path}")

            total_pages = len(doc)

            for page_idx in range(total_pages):
                page = doc[page_idx]
                page_num = page_idx + 1
                text = page.get_text("text").strip()
                ocr_applied = False

                # Fallback to Tesseract OCR if text is negligible (scanned page)
                if len(text) < 20:
                    try:
                        import pytesseract
                        from PIL import Image
                        import io

                        pix = page.get_pixmap(dpi=150)
                        img = Image.open(io.BytesIO(pix.tobytes("png")))
                        ocr_text = pytesseract.image_to_string(img).strip()
                        if len(ocr_text) > len(text):
                            text = ocr_text
                            ocr_applied = True
                            logger.info(f"OCR successfully extracted {len(text)} characters on page {page_num}")
                    except Exception as ocr_err:
                        logger.debug(f"OCR fallback skipped or unavailable on page {page_num}: {ocr_err}")

                extracted_pages.append({
                    "page_number": page_num,
                    "text": PDFExtractor.clean_extracted_text(text),
                    "char_count": len(text),
                    "ocr_applied": ocr_applied
                })

            doc.close()
            return extracted_pages

        except ImportError:
            logger.warning("PyMuPDF (fitz) not found. Attempting pure Python fallback...")
            return PDFExtractor._fallback_extract_pages(file_path)
        except Exception as e:
            logger.error(f"Error during PDF extraction: {e}")
            raise e

    @staticmethod
    def clean_extracted_text(text: str) -> str:
        """
        Cleans OCR and formatting noise from extracted text.
        """
        if not text:
            return ""
        # Collapse excessive whitespace and hyphens across lines
        text = re.sub(r'(\w+)-\n(\w+)', r'\1\2', text)
        text = re.sub(r'[ \t]+', ' ', text)
        text = re.sub(r'\n{3,}', '\n\n', text)
        return text.strip()

    @staticmethod
    def _fallback_extract_pages(file_path: str) -> List[Dict[str, Any]]:
        """
        Pure Python fallback for non-OCR basic extraction
        """
        import io
        if file_path.startswith("http://") or file_path.startswith("https://"):
            import httpx
            with httpx.Client(timeout=60.0, follow_redirects=True) as client:
                res = client.get(file_path)
                pdf_data = res.content
        else:
            with open(file_path, "rb") as f:
                pdf_data = f.read()

        # Very basic raw text string search in PDF stream
        raw_strings = re.findall(rb'\(([^\)]+)\)T[jJ]', pdf_data)
        extracted = " ".join([s.decode('latin1', errors='ignore') for s in raw_strings])
        return [{
            "page_number": 1,
            "text": PDFExtractor.clean_extracted_text(extracted),
            "char_count": len(extracted),
            "ocr_applied": False
        }]
