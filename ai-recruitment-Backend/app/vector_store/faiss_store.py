"""
FAISS Vector Store Service.
Manages embeddings for candidates and jobs with persistent storage.
"""
import os
import json
import pickle
import asyncio
from pathlib import Path
from typing import Optional
import numpy as np
import structlog

logger = structlog.get_logger()

# Lazy imports to avoid startup errors if not installed
_faiss = None
_openai_client = None


def get_faiss():
    global _faiss
    if _faiss is None:
        import faiss
        _faiss = faiss
    return _faiss


class VectorStore:
    """
    FAISS-based vector store with metadata tracking.
    Supports add, search, and delete operations.
    """

    def __init__(self, index_path: str, dimension: int = 1536):
        self.index_path = Path(index_path)
        self.dimension = dimension
        self.index = None
        self.id_map: dict[int, str] = {}  # faiss_id -> doc_id
        self.metadata_map: dict[str, dict] = {}  # doc_id -> metadata
        self._next_id = 0
        self._lock = asyncio.Lock()
        self._initialized = False

    async def initialize(self):
        """Load or create FAISS index."""
        async with self._lock:
            if self._initialized:
                return

            faiss = get_faiss()
            self.index_path.parent.mkdir(parents=True, exist_ok=True)

            index_file = self.index_path.with_suffix(".index")
            meta_file = self.index_path.with_suffix(".meta")

            if index_file.exists() and meta_file.exists():
                try:
                    self.index = faiss.read_index(str(index_file))
                    with open(meta_file, "rb") as f:
                        data = pickle.load(f)
                        self.id_map = data.get("id_map", {})
                        self.metadata_map = data.get("metadata_map", {})
                        self._next_id = data.get("next_id", 0)
                    logger.info("FAISS index loaded", vectors=self.index.ntotal)
                except Exception as e:
                    logger.warning("Failed to load index, creating new", error=str(e))
                    self._create_new_index()
            else:
                self._create_new_index()

            self._initialized = True

    def _create_new_index(self):
        faiss = get_faiss()
        # Use IndexFlatIP for cosine similarity (with normalized vectors)
        self.index = faiss.IndexFlatIP(self.dimension)
        logger.info("Created new FAISS index", dimension=self.dimension)

    def _save(self):
        """Persist index and metadata to disk."""
        try:
            faiss = get_faiss()
            index_file = self.index_path.with_suffix(".index")
            meta_file = self.index_path.with_suffix(".meta")

            faiss.write_index(self.index, str(index_file))
            with open(meta_file, "wb") as f:
                pickle.dump({
                    "id_map": self.id_map,
                    "metadata_map": self.metadata_map,
                    "next_id": self._next_id,
                }, f)
        except Exception as e:
            logger.error("Failed to save FAISS index", error=str(e))

    async def add_documents(
        self,
        texts: list[str],
        embeddings: list[list[float]],
        doc_id: str,
        metadata: Optional[dict] = None,
    ) -> list[int]:
        """Add document chunks to the index."""
        await self.initialize()

        async with self._lock:
            vectors = np.array(embeddings, dtype=np.float32)
            # Normalize for cosine similarity
            norms = np.linalg.norm(vectors, axis=1, keepdims=True)
            norms = np.where(norms == 0, 1, norms)
            vectors = vectors / norms

            faiss_ids = []
            for i, vector in enumerate(vectors):
                fid = self._next_id
                self.index.add(vector.reshape(1, -1))
                self.id_map[fid] = doc_id
                faiss_ids.append(fid)
                self._next_id += 1

            self.metadata_map[doc_id] = {
                "faiss_ids": faiss_ids,
                "texts": texts,
                **(metadata or {}),
            }

            self._save()
            logger.info("Documents added to FAISS", doc_id=doc_id, chunks=len(texts))
            return faiss_ids

    async def search(
        self,
        query_embedding: list[float],
        top_k: int = 10,
        filter_doc_ids: Optional[list[str]] = None,
    ) -> list[dict]:
        """Search for similar documents."""
        await self.initialize()

        if self.index.ntotal == 0:
            return []

        query = np.array([query_embedding], dtype=np.float32)
        norm = np.linalg.norm(query)
        if norm > 0:
            query = query / norm

        # Search more candidates if filtering
        search_k = min(top_k * 10 if filter_doc_ids else top_k * 3, self.index.ntotal)
        scores, indices = self.index.search(query, search_k)

        results = []
        seen_doc_ids = set()

        for score, idx in zip(scores[0], indices[0]):
            if idx == -1:
                continue

            doc_id = self.id_map.get(idx)
            if not doc_id:
                continue

            if filter_doc_ids and doc_id not in filter_doc_ids:
                continue

            if doc_id in seen_doc_ids:
                continue
            seen_doc_ids.add(doc_id)

            meta = self.metadata_map.get(doc_id, {})
            results.append({
                "doc_id": doc_id,
                "score": float(score),
                "metadata": meta,
            })

            if len(results) >= top_k:
                break

        return results

    async def delete_document(self, doc_id: str):
        """Remove a document from the index (marks as deleted)."""
        async with self._lock:
            if doc_id in self.metadata_map:
                del self.metadata_map[doc_id]
                # Remove from id_map
                self.id_map = {k: v for k, v in self.id_map.items() if v != doc_id}
                self._save()
                logger.info("Document deleted from FAISS", doc_id=doc_id)

    def get_stats(self) -> dict:
        return {
            "total_vectors": self.index.ntotal if self.index else 0,
            "total_documents": len(self.metadata_map),
            "dimension": self.dimension,
        }


# Global singleton
_vector_store: Optional[VectorStore] = None


def get_vector_store() -> VectorStore:
    global _vector_store
    if _vector_store is None:
        from app.config import settings
        _vector_store = VectorStore(
            index_path=settings.faiss_index_path,
            dimension=settings.embedding_dimension,
        )
    return _vector_store
