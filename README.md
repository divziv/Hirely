# Intelligent Candidate Discovery Platform
### Track 01 &mdash; "The Data & AI Challenge" &bull; India Runs Hackathon by Redrob AI

An AI-driven, privacy-preserving, full-stack recruitment solution designed to help recruitment teams screen, match, and discover the best talent. Rather than simple keyword checking, this system parses resumes contextually, generates semantic suitability alignments using dense vector embeddings (FAISS), executes custom regression algorithms, and provides recruiter-friendly explanations.

---

## 🎨 Design & Craftsmanship Approach

The platform features a **Midnight Titanium Theme** constructed with a high-contrast dark layout, premium typography pairing (**Space Grotesk** for display headers, **Inter** for clean UI, and **JetBrains Mono** for tracking statistics/metrics), and a generous layout spacing that avoids over-engineering.

*   **No Dummy/MOCKED APIS:** Every feature is live, backed by real Node.js/Express controllers and interactive `fetch` communication.
*   **Dual-Backend Power:** Utilizes a stateful Express full-stack layer on Port 3000 coupled with an optional local Python FastAPI microservice on Port 8000 for advanced Machine Learning operations.
*   **Multimodal Resume Processing:** Automatically parses raw documents using either native Python-based PyMuPDF extraction heuristics or server-side Gemini (`gemini-3.5-flash`) multimodal content generation depending on your server configuration.

---

## 🚀 Key Features

### A. Candidate Workspace (The Talent Hub)
1.  **Multi-Format Resume Uploader:** Supports standard Drag-and-Drop or direct file searches for `.pdf`, `.docx`, and `.txt` files.
2.  **Semantic Extractor & Manual Fallback:** Displays parsed profiles immediately upon upload, allowing candidates to refine extracted technologies via a responsive editor form.
3.  **Hiring Progress Stepper:** Track application progress transparently from applied, sorted, interviewed, up to placement offers on a linear timeline.
4.  **Feedback & Skill-gap Analysis:** Direct suggestions outlining exactly which core job prerequisites are missing, complete with guidelines on bridging them.

### B. Recruiter Workspace (Decision Control)
1.  **FAISS Semantic Ranking Feed:** Ranks applicants on-the-fly when viewing job roles, highlighting matching scores calculated using the hackathon's required hybrid formula.
2.  **In-Browser Document PDF Viewer:** Recruiter screens resumes with real-time extracted text highlighting matched skills.
3.  **Local Vector Matching:** High-speed similarity scoring computed using local NLP models without sending raw data to external servers.
4.  **Centralised Stage Controller & Private Loggers:** Move candidates securely through pipeline phases with single clicks, adjust scoring sliders, and log recruiter notes.
5.  **Interactive Candidate Comparison Panel:** Select up to 3 candidates to compare side-by-side on technical skills, academics, experience, and behavioral alignment.
6.  **Pipeline Analytics Dashboard:** Features metric indicators for Candidate Counts, Days-To-Hires, and Tailwind-designed charts for Pipeline distribution and Technology occurrences.

---

## 🧠 Core Brain: The Matching Formula

The ranking matching engine scores candidates relative to Job Descriptions using the **system weighted formula**:

$$\text{Final Score} = \left(0.5 \times \text{Semantic Similarity}\right) + \left(0.3 \times \text{Skill Overlap}\right) + \left(0.2 \times \text{Experience Alignment}\right)$$

1.  **Semantic Similarity ($50\%$ Weight):** Evaluated contextually via local FAISS dense embedding search or server-side Gemini. It assesses overall domain alignment, core skill mastery, and deep functional credentials (not just mechanical word count).
2.  **Skill Match Score ($30\%$ Weight):** Evaluates the direct mathematical intersection count:
    $$\text{Skill Match} = \frac{|\text{Candidate Skills} \cap \text{Required Skills}|}{|\text{Required Skills}|}$$
3.  **Experience Alignment ($20\%$ Weight):** Penalizes candidates who do not meet minimum requirements:
    *   If $\text{Candidate Exp} \ge \text{Required Exp} \implies 1.0\ (100\%)$
    *   Otherwise $\implies \frac{\text{Candidate Exp}}{\text{Required Exp}}$

