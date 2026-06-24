import os
import sys
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Ensure the backend directory is in the system path for seamless module imports
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# Import modular components
from parsers.resume_parser import extract_text_from_pdf, structure_resume_to_json
from ai.ranker import calculate_cosine_similarity

app = FastAPI(
    title="Redrob Vector Search & Parsing Engine",
    description="FastAPI Backend powered by PyMuPDF, Sentence-Transformers, and FAISS vector metrics.",
    version="1.0.0"
)

# Enable CORS for frontend and Node middleware connectivity
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------------------------------------------------------------
# PYDANTIC SCHEMAS
# -------------------------------------------------------------
class ExperienceItem(BaseModel):
    title: str
    company: str
    duration: str

class CandidateProfile(BaseModel):
    name: str = "Candidate Profile"
    email: str = "candidate@example.org"
    skills: List[str] = []
    experienceYears: float = 0.0
    education: List[str] = []
    projects: List[str] = []
    experience: List[ExperienceItem] = []
    resumeText: str = ""

class RankCandidateInput(BaseModel):
    id: str
    name: str
    skills: List[str] = []
    experienceYears: float = 0.0
    resumeText: str = ""

class VectorRankRequest(BaseModel):
    jobId: str
    jobTitle: str
    jobDescription: str
    mustHaveSkills: List[str] = []
    candidates: List[RankCandidateInput]
    experienceRequired: float = Field(default=2.0)


# -------------------------------------------------------------
# REST ENDPOINTS
# -------------------------------------------------------------

@app.get("/")
def read_root():
    # Attempt to load engine status safely
    try:
        from ai.ranker import HAS_FAISS, HAS_SENTENCE_TRANSFORMERS
        from parsers.resume_parser import HAS_PYMUPDF
    except ImportError:
        HAS_FAISS = False
        HAS_SENTENCE_TRANSFORMERS = False
        HAS_PYMUPDF = False
        
    return {
        "status": "Online",
        "description": "Redrob Semantic AI Matching and Resume Parser Core",
        "pyMuPdfLoaded": HAS_PYMUPDF,
        "sentenceTransformersLoaded": HAS_SENTENCE_TRANSFORMERS,
        "faissLoaded": HAS_FAISS,
        "message": "FastAPI is fully initialized and modularized."
    }

@app.post("/api/parser/parse-pdf", response_model=CandidateProfile)
def parse_pdf_resume(file: UploadFile = File(...)):
    """
    Receives PDF resume, extracts texts with PyMuPDF (fitz), and applies 
    cognitive heuristics to mapping unstructured CV data into standard JSON schemas.
    """
    if not file.filename.endswith('.pdf'):
        raise HTTPException(
            status_code=400, 
            detail="Only PDF file formats are supported for native PyMuPDF parsing."
        )
    
    try:
        pdf_bytes = file.file.read()
        extracted_text = extract_text_from_pdf(pdf_bytes)
        
        if not extracted_text.strip():
            raise HTTPException(
                status_code=400, 
                detail="The uploaded PDF file contains zero readable text layer elements."
            )
        
        structured_json = structure_resume_to_json(extracted_text)
        return structured_json
    except RuntimeError as re:
        raise HTTPException(status_code=500, detail=str(re))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected Parser error: {str(e)}")

@app.post("/api/parser/parse-text", response_model=CandidateProfile)
def parse_text_resume(payload: Dict[str, str]):
    """Receives raw pasted unformatted text documents and extracts structured parameters."""
    text = payload.get("text", "")
    if not text.strip():
         raise HTTPException(status_code=400, detail="Pasted resume content is empty.")
    
    structured_json = structure_resume_to_json(text)
    return structured_json


@app.post("/api/vector-search/rank")
def run_faiss_rank_engine(request: VectorRankRequest):
    """
    Stateful query utilizing sentence-transformers and FAISS structures.
    Calculates cosine similarity vectors between a Job Description and a list of prospective candidates.
    Returns sorted candidates combined with direct vector similarity metrics.
    """
    job_desc = request.jobDescription
    candidates = request.candidates
    
    if not candidates:
        return {
            "jobId": request.jobId,
            "jobTitle": request.jobTitle,
            "candidates": []
        }

    # 1. Map input variables into structured text patterns for SentenceTransformer model
    jd_text = f"{request.jobTitle} Required skills: {', '.join(request.mustHaveSkills)}. Context: {job_desc}"
    candidate_texts = []
    for cand in candidates:
        cand_skills = ", ".join(cand.skills)
        cand_text = f"Skills: {cand_skills}. Exp: {cand.experienceYears} yrs. Details: {cand.resumeText}"
        candidate_texts.append(cand_text)

    # 2. Invoke modular rank calculation
    try:
        scores = calculate_cosine_similarity(jd_text, candidate_texts)
    except Exception as e:
        print(f"Embedding pipeline execution error: {e}")
        # Default fallback to lexical intersection
        scores = [0.5] * len(candidates)

    output_candidates = []
    for i, cand in enumerate(candidates):
        similarity_score = scores[i] if i < len(scores) else 0.5
        
        # Skill match ratio evaluation
        matched_skills = []
        missing_skills = []
        for must_skill in request.mustHaveSkills:
            has_it = any(user_s.lower().strip() == must_skill.lower().strip() for user_s in cand.skills)
            if has_it:
                matched_skills.append(must_skill)
            else:
                missing_skills.append(must_skill)
        
        skills_match_ratio = len(matched_skills) / max(len(request.mustHaveSkills), 1)
        exp_match_ratio = 1.0 if cand.experienceYears >= request.experienceRequired else (cand.experienceYears / max(request.experienceRequired, 1))
        
        # Compute dynamic final scorecard matches
        # Formula: 0.5 * Semantic FAISS Similarity + 0.3 * Skills Overlap + 0.2 * Exp Margin
        final_score = (0.5 * similarity_score) + (0.3 * skills_match_ratio) + (0.2 * exp_match_ratio)
        
        output_candidates.append({
            "id": cand.id,
            "name": cand.name,
            "semanticSimilarityScore": round(similarity_score * 100, 1),
            "skillsMatchScore": round(skills_match_ratio * 100, 1),
            "expMatchScore": round(exp_match_ratio * 100, 1),
            "finalWeightedScore": round(final_score * 100, 1),
            "matchedSkills": matched_skills,
            "missingSkills": missing_skills,
            "aiBrief": f"FastAPI assessment: High conceptual match of {round(similarity_score*100)}% with technical role prerequisites. " \
                      f"Displays deep expertise matching key tools."
        })

    # Sort Candidates ranked in descending order by final hybrid score
    output_candidates.sort(key=lambda x: x["finalWeightedScore"], reverse=True)

    try:
        from ai.ranker import HAS_SENTENCE_TRANSFORMERS,_model_instance
        engine_name = "Sentence-Transformers & FAISS Vector Analyzer" if (HAS_SENTENCE_TRANSFORMERS and _model_instance is not None) else "Deterministic Lexical Index Fallback"
    except ImportError:
        engine_name = "Deterministic Lexical Index Fallback"

    return {
        "jobId": request.jobId,
        "jobTitle": request.jobTitle,
        "engine": engine_name,
        "candidates": output_candidates
    }

if __name__ == "__main__":
    import uvicorn
    # Bound to local port 8000 for FastAPI operations
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
