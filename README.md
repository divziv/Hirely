# Intelligent Candidate Discovery Platform

### Track 01 &mdash; "The Data & AI Challenge" &bull; India Runs Hackathon by Redrob AI

---

## 🎯 The Problem Statement
> **"Recruiters go through hundreds of profiles and still often miss the right person. Not because the talent isn't there — but because keyword filters can't see what actually matters."**

Traditional Applicant Tracking Systems (ATS) rely on basic keyword frequency matching. A candidate who writes "React.js" ten times gets ranked higher than an expert who describes architecting a state-management engine in a single elegant line. Keyword filters miss core domain familiarity, structural achievements, self-starter signs, and potential fit.

This platform represents a complete paradigm shift. It is an **AI-powered Recruiter Assistant** that ranks candidates the way a highly experienced headhunter would: not by scanning for matching letters, but by **deeply understanding career trajectory, skill proficiency thresholds, behavioral indicators, and holistic role fit.**

---

## 🎨 Design & Craftsmanship Approach

The system is styled under the **Midnight Titanium & Dark Slate Theme**—an ultra-modern, professional, eye-safe console dashboard engineered to look premium during extended recruiting operations.
- **Dynamic Theme Accent Colors**: Swaps accents dynamically (Emerald, Sapphire Blue, Amethyst Purple, Amber Gold, or Ruby Rose) instantly updating the UI.
- **Pristine Typography**: Headlines are set in **Space Grotesk** (display font), paired with **Inter** for clean UI copy, and **JetBrains Mono** for layout metrics, similarity scores, and data structures.
- **Micro-Interactions**: Custom state transitions, drag-and-drop feedback states, and fluid candidate pipeline animations make recruitment highly tactile.

---

## 🚀 Key Platform Features

### 1. Unified Recruiter Dashboard & Flow Control
The recruiter workspace offers three distinct views to streamline operations:
*   **Active Applicants Ranking**: Sorts candidates using our hybrid regression matching formula, presenting the best matches instantly with interactive similarity highlights.
*   **Interactive Kanban Pipeline Board**: Allows recruiters to intuitively visualize candidate stages. Supports full drag-and-drop to move candidates between stages (`Applied`, `Shortlisted`, `Interview`, `Offer`, `Rejected`).
*   **Passive Talent Sourcing**: Leverages the Gemini API to search offline databases, cold-sourcing matched profiles with personalized auto-drafted outreach.

### 2. Side-by-Side Comparison & Radar Chart Visualization
Recruiters can select any two candidates to view parallel comparisons:
*   **Recharts Radar Charts**: Visually maps both candidates' verified skill proficiencies side-by-side against the ideal role's baseline requirements.
*   **Technical & Academic Overlap**: Displays common skills, distinct strengths, and educational backgrounds.
*   **Comparative Resume Texts**: Directly highlights overlapping required skills in both resumes side-by-side.

### 3. AI-Powered Interview Preparation
*   **Structured Agenda Generator**: Generates candidate-tailored behavioral and technical interview questions based on their resume gaps and the job description.
*   **Save & Persist Notes**: Instantly appends the generated agenda and target indicators directly to the candidate's private recruiter notes for long-term database storage.

### 4. Interactive Document Viewer & Blind Screening Mode
*   **Blind Masking Toggle**: Instantly redacts names, email addresses, and locations to enforce unbiased, purely credential-based cognitive evaluations.
*   **Dynamic Highlighting**: Automatically parses, underlines, and groups technical matches within candidate resumes matching "Must-Have" requirements.

### 5. Multi-Format XLSX Export
*   **Shortlist Ranking Exporter**: Generates a professional XLSX spreadsheet of the ranked candidates, matching scores, and contact information with a single click.

---

## 🧠 The Brain: Matching Methodology

The platform evaluates candidates using a **multiphase hybrid mathematical formula**:

$$\text{Final Match Score} = \left(0.50 \times \text{Semantic Similarity}\right) + \left(0.30 \times \text{Skill Overlap}\right) + \left(0.20 \times \text{Experience Alignment}\right)$$

