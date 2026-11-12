import math
import hashlib
import logging
from typing import List
from app.core.config import settings

logger = logging.getLogger("nyayaflow.ai.embeddings")

class EmbeddingService:
    _model = None
    _is_fallback = False

    @classmethod
    def get_model(cls):
        if cls._model is None and not cls._is_fallback:
            try:
                from sentence_transformers import SentenceTransformer
                logger.info(f"Loading local SentenceTransformer model: {settings.EMBEDDING_MODEL_NAME}")
                cls._model = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
                logger.info("SentenceTransformer model successfully loaded into memory.")
            except Exception as e:
                logger.warning(
                    f"SentenceTransformer could not be initialized directly: {e}. "
                    "Activating deterministic 384-dim semantic embedding fallback."
                )
                cls._is_fallback = True
        return cls._model

    @classmethod
    def encode(cls, text: str) -> List[float]:
        """
        Encodes a single text string into a 384-dimensional float vector.
        """
        model = cls.get_model()
        if model is not None and not cls._is_fallback:
            try:
                embedding = model.encode(text, normalize_embeddings=True)
                return [round(float(v), 6) for v in embedding]
            except Exception as e:
                logger.warning(f"Error during model.encode: {e}. Using deterministic fallback vector.")

        # Deterministic 384-dimensional semantic projection fallback
        return cls._deterministic_384_vector(text)

    @classmethod
    def encode_batch(cls, texts: List[str]) -> List[List[float]]:
        """
        Encodes a batch of text strings into 384-dimensional float vectors.
        """
        model = cls.get_model()
        if model is not None and not cls._is_fallback:
            try:
                embeddings = model.encode(texts, normalize_embeddings=True, batch_size=16)
                return [[round(float(v), 6) for v in emb] for emb in embeddings]
            except Exception as e:
                logger.warning(f"Error during model.encode_batch: {e}. Using fallback vectorizer.")

        return [cls._deterministic_384_vector(t) for t in texts]

    @staticmethod
    def _deterministic_384_vector(text: str) -> List[float]:
        """
        Generates a deterministic 384-dimensional L2-normalized float vector
        using feature hashing over token n-grams.
        Preserves vector space properties so cosine distance calculations work reliably.
        """
        dim = 384
        vec = [0.0] * dim
        words = text.lower().split()
        
        if not words:
            vec[0] = 1.0
            return vec

        # Bag of words and character tri-grams
        for word in words:
            # Word level hash
            h_val = int(hashlib.md5(word.encode('utf-8')).hexdigest(), 16)
            idx = h_val % dim
            sign = 1.0 if (h_val // dim) % 2 == 0 else -1.0
            vec[idx] += sign

            # Subword trigrams
            for i in range(len(word) - 2):
                tri = word[i:i+3]
                h_tri = int(hashlib.sha1(tri.encode('utf-8')).hexdigest(), 16)
                idx_tri = h_tri % dim
                sign_tri = 0.5 if (h_tri // dim) % 2 == 0 else -0.5
                vec[idx_tri] += sign_tri

        # Compute L2 Norm and normalize
        norm = math.sqrt(sum(x * x for x in vec))
        if norm > 0:
            vec = [round(x / norm, 6) for x in vec]
        else:
            vec[0] = 1.0

        return vec
