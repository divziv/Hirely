import re
import numpy as np

# Try-except blocks for optional dependency loading with robust fallbacks
try:
    import faiss
    HAS_FAISS = True
except ImportError:
    HAS_FAISS = False

try:
    from sentence_transformers import SentenceTransformer
    HAS_SENTENCE_TRANSFORMERS = True
except ImportError:
    HAS_SENTENCE_TRANSFORMERS = False

# Lazy-loaded global ranker singleton
_global_ranker = None

class Ranker:
    """
    Ranker class initializes sentence-transformers/all-MiniLM-L6-v2,
    creates or manages a FAISS index, and encodes text fields to
    evaluate similarities contextually using exact Cosine Similarity distance.
    """
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model_name = model_name
        self.model = None
        if HAS_SENTENCE_TRANSFORMERS:
            try:
                # Load the space-saving and highly accurate all-MiniLM-L6-v2 model
                self.model = SentenceTransformer(self.model_name)
            except Exception as e:
                print(f"Error loading SentenceTransformer '{self.model_name}' inside Ranker constructor: {e}")

    def encode_texts(self, texts: list) -> np.ndarray:
        """Helper to create dense embeddings for a list of string entries."""
        if not self.model:
            raise RuntimeError("SentenceTransformer engine is inactive/unloaded on this server instance.")
        embeddings = self.model.encode(texts, show_progress_bar=False)
        return np.array(embeddings, dtype=np.float32)

    def rank_candidates(self, job_desc_text: str, candidate_texts: list) -> list:
        """
        Creates a dynamic FAISS index, encodes candidate resumes and job descriptions,
        and returns semantic similarity scores based on exact cosine distance calculation.
        """
        if not candidate_texts:
            return []

        if not self.model:
            # Secure, elegant word overlap matching fallback
            return self._lexical_fallback(job_desc_text, candidate_texts)

        try:
            # 1. Generate text embeddings
            jd_embedding = self.encode_texts([job_desc_text])
            candidate_embeddings = self.encode_texts(candidate_texts)

            # L2 Normalize for computing true Cosine Similarity via Inner Product Matrix operations
            jd_norm = jd_embedding / np.linalg.norm(jd_embedding, axis=1, keepdims=True)
            candidate_norms = candidate_embeddings / np.linalg.norm(candidate_embeddings, axis=1, keepdims=True)

            scores = []
            if HAS_FAISS:
                # 2. Build local memory-level FAISS Index Flat Inner Product
                dimension = jd_norm.shape[1]
                index = faiss.IndexFlatIP(dimension)
                index.add(candidate_norms)

                # Search candidate vectors matching Job Description
                k = len(candidate_texts)
                similarities, indices = index.search(jd_norm, k)

                # Coordinates dictionary map matching original indexes
                similarities = similarities[0]
                indices = indices[0]
                pos_to_score = {int(idx): float(sim) for idx, sim in zip(indices, similarities)}

                for i in range(len(candidate_texts)):
                    raw_cosine = pos_to_score.get(i, 0.5)
                    # Rescale [-1, 1] cosine range to standard [0, 1] percentage scores
                    scaled_score = max(0.0, min(1.0, (raw_cosine + 1.0) / 2.0))
                    scores.append(scaled_score)
            else:
                # Dot-product exact matrix algebra representation fallback
                matrix_sim = np.dot(candidate_norms, jd_norm.T)
                for i in range(len(candidate_texts)):
                    raw_cosine = float(matrix_sim[i][0])
                    scaled_score = max(0.0, min(1.0, (raw_cosine + 1.0) / 2.0))
                    scores.append(scaled_score)

            return scores

        except Exception as e:
            print(f"Exception raised in Ranker.rank_candidates pipeline: {e}. Executing fallback matcher.")
            return self._lexical_fallback(job_desc_text, candidate_texts)

    def _lexical_fallback(self, job_desc_text: str, candidate_texts: list) -> list:
        scores = []
        jd_tokens = set(re.findall(r"\w+", job_desc_text.lower()))
        for cand_t in candidate_texts:
            cand_tokens = set(re.findall(r"\w+", cand_t.lower()))
            intersection = jd_tokens.intersection(cand_tokens)
            overlap_score = len(intersection) / max(len(jd_tokens), 1)
            scores.append(min(0.95, 0.4 + (overlap_score * 0.6)))
        return scores


def get_ranker_instance() -> Ranker:
    """Lazy retrieves global Ranker instance as singleton."""
    global _global_ranker
    if _global_ranker is None:
        _global_ranker = Ranker()
    return _global_ranker


def calculate_cosine_similarity(job_desc_text: str, candidate_texts: list) -> list:
    """
    Maintains full backward compatibility with the main FastAPI controller
    delegating computations to get_ranker_instance().
    """
    ranker = get_ranker_instance()
    return ranker.rank_candidates(job_desc_text, candidate_texts)
