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

  const handleSocialLogin = (provider: string) => {
    // Generate simulated role-specific authentication profiles
    if (selectedRole === "recruiter") {
      const mockEmail = `${provider.toLowerCase()}.lead@hirely.com`;
      onLogin("recruiter", mockEmail);
    } else {
      const mockEmail = `${provider.toLowerCase()}.talent@hirely.com`;
      onLogin("candidate", mockEmail);
    }
  };

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
      <div className="max-w-md w-full space-y-7 bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl relative overflow-hidden">
        
        {/* Glow decoration */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl"></div>

        {/* Header Branding */}
        <div className="text-center space-y-1 relative z-10">
          <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center mx-auto mb-2">
            <Sparkles className="w-6 h-6 text-emerald-400 animate-pulse" />
          </div>
          <h1 className="text-2xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-emerald-400 font-display">
            HIRELY
          </h1>
          <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
            Leveraging neural parsing, FAISS cosine matching & weighted talent scores.
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

        {/* Social Authentication Providers */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="px-3 text-[9px] text-slate-500 uppercase font-mono tracking-widest">or sign in with</span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleSocialLogin("Google")}
              type="button"
              className="px-3 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 rounded-lg text-[10px] font-medium text-slate-300 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-rose-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.41 0-6.173-2.763-6.173-6.173s2.763-6.173 6.173-6.173c1.558 0 2.979.58 4.07 1.536l3.056-3.056C19.227 2.378 15.932 1|12.24 1c-6.76 0-12.24 5.48-12.24 13.24s5.48 12.24 12.24 12.24c6.8 0 12.24-5.44 12.24-12.24 0-.816-.068-1.632-.204-2.435H12.24z"/>
              </svg>
              Google
            </button>
            <button
              onClick={() => handleSocialLogin("GitHub")}
              type="button"
              className="px-3 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 rounded-lg text-[10px] font-medium text-slate-300 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub
            </button>
            <button
              onClick={() => handleSocialLogin("LinkedIn")}
              type="button"
              className="px-3 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 rounded-lg text-[10px] font-medium text-slate-300 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-sky-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
              LinkedIn
            </button>
          </div>
        </div>

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
