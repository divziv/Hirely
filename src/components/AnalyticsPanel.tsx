/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Job, Candidate } from "../types";
import { 
  TrendingUp, Award, Activity, Heart, Clock, AlertTriangle, CheckCircle 
} from "lucide-react";

interface AnalyticsPanelProps {
  jobs: Job[];
  candidates: Candidate[];
}

export default function AnalyticsPanel({ jobs, candidates }: AnalyticsPanelProps) {
  
  // Calculate analytics figures dynamically
  const totalInPipeline = candidates.length;
  
  // Pipeline distribution count
  const distribution = candidates.reduce((acc, cand) => {
    acc[cand.stage] = (acc[cand.stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const stages = ["Applied", "Shortlisted", "Interview", "Offer", "Rejected"];

  // Skills census
  const skillsCount = candidates.flatMap(c => c.skills).reduce((acc, sk) => {
    acc[sk] = (acc[sk] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedSkills = Object.entries(skillsCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  // General Mock Benchmark data
  const averageTimeToHireDays = 14;
  const placementRatePercent = 88.5;
  const talentDiscoveryAccuracy = 97.2;

  return (
    <div id="analytics_metrics_dashboard" className="space-y-6">
      
      {/* Overview Stat Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-lg">
          <div>
            <p className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">Active Talent Pipeline</p>
            <p className="text-xl font-bold font-mono text-white mt-1">{totalInPipeline} Candidates</p>
            <span className="text-[8px] text-emerald-400 mt-1 block">&uarr; 3 newly parsed today</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-lg">
          <div>
            <p className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">Average Days-To-Hire</p>
            <p className="text-xl font-bold font-mono text-white mt-1">{averageTimeToHireDays} Days</p>
            <span className="text-[8px] text-emerald-400 mt-1 block">34% faster than keyword filters</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-lg">
          <div>
            <p className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">Talent Retention Fit</p>
            <p className="text-xl font-bold font-mono text-white mt-1">{placementRatePercent}%</p>
            <span className="text-[8px] text-indigo-400 mt-1 block">Redrob semantic discovery metric</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-lg">
          <div>
            <p className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">AI Rank Match Accuracy</p>
            <p className="text-xl font-bold font-mono text-white mt-1">{talentDiscoveryAccuracy}%</p>
            <span className="text-[8px] text-purple-400 mt-1 block">Cosine match vs actual hires</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Visual Analytics Graphs block */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Graph 1: Pipeline Stage Distribution count */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-display">
              Candidate Pipeline Stage Distribution
            </h3>
            <p className="text-[10px] text-slate-500">Flow breakdown of all prospective profiles inside screen lifecycle.</p>
          </div>

          <div className="space-y-3.5 pt-2">
            {stages.map(phase => {
              const count = distribution[phase] || 0;
              const maxCount = Math.max(...Object.values(distribution), 1);
              const percent = (count / maxCount) * 100;

              return (
                <div key={phase} className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-300 font-medium">{phase}</span>
                    <span className="text-slate-400 font-bold">{count} {count === 1 ? "profile" : "profiles"}</span>
                  </div>
                  <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-900">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${
                        phase === "Offer" ? "bg-emerald-400" :
                        phase === "Interview" ? "bg-blue-400" :
                        phase === "Shortlisted" ? "bg-purple-500" :
                        phase === "Rejected" ? "bg-rose-500" :
                        "bg-slate-600"
                      }`}
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Graph 2: Top Technical requirements in pipeline */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-display">
              Top Technologies in Pipelines
            </h3>
            <p className="text-[10px] text-slate-500">Frequency mapping of parsed technical skills in current applicant baseline.</p>
          </div>

          {sortedSkills.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-12 text-center">No parsed applicant skills detected.</p>
          ) : (
            <div className="space-y-3 pt-2">
              {sortedSkills.map(([skill, count]) => {
                const maxCount = Math.max(...sortedSkills.map(s => s[1]), 1);
                const percent = (count / maxCount) * 100;

                return (
                  <div key={skill} className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-slate-200 font-medium">{skill}</span>
                      <span className="text-slate-400">{count} occurrences</span>
                    </div>
                    <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-900">
                      <div 
                        className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Redrob AI Proprietary LLM Advantage Statement */}
      <div className="bg-indigo-950/20 rounded-xl p-5 border border-indigo-500/10 space-y-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-400" />
          <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-display">
            The Redrob AI Proprietary Semantic Engine
          </h3>
        </div>
        <p className="text-[11px]/relaxed text-slate-400">
          Traditional recruiting searches for exact keyword strings, omitting talented engineers who express equivalent concepts utilizing alternate wording (e.g. searching for &quot;all-MiniLM&quot; might miss strong &quot;Sentence Transformers&quot; candidates). 
          Our dual-stage matching pipelines parse unformatted documents on-the-fly and execute semantic evaluation matrices alongside historical feedback logs to identify deep skill alignment.
        </p>
      </div>

    </div>
  );
}
