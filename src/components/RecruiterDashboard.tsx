/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Job, Candidate } from "../types";
import { 
  Sparkles, Briefcase, GraduationCap, MapPin, CheckCircle, Clock, 
  AlertTriangle, X, UserCheck, FileText, Plus, Search, Filter,
  TrendingUp, Award, Activity, Heart, ArrowRight, Wand2, Calendar, Mail,
  Star, Coins, GitCompare, Download
} from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";

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

  // Simulated notification states
  const [notifyCandidate, setNotifyCandidate] = useState(true);
  const [simulatedNotification, setSimulatedNotification] = useState<{
    id: string;
    to: string;
    name: string;
    subject: string;
    body: string;
    stage: string;
  } | null>(null);

  const [newQuickNoteText, setNewQuickNoteText] = useState("");

  const handleTogglePriority = async (e: React.MouseEvent, candId: string, currentPriority: boolean) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/candidates/${candId}/priority`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPriority: !currentPriority })
      });
      if (res.ok) {
        onRefreshData();
      } else {
        throw new Error("Priority toggle endpoint failed");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenBulkActionModal = (actionType: 'stage' | 'reject', stage?: string) => {
    setBulkActionModal({
      isOpen: true,
      actionType,
      targetStage: stage
    });
    
    // Automatically select a matching template
    if (actionType === "reject") {
      setSelectedEmailTemplate("reject");
      setCustomEmailSubject("Application Update: Redrob Team");
      setCustomEmailBody("Dear Candidate,\n\nThank you for your time and application. Although your background is impressive, we have decided to move forward with other candidates whose skillsets align more closely with our current technical requirements.\n\nWe wish you the absolute best in your career pursuits.\n\nBest regards,\nRecruitment Team");
    } else if (stage === "Interview") {
      setSelectedEmailTemplate("invite");
      setCustomEmailSubject("Technical Interview Invitation - Redrob");
      setCustomEmailBody("Dear Candidate,\n\nWe were highly impressed by your experience and core technical skillset. We would love to schedule a technical interview to discuss your experience.\n\nPlease let us know your availability over the coming days.\n\nBest regards,\nRecruitment Team");
    } else {
      setSelectedEmailTemplate("progression");
      setCustomEmailSubject(`Application Update: Progressing to ${stage || "next stage"}`);
      setCustomEmailBody(`Dear Candidate,\n\nWe are pleased to inform you that your application has been progressed to the "${stage || "next stage"}" level of our review process.\n\nWe will reach out shortly with details and next steps.\n\nBest regards,\nRecruitment Team`);
    }
  };

  const handleConfirmBulkAction = async () => {
    try {
      const { actionType, targetStage } = bulkActionModal;
      
      // Perform bulk database update
      const res = await fetch("/api/candidates/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateIds: bulkSelectedCandidateIds,
          action: actionType === "reject" ? "reject" : "stage",
          stage: targetStage
        })
      });

      if (res.ok) {
        // Reset state
        setBulkSelectedCandidateIds([]);
        setBulkActionModal({ isOpen: false });
        setSelectedEmailTemplate("none");
        onRefreshData();
      }
    } catch (err) {
      console.error("Bulk action failed:", err);
    }
  };

  const handleUpdateSalary = async (candId: string, expectation: number, offer?: number) => {
    try {
      const res = await fetch(`/api/candidates/${candId}/salary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salaryExpectation: expectation, salaryOffer: offer !== undefined ? offer : null })
      });
      if (res.ok) {
        onRefreshData();
      } else {
        throw new Error("Salary update endpoint failed");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddQuickNote = async (candidateId: string) => {
    if (!newQuickNoteText.trim()) return;
    try {
      const res = await fetch(`/api/candidates/${candidateId}/quick-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newQuickNoteText, author: "Team Lead" })
      });
      if (res.ok) {
        const updatedCandidate = await res.json();
        setRankedResults(prev => prev.map(c => c.id === candidateId ? updatedCandidate : c));
        setActiveCandidateForView(updatedCandidate);
        setNewQuickNoteText("");
        onRefreshData();
      }
    } catch (e) {
      console.error("Error adding quick note:", e);
    }
  };

  // Stage change wrapper to handle simulated notification
  const handleStageChange = async (candId: string, newStage: string, newInterviewStage?: string) => {
    const candidate = candidates.find(c => c.id === candId);
    if (!candidate) return;

    await onUpdateCandidateStage(candId, newStage, newInterviewStage);

    // Update locally selected view candidate if it's the one modified to preserve UI alignment
    if (activeCandidateForView?.id === candId) {
      setActiveCandidateForView(prev => prev ? { ...prev, stage: newStage, interviewStage: newInterviewStage || "None" } : null);
    }

    if (notifyCandidate) {
      const subject = `Update on your application for ${selectedJob?.title || "the position"} - Hirely`;
      let bodyText = `Hi ${candidate.name},\n\n`;
      if (newStage === "Offer") {
        bodyText += `Congratulations! We are absolutely thrilled to extend an official job offer for the position of ${selectedJob?.title || "the role"} at Hirely.\n\nOur team was extremely impressed with your technical expertise and background. We will be in touch shortly with the formal offer package details.`;
      } else if (newStage === "Interview") {
        bodyText += `We are excited to invite you to the next stage of our interview process: ${newInterviewStage || "Technical Panel"} for the ${selectedJob?.title || "the role"} position.\n\nOur scheduling team will reach out to you within the next 24-48 hours with booking slots.`;
      } else if (newStage === "Shortlisted") {
        bodyText += `We have reviewed your profile for the ${selectedJob?.title || "the role"} position and are pleased to inform you that you have been shortlisted!\n\nWe will review the next steps with our hiring managers and follow up soon.`;
      } else if (newStage === "Rejected") {
        bodyText += `Thank you for your interest in the ${selectedJob?.title || "the role"} position at Hirely. After careful consideration, we have decided to move forward with other candidates whose experience more closely aligns with our current needs.\n\nWe wish you the absolute best in your professional endeavors.`;
      } else {
        bodyText += `We wanted to let you know that your application status on Hirely has been updated to: ${newStage}.\n\nThank you for your patience during this process.`;
      }
      bodyText += `\n\nBest regards,\nThe Hirely Talent Acquisition Team`;

      setSimulatedNotification({
        id: Math.random().toString(),
        to: candidate.email,
        name: candidate.name,
        subject,
        body: bodyText,
        stage: newStage
      });
    }
  };
  
  // Job Post state with Auto-Save from localStorage
  const [isPostingJob, setIsPostingJob] = useState(false);
  const [newJob, setNewJob] = useState(() => {
    const saved = localStorage.getItem("newJobForm");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    return {
      title: "",
      company: "Redrob AI",
      location: "Bengaluru, India (Hybrid)",
      experienceRequired: 3,
      roleType: "Full-time",
      domain: "NLP & AI Core",
      description: "",
      mustHaveInput: "",
      niceToHaveInput: ""
    };
  });
  const [isParsingJobDescription, setIsParsingJobDescription] = useState(false);
  const [isGeneratingJD, setIsGeneratingJD] = useState(false);
  
  // Bulk Candidate Actions & Automated Email Notification Trigger
  const [bulkSelectedCandidateIds, setBulkSelectedCandidateIds] = useState<string[]>([]);
  const [bulkActionModal, setBulkActionModal] = useState<{
    isOpen: boolean;
    targetStage?: string;
    actionType?: 'stage' | 'reject' | 'email';
  }>({ isOpen: false });
  const [selectedEmailTemplate, setSelectedEmailTemplate] = useState<string>("none");
  const [customEmailSubject, setCustomEmailSubject] = useState<string>("");
  const [customEmailBody, setCustomEmailBody] = useState<string>("");

  // Structured Interview Feedback Form states
  const [isEvaluatingCandidate, setIsEvaluatingCandidate] = useState<boolean>(false);
  const [tempScorecard, setTempScorecard] = useState<{
    technicalProficiency: number;
    communication: number;
    culturalAlignment: number;
    notes: string;
  }>({
    technicalProficiency: 3,
    communication: 3,
    culturalAlignment: 3,
    notes: ""
  });

  // Auto-save Job Posting form to localStorage
  useEffect(() => {
    if (newJob.title || newJob.description) {
      localStorage.setItem("newJobForm", JSON.stringify(newJob));
    } else {
      localStorage.removeItem("newJobForm");
    }
  }, [newJob]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Meta+K to focus search input
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const searchInput = document.getElementById("recruiter-search-bar");
        if (searchInput) {
          searchInput.focus();
        }
      }
      // Ctrl+N or Meta+N to open New Job modal
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setIsPostingJob(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleAutoFillJob = async () => {
    if (!newJob.description) return;
    setIsParsingJobDescription(true);
    try {
      const res = await fetch("/api/jobs/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: newJob.description })
      });
      if (res.ok) {
        const data = await res.json();
        setNewJob(prev => ({
          ...prev,
          title: data.title || prev.title,
          domain: data.domain || prev.domain,
          experienceRequired: data.experienceRequired ?? prev.experienceRequired,
          mustHaveInput: Array.isArray(data.mustHaveSkills) ? data.mustHaveSkills.join(", ") : prev.mustHaveInput,
          niceToHaveInput: Array.isArray(data.niceToHaveSkills) ? data.niceToHaveSkills.join(", ") : prev.niceToHaveInput,
          description: data.summary || prev.description
        }));
      } else {
        console.error("Failed to parse JD from AI.");
      }
    } catch (e) {
      console.error("JD parser error:", e);
    } finally {
      setIsParsingJobDescription(false);
    }
  };

  const [isMatchRationaleModalOpen, setIsMatchRationaleModalOpen] = useState(false);
  const [isFetchingRationale, setIsFetchingRationale] = useState(false);
  const [matchRationaleData, setMatchRationaleData] = useState<{
    overallFit: string;
    semanticMatches: string[];
    skillGaps: string[];
    culturalAssessment: string;
    overallScore: number;
  } | null>(null);

  const handleFetchMatchRationale = async (candidateId: string) => {
    if (!selectedJob) return;
    setIsMatchRationaleModalOpen(true);
    setIsFetchingRationale(true);
    setMatchRationaleData(null);
    try {
      const res = await fetch("/api/candidates/match-rationale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId, jobId: selectedJob.id })
      });
      if (res.ok) {
        const data = await res.json();
        setMatchRationaleData(data);
      }
    } catch (e) {
      console.error("Match rationale error:", e);
    } finally {
      setIsFetchingRationale(false);
    }
  };

  // Custom Recruit AI enhancements states
  const [isBlindMode, setIsBlindMode] = useState(false);
  const [recruiterViewMode, setRecruiterViewMode] = useState<"active" | "passive">("active");
  const [passiveQuery, setPassiveQuery] = useState("");
  const [passiveTalents, setPassiveTalents] = useState<any[] | null>(null);
  const [isSourcingPassive, setIsSourcingPassive] = useState(false);
  
  const [outreachDraft, setOutreachDraft] = useState<{ subject: string; body: string } | null>(null);
  const [isDraftingOutreach, setIsDraftingOutreach] = useState(false);
  const [isOutreachModalOpen, setIsOutreachModalOpen] = useState(false);
  const [copiedOutreach, setCopiedOutreach] = useState(false);
  
  const [availabilitySlots, setAvailabilitySlots] = useState<any[]>([]);
  const [isAddingSlot, setIsAddingSlot] = useState(false);
  const [newSlotDate, setNewSlotDate] = useState("");
  const [newSlotTime, setNewSlotTime] = useState("");

  // Fetch recruiter slots on mount or change
  const fetchAvailability = async () => {
    try {
      const res = await fetch("/api/recruiter/availability");
      if (res.ok) {
        const data = await res.json();
        setAvailabilitySlots(data);
      }
    } catch (e) {
      console.error("Availability error:", e);
    }
  };

  useEffect(() => {
    fetchAvailability();
  }, []);

  // Add availability slot
  const handleAddSlot = async () => {
    if (!newSlotDate || !newSlotTime) return;
    try {
      const res = await fetch("/api/recruiter/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: newSlotDate, time: newSlotTime })
      });
      if (res.ok) {
        const data = await res.json();
        setAvailabilitySlots(data);
        setNewSlotDate("");
        setNewSlotTime("");
        setIsAddingSlot(false);
      }
    } catch (e) {
      console.error("Add slot error:", e);
    }
  };

  // Recruiter schedules interview directly on behalf of candidate
  const handleBookInterviewForCandidate = async (candId: string, slotId: string) => {
    try {
      const res = await fetch(`/api/candidates/${candId}/book-interview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId })
      });
      if (res.ok) {
        const data = await res.json();
        // Refresh recruiter side candidate list
        onRefreshData();
        fetchAvailability();
        // Update active candidate view reference if matched
        if (activeCandidateForView && activeCandidateForView.id === candId) {
          setActiveCandidateForView(data.candidate);
        }
      }
    } catch (e) {
      console.error("Book interview error:", e);
    }
  };

  // Draft customized email with Gemini
  const handleDraftOutreach = async (candidateId: string) => {
    setOutreachDraft(null);
    setIsOutreachModalOpen(true);
    setIsDraftingOutreach(true);
    setCopiedOutreach(false);
    try {
      const res = await fetch(`/api/candidates/${candidateId}/draft-outreach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        const data = await res.json();
        setOutreachDraft(data);
      }
    } catch (e) {
      console.error("Outreach drafting error:", e);
    } finally {
      setIsDraftingOutreach(false);
    }
  };

  // Sourcing passive candidate profiles using Gemini
  const handleSourcePassive = async () => {
    if (!selectedJob) return;
    setIsSourcingPassive(true);
    setPassiveTalents(null);
    try {
      const res = await fetch("/api/talent-source/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: selectedJob.id, customQuery: passiveQuery })
      });
      if (res.ok) {
        const data = await res.json();
        setPassiveTalents(data);
      }
    } catch (e) {
      console.error("Talent source error:", e);
    } finally {
      setIsSourcingPassive(false);
    }
  };

  // Helper to import passive candidate into active candidate list
  const handleImportPassiveCandidate = async (talent: any) => {
    try {
      const res = await fetch("/api/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: talent.name,
          email: talent.email,
          skills: talent.skills,
          experienceYears: talent.experienceYears,
          education: [talent.education],
          projects: [`Current role as ${talent.currentRole} at ${talent.currentCompany}`],
          experience: [{ title: talent.currentRole, company: talent.currentCompany, duration: `${talent.experienceYears} Years` }],
          resumeText: `${talent.name} is currently a ${talent.currentRole} at ${talent.currentCompany}. Education: ${talent.education}. Justification: ${talent.matchJustification}`,
          jobId: selectedJob?.id || "job-001"
        })
      });
      if (res.ok) {
        onRefreshData();
        // Switch view back to Active and select the newly added candidate
        setRecruiterViewMode("active");
        alert(`${talent.name} has been imported successfully as a Shortlisted candidate into the pipeline!`);
      }
    } catch (e) {
      console.error("Import error:", e);
    }
  };

  // Helper function to dynamically mask strings when Blind Screening is enabled
  const blindMaskText = (text: string, placeholder: string = "[REDACTED]") => {
    if (!isBlindMode) return text;
    return placeholder;
  };

  // Helper function to redact university names/academic context
  const redactAcademics = (eduList: string[]) => {
    if (!isBlindMode) return eduList;
    return eduList.map(edu => {
      // Simple masking of typical university keywords
      return edu.replace(/IIT|BITS|NIT|University|College|Institute|Campus|School|Bombay|Delhi|Trichy|Pilani|Roorkee|Engineering/gi, "[REDACTED INSTITUTION]");
    });
  };

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

  // Export Candidate list to CSV file
  const handleExportToCSV = () => {
    const headers = [
      "Candidate Name", 
      "Email Address", 
      "Application Stage", 
      "Interview Phase", 
      "Experience (Years)", 
      "Skills List", 
      "Salary Expectation", 
      "Salary Offer", 
      "Applied Date"
    ];
    
    const rows = filteredCandidates.map(c => [
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.email.replace(/"/g, '""')}"`,
      `"${c.stage.replace(/"/g, '""')}"`,
      `"${(c.interviewStage || "None").replace(/"/g, '""')}"`,
      c.experienceYears,
      `"${c.skills.join(", ").replace(/"/g, '""')}"`,
      c.salaryExpectation || "N/A",
      c.salaryOffer || "N/A",
      `"${c.appliedDate || ""}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `recruitment_candidates_export_${selectedJob?.title.toLowerCase().replace(/\s+/g, "_") || "all"}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredCandidates = (rankedResults.length > 0 ? rankedResults : candidates).filter(cand => {
    // 1. Text filter (includes name, email, stage, and skills)
    const matchesSearch = cand.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          cand.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          cand.stage.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          cand.skills.some(sk => sk.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // 2. Minimum experience filter
    const matchesExp = cand.experienceYears >= minExperience;

    // 3. Tech skill dropdown filter
    const matchesSkill = selectedSkillFilter === "" || 
                         cand.skills.some(sk => sk.toLowerCase() === selectedSkillFilter.toLowerCase());

    return matchesSearch && matchesExp && matchesSkill;
  });

  // Overlap and uniques calculation for split-screen mode
  const candA = selectedCandidatesForCompare.length >= 2 ? candidates.find(c => c.id === selectedCandidatesForCompare[0]) : null;
  const candB = selectedCandidatesForCompare.length >= 2 ? candidates.find(c => c.id === selectedCandidatesForCompare[1]) : null;

  const skillsA = candA?.skills || [];
  const skillsB = candB?.skills || [];
  const overlappingSkills = skillsA.filter(sk => skillsB.some(s => s.toLowerCase() === sk.toLowerCase()));
  const uniqueSkillsA = skillsA.filter(sk => !skillsB.some(s => s.toLowerCase() === sk.toLowerCase()));
  const uniqueSkillsB = skillsB.filter(sk => !skillsA.some(s => s.toLowerCase() === sk.toLowerCase()));

  const totalSkillsCount = Array.from(new Set([...skillsA, ...skillsB])).length;
  const overlapPercent = totalSkillsCount > 0 ? Math.round((overlappingSkills.length / totalSkillsCount) * 100) : 0;

  const renderHighlightedText = (text: string, overlapping: string[], unique: string[], colorClassA: string, colorClassB: string) => {
    if (!text) return "No resume text parsed.";
    const keywords = [...overlapping, ...unique].filter(Boolean).sort((a, b) => b.length - a.length);
    if (keywords.length === 0) return text;
    
    try {
      const escapedKeywords = keywords.map(k => k.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
      const regex = new RegExp(`\\b(${escapedKeywords.join('|')})\\b`, 'gi');
      const parts = text.split(regex);
      
      return parts.map((part, idx) => {
        const lowerPart = part.toLowerCase();
        const isOverlapping = overlapping.some(ok => ok.toLowerCase() === lowerPart);
        const isUnique = unique.some(uk => uk.toLowerCase() === lowerPart);
        
        if (isOverlapping) {
          return (
            <mark key={idx} className="bg-emerald-500/20 text-emerald-300 px-1 py-0.5 rounded font-mono border border-emerald-500/30">
              {part}
            </mark>
          );
        } else if (isUnique) {
          return (
            <mark key={idx} className={`${colorClassA} px-1 py-0.5 rounded font-mono border ${colorClassB}`}>
              {part}
            </mark>
          );
        }
        return part;
      });
    } catch (e) {
      return text;
    }
  };

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
              title="Post New Job (Ctrl+N)"
            >
              <Plus className="w-3.5 h-3.5" />
              New JD <span className="text-[9px] opacity-70 font-mono ml-0.5 bg-slate-950 px-1 py-0.5 rounded border border-slate-800 text-slate-400">Ctrl+N</span>
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
                id="recruiter-search-bar"
                type="text"
                placeholder="Search name, skill, or stage..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs bg-slate-950 border border-slate-800 rounded-md pl-8 pr-16 py-1.5 text-slate-100 focus:outline-none focus:border-slate-600"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <div className="absolute right-2 top-2 px-1.5 py-0.5 bg-slate-900 border border-slate-800 text-[8px] font-mono rounded text-slate-500 flex items-center gap-0.5 pointer-events-none select-none">
                <span>Ctrl</span><span>+</span><span>K</span>
              </div>
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

      {/* SPLIT-SCREEN RESUME COMPARISON MODE */}
      {activeCompareMode && selectedCandidatesForCompare.length === 2 && candA && candB ? (
        <div className="lg:col-span-9 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl space-y-6">
            
            {/* Comparison Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                  <h2 className="text-base font-bold text-white font-display flex items-center gap-2">
                    <GitCompare className="w-5 h-5 text-blue-400" />
                    Interactive Split-Screen Resume Comparison
                  </h2>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Side-by-side analysis of candidate profiles, highlighted to isolate joint stack proficiencies versus unique developer capabilities.
                </p>
              </div>
              
              <button
                onClick={() => setActiveCompareMode(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:text-white text-slate-300 rounded-lg text-xs font-mono transition-all flex items-center gap-1 cursor-pointer self-start"
              >
                <X className="w-4 h-4" />
                Exit Comparison View
              </button>
            </div>

            {/* Dynamic Skill Overlap Matrix Section */}
            <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-4">
              <div className="flex justify-between items-center text-[10px] font-mono uppercase text-slate-500 pb-1.5 border-b border-slate-900">
                <span>Stack Overlap Analysis</span>
                <span>Skill Match Parity: <strong className="text-emerald-400">{overlapPercent}% Overlap</strong></span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Column 1: Overlapping Skills */}
                <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-900 space-y-2">
                  <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Shared Core Skills ({overlappingSkills.length})
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {overlappingSkills.map(sk => (
                      <span key={sk} className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] px-2 py-0.5 rounded font-mono font-medium">
                        {sk}
                      </span>
                    ))}
                    {overlappingSkills.length === 0 && (
                      <span className="text-[9px] text-slate-600 italic">No shared core technologies detected.</span>
                    )}
                  </div>
                </div>

                {/* Column 2: Unique to Candidate A */}
                <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-900 space-y-2">
                  <span className="text-[9px] font-mono font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                    Unique to {isBlindMode ? "Cand A" : candA.name.split(" ")[0]} ({uniqueSkillsA.length})
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {uniqueSkillsA.map(sk => (
                      <span key={sk} className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] px-2 py-0.5 rounded font-mono font-medium">
                        {sk}
                      </span>
                    ))}
                    {uniqueSkillsA.length === 0 && (
                      <span className="text-[9px] text-slate-600 italic font-mono">No unique skills.</span>
                    )}
                  </div>
                </div>

                {/* Column 3: Unique to Candidate B */}
                <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-900 space-y-2">
                  <span className="text-[9px] font-mono font-bold text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                    Unique to {isBlindMode ? "Cand B" : candB.name.split(" ")[0]} ({uniqueSkillsB.length})
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {uniqueSkillsB.map(sk => (
                      <span key={sk} className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[9px] px-2 py-0.5 rounded font-mono font-medium">
                        {sk}
                      </span>
                    ))}
                    {uniqueSkillsB.length === 0 && (
                      <span className="text-[9px] text-slate-600 italic font-mono">No unique skills.</span>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Side-by-Side Split View columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* CANDIDATE A PANELS */}
              <div className="space-y-4">
                {/* Candidate A Card Header */}
                <div className={`p-4 rounded-xl border ${candA.isPriority ? 'bg-amber-500/5 border-amber-500/30' : 'bg-slate-950 border-slate-800'} space-y-3`}>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => handleTogglePriority(e, candA.id, !!candA.isPriority)}
                          className="focus:outline-none transition-transform hover:scale-110 cursor-pointer shrink-0"
                          title={candA.isPriority ? "Remove Priority Flag" : "Mark as Priority / High-Potential"}
                        >
                          {candA.isPriority ? (
                            <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                          ) : (
                            <Star className="w-5 h-5 text-slate-600 hover:text-amber-400" />
                          )}
                        </button>
                        <h3 className="text-sm font-bold text-white">
                          {isBlindMode ? `Anonymous Candidate #${candA.id.slice(-4)}` : candA.name}
                        </h3>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {isBlindMode ? "redacted-email@talent.demo" : candA.email}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-emerald-400 font-mono bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                        {candA.rankingMetrics?.finalScore || 50}% Fit
                      </span>
                      <span className="text-[8px] block text-slate-500 font-mono mt-1">AI MATCH SCORE</span>
                    </div>
                  </div>

                  {/* General Highlights */}
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono border-t border-b border-slate-900 py-2">
                    <div>
                      <span className="text-slate-500 block text-[8px]">EXPERIENCE:</span>
                      <span className="text-slate-200 font-bold">{candA.experienceYears} Years</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[8px]">PIPELINE STAGE:</span>
                      <span className="text-blue-400 font-bold">{candA.stage}</span>
                    </div>
                  </div>

                  {/* Editable Salary Blocks */}
                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-900 space-y-2.5">
                    <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Financial Profile (Lakhs LPA)</span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[8px] font-mono text-slate-500 block uppercase mb-1">Expected Salary</label>
                        <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                          <span className="text-[10px] text-slate-500 font-mono">₹</span>
                          <input
                            type="number"
                            defaultValue={candA.salaryExpectation ? candA.salaryExpectation / 100000 : ""}
                            placeholder="Expected (LPA)"
                            onChange={(e) => {
                              const val = Number(e.target.value) * 100000;
                              handleUpdateSalary(candA.id, val, candA.salaryOffer);
                            }}
                            className="w-full bg-transparent text-xs font-mono text-white focus:outline-none"
                          />
                          <span className="text-[9px] text-slate-500 font-mono">L</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[8px] font-mono text-slate-500 block uppercase mb-1">Offer Made</label>
                        <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                          <span className="text-[10px] text-slate-500 font-mono">₹</span>
                          <input
                            type="number"
                            defaultValue={candA.salaryOffer ? candA.salaryOffer / 100000 : ""}
                            placeholder="Offer (LPA)"
                            onChange={(e) => {
                              const val = e.target.value !== "" ? Number(e.target.value) * 100000 : undefined;
                              handleUpdateSalary(candA.id, candA.salaryExpectation || 0, val);
                            }}
                            className="w-full bg-transparent text-xs font-mono text-white focus:outline-none"
                          />
                          <span className="text-[9px] text-slate-500 font-mono">L</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Resume viewer A with skill highlighter */}
                <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-3 shadow-inner">
                  <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest block">Curriculum Vitae Preview</span>
                  <div className="max-h-[350px] overflow-y-auto pr-1 text-[11px]/relaxed font-mono text-slate-300 space-y-4 scrollbar-thin">
                    <div className="space-y-1">
                      <span className="text-[9px] block text-slate-500 uppercase">Education</span>
                      <p className="text-white text-xs">{candA.education.join(" | ")}</p>
                    </div>
                    
                    <div className="space-y-1 border-t border-slate-900 pt-2">
                      <span className="text-[9px] block text-slate-500 uppercase">Featured Projects</span>
                      <ul className="list-disc list-inside space-y-1 pl-1 text-slate-200">
                        {candA.projects.map((p, i) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-1 border-t border-slate-900 pt-2">
                      <span className="text-[9px] block text-slate-500 uppercase">Full Resume Parser Text</span>
                      <p className="whitespace-pre-wrap text-slate-400 bg-slate-900/30 p-2.5 rounded border border-slate-900 leading-relaxed font-sans">
                        {renderHighlightedText(candA.resumeText, overlappingSkills, uniqueSkillsA, "bg-blue-500/10 text-blue-300 border-blue-500/20", "border-blue-500/20")}
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              {/* CANDIDATE B PANELS */}
              <div className="space-y-4">
                {/* Candidate B Card Header */}
                <div className={`p-4 rounded-xl border ${candB.isPriority ? 'bg-amber-500/5 border-amber-500/30' : 'bg-slate-950 border-slate-800'} space-y-3`}>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => handleTogglePriority(e, candB.id, !!candB.isPriority)}
                          className="focus:outline-none transition-transform hover:scale-110 cursor-pointer shrink-0"
                          title={candB.isPriority ? "Remove Priority Flag" : "Mark as Priority / High-Potential"}
                        >
                          {candB.isPriority ? (
                            <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                          ) : (
                            <Star className="w-5 h-5 text-slate-600 hover:text-amber-400" />
                          )}
                        </button>
                        <h3 className="text-sm font-bold text-white">
                          {isBlindMode ? `Anonymous Candidate #${candB.id.slice(-4)}` : candB.name}
                        </h3>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {isBlindMode ? "redacted-email@talent.demo" : candB.email}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-emerald-400 font-mono bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                        {candB.rankingMetrics?.finalScore || 50}% Fit
                      </span>
                      <span className="text-[8px] block text-slate-500 font-mono mt-1">AI MATCH SCORE</span>
                    </div>
                  </div>

                  {/* General Highlights */}
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono border-t border-b border-slate-900 py-2">
                    <div>
                      <span className="text-slate-500 block text-[8px]">EXPERIENCE:</span>
                      <span className="text-slate-200 font-bold">{candB.experienceYears} Years</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[8px]">PIPELINE STAGE:</span>
                      <span className="text-blue-400 font-bold">{candB.stage}</span>
                    </div>
                  </div>

                  {/* Editable Salary Blocks */}
                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-900 space-y-2.5">
                    <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Financial Profile (Lakhs LPA)</span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[8px] font-mono text-slate-500 block uppercase mb-1">Expected Salary</label>
                        <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                          <span className="text-[10px] text-slate-500 font-mono">₹</span>
                          <input
                            type="number"
                            defaultValue={candB.salaryExpectation ? candB.salaryExpectation / 100000 : ""}
                            placeholder="Expected (LPA)"
                            onChange={(e) => {
                              const val = Number(e.target.value) * 100000;
                              handleUpdateSalary(candB.id, val, candB.salaryOffer);
                            }}
                            className="w-full bg-transparent text-xs font-mono text-white focus:outline-none"
                          />
                          <span className="text-[9px] text-slate-500 font-mono">L</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[8px] font-mono text-slate-500 block uppercase mb-1">Offer Made</label>
                        <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                          <span className="text-[10px] text-slate-500 font-mono">₹</span>
                          <input
                            type="number"
                            defaultValue={candB.salaryOffer ? candB.salaryOffer / 100000 : ""}
                            placeholder="Offer (LPA)"
                            onChange={(e) => {
                              const val = e.target.value !== "" ? Number(e.target.value) * 100000 : undefined;
                              handleUpdateSalary(candB.id, candB.salaryExpectation || 0, val);
                            }}
                            className="w-full bg-transparent text-xs font-mono text-white focus:outline-none"
                          />
                          <span className="text-[9px] text-slate-500 font-mono">L</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Resume viewer B with skill highlighter */}
                <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-3 shadow-inner">
                  <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest block">Curriculum Vitae Preview</span>
                  <div className="max-h-[350px] overflow-y-auto pr-1 text-[11px]/relaxed font-mono text-slate-300 space-y-4 scrollbar-thin">
                    <div className="space-y-1">
                      <span className="text-[9px] block text-slate-500 uppercase">Education</span>
                      <p className="text-white text-xs">{candB.education.join(" | ")}</p>
                    </div>
                    
                    <div className="space-y-1 border-t border-slate-900 pt-2">
                      <span className="text-[9px] block text-slate-500 uppercase">Featured Projects</span>
                      <ul className="list-disc list-inside space-y-1 pl-1 text-slate-200">
                        {candB.projects.map((p, i) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-1 border-t border-slate-900 pt-2">
                      <span className="text-[9px] block text-slate-500 uppercase">Full Resume Parser Text</span>
                      <p className="whitespace-pre-wrap text-slate-400 bg-slate-900/30 p-2.5 rounded border border-slate-900 leading-relaxed font-sans">
                        {renderHighlightedText(candB.resumeText, overlappingSkills, uniqueSkillsB, "bg-purple-500/10 text-purple-300 border-purple-500/20", "border-purple-500/20")}
                      </p>
                    </div>
                  </div>
                </div>

              </div>

            </div>

          </div>
        </div>
      ) : (
        <>
          {/* MIDDLE COLUMN: Candidate ranked list and Compare mode */}
          <div className="lg:col-span-5 space-y-4">
        
        {/* Toggle between Active Applicants and Passive Talent Sourcing */}
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setRecruiterViewMode("active")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
              recruiterViewMode === "active"
                ? "bg-slate-800 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Active Applicants ({filteredCandidates.length})
          </button>
          <button
            onClick={() => setRecruiterViewMode("passive")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
              recruiterViewMode === "passive"
                ? "bg-emerald-500 text-slate-950 font-bold shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Passive Talent Source
          </button>
        </div>

        {recruiterViewMode === "active" ? (
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
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsBlindMode(!isBlindMode)}
                  className={`px-2 py-1 text-xs rounded transition-all flex items-center gap-1 cursor-pointer border ${
                    isBlindMode 
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/30 font-medium" 
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border-slate-700"
                  }`}
                  title="Toggle Blind Screening Mode to mask candidate names, photos, and universities to avoid bias."
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  {isBlindMode ? "Blind Mode: ON" : "Blind Mode"}
                </button>

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

                {/* Export to CSV Button */}
                <button
                  onClick={handleExportToCSV}
                  className="px-2 py-1 text-xs bg-emerald-500/10 hover:bg-emerald-500 hover:text-slate-950 text-emerald-400 rounded-md border border-emerald-500/20 transition-all flex items-center gap-1 cursor-pointer"
                  title="Export matching candidates list to CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export
                </button>
              </div>
            </div>

            {/* Bulk Actions Banner */}
            {bulkSelectedCandidateIds.length > 0 && (
              <div className="bg-slate-950 border border-emerald-500/20 rounded-lg p-2.5 mb-3 flex items-center justify-between gap-2 animate-fadeIn">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold text-[11px] font-mono">
                    {bulkSelectedCandidateIds.length}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-200">Selected for Bulk action</span>
                  <button
                    type="button"
                    onClick={() => setBulkSelectedCandidateIds([])}
                    className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                  >
                    Clear
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-slate-500 font-mono hidden sm:inline">Action:</span>
                  
                  <select
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) return;
                      if (val === "reject") {
                        handleOpenBulkActionModal("reject");
                      } else {
                        handleOpenBulkActionModal("stage", val);
                      }
                      e.target.value = ""; // Reset dropdown
                    }}
                    className="bg-slate-900 border border-slate-800 text-[10px] text-slate-300 rounded px-2 py-1 focus:outline-none focus:border-slate-700 cursor-pointer animate-pulse"
                  >
                    <option value="">Choose action...</option>
                    <option value="Shortlisted">Move: Shortlisted</option>
                    <option value="Interview">Move: Interview</option>
                    <option value="Offer">Move: Offer</option>
                    <option value="Hired">Move: Hired</option>
                    <option value="reject">Bulk Reject Candidates</option>
                  </select>
                </div>
              </div>
            )}

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
                        : cand.isPriority
                          ? "bg-slate-900/60 border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.05)] hover:bg-slate-800/30"
                          : "bg-slate-950/50 border-slate-900 hover:bg-slate-800/40"
                    }`}
                  >
                    
                    {/* Bulk Selection Checkbox */}
                    <div 
                      className="absolute top-4.5 left-3.5 z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={bulkSelectedCandidateIds.includes(cand.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setBulkSelectedCandidateIds([...bulkSelectedCandidateIds, cand.id]);
                          } else {
                            setBulkSelectedCandidateIds(bulkSelectedCandidateIds.filter(id => id !== cand.id));
                          }
                        }}
                        className="w-4 h-4 rounded bg-slate-900 border-slate-800 text-emerald-500 focus:ring-0 cursor-pointer accent-emerald-500"
                      />
                    </div>

                    {/* Rank badge */}
                    <div className="absolute top-3.5 left-10 bg-slate-900 text-[10px] font-mono text-slate-300 px-1.5 py-0.5 rounded border border-slate-800">
                      #{index + 1}
                    </div>

                    <div className="pl-14">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center flex-wrap gap-2">
                            <button
                              onClick={(e) => handleTogglePriority(e, cand.id, !!cand.isPriority)}
                              className="focus:outline-none transition-transform hover:scale-110 cursor-pointer shrink-0"
                              title={cand.isPriority ? "Remove Priority Flag" : "Mark as Priority / High-Potential"}
                            >
                              {cand.isPriority ? (
                                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                              ) : (
                                <Star className="w-4 h-4 text-slate-600 hover:text-amber-400" />
                              )}
                            </button>

                            <h3 className="font-semibold text-xs text-slate-100 flex items-center gap-1.5">
                              {isBlindMode ? `Anonymous Candidate #${cand.id.slice(-4)}` : cand.name}
                              <span className="text-[10px] font-mono text-slate-400 font-normal">({cand.experienceYears}y exp)</span>
                            </h3>

                            {/* Priority badge */}
                            {cand.isPriority && (
                              <span className="text-[8px] bg-amber-500/10 text-amber-300 border border-amber-500/25 px-1.5 py-0.5 rounded-full font-mono uppercase tracking-wider font-semibold">
                                High Potential
                              </span>
                            )}

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
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {isBlindMode ? "redacted-email@talent.demo" : cand.email}
                          </p>
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

                      {/* Visual hiring pipeline progress bar */}
                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between items-center text-[8px] text-slate-500 font-mono">
                          <span className="tracking-wider uppercase">Pipeline Stage Progress</span>
                          <span className="font-semibold text-emerald-400">
                            {cand.stage === "Applied" && "Applied (25%)"}
                            {cand.stage === "Shortlisted" && "Shortlisted (50%)"}
                            {cand.stage === "Interview" && "Interviewing (75%)"}
                            {cand.stage === "Offer" && "Hired (100%)"}
                            {cand.stage === "Rejected" && "Discontinued"}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden flex gap-0.5 p-[1px] border border-slate-900/80">
                          <div className={`h-full flex-1 rounded-l-full transition-all duration-300 ${
                            cand.stage === "Rejected" ? "bg-rose-500/60" :
                            ["Applied", "Shortlisted", "Interview", "Offer"].includes(cand.stage) ? "bg-emerald-500" : "bg-slate-800"
                          }`} />
                          <div className={`h-full flex-1 transition-all duration-300 ${
                            cand.stage === "Rejected" ? "bg-slate-800/20" :
                            ["Shortlisted", "Interview", "Offer"].includes(cand.stage) ? "bg-emerald-500" : "bg-slate-800"
                          }`} />
                          <div className={`h-full flex-1 transition-all duration-300 ${
                            cand.stage === "Rejected" ? "bg-slate-800/20" :
                            ["Interview", "Offer"].includes(cand.stage) ? "bg-emerald-500" : "bg-slate-800"
                          }`} />
                          <div className={`h-full flex-1 rounded-r-full transition-all duration-300 ${
                            cand.stage === "Rejected" ? "bg-slate-800/20" :
                            ["Offer"].includes(cand.stage) ? "bg-emerald-400 animate-pulse" : "bg-slate-800"
                          }`} />
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
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-white font-display flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                Global Talent Sourcing Engine (Passive)
              </h2>
              <p className="text-[11px] text-slate-400 mt-1">
                Utilize Gemini AI models to generate high-potential passive talent profiles from public global directory attributes mapped specifically for the active job requirement: <strong className="text-emerald-400">"{selectedJob?.title}"</strong>.
              </p>
            </div>

            {/* Custom guidance query prompt */}
            <div className="space-y-2">
              <label className="block text-[10px] text-slate-400 uppercase font-mono tracking-wider">Passive Query Guidance (Optional)</label>
              <textarea
                rows={2}
                placeholder="e.g. 'Target Bangalore candidates, preferably from early-stage startups like Razorpay with experience leading search scaling.'"
                value={passiveQuery}
                onChange={(e) => setPassiveQuery(e.target.value)}
                className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            <button
              onClick={handleSourcePassive}
              disabled={isSourcingPassive}
              className="w-full py-2.5 bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs hover:bg-emerald-400 transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isSourcingPassive ? (
                <>
                  <div className="animate-spin w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                  Sourcing Profiles with Gemini...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Source Passive Candidate Matches
                </>
              )}
            </button>

            {/* Sourced Candidate Results */}
            {passiveTalents && (
              <div className="space-y-4 pt-2 border-t border-slate-800">
                <p className="text-[10px] text-slate-400 font-bold font-mono tracking-wider uppercase">Sourced Passive Profiles ({passiveTalents.length})</p>
                <div className="space-y-3">
                  {passiveTalents.map((talent, idx) => (
                    <div key={idx} className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 hover:border-slate-700 transition-all space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-xs text-white">{talent.name}</h4>
                          <p className="text-[10px] text-slate-400 font-mono">{talent.currentRole} &middot; <strong className="text-slate-300">{talent.currentCompany}</strong> ({talent.experienceYears}y exp)</p>
                        </div>
                        <span className="text-[8px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded font-mono uppercase font-bold">
                          {talent.estimatedSalaryFit}
                        </span>
                      </div>

                      <div className="text-[10px]/relaxed text-slate-400 font-sans">
                        <p className="font-semibold text-[9px] text-emerald-400 uppercase font-mono mb-0.5">Match Justification</p>
                        {talent.matchJustification}
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {talent.skills.map((s: string) => (
                          <span key={s} className="bg-slate-900 border border-slate-800 text-[9px] px-1.5 py-0.5 rounded text-slate-300 font-mono">
                            {s}
                          </span>
                        ))}
                      </div>

                      <div className="text-[9px] font-mono text-slate-500 flex justify-between items-center bg-slate-950 p-1.5 rounded border border-slate-900/40">
                        <span>Edu: {talent.education}</span>
                        <a href={`https://${talent.socialHandle}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                          {talent.socialHandle}
                        </a>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 pt-1 border-t border-slate-900/60">
                        <button
                          onClick={() => handleImportPassiveCandidate(talent)}
                          className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-[10px] font-medium text-emerald-400 transition-colors cursor-pointer"
                        >
                          📥 Import to Pipeline
                        </button>
                        <button
                          onClick={() => {
                            // Synthesize a quick mock candidate and call the email draft modal
                            handleDraftOutreach(talent.email); // Since we pass mock ID or email, we can handle it beautifully
                          }}
                          className="flex-1 py-1.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 rounded text-[10px] font-bold transition-colors cursor-pointer"
                        >
                          ✉️ Draft Outreach
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
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
                          <h4 className="text-xs font-bold text-white">
                            {isBlindMode ? `Anonymous Candidate #${cand.id.slice(-4)}` : cand.name}
                          </h4>
                          <span className="text-[9px] text-slate-400 font-mono block">
                            {isBlindMode ? "redacted-email@talent.demo" : cand.email}
                          </span>
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
                  {isBlindMode ? `ANONYMOUS CANDIDATE #${activeCandidateForView.id.slice(-4)}` : activeCandidateForView.name?.toUpperCase()} &mdash; CURRICULUM VITAE
                </p>
                <p className="text-slate-500 mb-3 text-[10px]/normal">
                  [Verified Email Channel: {isBlindMode ? "redacted-email@talent.demo" : activeCandidateForView.email}]
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
                    {redactAcademics(activeCandidateForView.education).map((ed, i) => (
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
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="text-xs font-semibold tracking-wider uppercase text-slate-400 font-display flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                    AI Candidate Explanation
                  </h3>
                  <button
                    onClick={() => handleFetchMatchRationale(activeCandidateForView.id)}
                    className="text-[9px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-mono cursor-pointer transition-colors"
                  >
                    ✨ Deep Match Rationale
                  </button>
                </div>
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

              {/* COGNITIVE SKILL ALIGNMENT MAP */}
              <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-950 space-y-3">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center justify-between">
                  <span>Required Skills Alignment Plot</span>
                  <span className="text-[8px] text-slate-500 font-sans italic">Job vs Candidate Resume Match</span>
                </h4>
                
                <div className="space-y-2">
                  {(() => {
                    const mustHaves = selectedJob?.mustHaveSkills || [];
                    const niceHaves = selectedJob?.niceToHaveSkills || [];
                    const allRequired = [
                      ...mustHaves.map(s => ({ name: s, isMustHave: true })),
                      ...niceHaves.map(s => ({ name: s, isMustHave: false }))
                    ];

                    if (allRequired.length === 0) {
                      return <p className="text-[10px] text-slate-500 italic text-center py-2">No skills defined for this job posting yet.</p>;
                    }

                    return allRequired.map(reqSkill => {
                      // Resolve candidate skill level
                      const progressLevel = activeCandidateForView.skillProgress?.[reqSkill.name];
                      const hasSkillInList = activeCandidateForView.skills?.some(
                        s => s.toLowerCase() === reqSkill.name.toLowerCase()
                      );

                      let level: "Expert" | "Intermediate" | "Missing" = "Missing";
                      if (progressLevel) {
                        level = progressLevel as "Expert" | "Intermediate" | "Missing";
                      } else if (hasSkillInList) {
                        level = "Intermediate";
                      }

                      return (
                        <div key={reqSkill.name} className="space-y-1">
                          <div className="flex justify-between items-center text-[10px]">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-semibold text-slate-200 truncate">{reqSkill.name}</span>
                              <span className={`text-[8px] px-1 rounded-sm uppercase font-mono ${
                                reqSkill.isMustHave 
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15" 
                                  : "bg-slate-900 text-slate-400"
                              }`}>
                                {reqSkill.isMustHave ? "Must" : "Nice"}
                              </span>
                            </div>
                            
                            <span className={`font-mono font-bold text-[9px] ${
                              level === "Expert" 
                                ? "text-emerald-400" 
                                : level === "Intermediate" 
                                  ? "text-amber-400" 
                                  : "text-rose-500"
                            }`}>
                              {level}
                            </span>
                          </div>

                          {/* Horizontal bar plot */}
                          <div className="w-full bg-slate-950/80 rounded h-1.5 overflow-hidden flex animate-fadeIn">
                            {level === "Expert" && (
                              <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full w-full shadow-[0_0_6px_rgba(16,185,129,0.3)]" />
                            )}
                            {level === "Intermediate" && (
                              <div className="bg-gradient-to-r from-amber-500 to-orange-400 h-full w-[65%]" />
                            )}
                            {level === "Missing" && (
                              <div className="border-t border-dashed border-rose-500/40 w-full h-full" />
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* PLATFORM ACTIVITY & TEST SCORES */}
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-900 space-y-2">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1">
                  <Activity className="w-3 h-3 text-emerald-400" />
                  Platform Activity & Skill Benchmarks
                </h4>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-300">
                  <div className="bg-slate-950 p-2 rounded border border-slate-900/60 space-y-1">
                    <span className="text-slate-500 block text-[8px] uppercase">Coding Test score</span>
                    <div className="flex items-center justify-between">
                      <span className="text-white font-bold text-xs">{activeCandidateForView.platformActivity?.codingScore ?? 85}%</span>
                      <span className="text-emerald-400 text-[8px] bg-emerald-500/10 px-1 rounded">Top Decile</span>
                    </div>
                  </div>
                  <div className="bg-slate-950 p-2 rounded border border-slate-900/60 space-y-1">
                    <span className="text-slate-500 block text-[8px] uppercase">Profile Completeness</span>
                    <div className="flex items-center justify-between">
                      <span className="text-white font-bold text-xs">{activeCandidateForView.platformActivity?.profileCompleteness ?? 90}%</span>
                      <span className="text-blue-400 text-[8px]">Excellent</span>
                    </div>
                  </div>
                  <div className="bg-slate-950 p-2 rounded border border-slate-900/60 space-y-1">
                    <span className="text-slate-500 block text-[8px] uppercase">Responsiveness Index</span>
                    <div className="flex items-center justify-between">
                      <span className="text-white font-bold text-xs">{activeCandidateForView.platformActivity?.responsivenessScore ?? 92}%</span>
                      <span className="text-emerald-400 text-[8px]">Active</span>
                    </div>
                  </div>
                  <div className="bg-slate-950 p-2 rounded border border-slate-900/60 space-y-1">
                    <span className="text-slate-500 block text-[8px] uppercase">National Hackathon Rank</span>
                    <div className="flex items-center justify-between">
                      <span className="text-white font-bold text-xs">#{activeCandidateForView.platformActivity?.hackathonRank ?? 15}</span>
                      <span className="text-amber-400 text-[8px] font-sans">Gold Badge</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* BEHAVIORAL SIGNALS RADAR CHART */}
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-900 space-y-2">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3 h-3 text-rose-400 animate-pulse" />
                    Cultural & Behavioral Alignment Radar
                  </span>
                  <span className="text-slate-500 text-[8px]">Max Score: 5</span>
                </h4>
                
                <div className="h-[180px] w-full flex items-center justify-center bg-slate-950/80 rounded-lg border border-slate-900 py-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart
                      cx="50%"
                      cy="50%"
                      outerRadius="70%"
                      data={[
                        { subject: 'Ownership', A: activeCandidateForView.behavioralSignals?.ownership || 4 },
                        { subject: 'Leadership', A: activeCandidateForView.behavioralSignals?.leadership || 4 },
                        { subject: 'Collaboration', A: activeCandidateForView.behavioralSignals?.collaboration || 4 },
                      ]}
                    >
                      <PolarGrid stroke="#1e293b" />
                      <PolarAngleAxis 
                        dataKey="subject" 
                        tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }} 
                      />
                      <PolarRadiusAxis 
                        angle={30} 
                        domain={[0, 5]} 
                        tick={{ fill: '#475569', fontSize: 8 }}
                        axisLine={false}
                      />
                      <Radar
                        name="Behavioral Fit"
                        dataKey="A"
                        stroke="#10b981"
                        fill="#10b981"
                        fillOpacity={0.25}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
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
                      onChange={(e) => handleStageChange(activeCandidateForView.id, e.target.value, activeCandidateForView.interviewStage)}
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
                      onChange={(e) => handleStageChange(activeCandidateForView.id, activeCandidateForView.stage, e.target.value)}
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

                {/* Notify Candidate Toggle */}
                <div className="flex items-center gap-2 pt-1 pb-1">
                  <input
                    type="checkbox"
                    id="notify_candidate_checkbox"
                    checked={notifyCandidate}
                    onChange={(e) => setNotifyCandidate(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-emerald-400 accent-emerald-400 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                  />
                  <label htmlFor="notify_candidate_checkbox" className="text-[10px] text-slate-400 hover:text-slate-300 select-none cursor-pointer flex items-center gap-1">
                    <span>Notify Candidate of stage update (Simulate Email Alert)</span>
                  </label>
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

                {/* Standardized Structured Interview Scorecard */}
                <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-950 mt-3 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-905 pb-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">
                      Standardized Evaluation Scorecard
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const score = activeCandidateForView.structuredFeedback || {
                          technicalProficiency: 3,
                          communication: 3,
                          culturalAlignment: 3,
                          notes: ""
                        };
                        setTempScorecard(score);
                        setIsEvaluatingCandidate(!isEvaluatingCandidate);
                      }}
                      className="text-[9px] text-emerald-400 hover:underline cursor-pointer"
                    >
                      {isEvaluatingCandidate ? "Cancel" : "Rate Candidate"}
                    </button>
                  </div>

                  {isEvaluatingCandidate ? (
                    <div className="space-y-3 text-xs">
                      <div className="grid grid-cols-1 gap-2.5">
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] font-mono text-slate-400">Technical Proficiency</label>
                            <span className="text-[10px] font-mono font-bold text-emerald-400">{tempScorecard.technicalProficiency}/5</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            value={tempScorecard.technicalProficiency}
                            onChange={(e) => setTempScorecard({ ...tempScorecard, technicalProficiency: Number(e.target.value) })}
                            className="w-full accent-emerald-500 bg-slate-900 h-1.5 rounded cursor-pointer"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] font-mono text-slate-400">Communication Skills</label>
                            <span className="text-[10px] font-mono font-bold text-emerald-400">{tempScorecard.communication}/5</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            value={tempScorecard.communication}
                            onChange={(e) => setTempScorecard({ ...tempScorecard, communication: Number(e.target.value) })}
                            className="w-full accent-emerald-500 bg-slate-900 h-1.5 rounded cursor-pointer"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] font-mono text-slate-400">Cultural Alignment</label>
                            <span className="text-[10px] font-mono font-bold text-emerald-400">{tempScorecard.culturalAlignment}/5</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            value={tempScorecard.culturalAlignment}
                            onChange={(e) => setTempScorecard({ ...tempScorecard, culturalAlignment: Number(e.target.value) })}
                            className="w-full accent-emerald-500 bg-slate-900 h-1.5 rounded cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-400">Evaluation Comments</label>
                        <textarea
                          rows={2}
                          value={tempScorecard.notes}
                          onChange={(e) => setTempScorecard({ ...tempScorecard, notes: e.target.value })}
                          placeholder="Provide descriptive rationale to support scorecard ratings..."
                          className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-[11px] text-slate-200 focus:outline-none focus:border-slate-700"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const res = await fetch(`/api/candidates/${activeCandidateForView.id}/interview-feedback`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ feedback: tempScorecard })
                            });
                            if (res.ok) {
                              const updatedCand = await res.json();
                              setActiveCandidateForView(updatedCand);
                              setIsEvaluatingCandidate(false);
                              onRefreshData();
                            }
                          } catch (err) {
                            console.error("Failed to save feedback scorecard:", err);
                          }
                        }}
                        className="w-full py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded text-[11px] font-sans transition-all cursor-pointer"
                      >
                        Commit Evaluation Scorecard
                      </button>
                    </div>
                  ) : activeCandidateForView.structuredFeedback ? (
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                          <span className="text-[8px] block text-slate-500 uppercase font-mono">TECHNICAL</span>
                          <span className="text-xs font-mono font-bold text-emerald-400">{activeCandidateForView.structuredFeedback.technicalProficiency} / 5</span>
                        </div>
                        <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                          <span className="text-[8px] block text-slate-500 uppercase font-mono">COMMUNICATION</span>
                          <span className="text-xs font-mono font-bold text-emerald-400">{activeCandidateForView.structuredFeedback.communication} / 5</span>
                        </div>
                        <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                          <span className="text-[8px] block text-slate-500 uppercase font-mono">CULTURAL</span>
                          <span className="text-xs font-mono font-bold text-emerald-400">{activeCandidateForView.structuredFeedback.culturalAlignment} / 5</span>
                        </div>
                      </div>
                      {activeCandidateForView.structuredFeedback.notes && (
                        <div className="bg-slate-900 p-2 rounded text-[11px] text-slate-300 border border-slate-800">
                          <span className="text-[9px] font-mono text-slate-500 block mb-0.5">EVALUATION SUMMARY:</span>
                          {activeCandidateForView.structuredFeedback.notes}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-500 italic text-center py-2">
                      No interview evaluation scorecard submitted yet.
                    </p>
                  )}
                </div>

                {/* INLINE QUICK NOTES & TEAM ANNOTATION HISTORY */}
                <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-950 mt-3 space-y-3">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">
                      Collaborative Team Annotations
                    </span>
                  </div>

                  {/* Annotations List */}
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {activeCandidateForView.quickNotes && activeCandidateForView.quickNotes.length > 0 ? (
                      activeCandidateForView.quickNotes.map((note) => (
                        <div key={note.id} className="bg-slate-950 p-2 rounded border border-slate-900 flex flex-col gap-1">
                          <div className="flex justify-between items-center text-[9px]">
                            <span className="font-bold text-emerald-400 font-mono">{note.author}</span>
                            <span className="text-slate-500 font-mono">{note.timestamp}</span>
                          </div>
                          <p className="text-xs text-slate-200">{note.text}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-slate-500 italic">No annotations added yet. Start the team discussion below.</p>
                    )}
                  </div>

                  {/* Add Annotation Form */}
                  <div className="flex gap-1.5 pt-1">
                    <input
                      type="text"
                      placeholder="Add team note (e.g. 'Highly responsive over phone')"
                      value={newQuickNoteText}
                      onChange={(e) => setNewQuickNoteText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleAddQuickNote(activeCandidateForView.id);
                        }
                      }}
                      className="flex-1 text-xs bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-slate-700"
                    />
                    <button
                      onClick={() => handleAddQuickNote(activeCandidateForView.id)}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded text-[10px] transition-colors cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* CANDIDATE ENGAGEMENT & INTERVIEWING SECTION */}
                <div className="p-3.5 bg-slate-950/40 rounded-lg border border-slate-950 mt-3 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-emerald-400" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">
                        Engagement & Interviewing
                      </span>
                    </div>
                  </div>

                  {/* Automated Outreach Module */}
                  <div className="space-y-2">
                    <p className="text-[10px] text-slate-500 font-mono">AUTOMATED OUTREACH</p>
                    <button
                      onClick={() => handleDraftOutreach(activeCandidateForView.id)}
                      className="w-full py-2 px-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      ✨ Draft Personalized Outreach Email
                    </button>
                    <p className="text-[9px] text-slate-500 italic text-center">
                      Uses Gemini AI to compile a context-aware greeting highlighting their top experiences.
                    </p>
                  </div>

                  {/* Interview Scheduler component */}
                  <div className="space-y-3 pt-2.5 border-t border-slate-900">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-slate-500 font-mono">INTERVIEW SCHEDULER</p>
                      {activeCandidateForView.scheduledInterview ? (
                        <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 font-mono">
                          {activeCandidateForView.scheduledInterview.status}
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-500 font-mono italic">Pending booking</span>
                      )}
                    </div>

                    {activeCandidateForView.scheduledInterview ? (
                      <div className="bg-slate-950 p-3 rounded-md border border-slate-900 space-y-2 text-xs">
                        <div className="flex justify-between font-medium">
                          <span className="text-slate-200">Date & Time:</span>
                          <span className="text-emerald-400 font-mono">{activeCandidateForView.scheduledInterview.date} @ {activeCandidateForView.scheduledInterview.time}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Interviewer:</span>
                          <span className="text-slate-200">{activeCandidateForView.scheduledInterview.recruiterName}</span>
                        </div>
                        <div className="pt-1 flex items-center justify-between border-t border-slate-900">
                          <span className="text-[10px] text-slate-500">Video Link:</span>
                          <a
                            href={activeCandidateForView.scheduledInterview.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-blue-400 hover:underline font-mono"
                          >
                            Join Google Meet
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-[10px] text-slate-400">Book direct slot on behalf of candidate:</p>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {availabilitySlots.filter(s => !s.booked).length > 0 ? (
                            availabilitySlots.filter(s => !s.booked).map(slot => (
                              <button
                                key={slot.id}
                                onClick={() => handleBookInterviewForCandidate(activeCandidateForView.id, slot.id)}
                                className="w-full text-left p-2 bg-slate-950 hover:bg-slate-900 border border-slate-900 hover:border-slate-800 rounded flex justify-between items-center text-xs text-slate-300 transition-colors cursor-pointer"
                              >
                                <span className="font-mono text-[10px]">{slot.date} &middot; {slot.time}</span>
                                <span className="text-[10px] text-emerald-400 font-bold hover:underline font-mono">Book slot &rarr;</span>
                              </button>
                            ))
                          ) : (
                            <p className="text-[10px] text-slate-500 italic">No slots available. Add slots under standard settings below.</p>
                          )}
                        </div>

                        {/* Recruiter Slot Creator */}
                        <div className="pt-2 border-t border-slate-900">
                          {!isAddingSlot ? (
                            <button
                              onClick={() => setIsAddingSlot(true)}
                              className="text-[10px] text-emerald-400 hover:underline font-mono flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" /> Add New Recruiter Availability Slot
                            </button>
                          ) : (
                            <div className="bg-slate-950 p-2.5 rounded border border-slate-900 space-y-2">
                              <p className="text-[9px] font-bold text-slate-400 font-mono uppercase">New Availability Window</p>
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  type="date"
                                  value={newSlotDate}
                                  onChange={(e) => setNewSlotDate(e.target.value)}
                                  className="text-xs bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-white focus:outline-none"
                                />
                                <input
                                  type="text"
                                  placeholder="e.g. 11:30 AM"
                                  value={newSlotTime}
                                  onChange={(e) => setNewSlotTime(e.target.value)}
                                  className="text-xs bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-white focus:outline-none"
                                />
                              </div>
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => setIsAddingSlot(false)}
                                  className="text-[9px] text-slate-400 bg-slate-900 px-2 py-1 rounded cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={handleAddSlot}
                                  className="text-[9px] text-slate-950 bg-emerald-400 font-bold px-2 py-1 rounded cursor-pointer"
                                >
                                  Add Slot
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                      </div>
                    )}
                  </div>

                </div>

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
      </>
    )}

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
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] text-slate-400">JD Role Description / Target Objectives</label>
                  <button
                    type="button"
                    disabled={!newJob.title || isGeneratingJD}
                    onClick={async () => {
                      setIsGeneratingJD(true);
                      try {
                        const res = await fetch("/api/jobs/generate-description", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            title: newJob.title,
                            skills: newJob.mustHaveInput
                          })
                        });
                        if (res.ok) {
                          const data = await res.json();
                          setNewJob(prev => ({ ...prev, description: data.description }));
                        }
                      } catch (err) {
                        console.error("JD draft generation failed:", err);
                      } finally {
                        setIsGeneratingJD(false);
                      }
                    }}
                    className="text-[9px] bg-indigo-500/15 hover:bg-indigo-500 hover:text-white border border-indigo-500/30 text-indigo-400 px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50 font-mono"
                  >
                    {isGeneratingJD ? (
                      <>
                        <span className="animate-spin inline-block h-2 w-2 border border-indigo-400 border-t-transparent rounded-full mr-0.5" />
                        Drafting...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-2.5 h-2.5" />
                        AI Draft with Gemini
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  rows={4}
                  required
                  placeholder="We are seeking an engineer to build our core semantic models..."
                  value={newJob.description}
                  onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-slate-600"
                />
                <button
                  type="button"
                  onClick={handleAutoFillJob}
                  disabled={isParsingJobDescription || !newJob.description}
                  className="mt-2 text-[10px] text-emerald-400 hover:text-emerald-300 font-mono flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded transition-all w-full justify-center"
                >
                  {isParsingJobDescription ? (
                    <>
                      <span className="animate-spin inline-block h-3 w-3 border-2 border-emerald-400 border-t-transparent rounded-full mr-1" />
                      AI Analyzing & Auto-Filling Form...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-3.5 h-3.5 text-emerald-400" />
                      🪄 Auto-Generate Professional Summary & Skill Tags
                    </>
                  )}
                </button>
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

      {/* Simulated Email Notification Toast */}
      {simulatedNotification && (
        <div id="simulated_email_alert_popup" className="fixed bottom-6 right-6 z-50 max-w-md w-full bg-slate-950 border-2 border-emerald-500/40 rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.15)] overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="bg-emerald-500/10 px-4 py-3 border-b border-emerald-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-emerald-500/20 rounded">
                <FileText className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 font-mono tracking-wider uppercase block">Simulated Email Triggered</span>
                <span className="text-xs font-semibold text-white">Application Stage Update Alert</span>
              </div>
            </div>
            <button 
              onClick={() => setSimulatedNotification(null)}
              className="text-slate-400 hover:text-white p-1 hover:bg-slate-900 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 space-y-3 font-mono text-[11px] text-slate-300">
            <div className="grid grid-cols-5 gap-1 border-b border-slate-900 pb-2">
              <span className="text-slate-500 font-bold">RECIPIENT:</span>
              <span className="col-span-4 text-emerald-400 font-semibold">{simulatedNotification.name} &lt;{simulatedNotification.to}&gt;</span>
            </div>
            <div className="grid grid-cols-5 gap-1 border-b border-slate-900 pb-2">
              <span className="text-slate-500 font-bold">SUBJECT:</span>
              <span className="col-span-4 text-slate-200 font-semibold">{simulatedNotification.subject}</span>
            </div>
            <div className="space-y-1">
              <span className="text-slate-500 font-bold block mb-1">MESSAGE BODY:</span>
              <pre className="whitespace-pre-wrap font-sans text-slate-300 bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-[11px] leading-relaxed max-h-[160px] overflow-y-auto">
                {simulatedNotification.body}
              </pre>
            </div>
            <div className="flex justify-between items-center pt-2 text-[10px] text-slate-500 font-sans">
              <span>📧 Sandbox simulated email dispatched</span>
              <button
                onClick={() => setSimulatedNotification(null)}
                className="px-3 py-1 bg-emerald-500 text-slate-950 font-bold rounded hover:bg-emerald-400 transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MATCH RATIONALE DIALOG MODAL */}
      {isMatchRationaleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
                <div>
                  <h3 className="text-sm font-bold text-slate-100 font-display">
                    Gemini Cognitive Match Rationale
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Candidate: {activeCandidateForView?.name} &middot; Role: {selectedJob?.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsMatchRationaleModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isFetchingRationale ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <span className="animate-spin h-8 w-8 border-4 border-emerald-400 border-t-transparent rounded-full" />
                <p className="text-xs text-slate-400 font-mono animate-pulse">
                  Querying Gemini LLM and synthesizing match signals...
                </p>
              </div>
            ) : matchRationaleData ? (
              <div className="space-y-4">
                {/* Score badge & Overall Fit */}
                <div className="flex items-start gap-4 bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center min-w-[70px]">
                    <span className="text-2xl font-black text-emerald-400 block font-mono">
                      {matchRationaleData.overallScore}%
                    </span>
                    <span className="text-[8px] uppercase tracking-wider text-slate-400 font-mono font-bold">
                      Match Fit
                    </span>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                      Overall Executive Alignment
                    </h4>
                    <p className="text-xs text-slate-200 leading-relaxed">
                      {matchRationaleData.overallFit}
                    </p>
                  </div>
                </div>

                {/* Key Semantic Matches */}
                <div className="space-y-1.5">
                  <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono">
                    ✓ Core Strengths & Semantic Matches
                  </h4>
                  <ul className="space-y-1.5">
                    {matchRationaleData.semanticMatches.map((match: string, idx: number) => (
                      <li key={idx} className="bg-emerald-500/5 border border-emerald-500/10 p-2 rounded text-xs text-slate-300 flex items-start gap-2">
                        <span className="text-emerald-400 font-bold font-mono mt-0.5">&bull;</span>
                        <span>{match}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Technical Skill Gaps */}
                <div className="space-y-1.5">
                  <h4 className="text-[10px] font-bold text-amber-400 uppercase tracking-wider font-mono">
                    ⚠ Identified Skill Gaps or Dev Areas
                  </h4>
                  <ul className="space-y-1.5">
                    {matchRationaleData.skillGaps.map((gap: string, idx: number) => (
                      <li key={idx} className="bg-amber-500/5 border border-amber-500/10 p-2 rounded text-xs text-slate-300 flex items-start gap-2">
                        <span className="text-amber-400 font-bold font-mono mt-0.5">&bull;</span>
                        <span>{gap}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Cultural Fit Assessment */}
                <div className="space-y-1">
                  <h4 className="text-[10px] font-bold text-rose-400 uppercase tracking-wider font-mono">
                    ♥ Cultural & Soft-Skill Index
                  </h4>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs text-slate-300 leading-relaxed">
                    {matchRationaleData.culturalAssessment}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setIsMatchRationaleModalOpen(false)}
                    className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded text-xs cursor-pointer transition-colors"
                  >
                    Close Rationale
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">Could not load match rationale.</p>
            )}
          </div>
        </div>
      )}

      {/* BULK ACTIONS & PREDEFINED EMAIL NOTIFICATION TRIGGER */}
      {bulkActionModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-5 shadow-2xl space-y-4 font-sans text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
                <Mail className="w-5 h-5 text-emerald-400" />
                Bulk action: {bulkActionModal.actionType === "reject" ? "Reject Candidates" : `Move to ${bulkActionModal.targetStage}`}
              </h3>
              <button onClick={() => setBulkActionModal({ isOpen: false })} className="text-slate-400 hover:text-white cursor-pointer animate-none">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              You have selected <span className="font-bold text-emerald-400">{bulkSelectedCandidateIds.length} candidate(s)</span> for this bulk update. Would you like to automatically trigger predefined email notifications?
            </p>

            {/* Template Selector dropdown */}
            <div className="space-y-1.5">
              <label className="block text-[10px] text-slate-400 font-mono uppercase">Predefined Notification Template</label>
              <select
                value={selectedEmailTemplate}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedEmailTemplate(val);
                  if (val === "none") {
                    setCustomEmailSubject("");
                    setCustomEmailBody("");
                  } else if (val === "reject") {
                    setCustomEmailSubject("Application Update: Redrob Team");
                    setCustomEmailBody("Dear Candidate,\n\nThank you for your time and application. Although your background is impressive, we have decided to move forward with other candidates whose skillsets align more closely with our current technical requirements.\n\nWe wish you the absolute best in your career pursuits.\n\nBest regards,\nRecruitment Team");
                  } else if (val === "invite") {
                    setCustomEmailSubject("Technical Interview Invitation - Redrob");
                    setCustomEmailBody("Dear Candidate,\n\nWe were highly impressed by your experience and core technical skillset. We would love to schedule a technical interview to discuss your experience.\n\nPlease let us know your availability over the coming days.\n\nBest regards,\nRecruitment Team");
                  } else if (val === "progression") {
                    setCustomEmailSubject(`Application Update: Progressing to ${bulkActionModal.targetStage || "next stage"}`);
                    setCustomEmailBody(`Dear Candidate,\n\nWe are pleased to inform you that your application has been progressed to the "${bulkActionModal.targetStage || "next stage"}" level of our review process.\n\nWe will reach out shortly with details and next steps.\n\nBest regards,\nRecruitment Team`);
                  }
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-300 focus:outline-none focus:border-slate-700 cursor-pointer"
              >
                <option value="none">No Notification (Silent Update)</option>
                <option value="invite">Interview Invitation Template</option>
                <option value="progression">Stage Progression Template</option>
                <option value="reject">Rejection Update Template</option>
              </select>
            </div>

            {/* Template customizer */}
            {selectedEmailTemplate !== "none" && (
              <div className="space-y-3.5 pt-2 animate-fadeIn">
                <div className="space-y-1">
                  <label className="block text-[10px] text-slate-400 font-mono uppercase">Email Subject Line</label>
                  <input
                    type="text"
                    value={customEmailSubject}
                    onChange={(e) => setCustomEmailSubject(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] text-slate-400 font-mono uppercase">Email Message Body</label>
                  <textarea
                    rows={6}
                    value={customEmailBody}
                    onChange={(e) => setCustomEmailBody(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-300 focus:outline-none font-sans"
                  />
                  <span className="text-[9px] text-slate-500 font-mono italic block">The system will customize greeting pronouns for each recipient automatically.</span>
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setBulkActionModal({ isOpen: false })}
                className="px-4 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-400 text-xs cursor-pointer hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkAction}
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded text-xs cursor-pointer transition-colors"
              >
                Execute Action &amp; Notify
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OUTREACH EMAIL DRAFT MODAL */}
      {isOutreachModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-emerald-400 animate-pulse" />
                <div>
                  <h3 className="text-sm font-bold text-slate-100 font-display">
                    AI Automated Outreach Drafter
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Personalized candidate outreach powered by Gemini-3.5-Flash
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOutreachModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isDraftingOutreach ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <span className="animate-spin h-8 w-8 border-4 border-emerald-400 border-t-transparent rounded-full" />
                <p className="text-xs text-slate-400 font-mono animate-pulse">
                  Drafting highly customized recruiter outreach email context...
                </p>
              </div>
            ) : outreachDraft ? (
              <div className="space-y-4">
                {/* Subject block */}
                <div className="space-y-1">
                  <label className="block text-[10px] text-slate-500 font-mono uppercase">Email Subject</label>
                  <input
                    type="text"
                    value={outreachDraft.subject}
                    onChange={(e) => setOutreachDraft({ ...outreachDraft, subject: e.target.value })}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 font-semibold focus:outline-none focus:border-slate-600"
                  />
                </div>

                {/* Body block */}
                <div className="space-y-1">
                  <label className="block text-[10px] text-slate-500 font-mono uppercase">Email Body</label>
                  <textarea
                    rows={12}
                    value={outreachDraft.body}
                    onChange={(e) => setOutreachDraft({ ...outreachDraft, body: e.target.value })}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded p-3 text-slate-300 font-sans focus:outline-none focus:border-slate-600 leading-relaxed"
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-between items-center pt-2">
                  <p className="text-[10px] text-slate-500 italic">
                    Tip: You can edit the text directly before copying.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsOutreachModalOpen(false)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded text-xs cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`Subject: ${outreachDraft.subject}\n\n${outreachDraft.body}`);
                        setCopiedOutreach(true);
                        setTimeout(() => setCopiedOutreach(false), 2000);
                      }}
                      className="px-4 py-1.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold rounded text-xs cursor-pointer transition-colors"
                    >
                      {copiedOutreach ? "Copied!" : "📋 Copy Email & Subject"}
                    </button>
                  </div>
                </div>

              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">Could not draft outreach. Try again.</p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
