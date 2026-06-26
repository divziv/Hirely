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
  platformActivity?: {
    codingScore: number;
    profileCompleteness: number;
    responsivenessScore: number;
    hackathonRank?: number;
  };
  jobId: string;
  stage: string; // "Applied" | "Shortlisted" | "Interview" | "Offer" | "Rejected"
  interviewStage?: string; // "Screening" | "Technical" | "Behavioral" | "Final" | "None"
  recruiterNotes: string;
  recruiterFeedback: string;
  appliedDate: string;
  isPriority?: boolean;
  salaryExpectation?: number;
  salaryOffer?: number;
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

export type AppRole = "recruiter" | "candidate";

export interface AnalyticsStats {
  timeToHireDays: number;
  topSkills: Array<{ name: string; count: number }>;
  dropOffRatePercent: number;
  pipelineAllocation: Array<{ name: string; count: number }>;
}
