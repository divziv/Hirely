import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Set up JSON parsers with generous limits for file binary uploads
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

// Setup Gemini SDK if API Key is present
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    console.log("System Status: AI Engine initialized successfully.");
  } catch (err) {
    console.warn("System Status: Error initializing Gemini AI SDK:", err);
  }
} else {
  console.log("System Status: GEMINI_API_KEY not found in environment. Fallbacks active.");
}

// ---------------------------------------------------------
// DATABASE / COGNITIVE TALENT STORAGE
// ---------------------------------------------------------
interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  experienceRequired: number;
  roleType: string;
  domain: string;
  description: string;
  mustHaveSkills: string[];
  niceToHaveSkills: string[];
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  skills: string[];
  experienceYears: number;
  education: string[];
  projects: string[];
  experience: Array<{
    title: string;
    company: string;
    duration: string;
  }>;
  resumeText: string;
  behavioralSignals: {
    ownership: number; // 1-5
    leadership: number; // 1-5
    collaboration: number; // 1-5
  };
  platformActivity?: {
    codingScore: number;
    profileCompleteness: number;
    responsivenessScore: number;
    hackathonRank?: number;
  };
  jobId: string; // Current applied job ID
  stage: string; // "Applied" | "Shortlisted" | "Interview" | "Offer" | "Rejected"
  interviewStage?: string; // "Screening" | "Technical" | "Behavioral" | "Final" | "None"
  recruiterNotes: string;
  recruiterFeedback: string;
  appliedDate: string;
  quickNotes?: Array<{
    id: string;
    text: string;
    timestamp: string;
    author: string;
  }>;
  scheduledInterview?: {
    slotId: string;
    date: string;
    time: string;
    recruiterName: string;
    status: 'Scheduled' | 'Confirmed' | 'Completed';
    meetingLink?: string;
  };
  isPriority?: boolean;
  salaryExpectation?: number;
  salaryOffer?: number | null;
  structuredFeedback?: {
    technicalProficiency: number;
    communication: number;
    culturalAlignment: number;
    problemSolving: number;
    overallRecommendation: 'Strong Hire' | 'Hire' | 'No Hire' | 'Strong No Hire';
    additionalNotes: string;
    submittedBy?: string;
    submittedAt?: string;
  };
  skillProgress?: Record<string, 'Expert' | 'Intermediate' | 'Missing'>;
  verificationRequests?: Array<{
    id: string;
    skillName: string;
    status: 'Pending' | 'Completed';
    assessmentLink: string;
    requestedAt: string;
    score?: number;
  }>;
  linkedInProfile?: {
    headline: string;
    summary: string;
    industry: string;
    pictureUrl?: string;
    connectedAt: string;
    publicProfileUrl: string;
  };
}

// Recruiter Availability Data Seed
let RECRUITER_AVAILABILITY = [
  { id: "slot-1", date: "2026-06-25", time: "10:00 AM", booked: false, bookedBy: null as string | null },
  { id: "slot-2", date: "2026-06-25", time: "11:30 AM", booked: false, bookedBy: null as string | null },
  { id: "slot-3", date: "2026-06-25", time: "02:00 PM", booked: false, bookedBy: null as string | null },
  { id: "slot-4", date: "2026-06-26", time: "09:00 AM", booked: false, bookedBy: null as string | null },
  { id: "slot-5", date: "2026-06-26", time: "01:30 PM", booked: false, bookedBy: null as string | null },
  { id: "slot-6", date: "2026-06-26", time: "04:00 PM", booked: false, bookedBy: null as string | null },
];

// Seed Database
let JOBS_DB: Job[] = [
  {
    id: "job-001",
    title: "Senior AI Engineer (LLM & Information Retrieval)",
    company: "Redrob AI",
    location: "Bengaluru, India (Hybrid)",
    experienceRequired: 3,
    roleType: "Full-time",
    domain: "NLP & AI Core",
    description: "We are building Redrob's proprietary LLM and predictive ranking models. You will design neural architectures, work with vector indices (FAISS/Milvus), execute custom fine-tunings, and optimize low-latency search systems with robust APIs.",
    mustHaveSkills: ["Python", "FastAPI", "FAISS", "LLMs", "NLP", "PyTorch"],
    niceToHaveSkills: ["Docker", "Kubernetes", "PostgreSQL", "AWS"]
  },
  {
    id: "job-002",
    title: "Data Scientist (Predictive Talent Discovery)",
    company: "Redrob AI",
    location: "New Delhi, India (On-site)",
    experienceRequired: 4,
    roleType: "Full-time",
    domain: "Data Analytics & Predictive Systems",
    description: "Analyze workforce credentials, skill graphs, and profile attributes. Build end-to-end regression, classification, and statistical models to predict skill growth and talent flight risk.",
    mustHaveSkills: ["Python", "Pandas", "Scikit-Learn", "Machine Learning", "SQL"],
    niceToHaveSkills: ["Tableau", "Flask", "GitHub API", "Data Visualization"]
  }
];

