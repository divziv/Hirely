/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Job {
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

export interface Candidate {
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
    ownership: number;
    leadership: number;
    collaboration: number;
  };
  jobId: string;
  stage: string; // "Applied" | "Shortlisted" | "Interview" | "Offer" | "Rejected"
  interviewStage?: string; // "Screening" | "Technical" | "Behavioral" | "Final" | "None"
  recruiterNotes: string;
  recruiterFeedback: string;
  appliedDate: string;
  rankingMetrics?: {
    semanticScore: number;
    skillMatchScore: number;
    expMatchScore: number;
    finalScore: number;
    matchedMustSkills: string[];
    missingMustSkills: string[];
    aiExplanation: string;
    gapAnalysis: string;
  };
}

export type AppRole = "recruiter" | "candidate";

export interface AnalyticsStats {
  timeToHireDays: number;
  topSkills: Array<{ name: string; count: number }>;
  dropOffRatePercent: number;
  pipelineAllocation: Array<{ name: string; count: number }>;
}
