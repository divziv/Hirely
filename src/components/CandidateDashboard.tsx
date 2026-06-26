/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Job, Candidate } from "../types";
import { 
  Upload, Sparkles, User, Mail, Award, BookOpen, Clock, 
  MapPin, CheckCircle, ChevronRight, Edit2, Check, ArrowRight,
  TrendingDown, Info, Trash2, HelpCircle, X
} from "lucide-react";

interface CandidateDashboardProps {
  jobs: Job[];
  currentUserEmail: string;
  candidates: Candidate[];
  onRefreshData: () => void;
  onUpdateCandidateProfile: (candidateData: Partial<Candidate>) => Promise<void>;
}

export default function CandidateDashboard({
  jobs,
  currentUserEmail,
  candidates,
  onRefreshData,
  onUpdateCandidateProfile
}: CandidateDashboardProps) {
  // Find current candidate state
  const currentCandidate = candidates.find(c => c.email.toLowerCase() === currentUserEmail.toLowerCase());
  
  // States
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Profile edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    email: currentUserEmail,
    skillsInput: "",
    experienceYears: 2,
    educationInput: "",
    projectsInput: "",
    resumeText: ""
  });

  // Pre-fill edit form when candidate changes, checking for autosaved drafts first
  useEffect(() => {
    const savedDraft = localStorage.getItem("candidateProfileForm");
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        if (parsed.email === currentUserEmail) {
          setEditForm(parsed);
          setIsEditing(true); // Restore edit mode if there is a draft!
          if (jobs.length > 0 && !selectedJobId) {
            setSelectedJobId(jobs[0].id);
          }
          return;
        }
      } catch (err) {
        console.error("Error restoring candidate profile draft:", err);
      }
    }

    if (currentCandidate) {
      setEditForm({
        name: currentCandidate.name,
        email: currentCandidate.email,
        skillsInput: currentCandidate.skills.join(", "),
        experienceYears: currentCandidate.experienceYears,
        educationInput: currentCandidate.education.join(", "),
        projectsInput: currentCandidate.projects.join(". "),
        resumeText: currentCandidate.resumeText
      });
    } else {
      // Clear for new sign ups
      setEditForm(prev => ({ ...prev, email: currentUserEmail }));
    }
    
    if (jobs.length > 0 && !selectedJobId) {
      setSelectedJobId(jobs[0].id);
    }
  }, [currentCandidate, currentUserEmail, jobs]);

  // Save candidate profile draft to localStorage on change
  useEffect(() => {
    if (isEditing && editForm.name) {
      localStorage.setItem("candidateProfileForm", JSON.stringify(editForm));
    }
  }, [editForm, isEditing]);

  // Handle Drag Events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setUploadError(null);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await processUploadedFile(files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const files = e.target.files;
    if (files && files.length > 0) {
      await processUploadedFile(files[0]);
    }
  };

  // Convert uploaded document to Base64 and send to server parsing API
  const processUploadedFile = async (file: File) => {
    setIsParsing(true);
    try {
      // Validate file size (12MB budget)
      if (file.size > 12 * 1024 * 1024) {
        throw new Error("File exceeds 12MB limit. Please upload a smaller resume.");
      }

      // Convert to Base64
      const base64String = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          const rawBase64 = (reader.result as string).split(",")[1];
          resolve(rawBase64);
        };
        reader.onerror = (err) => reject(err);
      });

      // Call our robust node parsing backend
      const res = await fetch("/api/candidates/parse-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileBase64: base64String,
          fileName: file.name,
          fileType: file.type
        })
      });

      if (res.ok) {
        const data = await res.json();
        
        // Populate edit form with the structured AI extraction immediately
        setEditForm({
          name: data.name || "Newly Parsed Professional",
          email: currentUserEmail, // Preservelogged user email
          skillsInput: Array.isArray(data.skills) ? data.skills.join(", ") : "",
          experienceYears: Number(data.experienceYears) || 1,
          educationInput: Array.isArray(data.education) ? data.education.join(", ") : "CS Graduate",
          projectsInput: Array.isArray(data.projects) ? data.projects.join(". ") : "",
          resumeText: data.resumeText || `Parsed content from ${file.name}`
        });

        // Trigger visual edit review form
        setIsEditing(true);
      } else {
        throw new Error("AI parser service was unable to decode the CV structure.");
      }
    } catch (err: any) {
      setUploadError(err.message || "Failed to parse document. Please input details manually.");
    } finally {
      setIsParsing(false);
    }
  };

  // Save changes to profile and submit application
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const skills = editForm.skillsInput.split(",").map(s => s.trim()).filter(Boolean);
      const education = editForm.educationInput.split(",").map(s => s.trim()).filter(Boolean);
      const projects = editForm.projectsInput.split(".").map(s => s.trim()).filter(Boolean);

      await onUpdateCandidateProfile({
        name: editForm.name,
        email: currentUserEmail,
        skills,
        experienceYears: Number(editForm.experienceYears) || 0,
        education,
        projects,
        resumeText: editForm.resumeText,
        jobId: selectedJobId || "job-001"
      });

      localStorage.removeItem("candidateProfileForm");
      setIsEditing(false);
      onRefreshData();
    } catch (err) {
      console.error("Profile save error:", err);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    localStorage.removeItem("candidateProfileForm");
  };

  return (
    <div id="candidate_main_dashboard" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* LEFT COLUMN: Career state & dynamic timeline */}
      <div className="lg:col-span-8 space-y-6">

        {/* Dynamic Greeting & Pipeline Timeline */}
        {currentCandidate ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
            
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-base font-bold text-white font-display">
                  Welcome back, {currentCandidate.name}!
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Track your personalized profile status inside Redrob&#39;s hiring pipe.
                </p>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="px-2.5 py-1 text-xs border border-slate-700 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 flex items-center gap-1 cursor-pointer"
              >
                <Edit2 className="w-3 h-3 text-emerald-400" />
                Update Profile Fallback
              </button>
            </div>

            {/* Application Progress Status indicators */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-950 space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[10px] text-slate-500 font-mono">Job Applied:</span>
                <span className="text-emerald-400 font-medium text-[11px] font-display">
                  {jobs.find(j => j.id === currentCandidate.jobId)?.title || "AI Systems Architect"}
                </span>
              </div>

              {/* Progress Stepper Timeline */}
              <div className="grid grid-cols-5 gap-1.5 pt-2 text-center">
                {["Applied", "Shortlisted", "Interview", "Offer", "Hired"].map((ph, idx) => {
                  
                  // Map database stages onto stepper
                  let isActive = false;
                  let isCompleted = false;

                  const stagesMap: Record<string, number> = {
                    "Applied": 0,
                    "Shortlisted": 1,
                    "Interview": 2,
                    "Offer": 3,
                    "Hired": 4,
                  };

                  const currentIdx = stagesMap[currentCandidate.stage] || 0;
                  if (idx === currentIdx) isActive = true;
                  if (idx < currentIdx) isCompleted = true;

                  if (currentCandidate.stage === "Rejected") {
                    // special handling
                    if (idx < 2) isCompleted = true;
                  }

                  return (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center justify-center">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center border font-mono text-[9px] ${
                          currentCandidate.stage === "Rejected" && idx >= 2
                            ? "bg-rose-950/20 text-rose-500 border-rose-900" :
                          isCompleted 
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" :
                          isActive 
                            ? "bg-blue-500 text-slate-950 font-bold border-blue-500" :
                          "bg-slate-900 text-slate-500 border-slate-800"
                        }`}>
                          {isCompleted ? "✓" : idx + 1}
                        </div>
                      </div>
                      <span className={`text-[9px] block ${
                        isActive ? "text-slate-100 font-semibold" : "text-slate-500 font-mono"
                      }`}>
                        {ph}
                      </span>
                    </div>
                  );
                })}
              </div>

              {currentCandidate.stage === "Rejected" && (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded p-2 text-[10px] text-rose-300 flex items-center gap-1.5 font-mono">
                  <span className="w-1.5 h-1.5 rounded bg-rose-500"></span>
                  Your application has been paused by the recruiter. Check the review box on the right for suggestions.
                </div>
              )}

            </div>

            {/* Profile specifications card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-900 space-y-1.5">
                <span className="text-[10px] text-slate-500 block font-mono">My Technologies Pool:</span>
                <div className="flex flex-wrap gap-1.5">
                  {currentCandidate.skills.map(sk => (
                    <span key={sk} className="bg-slate-900 border border-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px] font-mono">
                      {sk}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-900 space-y-1.5">
                <span className="text-[10px] text-slate-500 block font-mono">My Education:</span>
                <div className="space-y-1">
                  {currentCandidate.education.map((ed, i) => (
                    <p key={i} className="text-[10px] text-slate-300 flex items-center gap-1 font-display">
                      <BookOpen className="w-3 h-3 text-slate-500" />
                      {ed}
                    </p>
                  ))}
                  <p className="text-[9px] text-slate-500 mt-1 block">Verified credentials badge &middot; REDROB</p>
                </div>
              </div>
            </div>

          </div>
        ) : (
          
          /* NEW ADMISSIONS BOARD: Drag-and-drop resume uploader */
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-5">
            <div>
              <h1 className="text-base font-bold text-white font-display">
                Create Candidate Proﬁle & Apply
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Upload your unstructured resume file (PDF, TXT, DOCX) and our intelligence model will auto-parse it into a robust structured applicant schema instantly.
              </p>
            </div>

            {/* Drag & Drop Canvas */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer relative ${
                isDragOver 
                  ? "border-emerald-400 bg-emerald-500/5" 
                  : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
              }`}
            >
              <input
                type="file"
                id="resume_file_uploader"
                accept=".pdf,.txt,.docx"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />

              {isParsing ? (
                <div className="space-y-3">
                  <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs text-slate-200 font-mono animate-pulse">Running Neural CV Parser & Extraction Algorithms...</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <Upload className="w-8 h-8 text-slate-500 mx-auto" />
                  <div>
                    <p className="text-xs text-slate-200">
                      Drag &amp; Drop Resume File or <span className="text-emerald-400 underline font-medium">Browse Files</span>
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">Supports PDF, DOCX, TXT formats up to 12MB</p>
                  </div>
                </div>
              )}
            </div>

            {uploadError && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded font-mono">
                {uploadError}
              </div>
            )}

            {/* MANUAL PROFILE CREATOR OR FALLBACK SIGNUP */}
            <div className="pt-4 border-t border-slate-800 text-center">
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                Create Profile Manually (No Resume File)
              </button>
            </div>

          </div>
        )}

        {/* FEEDBACK LOOP AND EXECUTIVE SUGGESTIONS */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-display flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            AI Skill-Gap & Recruiter Suggestions Loop
          </h2>

          {currentCandidate ? (
            <div className="space-y-3">
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-950 space-y-2">
                <p className="text-[10px] text-slate-500 uppercase font-mono font-bold">Feedback from Human Recruiter:</p>
                <p className="text-xs text-slate-300 italic">
                  &quot;{currentCandidate.recruiterFeedback || "Draft credentials submitted successfully. Pre-screening is actively taking place. Please review the recommended actions below to gain priority alignment."}&quot;
                </p>
              </div>

              {/* Artificial Suggestions box bridging gaps */}
              <div className="p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/10 space-y-2">
                <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase block">RECOMMENDED SKILL-BRIDGE MODULES:</span>
                
                {(() => {
                  const appliedJob = jobs.find(j => j.id === currentCandidate.jobId);
                  if (appliedJob) {
                    const missingSkills = appliedJob.mustHaveSkills.filter(sk => 
                      !currentCandidate.skills.some(userSk => userSk.toLowerCase() === sk.toLowerCase())
                    );
                    
                    if (missingSkills.length > 0) {
                      return (
                        <div className="space-y-1">
                          <p className="text-xs text-slate-300">
                            The target role <span className="font-bold text-slate-200">{appliedJob.title}</span> requires deep components listed below. Consider adding them to your skills list once achieved:
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {missingSkills.map(sk => (
                              <span key={sk} className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[9px] font-mono px-1.5 py-0.2 rounded">
                                + Add {sk}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    }
                  }
                  return (
                    <p className="text-xs text-slate-400">
                      No matching gaps for your targeted job. You possess 100% of the core required stack!
                    </p>
                  );
                })()}

              </div>
            </div>
          ) : (
            <div className="p-3 text-center text-slate-500 text-xs bg-slate-950/40 rounded border border-transparent">
              Log in or upload a CV to receive tailored skill analyses.
            </div>
          )}
        </div>

      </div>

      {/* RIGHT COLUMN: Profile Review / Edit Form Fallback */}
      <div className="lg:col-span-4 space-y-4">
        
        {isEditing ? (
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white font-display">
                Edit Structured Profile Form
              </h3>
              <button onClick={handleCancelEdit} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
              
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-slate-600"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Verified Email Channel</label>
                <input
                  type="email"
                  disabled
                  value={editForm.email}
                  className="w-full bg-slate-950 border border-slate-900 rounded p-2 text-slate-500 cursor-not-allowed"
                />
                <span className="text-[9px] text-slate-500 font-mono block mt-1">Email is locked to user account credentials.</span>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Total Career Experience (Years)</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={editForm.experienceYears}
                  onChange={(e) => setEditForm({ ...editForm, experienceYears: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Target Job Description Opening</label>
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-300 focus:outline-none"
                >
                  {jobs.map(j => (
                    <option key={j.id} value={j.id}>{j.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">My Technologies (comma-separated list)</label>
                <input
                  type="text"
                  placeholder="Python, FastAPI, Machine Learning, PyTorch"
                  value={editForm.skillsInput}
                  onChange={(e) => setEditForm({ ...editForm, skillsInput: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Highest Academics / Education</label>
                <input
                  type="text"
                  placeholder="e.g. B.Tech in CS - IIT Madras"
                  value={editForm.educationInput}
                  onChange={(e) => setEditForm({ ...editForm, educationInput: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Major Completed Projects (period-separated list)</label>
                <textarea
                  rows={2}
                  placeholder="LLM contract parsing. Real-time predictive analytics dashboard."
                  value={editForm.projectsInput}
                  onChange={(e) => setEditForm({ ...editForm, projectsInput: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Original Resume Base Text (cognitive reference)</label>
                <textarea
                  rows={3}
                  value={editForm.resumeText}
                  onChange={(e) => setEditForm({ ...editForm, resumeText: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-slate-600"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-3 bg-slate-950 border border-slate-800 rounded text-slate-400 text-xs py-1.5 cursor-pointer"
                >
                  Discard Changes
                </button>
                <button
                  type="submit"
                  className="px-4 bg-emerald-500 text-slate-950 font-bold rounded text-xs py-1.5 cursor-pointer hover:bg-emerald-400 transition-colors"
                >
                  Save Profile & Apply
                </button>
              </div>

            </form>

          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-display">
              Candidate Account Hub
            </h3>
            <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-950 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-xs text-white">
                  {currentCandidate?.name || "Unstructured Guest Account"}
                </p>
                <p className="text-[10px] text-slate-400 font-mono">My ID Key: {currentUserEmail}</p>
              </div>
            </div>

            <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-900 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-mono block">Recruiter Status:</span>
              <p className="text-xs font-bold text-slate-300">
                {currentCandidate ? `${currentCandidate.stage} Phase` : "No Active Application Filed"}
              </p>
              <p className="text-[9px] text-slate-500 mt-1 block">
                Once submitted, candidates are ranked inside the matching pipeline instantly.
              </p>
            </div>
            
          </div>
        )}

      </div>

    </div>
  );
}
