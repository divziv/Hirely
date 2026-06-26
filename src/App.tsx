/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { AppRole, Job, Candidate } from "./types";
import AuthPanel from "./components/AuthPanel";
import RecruiterDashboard from "./components/RecruiterDashboard";
import CandidateDashboard from "./components/CandidateDashboard";
import AnalyticsPanel from "./components/AnalyticsPanel";
import SkillVerificationQuiz from "./components/SkillVerificationQuiz";
import { 
  Sparkles, LogOut, Briefcase, User, Activity, Globe, RefreshCcw, HelpCircle, Sun, Moon 
} from "lucide-react";

export default function App() {
  // Theme State
  const [theme, setTheme] = useState<"dark" | "light">(
    () => (localStorage.getItem("theme") as "dark" | "light") || "dark"
  );

  useEffect(() => {
    localStorage.setItem("theme", theme);
    if (theme === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  }, [theme]);

  // Global States
  const [role, setRole] = useState<AppRole | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  // State for handling active skill verification from url query params
  const [verificationQuery, setVerificationQuery] = useState<{
    candId: string;
    skillName: string;
    reqId: string;
  } | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const candId = params.get("candId");
    const skillName = params.get("skillName");
    const reqId = params.get("reqId");
    if (candId && skillName && reqId) {
      return { candId, skillName, reqId };
    }
    return null;
  });
  
  // Tab states for Recruiter Workspace ("discover" | "analytics")
  const [recruiterActiveTab, setRecruiterActiveTab] = useState<"discover" | "analytics">("discover");

  const [isLoading, setIsLoading] = useState(false);
  const [sysStatus, setSysStatus] = useState<string>("OK");
  const [notifyMsg, setNotifyMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Trigger self-dismissing alerts
  const showAlert = (text: string, type: "success" | "error" = "success") => {
    setNotifyMsg({ text, type });
    setTimeout(() => {
      setNotifyMsg(null);
    }, 4000);
  };

  // Fetch raw jobs and candidate lists from Express full-stack APIs
  const refreshWorkspaceData = async () => {
    setIsLoading(true);
    try {
      const [jobsRes, candidatesRes] = await Promise.all([
        fetch("/api/jobs"),
        fetch("/api/candidates")
      ]);

      if (jobsRes.ok && candidatesRes.ok) {
        const jobsData = await jobsRes.json();
        const candidatesData = await candidatesRes.json();
        setJobs(jobsData);
        setCandidates(candidatesData);
        setSysStatus("OK");
      } else {
        setSysStatus("Degraded");
        console.warn("Express data endpoints returned incomplete payload.");
      }
    } catch (err: any) {
      setSysStatus("Offline");
      showAlert("Offline mode: Database is currently local to memory.", "error");
      console.warn("Server communication error, fallbacks running:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshWorkspaceData();
  }, []);

  // Handle Auth selection triggers
  const handleUserLogin = (selectedRole: AppRole, email: string) => {
    setRole(selectedRole);
    setUserEmail(email);
    showAlert(`Logged in successfully as ${selectedRole === "recruiter" ? "Recruiting Director" : "Verified Candidate"}`);
  };

  const handleUserLogout = () => {
    setRole(null);
    setUserEmail("");
    showAlert("Logged out successfully from talent space.");
  };

  // Recruiter action API proxy: Publish JD
  const handlePublishJob = async (jobData: Partial<Job>) => {
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jobData)
      });
      if (res.ok) {
        showAlert("Job Posting indexed successfully into Redrob vector DB!");
        await refreshWorkspaceData();
      } else {
        throw new Error("Publishing endpoint failed.");
      }
    } catch (err) {
      // Local fallback in memory safely
      const mockNewJob: Job = {
        id: "job-" + Date.now(),
        title: jobData.title || "Technical Engineer",
        company: jobData.company || "Redrob AI",
        location: jobData.location || "Remote",
        experienceRequired: jobData.experienceRequired || 3,
        roleType: jobData.roleType || "Full-time",
        domain: jobData.domain || "AI",
        description: jobData.description || "",
        mustHaveSkills: jobData.mustHaveSkills || [],
        niceToHaveSkills: jobData.niceToHaveSkills || []
      };
      setJobs([...jobs, mockNewJob]);
      showAlert("Job Posting saved to local fallback memory successfully!");
    }
  };

  // Recruiter action API proxy: Update matching phase (applied -> shortlist -> interview -> final -> offer)
  const handleUpdateCandidateStage = async (candId: string, stage: string, interviewStage?: string) => {
    try {
      const res = await fetch(`/api/candidates/${candId}/stage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage, interviewStage })
      });
      if (res.ok) {
        showAlert(`Evaluated candidate pipeline stage updated to: ${stage}`);
        await refreshWorkspaceData();
      } else {
        throw new Error("Update stage endpoint failed.");
      }
    } catch (err) {
      // Memory state fallback update
      setCandidates(candidates.map(c => c.id === candId ? { ...c, stage, interviewStage } : c));
      showAlert(`Stage updated to ${stage} in active workspace state!`);
    }
  };

  // Recruiter action API proxy: Edit private logs, ratings & candidate diagnostics
  const handleCommitCandidateNotes = async (
    candId: string, 
    notes: string, 
    feedback: string, 
    signals: Record<string, number>
  ) => {
    try {
      const res = await fetch(`/api/candidates/${candId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recruiterNotes: notes,
          recruiterFeedback: feedback,
          behavioralSignals: signals
        })
      });
      if (res.ok) {
        showAlert("Professional reviews and suggestions synchronized cleanly.");
        await refreshWorkspaceData();
      } else {
        throw new Error("Notes endpoint failed.");
      }
    } catch (err) {
      // Memory state fallback update
      setCandidates(candidates.map(c => 
        c.id === candId 
          ? { 
              ...c, 
              recruiterNotes: notes, 
              recruiterFeedback: feedback, 
              behavioralSignals: { ownership: signals.ownership, leadership: signals.leadership, collaboration: signals.collaboration } 
            } 
          : c
      ));
      showAlert("Review logs saved to local memory state.");
    }
  };

  // Candidate action API proxy: Update personal profile manually
  const handleCandidateProfileUpdate = async (candidateData: Partial<Candidate>) => {
    try {
      const res = await fetch("/api/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(candidateData)
      });
      if (res.ok) {
        showAlert("Your application profile has been synced with Redrob's matching pool.");
        await refreshWorkspaceData();
      } else {
        throw new Error("Update profile endpoint failed.");
      }
    } catch (err) {
      // Memory state fallback insert
      const existingCandIdx = candidates.findIndex(c => c.email.toLowerCase() === candidateData.email?.toLowerCase());
      const updatedCand: Candidate = {
        id: existingCandIdx !== -1 ? candidates[existingCandIdx].id : "cand-" + Date.now(),
        name: candidateData.name || "Default candidate",
        email: candidateData.email || "",
        skills: candidateData.skills || [],
        experienceYears: candidateData.experienceYears || 0,
        education: candidateData.education || [],
        projects: candidateData.projects || [],
        experience: candidateData.experience || [],
        resumeText: candidateData.resumeText || "",
        behavioralSignals: existingCandIdx !== -1 ? candidates[existingCandIdx].behavioralSignals : { ownership: 4, leadership: 4, collaboration: 4 },
        jobId: candidateData.jobId || "job-001",
        stage: existingCandIdx !== -1 ? candidates[existingCandIdx].stage : "Applied",
        interviewStage: existingCandIdx !== -1 ? candidates[existingCandIdx].interviewStage : "None",
        recruiterNotes: existingCandIdx !== -1 ? candidates[existingCandIdx].recruiterNotes : "",
        recruiterFeedback: existingCandIdx !== -1 ? candidates[existingCandIdx].recruiterFeedback : "Pre-screening processing.",
        appliedDate: existingCandIdx !== -1 ? candidates[existingCandIdx].appliedDate : new Date().toISOString().split("T")[0]
      };

      if (existingCandIdx !== -1) {
        const copy = [...candidates];
        copy[existingCandIdx] = updatedCand;
        setCandidates(copy);
      } else {
        setCandidates([...candidates, updatedCand]);
      }
      showAlert("Profile registered in local candidate workspace state!");
    }
  };

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between ${theme}`}>
      
      {/* 1. TOP PREMIUM HEADER BAR */}
      <header className="border-b border-slate-900 bg-slate-900/40 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo Branding / INDIA RUNS theme */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-white text-sm font-display flex items-center gap-1.5">
                HIRELY
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 rounded-full font-bold">
                  Track 01
                </span>
              </span>
              <p className="text-[9px] text-slate-500 tracking-wider uppercase font-mono">
                The Data & AI Challenge
              </p>
            </div>
          </div>

          {/* Dynamic workspace context */}
          {role ? (
            <div className="flex items-center gap-4">
              
              {/* Recruiter specific menu tabs */}
              {role === "recruiter" && (
                <div className="hidden sm:flex bg-slate-950 p-1 rounded-lg border border-slate-900 text-xs">
                  <button
                    onClick={() => setRecruiterActiveTab("discover")}
                    className={`px-3 py-1 rounded-md transition-all cursor-pointer font-medium ${
                      recruiterActiveTab === "discover"
                        ? "bg-slate-800 text-white border border-slate-700"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Shortlist & Screen
                  </button>
                  <button
                    onClick={() => setRecruiterActiveTab("analytics")}
                    className={`px-3 py-1 rounded-md transition-all cursor-pointer font-medium ${
                      recruiterActiveTab === "analytics"
                        ? "bg-slate-800 text-white border border-slate-700"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Pipeline Metrics
                  </button>
                </div>
              )}

              {/* Status and Logged information */}
              <div className="flex items-center gap-3">
                {/* Theme Toggle Button */}
                <button
                  onClick={() => setTheme(prev => prev === "dark" ? "light" : "dark")}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center justify-center"
                  title={theme === "dark" ? "Switch to High-Contrast Light Mode" : "Switch to Dark Mode"}
                >
                  {theme === "dark" ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-400" />}
                </button>

                <span className="text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2 py-1 rounded-full hidden md:inline">
                  Active ID: {userEmail}
                </span>

                <button
                  onClick={handleUserLogout}
                  className="px-2.5 py-1 text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Logout
                </button>
              </div>

            </div>
          ) : (
            <div className="flex items-center gap-3">
              {/* Theme Toggle for Unauthenticated users too */}
              <button
                onClick={() => setTheme(prev => prev === "dark" ? "light" : "dark")}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center justify-center"
                title={theme === "dark" ? "Switch to High-Contrast Light Mode" : "Switch to Dark Mode"}
              >
                {theme === "dark" ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-400" />}
              </button>

              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                  Awaiting Auth Context
                </span>
              </div>
            </div>
          )}

        </div>
      </header>

      {/* 2. DYNAMIC FLOATING NOTIFICATIONS TOAST */}
      {notifyMsg && (
        <div className="fixed top-20 right-4 z-50 bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-2xl max-w-sm animate-bounce text-xs font-mono flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${notifyMsg.type === "success" ? "bg-emerald-400" : "bg-rose-500"}`}></span>
          <p className="text-slate-200">{notifyMsg.text}</p>
        </div>
      )}

      {/* 3. MAIN WORKSPACE CONTAINER */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-6">
        
        {/* If a skill verification query is present, show the assessment page directly */}
        {verificationQuery ? (
          <div className="flex flex-col items-center justify-center py-12 animate-fadeIn">
            <SkillVerificationQuiz
              candId={verificationQuery.candId}
              skillName={verificationQuery.skillName}
              reqId={verificationQuery.reqId}
              onComplete={() => {
                showAlert("Technical skill level successfully verified and elevated!", "success");
                // Clear query params
                window.history.replaceState({}, document.title, window.location.pathname);
                setVerificationQuery(null);
                refreshWorkspaceData();
              }}
            />
          </div>
        ) : !role ? (
          <AuthPanel 
            onLogin={handleUserLogin} 
            defaultCandidateEmail="20h51a6677@gmail.com" 
          />
        ) : (
          
          /* If active session represents Candidate Hub */
          role === "candidate" ? (
            <CandidateDashboard
              jobs={jobs}
              currentUserEmail={userEmail}
              candidates={candidates}
              onRefreshData={refreshWorkspaceData}
              onUpdateCandidateProfile={handleCandidateProfileUpdate}
            />
          ) : (
            
            /* If active session represents Recruiter Suite */
            recruiterActiveTab === "discover" ? (
              <RecruiterDashboard
                jobs={jobs}
                candidates={candidates}
                onRefreshData={refreshWorkspaceData}
                onPostJob={handlePublishJob}
                onUpdateCandidateStage={handleUpdateCandidateStage}
                onSaveCandidateNotes={handleCommitCandidateNotes}
              />
            ) : (
              <AnalyticsPanel jobs={jobs} candidates={candidates} />
            )

          )

        )}

      </main>

      {/* 4. PREMIUM COMPOSURE FOOTER DETAIL */}
      <footer className="border-t border-slate-900 bg-slate-950 py-5 text-center px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-slate-500 text-[10px] font-mono">
          <p>&copy; 2026 Redrob AI Intelligent Talent Acquisition platform.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              India Runs Hackathon Suite
            </span>
            <span>&middot;</span>
            <span className="text-slate-400">Track 01 &mdash; The Data & AI Challenge</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