### 1. Semantic Similarity (50% Weight)
Computed using dense vector embeddings (Sentence-Transformers/FAISS) or customized server-side Gemini semantic models. It analyzes underlying conceptual relationships instead of literal keywords (e.g., matching "Distributed Ledgers" to "Blockchain" or "Containerization" to "Kubernetes").

### 2. Skill Overlap Score (30% Weight)
Evaluates the mathematical subset intersection of a candidate's verified/claimed skills against the job's must-have criteria:

$$\text{Skill Match} = \frac{|\text{Candidate Skills} \cap \text{Required Skills}|}{|\text{Required Skills}|}$$

### 3. Experience Alignment (20% Weight)
Calculates a fractional experience match, penalizing tenure deficits without over-valuing surplus years:
*   If $\text{Candidate Exp} \ge \text{Required Exp} \implies 1.0\ (100\%)$
*   Otherwise $\implies \frac{\text{Candidate Exp}}{\text{Required Exp}}$

---

## 📦 System Architecture & Stack

```
                          +------------------------+
                          |   VITE REACT CLIENT    |
                          | (Space Grotesk & Inter)|
                          +-----------+------------+
                                      |
                             Fetch / JSON / CORS
                                      |
                                      v
                          +------------------------+
                          |   EXPRESS FULL-STACK   |
                          |  API Router & Server   |
                          +-----------+------------+
                                      |
                     Is Python FastAPI active on Port 8000?
                                      |
               +----------------------+----------------------+
               | Yes                                         | No (Hybrid Fallback)
               v                                             v
  +-------------------------+                   +-------------------------+
  |    FASTAPI ML SERVER    |                   |   NATIVE EXPRESS ENGIN  |
  | (PyMuPDF Parser, FAISS, |                   | - Node Lexical Regex    |
  |  Sentence-Embeddings)   |                   | - Gemini-3.5-Flash API  |
  +-------------------------+                   +-------------------------+
```

### Technologies Used:
*   **Frontend**: React 18, Vite, Tailwind CSS, Recharts (Radar Charts, Bar/Pie charts), Motion, Lucide Icons.
*   **Backend**: Node.js, Express.js (REST API, reverse proxy).
*   **AI Integration**: `@google/genai` (Gemini 3.5 Flash for Semantic Matching, Outreach, Job Description parsing, and Interview Agenda synthesis).
*   **Python AI Stack (Optional Fallback)**: FastAPI, PyMuPDF, Sentence-Transformers, FAISS Vector Stores.
*   **Data Handling**: In-Memory persistence mimicking enterprise DBs, with direct state updates and XLSX/PDF generators.

---

## ⚡ End-to-End Workflow

1.  **Job Posting**: A recruiter publishes or parses a raw JD text using Gemini to build a structured set of must-have skills, role descriptions, and experience baseline thresholds.
2.  **Candidate Submission**: Candidates drag-and-drop their resume. The system extracts texts, lists technical claims, identifies skill proficiencies (Expert/Intermediate/Beginner), and places them in the "Applied" pipeline stage.
3.  **Real-Time Semantic Evaluation**: The candidate is automatically mapped against active job positions, outputting a precise Match Score with clear text matching rationales.
4.  **Inter-Stage Promotion (Kanban)**: Recruiters scan rankings, toggling **Blind Mode** to prevent bias, and drag matched cards into "Shortlisted" or "Interview" on the pipeline board.
5.  **Multi-Candidate Comparison**: Recruiters select top candidates for a side-by-side comparison, analyzing overlap distributions on the Radar Chart.
6.  **AI-Powered Prep & Outreach**: Recruiter generates custom Interview Agendas, saves them to candidate Notes, drafts personalized outreach emails, and triggers simulated email notifications.
7.  **Data Export**: Recruiter exports the final ranked shortlisted sheet to an XLSX file for external hiring alignment.

---

## 🛠️ Getting Started Locally

### 1. Installation
From the project root, install Node dependencies:
```bash
npm install
```

### 2. Environment Variables
Configure your `.env` file at the root:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Run Development Server
Start the full-stack server on port 3000:
```bash
npm run dev
```
Open `http://localhost:3000` in your web browser.

---

*Intelligent Candidate Discovery Platform &bull; Track 01 &mdash; India Runs Hackathon by Redrob AI*
