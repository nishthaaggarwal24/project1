"""Lazy, reproducible all-MiniLM-L6-v2 embeddings for real source narratives.

The model is never downloaded at application startup. If its package or weights are
unavailable, callers receive an explicit availability result and can use lexical
TF-IDF retrieval with its method named correctly.
"""
import hashlib
import numpy as np


class EmbeddingService:
    def __init__(self):
        self._model = None
        self._error = None
        self._cache_key = None
        self._vectors = None

    def _load_model(self):
        if self._model is not None or self._error is not None:
            return
        try:
            from sentence_transformers import SentenceTransformer
            self._model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
        except Exception as exc:
            self._error = f"all-MiniLM-L6-v2 unavailable: {type(exc).__name__}: {exc}"

    def rank(self, texts, query, limit=10):
        corpus = self.encode_corpus(texts)
        if corpus is None:
            return {"available": False, "limitation": self._error, "results": []}
        query_vector = self._model.encode([str(query)], normalize_embeddings=True,
                                          show_progress_bar=False)[0]
        scores = np.asarray(corpus) @ np.asarray(query_vector)
        indices = np.argsort(scores)[::-1][:limit]
        return {"available": True, "method": "all-MiniLM-L6-v2 cosine similarity",
                "results": [{"index": int(i), "score": float(scores[i])} for i in indices]}

    def encode_corpus(self, texts):
        self._load_model()
        if self._model is None:
            return None
        digest = hashlib.sha256("\0".join(map(str, texts)).encode("utf-8")).hexdigest()
        if digest != self._cache_key:
            self._vectors = self._model.encode(list(map(str, texts)), normalize_embeddings=True,
                                               show_progress_bar=False, batch_size=64)
            self._cache_key = digest
        return self._vectors


embedding_service = EmbeddingService()
