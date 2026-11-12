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
        Returns a list of dicts: [ { 'page_number': 1, 'text': '...', 'ocr_applied': False } ]
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"PDF file does not exist at path: {file_path}")

        extracted_pages = []

        # Try PyMuPDF (fitz)
        try:
            import fitz
            doc = fitz.open(file_path)
            total_pages = len(doc)
            logger.info(f"Extracting {total_pages} pages using PyMuPDF from: {file_path}")

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
                    "text": text,
                    "ocr_applied": ocr_applied
                })
            
            doc.close()
            return extracted_pages

        except ImportError:
            logger.warning("PyMuPDF (fitz) not installed in current environment. Using raw PDF text parser fallback.")
            return PDFExtractor._raw_pdf_fallback(file_path)
        except Exception as e:
            logger.warning(f"PyMuPDF error: {e}. Trying fallback parser.")
            return PDFExtractor._raw_pdf_fallback(file_path)

    @staticmethod
    def _raw_pdf_fallback(file_path: str) -> List[Dict[str, Any]]:
        """
        Lightweight pure-python fallback parser to extract text streams from PDF bytes.
        """
        pages = []
        try:
            with open(file_path, "rb") as f:
                content = f.read().decode("latin1", errors="ignore")

            # Match text between BT (Begin Text) and ET (End Text)
            bt_et_blocks = re.findall(r"BT\s*(.*?)\s*ET", content, re.DOTALL)
            
            if not bt_et_blocks:
                # Simple string extraction
                raw_strings = re.findall(r"\((.*?)\)\s*['Tj]", content)
                full_text = " ".join(raw_strings)
                return [{"page_number": 1, "text": full_text or "PDF text could not be parsed.", "ocr_applied": False}]

            # Group blocks approximately by page
            page_blocks = re.split(r"/Type\s*/Page[^s]", content)
            if len(page_blocks) > 1:
                # Found page delimiters
                for idx, block in enumerate(page_blocks[1:], start=1):
                    strings = re.findall(r"\((.*?)\)\s*['Tj]", block)
                    text = "\n".join(strings).replace("\\(", "(").replace("\\)", ")")
                    pages.append({
                        "page_number": idx,
                        "text": text if text.strip() else "[Empty or Image Page]",
                        "ocr_applied": False
                    })
            else:
                strings = re.findall(r"\((.*?)\)\s*['Tj]", content)
                text = "\n".join(strings).replace("\\(", "(").replace("\\)", ")")
                pages.append({
                    "page_number": 1,
                    "text": text if text.strip() else "[Empty or Image Page]",
                    "ocr_applied": False
                })

            return pages
        except Exception as err:
            logger.error(f"Fallback PDF extractor failed: {err}")
            return [{"page_number": 1, "text": "Error extracting document text.", "ocr_applied": False}]