let CANDIDATES_DB: Candidate[] = [
  {
    id: "cand-001",
    name: "Arjun Sharma",
    email: "arjun.sharma@iitbombay.grad",
    skills: ["Python", "FastAPI", "React", "Docker", "Machine Learning", "LLMs", "NLP", "PyTorch", "SQL", "FAISS"],
    experienceYears: 4,
    education: ["B.Tech inside Computer Science, IIT Bombay"],
    projects: [
      "High performance microservices backend with FastAPI serving predictive analytics",
      "Fine-tuned Mistral-7B model for dynamic unstructured resume intelligence matching"
    ],
    experience: [
      { title: "Senior AI Engineer", company: "TechVanguard India", duration: "2.5 years" },
      { title: "Data Scientist", company: "Redrob Analytics", duration: "1.5 years" }
    ],
    resumeText: "Senior AI Specialist with 4 years of solid background. Graduated CS at IIT Bombay. Handled LLM pipeline development, sentence embeddings, semantic search, and FAISS vector indices integration. Built real-time matching engine APIs that increased parsing efficiency by 40% using python tools.",
    behavioralSignals: { ownership: 5, leadership: 4, collaboration: 5 },
    platformActivity: { codingScore: 98, profileCompleteness: 100, responsivenessScore: 95, hackathonRank: 3 },
    jobId: "job-001",
    stage: "Shortlisted",
    interviewStage: "Technical",
    recruiterNotes: "Incredibly qualified candidate with first-tier educational background. Perfect scores in AI and Retrieval pipeline evaluation.",
    recruiterFeedback: "Displayed extreme tech ownership during general pre-screening discussion. Passionate about Redrob's proprietary LLM roadmap.",
    appliedDate: "2026-06-19",
    isPriority: true,
    salaryExpectation: 2200000,
    salaryOffer: 2400000
  },
  {
    id: "cand-002",
    name: "Neha Gupta",
    email: "neha.gupta@bitsgrad.com",
    skills: ["Python", "Pandas", "Scikit-Learn", "Machine Learning", "FastAPI", "PostgreSQL", "Data Science", "SQL"],
    experienceYears: 3,
    education: ["B.E. in Electrical and Electronics, BITS Pilani"],
    projects: [
      "Predictive customer churn analyzer (Scikit-learn, XGBoost)",
      "Automated PDF tabular structure parsing module"
    ],
    experience: [
      { title: "Data Scientist", company: "InfoEdge India", duration: "2 years" },
      { title: "Associate Analyst", company: "Cognizant Technology Solutions", duration: "1 year" }
    ],
    resumeText: "Data Scientist with solid 3 years of career history building classification and clustering models. In-depth understanding of statistical analyses, hyper-parameter search, pandas, and SQL. Skilled in making microservices wrapper utilizing FastAPI and PostgreSQL database connectors.",
    behavioralSignals: { ownership: 4, leadership: 3, collaboration: 4 },
    platformActivity: { codingScore: 89, profileCompleteness: 90, responsivenessScore: 88, hackathonRank: 12 },
    jobId: "job-002",
    stage: "Interview",
    interviewStage: "Screening",
    recruiterNotes: "Strong analytical background. Good candidate for the Predictive Talent Discovery role.",
    recruiterFeedback: "Needs slight review on deep learning topics, but outstanding on core machine learning and clean Pandas logic.",
    appliedDate: "2026-06-18",
    isPriority: false,
    salaryExpectation: 1800000,
    salaryOffer: 1650000
  },
  {
    id: "cand-003",
    name: "Rohan Das",
    email: "rohan.das@nitpy.org",
    skills: ["Python", "Flask", "Django", "PostgreSQL", "Docker", "REST API", "Tailwind", "SQL", "Git"],
    experienceYears: 2,
    education: ["B.Tech in Information Technology, NIT Trichy"],
    projects: [
      "Automated billing SaaS with elegant React dashboard",
      "Collaborative project planner with secure auth"
    ],
    experience: [
      { title: "Backend Software Developer", company: "Zoho Corporation", duration: "2 years" }
    ],
    resumeText: "Energetic backend engineer with 2 years of work focus. Proficient with python Django and Flask setups. Created several modularREST APIs with high thoroughput. Excellent relational database design using PostgreSQL. Eager to transition towards ML/AI engineering.",
    behavioralSignals: { ownership: 5, leadership: 2, collaboration: 4 },
    platformActivity: { codingScore: 92, profileCompleteness: 85, responsivenessScore: 90, hackathonRank: 24 },
    jobId: "job-001",
    stage: "Applied",
    interviewStage: "None",
    recruiterNotes: "Excellent general software engineer but lacks advanced NLP embeddings and LLM training experience. Might cover gaps quickly due to NIT CS foundation.",
    recruiterFeedback: "Very humble, clear code structure, strong with Python architecture and Postgres performance tuning.",
    appliedDate: "2026-06-21",
    isPriority: false,
    salaryExpectation: 1200000
  },
  {
    id: "cand-004",
    name: "Priya Nair",
    email: "priya.nair@dtugrad.in",
    skills: ["Python", "Machine Learning", "PyTorch", "NLP", "TensorFlow", "Pandas", "Scikit-Learn"],
    experienceYears: 1.5,
    education: ["B.Tech inside Mathematics and Computing, DTU Delhi"],
    projects: [
      "Neural Style Transfer and image synthesis pipelines",
      "Sentiment scoring interface using huggingface bert"
    ],
    experience: [
      { title: "Junior ML Associate", company: "Defense Research Labs", duration: "1.5 years" }
    ],
    resumeText: "Passionate AI practitioner with 1.5 years experience. Strongly focused on deep neural networks utilizing PyTorch and TensorFlow datasets. Conducted NLP tasks like sentiment classification, tokenizer implementations, and model evaluation under pressure.",
    behavioralSignals: { ownership: 4, leadership: 3, collaboration: 3 },
    platformActivity: { codingScore: 85, profileCompleteness: 95, responsivenessScore: 80, hackathonRank: 41 },
    jobId: "job-001",
    stage: "Applied",
    interviewStage: "None",
    recruiterNotes: "Talented junior researcher, but slightly underqualified in years of experience (1.5 yrs vs 3 yrs required) and lacks vector index skills.",
    recruiterFeedback: "Excellent coding baseline. Suggested she check our open junior ML developer program.",
    appliedDate: "2026-06-20",
    isPriority: false,
    salaryExpectation: 950000
  },
  {
    id: "cand-005",
    name: "Vikram Aditya",
    email: "vikram.aditya@iiit.ac.in",
    skills: ["Python", "Docker", "Kubernetes", "AWS", "CI/CD", "PostgreSQL", "FastAPI", "React", "Linux"],
    experienceYears: 6,
    education: ["M.Tech in Computational Sciences, IIIT Hyderabad"],
    projects: [
      "Distributed training orchestration framework utilizing Ray and AWS",
      "Enterprise level API gateway with auto telemetry logs"
    ],
    experience: [
      { title: "MLOps Tech Lead", company: "Ola Cabs Core ML", duration: "3 years" },
      { title: "Software Engineer - Infrastructure", company: "Wipro Technologies", duration: "3 years" }
    ],
    resumeText: "Experienced infrastructure and systems lead with 6 years experience. M.Tech graduate of IIIT Hyderabad. Champion of scalable AI pipeline deployment, Docker orchestration, AWS systems security, CI/CD automated testbeds, and postgres cluster management.",
    behavioralSignals: { ownership: 5, leadership: 5, collaboration: 4 },
    platformActivity: { codingScore: 94, profileCompleteness: 100, responsivenessScore: 92, hackathonRank: 8 },
    jobId: "job-001",
    stage: "Offer",
    interviewStage: "None",
    recruiterNotes: "Extremely strong on system orchestration, deployment and container scaling. Lacks direct LLMs training experience, but a vital asset for production scaling.",
    recruiterFeedback: "A natural leader who takes absolute ownership. Highly competent architect for MLOps and microservice optimization.",
    appliedDate: "2026-06-17",
    isPriority: true,
    salaryExpectation: 2800000,
    salaryOffer: 2900000
  }
];

// ---------------------------------------------------------
// SERVER ENDPOINTS
// ---------------------------------------------------------

// GET all jobs
app.get("/api/jobs", (req, res) => {
  res.json(JOBS_DB);
});

