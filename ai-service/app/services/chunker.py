import re
import logging
from typing import List, Dict, Any

logger = logging.getLogger("nyayaflow.ai.chunker")

class TextChunker:
    @staticmethod
    def chunk_pages(pages: List[Dict[str, Any]], chunk_size: int = 400, chunk_overlap: int = 50) -> List[Dict[str, Any]]:
        """
        Takes list of extracted pages [ { 'page_number': 1, 'text': '...' } ]
        Produces a flat list of chunks with page numbers preserved:
        [
            {
                'chunk_index': 0,
                'page_number': 1,
                'content': '...',
                'token_count': 120
            }
        ]
        """
        all_chunks = []
        global_chunk_idx = 0

        for p in pages:
            page_num = p.get("page_number", 1)
            text = p.get("text", "").strip()

            if not text:
                continue

            # Split text into paragraphs or sentences
            paragraphs = [para.strip() for para in text.split("\n\n") if para.strip()]
            if not paragraphs:
                paragraphs = [text]

            # Accumulate words up to chunk_size
            current_words = []
            
            for para in paragraphs:
                words = para.split()
                if not words:
                    continue

                if len(current_words) + len(words) <= chunk_size:
                    current_words.extend(words)
                else:
                    # Flush current chunk if it has sufficient content
                    if current_words:
                        chunk_text = " ".join(current_words)
                        all_chunks.append({
                            "chunk_index": global_chunk_idx,
                            "page_number": page_num,
                            "content": chunk_text,
                            "token_count": int(len(current_words) * 1.3)
                        })
                        global_chunk_idx += 1
                        
                        # Retain overlap words
                        overlap_words = current_words[-chunk_overlap:] if len(current_words) > chunk_overlap else []
                        current_words = overlap_words + words
                    else:
                        current_words = words

                    # If a single paragraph is larger than chunk_size, split by sliding window
                    while len(current_words) > chunk_size:
                        window_words = current_words[:chunk_size]
                        chunk_text = " ".join(window_words)
                        all_chunks.append({
                            "chunk_index": global_chunk_idx,
                            "page_number": page_num,
                            "content": chunk_text,
                            "token_count": int(len(window_words) * 1.3)
                        })
                        global_chunk_idx += 1
                        current_words = current_words[chunk_size - chunk_overlap:]

            # Flush remaining words on this page
            if current_words:
                chunk_text = " ".join(current_words)
                all_chunks.append({
                    "chunk_index": global_chunk_idx,
                    "page_number": page_num,
                    "content": chunk_text,
                    "token_count": int(len(current_words) * 1.3)
                })
                global_chunk_idx += 1

        logger.info(f"Chunker created {len(all_chunks)} semantic chunks across {len(pages)} pages.")
        return all_chunks