---

## 📦 System Architecture

```
                                  +-----------------------+
                                  |   REACT 19 FRONTEND   |
                                  | (Vite SPA - Port 3000)|
                                  +-----------+-----------+
                                              |
                                     Fetch/JSON Payloads
                                              |
                                              v
                                  +-----------------------+
                                  | EXPRESS FULL-STACK    |
                                  |  (Server - Port 3000) |
                                  +-----------+-----------+
                                              |
                             Is Python FastAPI Alive? (Port 8000)
                                              |
                     +------------------------+------------------------+
                     | Yes                                             | No (Fallback Loop)
                     v                                                 v
        +----------------------------+                   +----------------------------+
        |   FASTAPI ML SERVER        |                   | NATIVE EXPRESS ML ROOT     |
        |        (Port 8000)         |                   |  - Regex Heuristics        |
        |                            |                   |  - Gemini AI Parser API    |
        |  - PyMuPDF Resume Parser   |                   |  - Lexical Jaccard Cosine  |
        |  - Sentence-Transformers   |                   +----------------------------+
        |  - FAISS Vector Indexes    |
        +----------------------------+
```

### Components Breakdown:
1.  **React 19 Frontend**: Elegant user interface driven by Tailwind CSS and Lucide Icons, featuring the Candidate Hub (file drag-and-drop system, profile optimizer) and Recruiter Control Panels (FAISS dashboard, analytics widgets).
2.  **Express Backend Gateway**: Serves the React bundle in production, contains our lightweight SQLite-style custom JSON cache, and dynamically coordinates incoming jobs/candidates requests.
3.  **FastAPI Python ML Server**: A stateless, highly responsive microservice that provides native Python solutions for parsing files and computing semantic vector alignments offline.

---

## 🛠️ Python Backend Directory Structure & Modules

The python backend is cleanly organized to ensure high modularity, readability, and ease of maintainability.

```
backend/
├── main.py                   # FastAPI main entry point & controller routes
├── requirements.txt          # Python dependencies manifest
├── ai/
│   └── ranker.py             # FAISS indexing & Sentence-Transformers matching
└── parsers/
    └── resume_parser.py      # PyMuPDF parser & JSON structurizer utilities
```

### 1. `backend/ai/ranker.py`
This module acts as the semantic core.
*   **Model Load**: Initializes the `sentence-transformers/all-MiniLM-L6-v2` dense mapping model as a thread-safe singleton.
*   **Vector Engine**: Loads / constructs memory-level dynamic FAISS indexes (`faiss.IndexFlatIP` on normalized vectors) to measure exact Cosine Similarity vectors.
*   **Similarity calculation**: Generates normalized embedding arrays from job descriptions and candidate logs, evaluating exact matching vectors with elegant lexical fallback pipelines.

### 2. `backend/parsers/resume_parser.py`
This module powers file extraction.
*   **Text Extraction**: Employs **PyMuPDF (`fitz`)** to process binary PDF data streams directly to plain-text strings, ensuring 100% privacy and lightning speed.
*   **Heuristics Structuring**: Applies regular expressions and cognitive patterns to categorize unformatted resume texts directly into pristine Candidate Profile schemas matching frontend targets (parsing e-mails, credentials, years of experience, courses, projects, and former roles).

---

## 🛠️ Python Backend Installation & Verification

The embedding engine utilizes **Sentence-Transformers** for dense representation creation and **FAISS (Facebook AI Similarity Search)** for hyper-fast vector tracking on the CPU.

### 1. Requirements & System Dependencies
Make sure you have `Python 3.9+` and `pip` installed on your host system.

On Linux/Ubuntu systems, install common build essentials:
```bash
sudo apt-get update && sudo apt-get install -y build-essential python3-dev
```

### 2. Install Python Dependencies
Navigate to the `/backend` directory and install target libraries:
```bash
cd backend
pip install -r requirements.txt
```

