# Intelligent Candidate Discovery Platform
### Track 01 &mdash; "The Data & AI Challenge" &bull; India Runs Hackathon by Redrob AI

An enterprise-grade, privacy-preserving, AI-driven full-stack recruitment solution engineered to streamline talent matching, screening, and sourcing. Moving far beyond traditional, rigid keyword-matching heuristics, this platform employs a hybrid mathematical formula powered by dense vector embeddings (FAISS), custom multi-criteria regression algorithms, and generative AI (Gemini 3.5 Flash) to assess, rank, and explain candidate suitability contextually.

---

## 🎨 Design & Craftsmanship Approach

The application is built around the **Midnight Titanium & Dark Slate Theme**—a sophisticated, eye-safe dark mode aesthetic optimized for long recruiting sessions. It features:
*   **Customizable Theme Accent Colors**: Recruiters can dynamically toggle the primary accent color from the user settings (swapping between Emerald, Sapphire Blue, Amethyst Purple, Amber Gold, or Ruby Rose) which dynamically updates the visual interface.
*   **Pristine Typography Pairing**: Displays headlines in **Space Grotesk** for a modern, tech-forward voice, paired with **Inter** for crisp UI copy, and **JetBrains Mono** for layout metrics, similarity weights, and code/data attributes.
*   **Aesthetic Micro-Interactions**: Features elegant state transitions and candidate stage-change animations for list sorting and pipeline shifts.

---

## 🚀 Key Features

### A. Candidate Workspace (The Talent Hub)
1.  **Multi-Format Resume Uploader**: Standard Drag-and-Drop or direct browser file selection for `.pdf`, `.docx`, and `.txt` documents.
2.  **Semantic Extractor & Refiner**: Live parsed resume text layout with a responsive editing form allowing candidates to verify and adjust their core technical skills and metadata before submission.
3.  **Active Progress Timeline**: A visual horizontal tracker displaying the candidate's exact state in the recruitment pipeline (Applied, Shortlisted, Interview, Offered, Rejected).
4.  **Feedback & Gap Analysis**: Dynamic recommendations pinpointing missing prerequisite skills compared to active job listings with actionable advice on bridging those gaps.

### B. Recruiter Workspace (Decision Control Suite)
1.  **FAISS Semantic Match Feed**: Real-time rank ordering of candidates matching the active job description using our custom weighted ranking engine.
2.  **Interactive Skill Match Highlight Layer**: An overlay that highlights, underlines, and groups technical skills directly in the candidate's resume text that match the selected job's "Must-Have" requirements.
3.  **Interactive Candidate Scorecard**: Visual representation of skills vs. requirements, behavioral ratings, and experience tenure comparisons.
4.  **In-Browser Document Previewer**: Instant inline previewing of candidates' transcripts and quick note logs.
5.  **Multi-Candidate Comparison Panel**: Select up to 3 candidates for a dense, side-by-side technical, academic, and behavioral matrix comparison.
6.  **Pipeline Analytics Dashboard**: Actionable visualizations monitoring application flows, average Days-To-Hire, conversion rates, and skill distribution charts.
7.  **Flag for Review Bookmark**: Toggles a high-priority flagged state on candidate cards to quickly bookmark profiles for deeper review.

### C. Advanced Recruiter Operations & Automation
1.  **PDF Summary Profile Export**: Generates and downloads a clean, publication-quality professional summary PDF sheet of any candidate's resume text, evaluation logs, and feedback history.
2.  **Skill Verification Assessment Links**: Allows recruiters to send automated, unique, encrypted assessment links to candidates to officially verify "Expert" skill claims through interactive code/concept quizzes.
3.  **Simulated LinkedIn Connection (OAuth)**: Allows recruiters to request professional data via a consent interface, importing verified profile bios, current positions, and skills.
4.  **Bulk Outbox Messaging & Batch Updates**: A rich bulk messaging screen allowing recruiters to broadcast status updates to multiple selected candidates with automated placeholder replacement (e.g., `{{candidate_name}}`, `{{job_title}}`).

---

## 🧠 Core Brain: The Matching Formula

The matching engine scores candidates contextually against Job Descriptions utilizing a precise **system weighted regression formula**:

$$\text{Final Score} = \left(0.50 \times \text{Semantic Similarity}\right) + \left(0.30 \times \text{Skill Overlap}\right) + \left(0.20 \times \text{Experience Alignment}\right)$$

1.  **Semantic Similarity (50% Weight)**: Evaluated contextually via local FAISS dense embedding queries or server-side Gemini. It assesses overall domain alignment, core skill mastery, and deep functional credentials.
2.  **Skill Overlap Score (30% Weight)**: Represents the strict mathematical intersection of candidate assets and job criteria:
    $$\text{Skill Match} = \frac{|\text{Candidate Skills} \cap \text{Required Skills}|}{|\text{Required Skills}|}$$
3.  **Experience Alignment (20% Weight)**: Penalizes experience deficits relative to the target role requirements:
    *   If $\text{Candidate Exp} \ge \text{Required Exp} \implies 1.0\ (100\%)$
    *   Otherwise $\implies \frac{\text{Candidate Exp}}{\text{Required Exp}}$

---

## 📦 System Architecture

```
                                  +-----------------------+
                                  |   REACT 18 FRONTEND   |
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

---

## 🛠️ Installation & Running Locally

The repository is built for parallel development. The Express server acts as a reverse proxy, checking for the presence of the Python ML server on port 8000. If offline, the Express server switches dynamically and gracefully to its built-in Node.js heuristics and server-side Gemini APIs.

### A. Python ML Server Setup (Optional, Port 8000)
1.  Navigate to the `/backend` directory:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
    *Note for Apple Silicon (M1/M2/M3) or Windows ARM*: If `faiss-cpu` compilation encounters native platform errors, install the precompiled wheels:
    ```bash
    pip install faiss-cpu-no-mkl
    ```
3.  Run the FastAPI application:
    ```bash
    python main.py
    ```
    The FastAPI swagger documentation is served on `http://localhost:8000/docs`.

### B. Fullstack Express & Vite Setup (Primary, Port 3000)
1.  From the project root, install Node dependencies:
    ```bash
    npm install
    ```
2.  Ensure you configure your `.env` file with your Gemini API Key:
    ```env
    # .env
    GEMINI_API_KEY=your_gemini_api_key_here
    ```
3.  Boot up the development environment:
    ```bash
    npm run dev
    ```
    Open `http://localhost:3000` to preview the fully functional application!

---

## 📄 Key API Routes Reference

### Candidate endpoints (`/api/candidates/*`)
*   `POST /api/candidates` - Upload/register a new candidate profile.
*   `POST /api/candidates/bulk-update` - Execute stage updates, rejections, or email alerts to multiple selected records.
*   `POST /api/candidates/verify-skill/request` - Triggers an automated skills assessment challenge link.
*   `POST /api/candidates/verify-skill/submit` - Evaluates quiz scores and upgrades verified skills to "Expert" status.

### Job Endpoints (`/api/jobs/*`)
*   `GET /api/jobs` - Retrieves active job listings.
*   `POST /api/jobs/parse` - Leverages Gemini structure engines to convert unstructured texts into standard job roles.
*   `POST /api/jobs/generate-description` - Drafts rich, structured, professional descriptions using Gemini.
*   `POST /api/match-rationale` - Evaluates deep semantic, tool-level, and cultural alignments, providing text rationales.

---

### Challenge Submission Footnote
Developed as a workable Proof-of-Concept demonstrating predictive candidate discoveries for **The Data & AI Challenge - India Runs hackathon by Redrob AI**.
