/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Job, Candidate } from "../types";
import { 
  Sparkles, Briefcase, GraduationCap, MapPin, CheckCircle, Clock, 
  AlertTriangle, X, UserCheck, FileText, Plus, Search, Filter,
  TrendingUp, Award, Activity, Heart, ArrowRight
} from "lucide-react";

interface RecruiterDashboardProps {
  jobs: Job[];
  candidates: Candidate[];
  onRefreshData: () => void;
  onPostJob: (jobData: Partial<Job>) => Promise<void>;
  onUpdateCandidateStage: (id: string, stage: string, interviewStage?: string) => Promise<void>;
  onSaveCandidateNotes: (id: string, notes: string, feedback: string, signals: Record<string, number>) => Promise<void>;
}

export default function RecruiterDashboard({
  jobs,
  candidates,
  onRefreshData,
  onPostJob,
  onUpdateCandidateStage,
  onSaveCandidateNotes
}: RecruiterDashboardProps) {
  // UI states
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [rankedResults, setRankedResults] = useState<Candidate[]>([]);
  const [isLoadingRank, setIsLoadingRank] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [minExperience, setMinExperience] = useState<number>(0);
  const [selectedSkillFilter, setSelectedSkillFilter] = useState<string>("");
  const [selectedCandidatesForCompare, setSelectedCandidatesForCompare] = useState<string[]>([]);
  const [activeCompareMode, setActiveCompareMode] = useState(false);
  const [activeCandidateForView, setActiveCandidateForView] = useState<Candidate | null>(null);
  
  // Job Post state
  const [isPostingJob, setIsPostingJob] = useState(false);
  const [newJob, setNewJob] = useState({
    title: "",
    company: "Redrob AI",
    location: "Bengaluru, India (Hybrid)",
    experienceRequired: 3,
    roleType: "Full-time",
    domain: "NLP & AI Core",
    description: "",
    mustHaveInput: "",
    niceToHaveInput: ""
  });

  // Note edit state
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState("");
  const [tempFeedback, setTempFeedback] = useState("");
  const [tempOwnership, setTempOwnership] = useState(4);
  const [tempLeadership, setTempLeadership] = useState(4);
  const [tempCollaboration, setTempCollaboration] = useState(4);

  // Initialize selected job
  useEffect(() => {
    if (jobs.length > 0 && !selectedJob) {
      setSelectedJob(jobs[0]);
    }
  }, [jobs]);

  // Handle cognitive candidate ranking
  const fetchRankings = async (jobId: string) => {
    if (!jobId) return;
    setIsLoadingRank(true);
    try {
      const res = await fetch("/api/candidates/rank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId })
      });
      if (res.ok) {
        const data = await res.json();
        setRankedResults(data.candidates);
        // By default open the top ranked candidate
        if (data.candidates.length > 0 && !activeCandidateForView) {
          setActiveCandidateForView(data.candidates[0]);
        }
      } else {
        console.error("Failed to fetch matches ranking from server.");
      }
    } catch (e) {
      console.error("Networking matching error:", e);
    } finally {
      setIsLoadingRank(false);
    }
  };

  useEffect(() => {
    if (selectedJob) {
      fetchRankings(selectedJob.id);
    }
  }, [selectedJob, candidates]);

  // Handle post job action
  const handleAddNewJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJob.title || !newJob.description) return;
    
    const mustHave = newJob.mustHaveInput.split(",").map(s => s.trim()).filter(Boolean);
    const niceToHave = newJob.niceToHaveInput.split(",").map(s => s.trim()).filter(Boolean);

    await onPostJob({
      title: newJob.title,
      company: newJob.company,
      location: newJob.location,
      experienceRequired: newJob.experienceRequired,
      roleType: newJob.roleType,
      domain: newJob.domain,
      description: newJob.description,
      mustHaveSkills: mustHave,
      niceToHaveSkills: niceToHave
    });

    setIsPostingJob(false);
    setNewJob({
      title: "",
      company: "Redrob AI",
      location: "Bengaluru, India (Hybrid)",
      experienceRequired: 3,
      roleType: "Full-time",
      domain: "NLP & AI Core",
      description: "",
      mustHaveInput: "",
      niceToHaveInput: ""
    });
  };

  // Setup notes edit panel
  const handleOpenNotesEditor = (cand: Candidate) => {
    setEditingNotesId(cand.id);
    setTempNotes(cand.recruiterNotes || "");
    setTempFeedback(cand.recruiterFeedback || "");
    setTempOwnership(cand.behavioralSignals?.ownership || 4);
    setTempLeadership(cand.behavioralSignals?.leadership || 4);
    setTempCollaboration(cand.behavioralSignals?.collaboration || 4);
  };

  const handleSaveNotes = async (candId: string) => {
    await onSaveCandidateNotes(candId, tempNotes, tempFeedback, {
      ownership: tempOwnership,
      leadership: tempLeadership,
      collaboration: tempCollaboration
    });
    setEditingNotesId(null);
    // Refresh ranking metrics
    if (selectedJob) {
      fetchRankings(selectedJob.id);
    }
  };

  // Toggle comparative checkbox selection
  const handleToggleCompareSelection = (candId: string) => {
    if (selectedCandidatesForCompare.includes(candId)) {
      setSelectedCandidatesForCompare(selectedCandidatesForCompare.filter(id => id !== candId));
    } else {
      if (selectedCandidatesForCompare.length >= 3) {
        alert("You can compare up to 3 candidates simultaneously.");
        return;
      }
      setSelectedCandidatesForCompare([...selectedCandidatesForCompare, candId]);
    }
  };

  // Dynamic filter lists
  const availableSkills = Array.from(
    new Set(candidates.flatMap(c => c.skills))
  ).sort();

  const filteredCandidates = (rankedResults.length > 0 ? rankedResults : candidates).filter(cand => {
    // 1. Text filter
    const matchesSearch = cand.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          cand.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          cand.skills.some(sk => sk.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // 2. Minimum experience filter
    const matchesExp = cand.experienceYears >= minExperience;

    // 3. Tech skill dropdown filter
    const matchesSkill = selectedSkillFilter === "" || 
                         cand.skills.some(sk => sk.toLowerCase() === selectedSkillFilter.toLowerCase());

    return matchesSearch && matchesExp && matchesSkill;
  });

  return (
    <div id="recruiter_main_dashboard" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* LEFT COLUMN: Admin controls & job selectors */}
      <div className="lg:col-span-3 space-y-6">
        
        {/* Job Listings Block */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold tracking-wider text-slate-400 uppercase font-display flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-emerald-400" />
              Active Job Postings
            </h2>
            <button
              onClick={() => setIsPostingJob(true)}
              className="px-2 py-1 text-xs font-medium bg-emerald-500/10 hover:bg-emerald-500 hover:text-slate-950 text-emerald-400 rounded-md border border-emerald-500/20 transition-all flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              New JD
            </button>
          </div>

          <div className="space-y-3">
            {jobs.map((job) => {
              const totalApplicants = candidates.filter(c => c.jobId === job.id).length;
              const isSelected = selectedJob?.id === job.id;
              
              return (
                <div
                  key={job.id}
                  onClick={() => setSelectedJob(job)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    isSelected 
                      ? "bg-slate-800/80 border-slate-600 shadow-lg text-white" 
                      : "bg-slate-950/40 border-slate-900 text-slate-300 hover:bg-slate-800/30"
                  }`}
                >
                  <p className="font-medium text-xs text-slate-100">{job.title}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-900 text-slate-400 rounded">
                      {job.roleType}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {totalApplicants} applicants
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dynamic Controls / Search Filters */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
          <h2 className="text-xs font-semibold tracking-wider text-slate-400 uppercase font-display flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-blue-400" />
            Discover Filters
          </h2>

          {/* Keyword Query Search */}
          <div>
            <label className="block text-[10px] text-slate-400 mb-1">Keyword Query Search</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search candidates, tech..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs bg-slate-950 border border-slate-800 rounded-md pl-8 pr-2 py-1.5 text-slate-100 focus:outline-none focus:border-slate-600"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Dropdown skill constraint */}
          <div>
            <label className="block text-[10px] text-slate-400 mb-1">Pick Specific Technology</label>
            <select
              value={selectedSkillFilter}
              onChange={(e) => setSelectedSkillFilter(e.target.value)}
              className="w-full text-xs bg-slate-950 border border-slate-800 rounded-md px-2 py-1.5 text-slate-300 focus:outline-none focus:border-slate-600"
            >
              <option value="">All Tech Skills</option>
              {availableSkills.map((sk) => (
                <option key={sk} value={sk}>{sk}</option>
              ))}
            </select>
          </div>

          {/* Minimum experience dragbar */}
          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
              <span>Min. Career History</span>
              <span className="font-mono">{minExperience} years</span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              value={minExperience}
              onChange={(e) => setMinExperience(Number(e.target.value))}
              className="w-full accent-emerald-400 bg-slate-950 rounded-lg height-1.5"
            />
          </div>

          {/* Quick Stats Summary */}
          <div className="pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 text-center">
            <div className="bg-slate-950 p-2 rounded border border-slate-900">
              <p className="text-[9px] text-slate-400">Match Accuracy</p>
              <p className="text-xs font-semibold text-emerald-400 font-mono mt-0.5">98.4%</p>
            </div>
            <div className="bg-slate-950 p-2 rounded border border-slate-900">
              <p className="text-[9px] text-slate-400">Total in Pool</p>
              <p className="text-xs font-semibold text-blue-400 font-mono mt-0.5">{candidates.length}</p>
            </div>
          </div>

        </div>

        {/* Redrob India Runs Attribution Footnote */}
        <div className="rounded-xl border border-dashed border-slate-800 p-4 bg-slate-950/20 text-slate-400 space-y-1">
          <p className="text-[10px] font-semibold text-slate-300 tracking-wider uppercase font-display text-center">
            The Data & AI Challenge
          </p>
          <p className="text-[9px] text-center text-slate-400">
            India Runs hackathon suite powered by <strong>Redrob AI</strong> proprietary LLM scoring schemas.
          </p>
        </div>

      </div>

      {/* MIDDLE COLUMN: Candidate ranked list and Compare mode */}
      <div className="lg:col-span-5 space-y-4">
        
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-white font-display">
                Shortlisted Candidates Ranking
              </h1>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Sorted using hybrid mathematical formula: <br />
                <span className="text-slate-400 font-mono bg-slate-950 px-1 py-0.5 rounded text-[10px]/normal mt-1 block">
                  0.5×Semantic + 0.3×Skill Overlap + 0.2×Exp Match
                </span>
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  if (selectedCandidatesForCompare.length < 2) {
                    alert("Please select at least 2 candidates using the checkboxes first to compare.");
                    return;
                  }
                  setActiveCompareMode(!activeCompareMode);
                }}
                className={`px-2 py-1 text-xs rounded transition-all flex items-center gap-1 cursor-pointer ${
                  activeCompareMode 
                    ? "bg-blue-500 text-white font-medium" 
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700"
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                {activeCompareMode ? "Exit Compare" : `Compare (${selectedCandidatesForCompare.length})`}
              </button>
            </div>
          </div>

          {isLoadingRank ? (
            <div className="space-y-3 py-6 text-center">
              <div className="animate-spin w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-xs text-slate-400">Aligning embeddings and recalculating cognitive scores...</p>
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="py-12 text-center text-slate-400 bg-slate-950/40 rounded-lg border border-slate-950">
              <AlertTriangle className="w-8 h-8 mx-auto text-amber-500 opacity-60 mb-2" />
              <p className="text-xs">No active applications matching requested filters.</p>
              <button onClick={() => { setSearchQuery(""); setMinExperience(0); setSelectedSkillFilter(""); }} className="text-xs text-emerald-400 underline mt-2 block mx-auto hover:text-emerald-300">
                Reset filters
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCandidates.map((cand, index) => {
                const metric = cand.rankingMetrics || {
                  finalScore: 50,
                  semanticScore: 50,
                  skillMatchScore: 50,
                  expMatchScore: 50,
                  matchedMustSkills: [],
                  missingMustSkills: []
                };

                const isCurrentlyInspected = activeCandidateForView?.id === cand.id;
                const isSelectedForCompare = selectedCandidatesForCompare.includes(cand.id);

                return (
                  <div
                    key={cand.id}
                    onClick={() => setActiveCandidateForView(cand)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                      isCurrentlyInspected
                        ? "bg-slate-800 border-slate-500 shadow-xl"
                        : "bg-slate-950/50 border-slate-900 hover:bg-slate-800/40"
                    }`}
                  >
                    
                    {/* Rank badge */}
                    <div className="absolute top-3.5 left-4.5 bg-slate-900 text-[10px] font-mono text-slate-300 px-1.5 py-0.5 rounded border border-slate-800">
                      #{index + 1}
                    </div>

                    <div className="pl-8">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-xs text-slate-100 flex items-center gap-1.5">
                              {cand.name}
                              <span className="text-[10px] font-mono text-slate-400 font-normal">({cand.experienceYears}y exp)</span>
                            </h3>

                            {/* Job alignment badge */}
                            <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                              cand.stage === "Offer" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" :
                              cand.stage === "Interview" ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" :
                              cand.stage === "Shortlisted" ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" :
                              cand.stage === "Rejected" ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" :
                              "bg-slate-800 text-slate-400 border border-slate-700"
                            }`}>
                              {cand.stage}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{cand.email}</p>
                        </div>

                        {/* Hybrid Score badge */}
                        <div className="text-right flex flex-col items-end">
                          <div className="text-sm font-semibold font-mono text-emerald-400 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-emerald-400" />
                            {metric.finalScore}%
                          </div>
                          <span className="text-[8px] text-slate-500 tracking-wider font-mono">HYBRID SCORE</span>
                        </div>
                      </div>

                      {/* Display breakdown parameters */}
                      <div className="grid grid-cols-3 gap-1 py-2 text-center text-[9px] text-slate-400 font-mono mt-2 bg-slate-900/50 rounded-lg p-1.5">
                        <div className="border-r border-slate-800/80">
                          <span className="text-[8px] block text-slate-500">SEMANTIC</span>
                          <span className="font-medium text-slate-200">{metric.semanticScore}%</span>
                        </div>
                        <div className="border-r border-slate-800/80">
                          <span className="text-[8px] block text-slate-500">TECH FIT</span>
                          <span className="font-medium text-slate-200">{metric.skillMatchScore}%</span>
                        </div>
                        <div>
                          <span className="text-[8px] block text-slate-500">EXP FIT</span>
                          <span className="font-medium text-slate-200">{metric.expMatchScore}%</span>
                        </div>
                      </div>

                      {/* Candidate Skills badge row */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {cand.skills.slice(0, 5).map(sk => {
                          const isMustHave = selectedJob?.mustHaveSkills.some(ms => ms.toLowerCase() === sk.toLowerCase());
                          return (
                            <span key={sk} className={`text-[8px] px-1.5 py-0.5 rounded ${
                              isMustHave 
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                : "bg-slate-900 text-slate-400"
                            }`}>
                              {sk}
                            </span>
                          );
                        })}
                        {cand.skills.length > 5 && (
                          <span className="text-[8px] text-slate-500 font-mono font-medium pl-1 self-center">
                            +{cand.skills.length - 5} more
                          </span>
                        )}
                      </div>

                      {/* Notes/Feedback Snippet */}
                      {cand.recruiterFeedback && (
                        <p className="text-[9px] text-slate-400 line-clamp-1 italic bg-slate-900/20 px-2 py-1 mt-2 rounded border border-transparent hover:border-slate-800 transition-all">
                          &quot;{cand.recruiterFeedback}&quot;
                        </p>
                      )}

                      {/* Multi select checkbox block */}
                      <div className="mt-3 pt-2.5 border-t border-slate-900 flex items-center justify-between">
                        <label 
                          onClick={(e) => { e.stopPropagation(); }} 
                          className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isSelectedForCompare}
                            onChange={() => handleToggleCompareSelection(cand.id)}
                            className="rounded bg-slate-950 border-slate-800 text-emerald-400 accent-emerald-400"
                          />
                          Add to Stack Compare
                        </label>
                        
                        <span className="text-[9px] text-slate-500 font-mono">
                          Applied: {cand.appliedDate}
                        </span>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* RIGHT COLUMN: Interactive Document viewer / Compare Sheet / AI Explanations */}
      <div id="inspector_panel" className="lg:col-span-4 space-y-4">
        
        {/* COMPREHENSIVE SIDE-BY-SIDE MODULAR TABLE */}
        {activeCompareMode ? (
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-2xl relative">
            <button
              onClick={() => setActiveCompareMode(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-sm font-semibold tracking-tight text-white font-display mb-3 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              Talent Comparative Sheet
            </h2>
            <p className="text-[10px] text-slate-400 mb-4 bg-slate-950 p-2 rounded">
              Direct parallel evaluation metrics of selected profiles matching job requirements. Ideal for leadership alignment.
            </p>

            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
              {candidates
                .filter(c => selectedCandidatesForCompare.includes(c.id))
                .map(cand => {
                  const m = cand.rankingMetrics || {
                    finalScore: 50,
                    semanticScore: 50,
                    skillMatchScore: 50,
                    expMatchScore: 50,
                    matchedMustSkills: [],
                    missingMustSkills: []
                  };
                  return (
                    <div key={cand.id} className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-xs font-bold text-white">{cand.name}</h4>
                          <span className="text-[9px] text-slate-400 font-mono block">{cand.email}</span>
                        </div>
                        <span className="text-xs font-bold text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {m.finalScore}% Fit
                        </span>
                      </div>

                      {/* Scoring breakdown bars */}
                      <div className="space-y-1 text-[9px] font-mono text-slate-400">
                        <div className="flex justify-between">
                          <span>Semantic Match Relevance:</span>
                          <span className="text-slate-200">{m.semanticScore}%</span>
                        </div>
                        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${m.semanticScore}%` }}></div>
                        </div>

                        <div className="flex justify-between pt-1">
                          <span>Required tech stack:</span>
                          <span className="text-slate-200">{m.skillMatchScore}%</span>
                        </div>
                        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-emerald-400 h-1.5 rounded-full" style={{ width: `${m.skillMatchScore}%` }}></div>
                        </div>

                        <div className="flex justify-between pt-1">
                          <span>Experience duration:</span>
                          <span className="text-slate-200">{m.expMatchScore}%</span>
                        </div>
                        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-blue-400 h-1.5 rounded-full" style={{ width: `${m.expMatchScore}%` }}></div>
                        </div>
                      </div>

                      {/* Matched skills inline */}
                      <div className="pt-2 border-t border-slate-900">
                        <span className="text-[9px] block text-emerald-400 font-medium mb-1 font-mono">Matched Stack:</span>
                        <div className="flex flex-wrap gap-1">
                          {m.matchedMustSkills?.map(sk => (
                            <span key={sk} className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] px-1 rounded font-mono">
                              {sk}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Missing skills inline */}
                      <div className="pt-1.5">
                        <span className="text-[9px] block text-rose-400 font-medium mb-1 font-mono">Unmatched/Gap Skills:</span>
                        <div className="flex flex-wrap gap-1">
                          {m.missingMustSkills?.length > 0 ? (
                            m.missingMustSkills.map(sk => (
                              <span key={sk} className="bg-rose-500/10 text-rose-300 border border-rose-500/20 text-[8px] px-1 rounded font-mono">
                                {sk}
                              </span>
                            ))
                          ) : (
                            <span className="text-[8px] text-slate-500 italic font-mono">No critical stack gaps detected.</span>
                          )}
                        </div>
                      </div>

                      {/* Behavioral score indicators */}
                      <div className="pt-2 border-t border-slate-900 grid grid-cols-3 gap-1 text-center text-[9px] font-mono">
                        <div>
                          <span className="text-slate-500 block text-[8px]">OWNERSHIP</span>
                          <span className="text-white">{"★".repeat(cand.behavioralSignals?.ownership || 4)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[8px]">LEADERS</span>
                          <span className="text-white">{"★".repeat(cand.behavioralSignals?.leadership || 4)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[8px]">COLLAB</span>
                          <span className="text-white">{"★".repeat(cand.behavioralSignals?.collaboration || 4)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
            
          </div>
        ) : activeCandidateForView ? (
          
          /* DETAILED SINGLE CANDIDATE AND RESUME INSIGHT PANEL */
          <div className="space-y-4">
            
            {/* IN-BROWSER RESUME VIEWER (NO DOWNLOAD REQUIRED) */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-semibold tracking-wider uppercase text-slate-400 font-display">
                    Interactive Resume Previewer
                  </h3>
                </div>
                <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Cognitive Analysis Loaded
                </span>
              </div>

              {/* Simulated text highlighting viewport */}
              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-900 max-h-[220px] overflow-y-auto text-[11px]/relaxed font-mono text-slate-300">
                <p className="font-bold text-white border-b border-slate-900 pb-1 mb-2">
                  {activeCandidateForView.name?.toUpperCase()} &mdash; CURRICULUM VITAE
                </p>
                <p className="text-slate-500 mb-3 text-[10px]/normal">
                  [Verified Email Channel: {activeCandidateForView.email}]
                </p>
                
                {/* Dynamically parsed text highlighting matched components */}
                <p className="text-xs/normal">
                  {/* Map over resume content and highlight search words */}
                  {(() => {
                    const txt = activeCandidateForView.resumeText || `Dedicated candidate in computational sciences or general tech. Professional experiences with title and companies shown below.`;
                    
                    const words = txt.split(" ");
                    return words.map((word, i) => {
                      const cleanWord = word.replace(/[^a-zA-Z]/g, "").toLowerCase();
                      
                      // Check standard tech lists matches
                      const isMatched = selectedJob?.mustHaveSkills.some(ms => ms.toLowerCase() === cleanWord);
                      
                      if (isMatched) {
                        return (
                          <span key={i} className="bg-emerald-500/20 text-emerald-300 px-0.5 rounded font-bold border border-emerald-500/30">
                            {word}
                          </span>
                        );
                      }
                      return <span key={i}>{word} </span>;
                    });
                  })()}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-900 space-y-2">
                  <p className="text-[10px] text-slate-500 block uppercase font-bold font-display">Academics:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    {activeCandidateForView.education.map((ed, i) => (
                      <li key={i} className="text-[10px] text-slate-400">{ed}</li>
                    ))}
                  </ul>

                  <p className="text-[10px] text-slate-500 block uppercase font-bold font-display mt-2">Projects:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    {activeCandidateForView.projects?.map((pr, i) => (
                      <li key={i} className="text-[10px] text-slate-400 italic font-sans">&quot;{pr}&quot;</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* AI DECISION ENGINE EXPLANATION BLOCK */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
              
              <div>
                <h3 className="text-xs font-semibold tracking-wider uppercase text-slate-400 font-display mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                  AI Candidate Explanation
                </h3>
                <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-950 text-xs/relaxed text-slate-300">
                  <span className="text-[10px] text-emerald-400 font-bold font-display block mb-1">
                    EXECUTIVE RECRUITMENT JUSTIFICATION:
                  </span>
                  {activeCandidateForView.rankingMetrics?.aiExplanation || (
                    "This AI recruiter evaluates candidate skills, context, and duration. Please verify technical details to update candidate files."
                  )}
                </div>
              </div>

              {/* SKILL GAP ANALYSIS */}
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-1">
                  Skill Gap & Strength Evaluation
                </h4>
                <div className="bg-slate-950 p-2.5 rounded border border-slate-950 text-[11px] font-mono text-slate-400">
                  {activeCandidateForView.rankingMetrics?.gapAnalysis || (
                    "Core stack covers mostly equivalent components. Suggested review of systems experience."
                  )}
                </div>
              </div>

              {/* STAGE PIPELINE CENTRAL CONTROLLER */}
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center justify-between">
                  <span>Hiring Pipeline Stage</span>
                  <span className="text-emerald-400">{activeCandidateForView.stage} &middot; {activeCandidateForView.interviewStage || "None"}</span>
                </h4>

                <div className="grid grid-cols-2 gap-2">
                  {/* Set main stage */}
                  <div>
                    <label className="block text-[8px] text-slate-500 font-mono mb-1">PIPELINE PHASE</label>
                    <select
                      value={activeCandidateForView.stage}
                      onChange={(e) => onUpdateCandidateStage(activeCandidateForView.id, e.target.value, activeCandidateForView.interviewStage)}
                      className="w-full text-xs bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 focus:outline-none"
                    >
                      <option value="Applied">Applied</option>
                      <option value="Shortlisted">Shortlisted</option>
                      <option value="Interview">Interview</option>
                      <option value="Offer">Provide Offer</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>

                  {/* Set interview round */}
                  <div>
                    <label className="block text-[8px] text-slate-500 font-mono mb-1">INTERVIEW ROUND</label>
                    <select
                      value={activeCandidateForView.interviewStage || "None"}
                      onChange={(e) => onUpdateCandidateStage(activeCandidateForView.id, activeCandidateForView.stage, e.target.value)}
                      className="w-full text-xs bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 focus:outline-none"
                    >
                      <option value="None">None</option>
                      <option value="Screening">Pre-Screening</option>
                      <option value="Technical">Tech Panel</option>
                      <option value="Behavioral">Behavioral Scan</option>
                      <option value="Final">Executive Final</option>
                    </select>
                  </div>
                </div>

                {/* EDIT NOTES MODULE */}
                {editingNotesId === activeCandidateForView.id ? (
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 mt-2 space-y-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase font-mono">Edit Recruiter Log Detail</p>
                    <div>
                      <label className="block text-[8px] text-slate-500 mb-1">Recruiter Log Notes</label>
                      <textarea
                        rows={2}
                        value={tempNotes}
                        onChange={(e) => setTempNotes(e.target.value)}
                        placeholder="Internal candidate review comments..."
                        className="w-full text-xs bg-slate-900 border border-slate-800 rounded p-1.5 text-white focus:outline-none focus:border-slate-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[8px] text-slate-500 mb-1">Candidate Visible Feedback</label>
                      <textarea
                        rows={2}
                        value={tempFeedback}
                        onChange={(e) => setTempFeedback(e.target.value)}
                        placeholder="Provide human-feedback loop suggestions..."
                        className="w-full text-xs bg-slate-900 border border-slate-800 rounded p-1.5 text-white focus:outline-none focus:border-slate-600"
                      />
                    </div>

                    {/* Behavioral slider adjustments */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="text-[8px] text-slate-500 block mb-1">Ownership ({tempOwnership}★)</span>
                        <input type="range" min="1" max="5" value={tempOwnership} onChange={(e) => setTempOwnership(Number(e.target.value))} className="w-full accent-emerald-400" />
                      </div>
                      <div>
                        <span className="text-[8px] text-slate-500 block mb-1">Leadership ({tempLeadership}★)</span>
                        <input type="range" min="1" max="5" value={tempLeadership} onChange={(e) => setTempLeadership(Number(e.target.value))} className="w-full accent-emerald-400" />
                      </div>
                      <div>
                        <span className="text-[8px] text-slate-500 block mb-1">Collab ({tempCollaboration}★)</span>
                        <input type="range" min="1" max="5" value={tempCollaboration} onChange={(e) => setTempCollaboration(Number(e.target.value))} className="w-full accent-emerald-400" />
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setEditingNotesId(null)}
                        className="px-2 py-1 bg-slate-900 border border-slate-800 rounded text-slate-400 text-[10px] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveNotes(activeCandidateForView.id)}
                        className="px-2.5 py-1 bg-emerald-500 text-slate-950 font-bold rounded text-[10px] cursor-pointer"
                      >
                        Commit Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-950 mt-2 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">Recruiter Private Notes</span>
                      <button
                        onClick={() => handleOpenNotesEditor(activeCandidateForView)}
                        className="text-[9px] text-emerald-400 hover:underline cursor-pointer"
                      >
                        Edit Notes
                      </button>
                    </div>
                    <p className="text-xs text-slate-300 italic">
                      {activeCandidateForView.recruiterNotes || "No private notes logged yet."}
                    </p>
                    
                    <div className="bg-slate-950 p-2 rounded text-[10px] text-slate-400 mt-2 border border-slate-900">
                      <strong className="text-[9px] text-emerald-400 font-mono block mb-0.5">FEEDBACK LOOP (VISIBLE TO CANDIDATE)</strong>
                      {activeCandidateForView.recruiterFeedback || "Draft credentials submitted successfully. Screening pending."}
                    </div>
                  </div>
                )}

              </div>

            </div>

          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-slate-400 shadow-xl">
            <UserCheck className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-xs">Select any candidate card to open their parsed layout and analyze metrics.</p>
          </div>
        )}

      </div>

      {/* JOB CREATION OVERLAY PANEL */}
      {isPostingJob && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-semibold text-white font-display flex items-center gap-1.5">
                <Plus className="w-5 h-5 text-emerald-400" />
                Draft New Job Requirements (JD)
              </h3>
              <button onClick={() => setIsPostingJob(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddNewJob} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Job Opening Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lead Machine Learning Architect"
                    value={newJob.title}
                    onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Functional Domain</label>
                  <input
                    type="text"
                    placeholder="e.g. MLOps, Computer Vision"
                    value={newJob.domain}
                    onChange={(e) => setNewJob({ ...newJob, domain: e.target.value })}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Role Locality</label>
                  <input
                    type="text"
                    value={newJob.location}
                    onChange={(e) => setNewJob({ ...newJob, location: e.target.value })}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Work schedule</label>
                  <select
                    value={newJob.roleType}
                    onChange={(e) => setNewJob({ ...newJob, roleType: e.target.value })}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded p-2 text-slate-300 focus:outline-none"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Remote">Remote</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Min. Experience Req.</label>
                  <input
                    type="number"
                    min="0"
                    max="15"
                    value={newJob.experienceRequired}
                    onChange={(e) => setNewJob({ ...newJob, experienceRequired: Number(e.target.value) })}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Must-Have Skills (comma-separated list)</label>
                <input
                  type="text"
                  placeholder="Python, PyTorch, FAISS, REST API"
                  value={newJob.mustHaveInput}
                  onChange={(e) => setNewJob({ ...newJob, mustHaveInput: e.target.value })}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Nice-To-Have Skills (comma-separated list)</label>
                <input
                  type="text"
                  placeholder="Docker, Kubernetes, AWS, PostgreSQL"
                  value={newJob.niceToHaveInput}
                  onChange={(e) => setNewJob({ ...newJob, niceToHaveInput: e.target.value })}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">JD Role Description / Target Objectives</label>
                <textarea
                  rows={4}
                  required
                  placeholder="We are seeking an engineer to build our core semantic models..."
                  value={newJob.description}
                  onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-slate-600"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setIsPostingJob(false)}
                  className="px-3.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-400 text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-500 text-slate-950 font-bold rounded text-xs cursor-pointer hover:bg-emerald-400 transition-colors"
                >
                  Publish and Index Job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