*Note on FAISS Compatibility*: 
We specify `faiss-cpu` inside `requirements.txt`. If you are developing on Apple Silicon (M1/M2/M3) or Windows ARM systems, you can install the universal wheel alternatively:
```bash
pip install faiss-cpu-no-mkl
```

---

## ⚡ Running the Applications

To run the complete platform, start both servers in parallel:

### Step A: Boot the Python FastAPI Microservice (Port 8000)
```bash
cd backend
python main.py
# or command line alternative:
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

You can verify the FastAPI setup is online by opening your browser to `http://localhost:8000/`. You should receive a healthy system status JSON payload showing `pyMuPdfLoaded: true`, `faissLoaded: true`, and `sentenceTransformersLoaded: true`.

The built-in Swagger interactive documentation is accessible at `http://localhost:8000/docs`.

### Step B: Boot the Express & Vite Full-Stack Workspace (Port 3000)
Open a new terminal shell in the project root:
```bash
# Install NPM modules
npm install

# Run Vite development server & Express proxy
npm run dev
```

*Pro-tip on API routing*: The Express server automatically scans for the FastAPI service on boot or runtime request events. If a process is detected on Port 8000, all Resume Parser actions (PyMuPDF) and Candidate shortlisting requests (Sentence-Transformers and FAISS) are dynamically delegated to the Python backend. If the Python process is closed, the system reverts instantly and gracefully to its built-in Node and Gemini API fallbacks, ensuring 100% uptime and testability.

*Static Pages / GitHub Pages Build*:
To build the static frontend directly to the project root directory enabling instant serverless hosting or GitHub Pages integration, run:
```bash
npm run build:gh-pages
# or
npm run build:frontend
```
This compilation outputs all assets directly inside the root workspace directory while securely keeping all project source code, configuration files, and Python microservices clean and unmodified.

---

## 🧠 Setup Details for the Local Embedding Engine

When the FastAPI server starts, the system automatically initializes the **local embedding engine**:

1.  **Model Loading**: It downloads and caches the **Hugging Face `all-MiniLM-L6-v2`** model. This is a lightweight (384-dimensional) SentenceTransformer model optimized for high semantic-search accuracy.
2.  **Caching**: The model parameters are local, cached inside your system directory (by default under `~/.cache/torch/sentence_transformers/`). Subsequent boots are instantaneous.
3.  **FAISS Seeding**: 
    - When a candidate listing is queried for relevance against a job opening, the FastAPI backend joins the candidate's skills, experience, and full parsed resume text to construct candidate text layers.
    - It computes dense feature vectors for the job opening and each candidate.
    - A **`faiss.IndexFlatIP`** (Inner Product index) is initialized on the CPU. Because our vectors are automatically normalized, calculating the inner product yields the exact mathematical **Cosine Similarity coefficient**.
    - Candidate vectors are injected into our FAISS index, and queried with the Job Description vector. FAISS performs vector similarity mapping and returns ranked indexes contextually.

---

## 📄 Resume Parser with PyMuPDF

Our python module features a custom script incorporating **PyMuPDF (`fitz`)**, which provides an incredibly robust, zero-telemetry resume processing pipeline:

1.  **Text Extraction (`extract_text_from_pdf_data`)**: Parses binary vector PDF files. It loops through all pages and aggregates raw positional text without external cloud dependency.
2.  **JSON Structurizer (`convert_text_to_structured_json`)**: Converts unstructured plain text into our uniform structured candidate schema via regex matrices and NLP heuristics:
    - **Email Matching**: Detects active email routes via `[\w\.-]+@[\w\.-]+\.\w+`.
    - **Name Finder**: Identifies candidate identity headers by scanning early paragraphs, excluding standard format markers.
    - **Skills Harvesting**: Audits text layers against a dictionary pool of 30+ core languages, frameworks, and database engines.
    - **Aeronautical Experience Metrics**: Gathers numeric quantities related to years of enterprise history.
    - **Education & Projects Partitioning**: Splits and cleans academic records, keeping files formatted.

---

### Challenge Submission Footnote
Developed as a workable Proof-of-Concept demonstrating predictive candidate discoveries for **The Data & AI Challenge - India Runs hackathon by Redrob AI**.
