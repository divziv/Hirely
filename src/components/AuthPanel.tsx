/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Sparkles, Briefcase, User, Info, ArrowRight, TrendingUp } from "lucide-react";
import { AppRole } from "../types";

interface AuthPanelProps {
  onLogin: (role: AppRole, email: string) => void;
  defaultCandidateEmail: string;
}

export default function AuthPanel({ onLogin, defaultCandidateEmail }: AuthPanelProps) {
  const [selectedRole, setSelectedRole] = useState<AppRole>("recruiter");
  const [candidateEmail, setCandidateEmail] = useState(defaultCandidateEmail || "talent.india@gmail.com");
  const [recruiterEmail, setRecruiterEmail] = useState("recruiting.lead@redrob.ai");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRole === "recruiter") {
      onLogin("recruiter", recruiterEmail);
    } else {
      onLogin("candidate", candidateEmail);
    }
  };

  return (
    <div id="auth_panel_screen" className="min-h-[80vh] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl relative overflow-hidden">
        
        {/* Glow decoration */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl"></div>

        {/* Header Branding */}
        <div className="text-center space-y-2 relative z-10">
          <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6 text-emerald-400 animate-pulse" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-white font-display">
            Intelligent Candidate Discovery
          </h1>
          <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
            Leveraging neural parsing, cosine talent matching & weighted skill scoring.
          </p>
        </div>

        {/* Selection Switch Tab */}
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-lg border border-slate-900 my-4">
          <button
            type="button"
            onClick={() => setSelectedRole("recruiter")}
            className={`py-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
              selectedRole === "recruiter"
                ? "bg-slate-800 text-white shadow-md border border-slate-700"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            Recruiter Login
          </button>
          <button
            type="button"
            onClick={() => setSelectedRole("candidate")}
            className={`py-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
              selectedRole === "candidate"
                ? "bg-slate-800 text-white shadow-md border border-slate-700"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Candidate Hub
          </button>
        </div>

        {/* Dynamic Sign-in Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {selectedRole === "recruiter" ? (
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-mono">Recruiter ID Key</label>
                <input
                  type="email"
                  required
                  value={recruiterEmail}
                  onChange={(e) => setRecruiterEmail(e.target.value)}
                  className="w-full text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-slate-600"
                />
              </div>
              <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-950 text-[10px]/relaxed text-slate-400 space-y-1">
                <span className="text-emerald-400 font-bold block mb-0.5">RECRUITER SUITE PRIVILEGES:</span>
                <p>&middot; Publish custom Job Descriptions (JDs)</p>
                <p>&middot; Review in-browser candidate resume transcripts without downloads</p>
                <p>&middot; Update status logs & view dynamic comparative scores</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-mono">My Account Email</label>
                <input
                  type="email"
                  required
                  value={candidateEmail}
                  onChange={(e) => setCandidateEmail(e.target.value)}
                  placeholder="e.g. candidate@example.com"
                  className="w-full text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-slate-600"
                />
              </div>
              <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-950 text-[10px]/relaxed text-slate-400 space-y-1">
                <span className="text-blue-400 font-bold block mb-0.5">CANDIDATE PRIVILEGES:</span>
                <p>&middot; Drag-and-drop unstructured curriculum vitae uploads</p>
                <p>&middot; Extract structured skill profile data & manually edit details</p>
                <p>&middot; Track live recruiter screening status loop & review gap advice</p>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 px-4 border border-transparent rounded-lg text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 font-sans shadow-lg shadow-emerald-400/10 hover:shadow-emerald-400/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            Enter Platform Workspace
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Redrob India Runs Meta Footer details */}
        <div className="pt-4 border-t border-slate-800 text-center flex flex-col items-center gap-1">
          <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">India Runs REDROB AI Hackathon Series</span>
          <p className="text-[8px] text-slate-400 max-w-xs leading-normal">
            Evaluating contextual semantic similarities with Weighted Matching matrices. Developed for global recruiter scale.
          </p>
        </div>

      </div>
    </div>
  );
}
