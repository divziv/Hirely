# Intelligent Candidate Discovery Platform
### Track 01 &mdash; "The Data & AI Challenge" &bull; India Runs Hackathon by Redrob AI

An AI-driven, privacy-preserving, full-stack recruitment solution designed to help recruitment teams screen, match, and Discover the best talent. Rather than simple keyword checking, this system parses resumes contextually, generates semantic suitability alignments using Gemini, performs deterministic weighted index scores, and provides recruiter-friendly explanations.

---

## 🎨 Design & Craftsmanship Approach

The platform features a **Midnight Titanium Theme** constructed with a high-contrast dark layout, premium typography pairing (**Space Grotesk** for display headers, **Inter** for clean UI, and **JetBrains Mono** for tracking statistics/metrics), and a generous layout spacing that avoids over-engineering.

*   **No Dummy/MOCKED APIS:** Every feature is live, backed by real Node.js/Express controllers and interactive `fetch` communication.
*   **Multimodal Resume Processing:** Utilizes Gemini (`gemini-3.5-flash`) on the server to read uploaded PDF, TXT, or DOCX documents to extract structured skills, projects, and history natively with high accuracy.
*   **Dual-role Personalization:** Swappable authentication interface to test both Candidate Hub uploads and Recruiter pipeline assessments back-to-back.

---

## 🚀 Key Corporate Features

### A. Candidate Workspace (The Talent Hub)
1.  **Multi-Format Resume Uploader:** Supports standard Drag-and-Drop or direct file searches for `.pdf`, `.docx`, and `.txt` files up to 12MB.
2.  **Semantic Extractor & Manual Fallback:** Displays parsed profiles immediately upon upload, allowing candidates to refine extracted technologies via a responsive editor form.
3.  **Hiring Progress Stepper:** Track application progress transparently from applied, sorted, interviewed, up to placement offers on a linear timeline.
4.  **Feedback & Skill-gap Analysis:** Direct suggestions outlining exactly which core job prerequisites are missing, complete with guidelines on bridging them.

### B. Recruiter Workspace (Decision Control)
1.  **Semantic Ranking Feed:** Ranks applicants on-the-fly when viewing job roles, highlighting matching scores calculated using the hackathon's required hybrid formula.
2.  **In-Browser Document Viewer:** Recruiter screens resumes without downloading. The reader highlights detected matching skills dynamically in green text.
3.  **AI Executive Justification:** Provides 2-3 sentence recruiter justifications explaining *why* candidates matched and doing detailed skill-gap analyses.
4.  **Centralised Stage Controller & Private Loggers:** Move candidates securely through pipeline phases with single clicks, adjust scoring sliders, and log recruiter notes.
5.  **Interactive Candidate Comparison Panel:** Select up to 3 candidates to compare side-by-side on technical skills, academics, experience, and behavioral alignment.
6.  **Pipeline Analytics Dashboard:** Features metric indicators for Candidate Counts, Days-To-Hire metrics, and Tailwind-designed charts for Pipeline distribution and Technology occurrences.

---

## 🧠 Core Brain: The Matching Formula

The ranking matching engine scores candidates relative to Job Descriptions using the **system weighted formula**:

$$\text{Final Score} = \left(0.5 \times \text{Semantic Similarity}\right) + \left(0.3 \times \text{Skill Overlap}\right) + \left(0.2 \times \text{Experience Alignment}\right)$$

1.  **Semantic Similarity ($50\%$ Weight):** Evaluated contextually via server-side Gemini. It assesses overall domain alignment, core skill mastery, and deep functional credentials (not just mechanical word count). Fallback is structured using a TF-IDF multi-token Jaccard index similarity logic.
2.  **Skill Match Score ($30\%$ Weight):** Evaluates the direct mathematical intersection count:
    $$\text{Skill Match} = \frac{|\text{Candidate Skills} \cap \text{Required Skills}|}{|\text{Required Skills}|}$$
3.  **Experience Alignment ($20\%$ Weight):** Penalizes candidates who do not meet minimum requirements:
    *   If $\text{Candidate Exp} \ge \text{Repo Required Exp} \implies 1.0\ (100\%)$
    *   Otherwise $\implies \frac{\text{Candidate Exp}}{\text{Required Exp}}$

---

## 📦 System Architecture

```
                       [ REACT 19 FRONTEND ]
                                |
             (JSON / Base64 Document Payloads via Fetch)
                                |
                                v
                   [ EXPRESS FULL-STACK PORT 3000 ]
                                |
         +----------------------+----------------------+
         |                      |                      |
         v                      v                      v
[ COGNITIVE STORAGE ]   [ EMBEDDING ENGINE ]   [ RESUME MULTIMODAL PARSER ]
  In-Memory Seed DB     Dual-Stage Matcher     Gemini / Regex Regex
  Jobs & Candidates     & Scoring Algorithm           Parser
```

---

## 🛠️ Codebase Structure

*   `/server.ts` — Full-stack Express.ts backend API, seeding DB of candidates/roles, regex fallback parser logic, and hybrid ranking algorithms.
*   `/src/App.tsx` — Root React controller and data fetch manager.
*   `/src/types.ts` — Unified TypeScript interfaces for candidates, openings, and pipeline indicators.
*   `/src/components/RecruiterDashboard.tsx` — Recruiter views: filters, JDs list, interactive PDF reader, pipeline updates, and comparison metrics.
*   `/src/components/CandidateDashboard.tsx` — Candidate views: dashboard summary, file uploader, manual fallback profile editor, and feedback panels.
*   `/src/components/AuthPanel.tsx` — Account selection gateway.
*   `/src/components/AnalyticsPanel.tsx` — Dashboard metrics showing pipeline stage distribution and top technologies, designed using CSS and Tailwind.

---

## ⚡ Deployment & Running

### Requirements
*   `Node.js` v18+ configured.
*   An active `GEMINI_API_KEY` loaded as a system secret or local environment variable to run semantic analysis (a regex parsing fallback is active if the key is missing).

### commands
```bash
# Install base packages
npm install

# Run full-stack developmental workspace
npm run dev

# Bundle React SPA assets & compile Server utilizing esbuild
npm run build

# Boot compiled bundle in production
npm run start
```

---

### Challenge Submission Footnote
Developed as a workable Proof-of-Concept demonstrating predictive candidate discoveries for **The Data & AI Challenge - India Runs hackathon by Redrob AI**.