// POST new job
app.post("/api/jobs", (req, res) => {
  try {
    const { title, company, location, experienceRequired, roleType, domain, description, mustHaveSkills, niceToHaveSkills } = req.body;
    if (!title || !description) {
      return res.status(400).json({ error: "Missing required fields (title, description)" });
    }
    const newJob: Job = {
      id: "job-" + Date.now(),
      title,
      company: company || "Self-Posted",
      location: location || "Remote",
      experienceRequired: Number(experienceRequired) || 0,
      roleType: roleType || "Full-time",
      domain: domain || "AI & Tech",
      description,
      mustHaveSkills: Array.isArray(mustHaveSkills) ? mustHaveSkills : [],
      niceToHaveSkills: Array.isArray(niceToHaveSkills) ? niceToHaveSkills : []
    };
    JOBS_DB.push(newJob);
    res.json(newJob);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET all candidates
app.get("/api/candidates", (req, res) => {
  CANDIDATES_DB.forEach(c => {
    if (!c.quickNotes || c.quickNotes.length === 0) {
      c.quickNotes = [
        {
          id: "default-1",
          text: "Initial resume parsing looks successful. Good match on core keywords.",
          timestamp: "09:30 AM " + c.appliedDate,
          author: "System Parser"
        }
      ];
    }
  });
  res.json(CANDIDATES_DB);
});

// POST add quick note
app.post("/api/candidates/:id/quick-notes", (req, res) => {
  try {
    const { id } = req.params;
    const { text, author } = req.body;
    const cand = CANDIDATES_DB.find((c) => c.id === id);
    if (!cand) {
      return res.status(404).json({ error: "Candidate not found" });
    }
    if (!cand.quickNotes) {
      cand.quickNotes = [];
    }
    const newNote = {
      id: "note-" + Date.now(),
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " " + new Date().toLocaleDateString(),
      author: author || "Recruiter"
    };
    cand.quickNotes.push(newNote);
    res.json(cand);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST update candidate stage
app.post("/api/candidates/:id/stage", (req, res) => {
  try {
    const { id } = req.params;
    const { stage, interviewStage } = req.body;
    const cand = CANDIDATES_DB.find((c) => c.id === id);
    if (!cand) {
      return res.status(404).json({ error: "Candidate not found" });
    }
    if (stage) cand.stage = stage;
    if (interviewStage) cand.interviewStage = interviewStage;
    res.json(cand);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST update recruiter notes/feedback
app.post("/api/candidates/:id/notes", (req, res) => {
  try {
    const { id } = req.params;
    const { recruiterNotes, recruiterFeedback, behavioralSignals } = req.body;
    const cand = CANDIDATES_DB.find((c) => c.id === id);
    if (!cand) {
      return res.status(404).json({ error: "Candidate not found" });
    }
    if (recruiterNotes !== undefined) cand.recruiterNotes = recruiterNotes;
    if (recruiterFeedback !== undefined) cand.recruiterFeedback = recruiterFeedback;
    if (behavioralSignals) {
      cand.behavioralSignals = {
        ownership: Number(behavioralSignals.ownership) || cand.behavioralSignals.ownership,
        leadership: Number(behavioralSignals.leadership) || cand.behavioralSignals.leadership,
        collaboration: Number(behavioralSignals.collaboration) || cand.behavioralSignals.collaboration
      };
    }
    res.json(cand);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST toggle priority flag for candidate
app.post("/api/candidates/:id/priority", (req, res) => {
  try {
    const { id } = req.params;
    const { isPriority } = req.body;
    const cand = CANDIDATES_DB.find((c) => c.id === id);
    if (!cand) {
      return res.status(404).json({ error: "Candidate not found" });
    }
    cand.isPriority = !!isPriority;
    res.json(cand);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST update candidate salary expectations/offers
app.post("/api/candidates/:id/salary", (req, res) => {
  try {
    const { id } = req.params;
    const { salaryExpectation, salaryOffer } = req.body;
    const cand = CANDIDATES_DB.find((c) => c.id === id);
    if (!cand) {
      return res.status(404).json({ error: "Candidate not found" });
    }
    if (salaryExpectation !== undefined) cand.salaryExpectation = Number(salaryExpectation) || 0;
    if (salaryOffer !== undefined) cand.salaryOffer = salaryOffer !== null ? (Number(salaryOffer) || 0) : undefined;
    res.json(cand);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST submit/update structured interview feedback
app.post("/api/candidates/:id/interview-feedback", (req, res) => {
  try {
    const { id } = req.params;
    const { feedback } = req.body;
    const cand = CANDIDATES_DB.find((c) => c.id === id);
    if (!cand) {
      return res.status(404).json({ error: "Candidate not found" });
    }
    cand.structuredFeedback = feedback;
    res.json(cand);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST perform bulk updates on multiple candidates
app.post("/api/candidates/bulk-update", (req, res) => {
  try {
    const { candidateIds, stage, action } = req.body;
    if (!Array.isArray(candidateIds)) {
      return res.status(400).json({ error: "candidateIds must be an array" });
    }
    candidateIds.forEach(id => {
      const cand = CANDIDATES_DB.find(c => c.id === id);
      if (cand) {
        if (action === "reject") {
          cand.stage = "Rejected";
          if (!cand.quickNotes) cand.quickNotes = [];
          cand.quickNotes.push({
            id: "note-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
            text: "Candidate rejected via automated mass batch pipeline.",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " " + new Date().toLocaleDateString(),
            author: "Automated Bulk Process"
          });
        } else if (action === "stage" && stage) {
          cand.stage = stage;
        }
      }
    });
    res.json({ success: true, candidates: CANDIDATES_DB });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST update Candidate's skill progress (fills skill gaps)
app.post("/api/candidates/:id/skills/progress", (req, res) => {
  try {
    const { id } = req.params;
    const { skillName, level } = req.body;
    const cand = CANDIDATES_DB.find((c) => c.id === id);
    if (!cand) {
      return res.status(404).json({ error: "Candidate not found" });
    }
    if (!cand.skillProgress) {
      cand.skillProgress = {};
    }
    cand.skillProgress[skillName] = level;

    // If level is Intermediate or Expert, make sure it exists in candidate's skills list
    if ((level === "Intermediate" || level === "Expert") && !cand.skills.includes(skillName)) {
      cand.skills.push(skillName);
    } else if (level === "Missing") {
      cand.skills = cand.skills.filter(s => s !== skillName);
    }

    res.json(cand);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------
// NEW ADDITIONS: BATCH EMAILING, SKILL VERIFICATION, OAUTH
// ---------------------------------------------------------

// POST perform bulk updates on multiple candidates
app.post("/api/candidates/bulk-email", (req, res) => {
  try {
    const { candidateIds, subjectTemplate, bodyTemplate } = req.body;
    if (!Array.isArray(candidateIds)) {
      return res.status(400).json({ error: "candidateIds must be an array" });
    }

    const updatedCandidates: any[] = [];
    candidateIds.forEach(id => {
      const cand = CANDIDATES_DB.find(c => c.id === id);
      if (cand) {
        // Resolve job title
        const job = JOBS_DB.find(j => j.id === cand.jobId) || { title: "Software Engineer" };
        
        // Automated tag replacement
        const personalizedSubject = subjectTemplate
          .replace(/\{\{candidate_name\}\}/gi, cand.name)
          .replace(/\{\{job_title\}\}/gi, job.title)
          .replace(/\{\{current_stage\}\}/gi, cand.stage);

        const personalizedBody = bodyTemplate
          .replace(/\{\{candidate_name\}\}/gi, cand.name)
          .replace(/\{\{job_title\}\}/gi, job.title)
          .replace(/\{\{current_stage\}\}/gi, cand.stage);

        if (!cand.quickNotes) cand.quickNotes = [];
        cand.quickNotes.push({
          id: "email-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
          text: `[BATCH EMAIL SENT]\nSubject: ${personalizedSubject}\n\n${personalizedBody}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " " + new Date().toLocaleDateString(),
          author: "Recruiter Batch Outbox"
        });
        updatedCandidates.push(cand);
      }
    });

    res.json({ success: true, count: updatedCandidates.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST request technical skill verification
app.post("/api/candidates/:id/request-verification", (req, res) => {
  try {
    const { id } = req.params;
    const { skillName } = req.body;
    const cand = CANDIDATES_DB.find(c => c.id === id);
    if (!cand) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    if (!cand.verificationRequests) {
      cand.verificationRequests = [];
    }

    // Check if there is already a pending request for this skill
    const existing = cand.verificationRequests.find(r => r.skillName === skillName && r.status === "Pending");
    if (existing) {
      return res.json({ alreadyExists: true, request: existing });
    }

    const requestId = "req-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6);
    // Link can be formatted relative to the server/client
    const assessmentLink = `/verify-skill?candId=${cand.id}&skillName=${encodeURIComponent(skillName)}&reqId=${requestId}`;

    const newRequest = {
      id: requestId,
      skillName,
      status: "Pending" as const,
      assessmentLink,
      requestedAt: new Date().toLocaleDateString()
    };

    cand.verificationRequests.push(newRequest);

    // Log in candidate notes
    if (!cand.quickNotes) cand.quickNotes = [];
    cand.quickNotes.push({
      id: "note-verify-" + Date.now(),
      text: `Requested technical verification for skill: [${skillName}]. Assessment link generated: ${assessmentLink}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " " + new Date().toLocaleDateString(),
      author: "Skills Verification Bot"
    });

    res.json({ success: true, request: newRequest, candidate: cand });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST submit skill verification quiz
app.post("/api/candidates/:id/submit-verification", (req, res) => {
  try {
    const { id } = req.params;
    const { skillName, reqId, score } = req.body;
    const cand = CANDIDATES_DB.find(c => c.id === id);
    if (!cand) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    // Update request
    if (cand.verificationRequests) {
      const request = cand.verificationRequests.find(r => r.id === reqId || (r.skillName === skillName && r.status === "Pending"));
      if (request) {
        request.status = "Completed";
        request.score = score;
      }
    }

    // Elevate skill progress
    if (!cand.skillProgress) {
      cand.skillProgress = {};
    }
    cand.skillProgress[skillName] = "Expert";

    // Add to skills list
    if (!cand.skills.includes(skillName)) {
      cand.skills.push(skillName);
    }

    // Log the success in quick notes
    if (!cand.quickNotes) cand.quickNotes = [];
    cand.quickNotes.push({
      id: "note-verified-" + Date.now(),
      text: `Successfully completed skill assessment for [${skillName}] with score of ${score}%. Skill level officially verified and elevated to Expert status!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " " + new Date().toLocaleDateString(),
      author: "Skills Verification Bot"
    });

    res.json({ success: true, candidate: cand });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET build LinkedIn OAuth URL
app.get("/api/auth/linkedin/url", (req, res) => {
  const { redirectUri, candidateId } = req.query;
  const state = JSON.stringify({ candidateId, redirectUri });
  const params = new URLSearchParams({
    client_id: "linkedin_redrob_mock_client",
    redirect_uri: redirectUri as string,
    response_type: "code",
    scope: "r_liteprofile r_emailaddress",
    state: state,
  });
  res.json({ url: `/auth/linkedin/provider?${params.toString()}` });
});

// GET simulated LinkedIn authorization provider page (consent dialog)
app.get("/auth/linkedin/provider", (req, res) => {
  const { redirect_uri, state } = req.query;
  
  res.send(`
    <html>
      <head>
        <title>LinkedIn Sign In & Authorization</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Inter', sans-serif; }
        </style>
      </head>
      <body class="bg-slate-900 text-slate-100 min-h-screen flex flex-col justify-between">
        <!-- Blue LinkedIn Header -->
        <header class="bg-slate-950 border-b border-slate-800 p-4">
          <div class="max-w-4xl mx-auto flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="bg-[#0077b5] text-white font-bold px-2 py-0.5 rounded text-lg font-mono tracking-tighter">in</span>
              <span class="text-xs font-semibold tracking-wider uppercase text-slate-400 font-mono">Simulated Developer Sandbox</span>
            </div>
            <span class="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-mono">Secure OAuth Session</span>
          </div>
        </header>

        <main class="max-w-md w-full mx-auto px-4 py-8 flex-1 flex items-center justify-center">
          <div class="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-2xl w-full space-y-5">
            <div class="text-center space-y-1">
              <div class="w-12 h-12 bg-[#0077b5]/10 text-[#0077b5] rounded-full flex items-center justify-center mx-auto text-xl font-bold font-mono">
                in
              </div>
              <h2 class="text-md font-bold text-white tracking-tight">Authorize Redrob Recruiter Suite</h2>
              <p class="text-xs text-slate-400">Requesting permission to link your professional credentials</p>
            </div>

            <div class="bg-slate-900/60 p-3 rounded border border-slate-900 text-[11px] text-slate-300 space-y-2.5">
              <p class="font-semibold text-slate-200 uppercase tracking-wide font-mono text-[9px]">Requested Access Scopes:</p>
              <div class="flex items-start gap-2">
                <span class="text-[#0077b5] font-mono font-bold mt-0.5">&bull;</span>
                <span><strong>r_liteprofile:</strong> Full name, high-quality headshot URL, and professional headline.</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-[#0077b5] font-mono font-bold mt-0.5">&bull;</span>
                <span><strong>r_emailaddress:</strong> Read primary email address and communications profile.</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-[#0077b5] font-mono font-bold mt-0.5">&bull;</span>
                <span><strong>r_experience:</strong> Profile summary, industry info, and career history highlights.</span>
              </div>
            </div>

            <form action="/auth/linkedin/callback" method="GET" class="space-y-4">
              <input type="hidden" name="state" value="\${state || ""}" />
              <input type="hidden" name="code" id="auth_code" value="mock_code_engineer" />

              <div class="space-y-1.5">
                <label class="block text-[10px] text-slate-400 uppercase font-mono">Select Testing Persona Profile</label>
                <select 
                  id="persona_select"
                  onchange="updatePersonaInfo()"
                  class="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-200 focus:outline-none focus:border-slate-700 cursor-pointer"
                >
                  <option value="engineer">Staff Software Engineer (Core Systems / Ex-Google)</option>
                  <option value="data_scientist">Data Scientist & AI Specialist (Ex-Meta)</option>
                  <option value="frontend">Senior Frontend Engineer (React & Tailwind specialist)</option>
                  <option value="phd">AI Research Scientist (PhD in Machine Learning)</option>
                </select>
              </div>

              <!-- Live Preview Card -->
              <div class="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-2">
                <p class="text-[9px] font-mono text-slate-500 uppercase tracking-wider">Preview of Linked Profile Data:</p>
                <div class="flex items-center gap-3">
                  <img id="preview_avatar" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80" class="w-10 h-10 rounded-full border border-slate-700 object-cover" />
                  <div class="min-w-0 flex-1">
                    <p id="preview_name" class="text-xs font-bold text-white">Alice Vance</p>
                    <p id="preview_headline" class="text-[10px] text-slate-300 truncate">Staff Software Engineer | Distributed Systems & AI/ML | Ex-Google</p>
                  </div>
                </div>
                <p id="preview_summary" class="text-[10px] text-slate-400 italic">"Passionate software engineer with 10+ years of experience designing scalable real-time microservices."</p>
              </div>

              <div class="flex items-center gap-2 pt-1">
                <button 
                  type="button"
                  onclick="window.close()"
                  class="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded text-xs font-semibold border border-slate-800 cursor-pointer"
                >
                  Decline
                </button>
                <button 
                  type="submit"
                  class="flex-1 py-2 bg-[#0077b5] hover:bg-[#00669c] text-white font-bold rounded text-xs transition-colors cursor-pointer shadow-lg shadow-[#0077b5]/10"
                >
                  Authorize &amp; Link
                </button>
              </div>
            </form>
          </div>
        </main>

        <footer class="bg-slate-950 border-t border-slate-900 p-3 text-center">
          <p class="text-[9px] text-slate-500 font-mono">&copy; LinkedIn Simulated OAuth Sandbox. No credentials or cookies stored.</p>
        </footer>

        <script>
          const personas = {
            engineer: {
              code: "mock_code_engineer",
              name: "Alice Vance",
              headline: "Staff Software Engineer | Distributed Systems & AI/ML | Ex-Google",
              summary: "Passionate software engineer with 10+ years of experience designing scalable real-time microservices and training custom transformer models. Active contributor to open-source systems.",
              avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80"
            },
            data_scientist: {
              code: "mock_code_ds",
              name: "David Chen",
              headline: "Senior Data Scientist & AI/ML Engineer | Ex-Meta",
              summary: "Quantitative researcher and data practitioner with 5+ years building production model pipelines, high-dimensional neural network embedding architectures, and optimized data lake aggregations.",
              avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80"
            },
            frontend: {
              code: "mock_code_frontend",
              name: "Chloe Sterling",
              headline: "Senior Frontend Engineer | UX & Creative Technologist",
              summary: "UI design architect specialized in React, TypeScript, high-performance web canvases, micro-frontends, and tailwind optimization. Committed to high-fidelity interactions and design integrity.",
              avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&h=150&q=80"
            },
            phd: {
              code: "mock_code_phd",
              name: "Dr. Marcus Thorne",
              headline: "Principal AI Research Scientist | PhD in Machine Learning",
              summary: "Deep learning researcher focusing on unsupervised representation learning, reinforcement learning from human feedback (RLHF), and high-throughput transformer attention scalability.",
              avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80"
            }
          };

          function updatePersonaInfo() {
            const val = document.getElementById("persona_select").value;
            const p = personas[val];
            document.getElementById("auth_code").value = p.code;
            document.getElementById("preview_name").textContent = p.name;
            document.getElementById("preview_headline").textContent = p.headline;
            document.getElementById("preview_summary").textContent = '"' + p.summary + '"';
            document.getElementById("preview_avatar").src = p.avatar;
          }
        </script>
      </body>
    </html>
  `);
});

// GET OAuth callback handler - processes mock code and links LinkedIn details to candidate
app.get("/auth/linkedin/callback", (req, res) => {
  const { code, state } = req.query;
  
  let candidateId = "";
  let redirectUri = "";
  
  try {
    const parsedState = JSON.parse(state as string);
    candidateId = parsedState.candidateId;
    redirectUri = parsedState.redirectUri;
  } catch (e) {
    console.error("Failed to parse state from OAuth:", e);
  }

  // Get matching mock details based on auth code
  const candidate_id_clean = candidateId;
  const cand = CANDIDATES_DB.find(c => c.id === candidate_id_clean);

  let mockProfile = {
    headline: "Staff Software Engineer | Distributed Systems & AI/ML | Ex-Google",
    summary: "Passionate software engineer with 10+ years of experience designing scalable real-time microservices and training custom transformer models. Active contributor to open-source systems.",
    industry: "Technology, Information and Internet",
    pictureUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80",
    connectedAt: new Date().toLocaleString(),
    publicProfileUrl: "https://www.linkedin.com/in/verified-redrob-" + candidate_id_clean
  };

  if (code === "mock_code_ds") {
    mockProfile = {
      headline: "Senior Data Scientist & AI/ML Engineer | Ex-Meta",
      summary: "Quantitative researcher and data practitioner with 5+ years building production model pipelines, high-dimensional neural network embedding architectures, and optimized data lake aggregations.",
      industry: "Financial Services / Technology",
      pictureUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80",
      connectedAt: new Date().toLocaleString(),
      publicProfileUrl: "https://www.linkedin.com/in/verified-redrob-" + candidate_id_clean
    };
  } else if (code === "mock_code_frontend") {
    mockProfile = {
      headline: "Senior Frontend Engineer | UX & Creative Technologist",
      summary: "UI design architect specialized in React, TypeScript, high-performance web canvases, micro-frontends, and tailwind optimization. Committed to high-fidelity interactions and design integrity.",
      industry: "Technology & Entertainment",
      pictureUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&h=150&q=80",
      connectedAt: new Date().toLocaleString(),
      publicProfileUrl: "https://www.linkedin.com/in/verified-redrob-" + candidate_id_clean
    };
  } else if (code === "mock_code_phd") {
    mockProfile = {
      headline: "Principal AI Research Scientist | PhD in Machine Learning",
      summary: "Deep learning researcher focusing on unsupervised representation learning, reinforcement learning from human feedback (RLHF), and high-throughput transformer attention scalability.",
      industry: "Research & Development / AI Labs",
      pictureUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80",
      connectedAt: new Date().toLocaleString(),
      publicProfileUrl: "https://www.linkedin.com/in/verified-redrob-" + candidate_id_clean
    };
  }

  if (cand) {
    cand.linkedInProfile = mockProfile;

    // Log in candidate's notes/history
    if (!cand.quickNotes) cand.quickNotes = [];
    cand.quickNotes.push({
      id: "note-li-" + Date.now(),
      text: "LinkedIn Professional Profile linked: [" + mockProfile.headline + "]. Linked summary imported.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " " + new Date().toLocaleDateString(),
      author: "LinkedIn Integration"
    });
  }

  res.send(\`
    <html>
      <head>
        <title>LinkedIn Authentication Success</title>
        <style>
          body {
            background-color: #0b1329;
            color: #f1f5f9;
            font-family: system-ui, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            text-align: center;
          }
          .card {
            background: #0f172a;
            padding: 2.5rem;
            border-radius: 1rem;
            box-shadow: 0 10px 25px rgba(0,0,0,0.5);
            border: 1px solid #1e293b;
            max-width: 400px;
          }
          .logo {
            background: #0077b5;
            color: white;
            font-weight: bold;
            padding: 0.5rem 1rem;
            border-radius: 0.25rem;
            font-size: 1.5rem;
            margin-bottom: 1rem;
            display: inline-block;
          }
          h1 { font-size: 1.25rem; margin-bottom: 0.5rem; color: #ffffff; }
          p { color: #94a3b8; font-size: 0.875rem; margin-bottom: 1.5rem; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo font-sans">in</div>
          <h1>LinkedIn Connected</h1>
          <p>Your simulated professional profile has been connected successfully to the Redrob Recruiter Suite. This popup will close automatically.</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', candidateId: "${candidate_id_clean}" }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
        </div>
      </body>
    </html>
  \`);
});

// GET recruiter availability slots
app.get("/api/recruiter/availability", (req, res) => {
  res.json(RECRUITER_AVAILABILITY);
});

// POST add new recruiter slot
app.post("/api/recruiter/availability", (req, res) => {
  try {
    const { date, time } = req.body;
    if (!date || !time) {
      return res.status(400).json({ error: "Missing date or time" });
    }
    const newSlot = {
      id: "slot-" + Date.now(),
      date,
      time,
      booked: false,
      bookedBy: null as string | null
    };
    RECRUITER_AVAILABILITY.push(newSlot);
    res.json(RECRUITER_AVAILABILITY);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST book candidate interview
app.post("/api/candidates/:id/book-interview", (req, res) => {
  try {
    const { id } = req.params;
    const { slotId } = req.body;
    const cand = CANDIDATES_DB.find(c => c.id === id);
    if (!cand) return res.status(404).json({ error: "Candidate not found" });

    const slot = RECRUITER_AVAILABILITY.find(s => s.id === slotId);
    if (!slot) return res.status(404).json({ error: "Slot not found" });
    if (slot.booked) return res.status(400).json({ error: "Slot is already booked" });

    // Clear previous booking for this candidate if exists
    if (cand.scheduledInterview) {
      const prevSlot = RECRUITER_AVAILABILITY.find(s => s.id === cand.scheduledInterview?.slotId);
      if (prevSlot) {
        prevSlot.booked = false;
        prevSlot.bookedBy = null;
      }
    }

    slot.booked = true;
    slot.bookedBy = cand.id;
    cand.scheduledInterview = {
      slotId: slot.id,
      date: slot.date,
      time: slot.time,
      recruiterName: "Sneha Reddy (Lead Technical Recruiter)",
      status: "Confirmed",
      meetingLink: "https://meet.google.com/abc-defg-hij"
    };

    res.json({ candidate: cand, availability: RECRUITER_AVAILABILITY });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST draft personalized outreach email
app.post("/api/candidates/:id/draft-outreach", async (req, res) => {
  try {
    const { id } = req.params;
    const cand = CANDIDATES_DB.find(c => c.id === id);
    if (!cand) return res.status(404).json({ error: "Candidate not found" });

    const job = JOBS_DB.find(j => j.id === cand.jobId) || JOBS_DB[0];

    if (ai) {
      console.log(`AI drafting outreach email for ${cand.name}...`);
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Draft a highly professional, warm, personalized outreach recruitment email for candidate "${cand.name}" who is shortlisted for the role "${job.title}" at "${job.company}". Leverage key highlights from their CV/resume text below: \n\nResume/Bio:\n${cand.resumeText || ""}\nSkills:\n${cand.skills.join(", ")}\n\nJob details:\n${job.description}\n\nMaintain a friendly, authentic, and compelling tone. Include placeholders for the recruiter to inspect/customize.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              subject: { type: Type.STRING },
              body: { type: Type.STRING }
            },
            required: ["subject", "body"]
          }
        }
      });
      const text = response.text;
      if (text) {
        const parsed = JSON.parse(text);
        return res.json(parsed);
      }
    }

    // Fallback outreach draft
    res.json({
      subject: `Exciting Career Opportunity: ${job.title} at ${job.company}`,
      body: `Hi ${cand.name},\n\nI hope this email finds you well!\n\nMy name is Sneha and I'm a Lead Recruiter at ${job.company}. I came across your impressive background in ${cand.skills.slice(0, 3).join(", ")}, and your profile caught my attention for our open ${job.title} position.\n\nYour experience with projects like "${cand.projects?.[0] || "scalable system design"}" and your solid ${cand.experienceYears} years of technical experience aligns beautifully with what we're building here.\n\nI would love to set up a brief 15-minute introductory call to tell you more about the role and learn about your career goals. Let me know if you have availability this week, or feel free to book a slot directly through our scheduler!\n\nBest regards,\n\nSneha Reddy\nLead Recruiter, ${job.company}`
    });
  } catch (error: any) {
    console.error("Draft outreach error:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST search/source passive talent
app.post("/api/talent-source/search", async (req, res) => {
  try {
    const { jobId, customQuery } = req.body;
    const job = JOBS_DB.find(j => j.id === jobId) || JOBS_DB[0];

    if (ai) {
      console.log(`AI sourcing passive talent for Job: ${job.title}...`);
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Generate exactly 3 realistic, highly detailed, and compelling passive candidate profiles sourced from public directories that would perfectly match the active job requirement "${job.title}". Utilize the job's must-have skills [${job.mustHaveSkills.join(", ")}] and nice-to-have skills [${job.niceToHaveSkills.join(", ")}]. Ensure the profiles look realistic with Indian names, current top tech companies, experience history, portfolios, and a solid semantic alignment justification.\n\nCustom prompt guidance: ${customQuery || "None"}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                currentRole: { type: Type.STRING },
                currentCompany: { type: Type.STRING },
                experienceYears: { type: Type.INTEGER },
                skills: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                education: { type: Type.STRING },
                socialHandle: { type: Type.STRING },
                email: { type: Type.STRING },
                matchJustification: { type: Type.STRING },
                estimatedSalaryFit: { type: Type.STRING }
              },
              required: ["name", "currentRole", "currentCompany", "experienceYears", "skills", "education", "socialHandle", "email", "matchJustification", "estimatedSalaryFit"]
            }
          }
        }
      });
      const text = response.text;
      if (text) {
        const parsed = JSON.parse(text);
        return res.json(parsed);
      }
    }

    // Fallback high-potential passive profiles
    res.json([
      {
        name: "Priyanka Nair",
        currentRole: "Senior Backend Dev",
        currentCompany: "Razorpay",
        experienceYears: 5,
        skills: [...job.mustHaveSkills, "Go", "Kubernetes", "Redis"].slice(0, 5),
        education: "B.Tech in CSE, NIT Trichy",
        socialHandle: "github.com/priyanka-nair",
        email: "p.nair@razorpay.demo",
        matchJustification: "Exceptional system design skills. Led microservice migration handling 15k RPS. Direct alignment with must-have stack.",
        estimatedSalaryFit: "Strong Match (Within Budget)"
      },
      {
        name: "Rohan Das",
        currentRole: "Lead Frontend Architect",
        currentCompany: "Flipkart",
        experienceYears: 6,
        skills: [...job.mustHaveSkills, "React Native", "Tailwind CSS", "Webpack"].slice(0, 5),
        education: "M.Tech, BITS Pilani",
        socialHandle: "github.com/rohandas-dev",
        email: "rohan.das@flipkart.demo",
        matchJustification: "Maintained critical core UI components libraries. Expert in client-side bundling, code splitting, and web vitals optimization.",
        estimatedSalaryFit: "Medium Match (+5% over budget)"
      },
      {
        name: "Saurabh Mishra",
        currentRole: "AI Research Engineer",
        currentCompany: "Hugging Face (Remote)",
        experienceYears: 4,
        skills: [...job.mustHaveSkills, "PyTorch", "Transformers", "LangChain"].slice(0, 5),
        education: "B.Tech, IIT Roorkee",
        socialHandle: "github.com/saurabh-m",
        email: "s.mishra@hf.demo",
        matchJustification: "Active contributor to open-source agentic frameworks. Deep understanding of quantization, fine-tuning, and RAG architectures.",
        estimatedSalaryFit: "Strong Match (Within Budget)"
      }
    ]);
  } catch (error: any) {
    console.error("Talent Sourcing error:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST create/update custom candidate profile
app.post("/api/candidates", (req, res) => {
  try {
    const { name, email, skills, experienceYears, education, projects, experience, resumeText, jobId } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: "Missing required profile parameters (name, email)" });
    }

    // Check if duplicate candidate
    const existingIndex = CANDIDATES_DB.findIndex((c) => c.email.toLowerCase() === email.toLowerCase());

    const candidateProfile: Candidate = {
      id: existingIndex !== -1 ? CANDIDATES_DB[existingIndex].id : "cand-" + Date.now(),
      name,
      email,
      skills: Array.isArray(skills) ? skills : [],
      experienceYears: Number(experienceYears) || 0,
      education: Array.isArray(education) ? education : [],
      projects: Array.isArray(projects) ? projects : [],
      experience: Array.isArray(experience) ? experience : [],
      resumeText: resumeText || "",
      behavioralSignals: existingIndex !== -1 ? CANDIDATES_DB[existingIndex].behavioralSignals : { ownership: 4, leadership: 4, collaboration: 4 },
      platformActivity: existingIndex !== -1 ? CANDIDATES_DB[existingIndex].platformActivity : { codingScore: 82, profileCompleteness: 75, responsivenessScore: 80, hackathonRank: 45 },
      jobId: jobId || "job-001",
      stage: existingIndex !== -1 ? CANDIDATES_DB[existingIndex].stage : "Applied",
      interviewStage: existingIndex !== -1 ? CANDIDATES_DB[existingIndex].interviewStage : "None",
      recruiterNotes: existingIndex !== -1 ? CANDIDATES_DB[existingIndex].recruiterNotes : "",
      recruiterFeedback: existingIndex !== -1 ? CANDIDATES_DB[existingIndex].recruiterFeedback : "Parsed application successfully matching the data points.",
      appliedDate: existingIndex !== -1 ? CANDIDATES_DB[existingIndex].appliedDate : new Date().toISOString().split("T")[0]
    };

    if (existingIndex !== -1) {
      CANDIDATES_DB[existingIndex] = candidateProfile;
    } else {
      CANDIDATES_DB.push(candidateProfile);
    }

    res.json(candidateProfile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------
// PYTHON FASTAPI COGNITIVE BRIDGE
// ---------------------------------------------------------
const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || "http://localhost:8000";

async function isPythonBackendAlive(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const res = await fetch(PYTHON_BACKEND_URL + "/", { signal: controller.signal });
    clearTimeout(timeoutId);
    return res.ok;
  } catch (e) {
    return false;
  }
}

// POST parse upload resume using Gemini AI or Local Python PyMuPDF
app.post("/api/candidates/parse-resume", async (req, res) => {
  try {
    const { fileBase64, fileName, fileType, rawPastedText } = req.body;

    // Check if the FastAPI python backend is active
    const pythonActive = await isPythonBackendAlive();
    if (pythonActive) {
      try {
        console.log("System Status: Directing resume parse towards FastAPI service...");
        if (fileBase64 && !rawPastedText) {
          // Decode Base64 and build Blob for PyMuPDF parsing
          const buffer = Buffer.from(fileBase64, "base64");
          const fileBlob = new Blob([buffer], { type: "application/pdf" });
          const formData = new FormData();
          formData.append("file", fileBlob, fileName || "resume.pdf");

          const pyRes = await fetch(`${PYTHON_BACKEND_URL}/api/parser/parse-pdf`, {
            method: "POST",
            body: formData
          });

          if (pyRes.ok) {
            const parsedData = await pyRes.json();
            return res.json(parsedData);
          } else {
            console.warn("Python PDF custom parser returned a non-200 state, continuing to fallback...");
          }
        } else if (rawPastedText) {
          const pyRes = await fetch(`${PYTHON_BACKEND_URL}/api/parser/parse-text`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: rawPastedText })
          });

          if (pyRes.ok) {
            const parsedData = await pyRes.json();
            return res.json(parsedData);
          }
        }
      } catch (err) {
        console.warn("FastAPI parser error, applying primary Node logic:", err);
      }
    }

    let textToParse = rawPastedText || "";

    // If PDF or Doc exists, or we have raw pasted text, we pass it to Gemini or fallback
    if ((fileBase64 || rawPastedText) && ai) {
      try {
        let contents: any[] = [];
        if (fileBase64) {
          console.log(`Analyzing file ${fileName || "Resume"} using Gemini Model multimodal parsing...`);
          // Setup file content parts
          let mimeType = "application/pdf";
          if (fileType) {
            mimeType = fileType;
          } else if (fileName?.endsWith(".pdf")) mimeType = "application/pdf";
          else if (fileName?.endsWith(".txt")) mimeType = "text/plain";
          
          contents.push({
            inlineData: {
              data: fileBase64,
              mimeType: mimeType
            }
          });
        } else {
          console.log("Analyzing pasted raw resume text using Gemini...");
          contents.push(`Resume text content:\n${rawPastedText}`);
        }
        
        contents.push("Parsing instruction: You are a professional CV parser. Read this document carefully and extract: name, email, skills (list of technologies), total estimated experience in years (number), education, and list of professional experiences with title, company, duration, and list of projects. Keep standard field layout. Return strictly valid raw JSON code. Do not wrap in markdown quotes.");

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                email: { type: Type.STRING },
                skills: { type: Type.ARRAY, items: { type: Type.STRING } },
                experienceYears: { type: Type.NUMBER },
                education: { type: Type.ARRAY, items: { type: Type.STRING } },
                projects: { type: Type.ARRAY, items: { type: Type.STRING } },
                experience: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      company: { type: Type.STRING },
                      duration: { type: Type.STRING }
                    },
                    required: ["title"]
                  }
                }
              },
              required: ["name", "email", "skills"]
            }
          }
        });

        if (response.text) {
          const parsed = JSON.parse(response.text.trim());
          parsed.resumeText = `Extracted from uploaded resume PDF. Name: ${parsed.name}. Skills: ${parsed.skills?.join(", ")}`;
          return res.json(parsed);
        }
      } catch (gemError) {
        console.warn("Failed parsing with Gemini API, resorting to content-extraction fallback:", gemError);
      }
    }

    // Default Fallback parsing (Intelligent Regex & text matching)
    if (fileBase64 && !rawPastedText) {
      // Decode simple base64 (useful for TXT files)
      try {
        const buffer = Buffer.from(fileBase64, "base64");
        textToParse = buffer.toString("utf-8");
      } catch (err) {
        textToParse = "Robust content parser failed base64 decoding.";
      }
    }

    // Clean unstructured text fallbacks
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
    const discoveredEmail = textToParse.match(emailRegex)?.[0] || "candidate@example.org";
    
    // Extract Name
    let discoveredName = "New Professional Profile";
    const lines = textToParse.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length > 0 && lines[0].length < 50 && !discoveredEmail.includes(lines[0])) {
      discoveredName = lines[0];
    }

    // Extract Skills (Regex scan of key Tech)
    const techSkillsPool = [
      "Python", "FastAPI", "React", "Docker", "Machine Learning", "LLMs", "NLP", "PyTorch", "SQL", "FAISS",
      "TensorFlow", "Scikit-Learn", "Pandas", "Django", "Flask", "PostgreSQL", "AWS", "Kubernetes", "Git", "Tableau"
    ];
    const discoveredSkills: string[] = [];
    techSkillsPool.forEach(skill => {
      const regex = new RegExp(`\\b${skill}\\b`, "i");
      if (regex.test(textToParse)) {
        discoveredSkills.push(skill);
      }
    });

    if (discoveredSkills.length === 0) {
      discoveredSkills.push("Python", "SQL");
    }

    // Output Response Structure
    const parsedData = {
      name: discoveredName,
      email: discoveredEmail,
      skills: discoveredSkills,
      experienceYears: textToParse.toLowerCase().includes("senior") ? 4 : 2,
      education: ["Undergraduate Degree (Verified)"],
      projects: ["Enterprise production deployment pipeline"],
      experience: [
        { title: textToParse.toLowerCase().includes("senior") ? "Senior Developer" : "Software Engineer", company: "Premium Tech Group", duration: "2 years" }
      ],
      resumeText: textToParse || "No explicit backup text detected."
    };

    res.json(parsedData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// POST matching and ranking engine of candidates for a job description
app.post("/api/candidates/rank", async (req, res) => {
  try {
    const { jobId } = req.body;
    const job = JOBS_DB.find(j => j.id === jobId);
    if (!job) {
      return res.status(404).json({ error: "Job opening not found." });
    }

    // Check if FastAPI python backend can satisfy vector ranking query using sentence-transformers & FAISS
    const pythonActive = await isPythonBackendAlive();
    if (pythonActive) {
      try {
        console.log(`System Status: Querying python FAISS embedding matching pool for ${job.title}...`);
        
        // Prepare Request Payload matched exactly to FastAPI expected schema
        const payload = {
          jobId: job.id,
          jobTitle: job.title,
          jobDescription: job.description,
          mustHaveSkills: job.mustHaveSkills,
          candidates: CANDIDATES_DB.map(cand => ({
            id: cand.id,
            name: cand.name,
            skills: cand.skills,
            experienceYears: cand.experienceYears,
            resumeText: cand.resumeText || ""
          }))
        };

        const pyRankRes = await fetch(`${PYTHON_BACKEND_URL}/api/vector-search/rank`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (pyRankRes.ok) {
          const rankData = await pyRankRes.json();
          const pythonRanks = rankData.candidates;

          // Merge parsed candidate metrics index-by-index
          const rankedCandidates = pythonRanks.map((pyCand: any) => {
            const originalCand = CANDIDATES_DB.find(c => c.id === pyCand.id) || CANDIDATES_DB[0];
            return {
              ...originalCand,
              rankingMetrics: {
                semanticScore: Math.round(pyCand.semanticSimilarityScore),
                skillMatchScore: Math.round(pyCand.skillsMatchScore),
                expMatchScore: Math.round(pyCand.expMatchScore),
                finalScore: Math.round(pyCand.finalWeightedScore),
                matchedMustSkills: pyCand.matchedSkills,
                missingMustSkills: pyCand.missingSkills,
                aiExplanation: `${pyCand.aiBrief} (Retrieved contextually via python vector similarity calculated in Sentence-Transformers)`,
                gapAnalysis: `Technical gaps identified: ${pyCand.missingSkills.join(", ") || "None Outstanding"}`
              }
            };
          });

          return res.json({
            jobId: job.id,
            jobTitle: job.title,
            engine: "Sentence-Transformers & FAISS Vector Analyzer",
            candidates: rankedCandidates
          });
        }
      } catch (err) {
        console.warn("Failed retrieving ranks from Python backend, executing node scoring engine fallback...", err);
      }
    }

    // Calculate ranking metrics for each candidate
    const rankedCandidates = await Promise.all(CANDIDATES_DB.map(async (cand) => {
      // Metric A: Skill Overlap math
      let matchedMustSkills: string[] = [];
      let missingMustSkills: string[] = [];
      
      job.mustHaveSkills.forEach(mustSkill => {
        const hasSkill = cand.skills.some(userSkill => 
          userSkill.toLowerCase().trim() === mustSkill.toLowerCase().trim()
        );
        if (hasSkill) matchedMustSkills.push(mustSkill);
        else missingMustSkills.push(mustSkill);
      });

      const skillMatchScore = job.mustHaveSkills.length > 0 
        ? (matchedMustSkills.length / job.mustHaveSkills.length)
        : 1.0;

      // Metric B: Experience gap math
      const expMatchScore = cand.experienceYears >= job.experienceRequired
        ? 1.0
        : (cand.experienceYears / job.experienceRequired);

      // Metric C: Semantic Similarity
      // We will perform semantic assessment. Let's call Gemini if active to give a deep professional semantic score.
      let semanticScore = 0.5; // Default neutral baseline
      let aiAnalysis = `This candidate has a solid developer outline. Preseeded evaluations note a ${cand.skills.includes("Python") ? "good" : "moderate"} skills background overlap with ${job.title}. See detailed history for verification.`;
      let gapAnalysis = `Missing ${missingMustSkills.length > 0 ? missingMustSkills.join(", ") : "no major"} tool components.`;

      if (ai) {
        try {
          const systemContext = `You are Redrob's premium recruiter bot. Your task is to mathematically and contextually score the relevance of a candidate's profile against a Job Description. 
Assess overall domain alignment, core skill mastery, and deep functional credentials (not just mechanical word repetition).`;

          const userQuery = `Job Opening: "${job.title}" at ${job.company}
Required Core Skills: ${job.mustHaveSkills.join(", ")}
Job Brief: ${job.description}

Candidate Profile:
Name: ${cand.name}
Academics/Education: ${cand.education.join("; ")}
Tracked Skills: ${cand.skills.join(", ")}
Years Experience: ${cand.experienceYears}
Professional Resume Text summary: ${cand.resumeText}
Selected Projects: ${cand.projects.join(". ")}

Analyze this and output strictly a valid human-readable JSON block with keys "semanticScore" (a float between 0.00 and 1.00 indicating conceptual domain relevance), "fitMatchExplanation" (a 2-3 sentence executive recap of why they fit), and "gapAnalysis" (a list of 1-3 tool or concept gaps/strengths of note).
Strict rule: Output ONLY the raw JSON format with no Markdown.`;

          const aiResponse = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: userQuery,
            config: {
              systemInstruction: systemContext,
              responseMimeType: "application/json"
            }
          });

          if (aiResponse.text) {
            const data = JSON.parse(aiResponse.text.trim());
            semanticScore = Number(data.semanticScore) || 0.6;
            aiAnalysis = data.fitMatchExplanation || aiAnalysis;
            gapAnalysis = Array.isArray(data.gapAnalysis) ? data.gapAnalysis.join(". ") : (data.gapAnalysis || gapAnalysis);
          }
        } catch (err) {
          console.warn(`Gemini evaluation error for candidate ${cand.name}, using fast semantic string-similarity approximation:`, err);
          // Fallback simple TF-IDF-like / multi-token Jaccard index similarity logic
          let overlapCount = 0;
          const tokensJob = new Set(job.description.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(" "));
          const tokensResume = new Set((cand.resumeText + " " + cand.skills.join(" ")).toLowerCase().replace(/[^a-z0-9 ]/g, "").split(" "));
          tokensJob.forEach(tk => {
            if (tk.length > 3 && tokensResume.has(tk)) overlapCount++;
          });
          semanticScore = Math.min(0.9, 0.4 + (overlapCount / 50));
        }
      } else {
        // Simple deterministic similarity approximation logic
        let overlapCount = 0;
        const tokensJob = new Set(job.description.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(" "));
        const tokensResume = new Set((cand.resumeText + " " + cand.skills.join(" ")).toLowerCase().replace(/[^a-z0-9 ]/g, "").split(" "));
        tokensJob.forEach(tk => {
          if (tk.length > 3 && tokensResume.has(tk)) overlapCount++;
        });
        semanticScore = Math.min(0.95, 0.45 + (overlapCount / 40));
      }

      // Formula: 0.5 * semantic_similarity + 0.3 * skill_match + 0.2 * experience_match
      const finalScore = (0.5 * semanticScore) + (0.3 * skillMatchScore) + (0.2 * expMatchScore);

      return {
        ...cand,
        rankingMetrics: {
          semanticScore: Math.round(semanticScore * 100),
          skillMatchScore: Math.round(skillMatchScore * 100),
          expMatchScore: Math.round(expMatchScore * 100),
          finalScore: Math.round(finalScore * 100),
          matchedMustSkills,
          missingMustSkills,
          aiExplanation: aiAnalysis,
          gapAnalysis: gapAnalysis
        }
      };
    }));

    // Sort by final hybrid score descending
    rankedCandidates.sort((a, b) => b.rankingMetrics.finalScore - a.rankingMetrics.finalScore);

    res.json({
      jobId: job.id,
      jobTitle: job.title,
      candidates: rankedCandidates
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST parse raw job description to auto-generate details & skill tags
app.post("/api/jobs/parse", async (req, res) => {
  try {
    const { description } = req.body;
    if (!description || typeof description !== "string") {
      return res.status(400).json({ error: "Job description is required" });
    }

    if (ai) {
      console.log("System Status: AI parsing raw job description...");
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Analyze the following raw job description and extract a structured job profile. Ensure the skills are standardized, correct technical acronyms, and format the output according to the requested schema.\n\nRaw Job Description:\n${description}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              domain: { type: Type.STRING },
              experienceRequired: { type: Type.INTEGER },
              summary: { type: Type.STRING },
              mustHaveSkills: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              niceToHaveSkills: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["title", "domain", "experienceRequired", "summary", "mustHaveSkills", "niceToHaveSkills"]
          }
        }
      });

      const text = response.text;
      if (text) {
        const parsed = JSON.parse(text);
        return res.json(parsed);
      }
    }

    // Fallback if AI not initialized or fails
    console.log("AI parse fallback triggered");
    const lowercase = description.toLowerCase();
    let title = "Senior Software Engineer";
    if (lowercase.includes("react") || lowercase.includes("frontend") || lowercase.includes("ui")) title = "Senior Frontend Developer";
    else if (lowercase.includes("python") || lowercase.includes("ml") || lowercase.includes("learning") || lowercase.includes("llm")) title = "AI / ML Core Engineer";
    else if (lowercase.includes("data") || lowercase.includes("analysis") || lowercase.includes("analyst")) title = "Data Scientist / Analyst";
    
    res.json({
      title,
      domain: title.includes("AI") ? "NLP & AI Core" : "Fullstack Web",
      experienceRequired: 3,
      summary: description.slice(0, 150) + " (Synthesized summary from description)...",
      mustHaveSkills: ["React", "TypeScript", "Node.js"],
      niceToHaveSkills: ["Docker", "AWS", "Git"]
    });
  } catch (error: any) {
    console.error("Error in /api/jobs/parse:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST draft a professional job description using Gemini based on title and skills
app.post("/api/jobs/generate-description", async (req, res) => {
  try {
    const { title, skills } = req.body;
    if (!title) {
      return res.status(400).json({ error: "Job title is required to generate description" });
    }
    
    if (ai) {
      console.log(`System Status: AI generating job description for ${title}...`);
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Draft a highly professional, engaging, and detailed job description for a role titled "${title}" requiring the following skills: ${skills || "AI, Cloud, Python"}. Include an 'About the Role' section, 'Core Responsibilities', and why a candidate should apply. Highlight the specified skills naturally. Format with clean structure.`,
      });
      return res.json({ description: response.text });
    }
    
    // Fallback description
    const fallbackDesc = `About the Role:
We are seeking a talented and driven ${title} to join our core technical team. In this role, you will lead development, optimize pipelines, and innovate.

Core Requirements:
- Hands-on experience with: ${skills || "relevant technologies"}
- Minimum 3+ years in a software development environment
- Proven capability to collaborate, design, and deliver robust software.

Key Responsibilities:
- Design and implement critical features and core backend components
- Champion clean code, unit tests, and software engineering best practices
- Mentor junior engineers and collaborate across product lines.`;
    return res.json({ description: fallbackDesc });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST match rationale explanation for a candidate on a job
app.post("/api/candidates/match-rationale", async (req, res) => {
  try {
    const { candidateId, jobId } = req.body;
    const candidate = CANDIDATES_DB.find(c => c.id === candidateId);
    const job = JOBS_DB.find(j => j.id === jobId);

    if (!candidate || !job) {
      return res.status(404).json({ error: "Candidate or Job not found" });
    }

    if (ai) {
      console.log(`System Status: AI generating match rationale for ${candidate.name} and ${job.title}...`);
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Analyze why the candidate "${candidate.name}" is a fit for the job "${job.title}" at "${job.company}". Highlight key semantic overlaps, experience alignment, potential soft skills, and any potential skill gaps.\n\nJob Title: ${job.title}\nJob Description: ${job.description}\nJob Must-Have Skills: ${job.mustHaveSkills.join(", ")}\nJob Nice-to-Have Skills: ${job.niceToHaveSkills.join(", ")}\n\nCandidate Resume / Experience:\n${candidate.resumeText || ""}\nCandidate Skills: ${candidate.skills.join(", ")}\nCandidate Experience Years: ${candidate.experienceYears}\nCandidate Behavioral Scores: Ownership=${candidate.behavioralSignals?.ownership || 4}, Leadership=${candidate.behavioralSignals?.leadership || 4}, Collaboration=${candidate.behavioralSignals?.collaboration || 4}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overallFit: { type: Type.STRING },
              semanticMatches: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              skillGaps: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              culturalAssessment: { type: Type.STRING },
              overallScore: { type: Type.INTEGER }
            },
            required: ["overallFit", "semanticMatches", "skillGaps", "culturalAssessment", "overallScore"]
          }
        }
      });

      const text = response.text;
      if (text) {
        const parsed = JSON.parse(text);
        return res.json(parsed);
      }
    }

    // Fallback if AI not initialized or fails
    const matchedSkills = candidate.skills.filter(s => job.mustHaveSkills.some(jS => jS.toLowerCase() === s.toLowerCase()));
    const missingSkills = job.mustHaveSkills.filter(jS => !candidate.skills.some(s => s.toLowerCase() === jS.toLowerCase()));

    res.json({
      overallFit: `${candidate.name} demonstrates a solid foundation suitable for the ${job.title} position, possessing ${candidate.experienceYears} years of experience and core capability alignment in several technical fields.`,
      semanticMatches: [
        `Direct overlap in technical stack: ${matchedSkills.slice(0, 3).join(", ") || "Generic programming tools"}.`,
        `${candidate.experienceYears} years of domain-focused engineering tenure matches the minimum requirement.`,
        `Familiarity with related architectural patterns mentioned in the description.`
      ],
      skillGaps: missingSkills.length > 0 ? missingSkills.map(s => `Missing direct indicator for: ${s}`) : ["No major skill gaps identified."],
      culturalAssessment: `Strong soft skills indicated by high ratings in collaboration (${candidate.behavioralSignals?.collaboration || 4}/5) and ownership (${candidate.behavioralSignals?.ownership || 4}/5), fitting well with the team structure.`,
      overallScore: 82
    });
  } catch (error: any) {
    console.error("Error in match rationale:", error);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------
// VITE DEV SERVER AND PRODUCTION SERVING CONFIG
// ---------------------------------------------------------
async function initServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development Environment: Hook up Vite
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite developmental hot-reloader middleware mounted.");
  } else {
    // Production Environment: Serve static bundle inside dist
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static production assets from dist/.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`------------------------------------------------------`);
    console.log(`Intelligent Candidate Discovery Platform LIVE on port ${PORT}`);
    console.log(`India Runs REDROB Hackathon System Ready!`);
    console.log(`------------------------------------------------------`);
  });
}

initServer();
