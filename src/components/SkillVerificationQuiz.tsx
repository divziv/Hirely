import React, { useState } from "react";
import { CheckCircle2, AlertTriangle, ArrowRight, Award, ShieldAlert } from "lucide-react";

interface SkillVerificationQuizProps {
  candId: string;
  skillName: string;
  reqId: string;
  onComplete: () => void;
}

interface Question {
  q: string;
  options: string[];
  answerIdx: number;
}

const QUIZZES: Record<string, Question[]> = {
  react: [
    {
      q: "What is the primary benefit of React Server Components (RSC)?",
      options: [
        "They run on the client-side to bypass server limits entirely.",
        "They execute exclusively on the server, minimizing client bundle sizes and initial load times.",
        "They eliminate the need for using standard React hooks like useState.",
        "They automatically synchronize client-side caches with external SQL databases."
      ],
      answerIdx: 1
    },
    {
      q: "Which hook should be used to memoize a complex calculated value across standard component re-renders?",
      options: [
        "useEffect",
        "useCallback",
        "useMemo",
        "useRef"
      ],
      answerIdx: 2
    },
    {
      q: "What is a major risk of invoking a state updater directly inside a useEffect without a dependency array?",
      options: [
        "The state becomes permanently read-only.",
        "A runtime memory exception is thrown on the main window thread.",
        "Vite raises a bundle compilation error immediately.",
        "The application falls into an infinite re-render loop, freezing the browser."
      ],
      answerIdx: 3
    }
  ],
  python: [
    {
      q: "What is the core structural difference between a List and a Tuple in Python?",
      options: [
        "Lists are mutable and defined with square brackets; Tuples are immutable and defined with parentheses.",
        "Lists can only contain integers, while Tuples can contain mixed data types.",
        "Tuples perform slower than Lists during sequential read operations.",
        "Lists are compiled down to native C arrays, whereas Tuples are fully dynamic objects."
      ],
      answerIdx: 0
    },
    {
      q: "Which keyword is utilized to create a generator function in Python, permitting lazy valuation of streams?",
      options: [
        "yield",
        "return",
        "lambda",
        "defer"
      ],
      answerIdx: 0
    },
    {
      q: "How does Python's Global Interpreter Lock (GIL) impact multi-threaded CPU-bound execution?",
      options: [
        "It prevents multiple threads from accessing the file system concurrently.",
        "It restricts execution of Python bytecode to a single thread at a time, rendering multi-threaded CPU tasks single-core bound.",
        "It automatically distributes processing to GPU clusters in the background.",
        "It prevents race conditions entirely across distributed networks."
      ],
      answerIdx: 1
    }
  ],
  typescript: [
    {
      q: "What is the primary design purpose of the 'unknown' type in TypeScript compared to 'any'?",
      options: [
        "It is identical to any but restricted to primitive string types.",
        "It is type-safe; you must perform type checking or assertions before executing operations on it.",
        "It allows any property access without triggering compile-time warnings.",
        "It is automatically discarded during development build processes."
      ],
      answerIdx: 1
    },
    {
      q: "How do you extract a type representing all key names of a given interface T?",
      options: [
        "typeof T",
        "keyof T",
        "keys(T)",
        "pick<T>"
      ],
      answerIdx: 1
    },
    {
      q: "What is the structural outcome of marking an array type as 'readonly' in TypeScript?",
      options: [
        "All elements of the array are cast to string literals.",
        "The array can only be accessed inside class declarations.",
        "Mutating methods like push(), pop(), and shift() are flagged as compiler errors.",
        "The runtime engine executes the array using isolated thread boundaries."
      ],
      answerIdx: 2
    }
  ]
};

const DEFAULT_QUIZ: Question[] = [
  {
    q: "What does a Big O time complexity of O(log n) indicate regarding execution scalability?",
    options: [
      "The execution time grows linearly with the size of the input.",
      "The execution time doubles every time the input size is incremented.",
      "The execution time grows logarithmically, meaning scalability becomes more efficient as the input size scales.",
      "The execution time remains completely unchanged regardless of the input size."
    ],
    answerIdx: 2
  },
  {
    q: "Which HTTP method is mathematically designed and defined as idempotent for replacing/saving full resource state?",
    options: [
      "POST",
      "PUT",
      "PATCH",
      "DELETE"
    ],
    answerIdx: 1
  },
  {
    q: "What is the primary operational advantage of implementing a database index on a specific relational table column?",
    options: [
      "It automatically encrypts the data inside that column for security compliance.",
      "It significantly speeds up search query retrieval times at the cost of slight additional storage and write overhead.",
      "It prevents duplicate keys from being added to the database tables entirely.",
      "It allows the database engine to run in a single-threaded server-less context."
    ],
    answerIdx: 1
  }
];

export default function SkillVerificationQuiz({ candId, skillName, reqId, onComplete }: SkillVerificationQuizProps) {
  const normSkill = skillName.toLowerCase().trim();
  const questions = QUIZZES[normSkill] || DEFAULT_QUIZ;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackState, setFeedbackState] = useState<{ isCorrect: boolean; show: boolean } | null>(null);

  const handleSelectOption = (idx: number) => {
    if (feedbackState?.show) return; // Prevent changing after choosing
    setSelectedOpt(idx);
  };

  const handleVerifyAnswer = () => {
    if (selectedOpt === null) return;

    const currentQ = questions[currentIdx];
    const isCorrect = selectedOpt === currentQ.answerIdx;

    if (isCorrect) {
      setCorrectAnswersCount(prev => prev + 1);
    }

    setFeedbackState({
      isCorrect,
      show: true
    });
  };

  const handleNext = () => {
    setFeedbackState(null);
    setSelectedOpt(null);

    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(currentIdx + 1);
    } else {
      setQuizFinished(true);
    }
  };

  const handleSubmitQuizResult = async () => {
    setIsSubmitting(true);
    const score = Math.round((correctAnswersCount / questions.length) * 100);

    try {
      const res = await fetch(`/api/candidates/${candId}/submit-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skillName,
          reqId,
          score
        })
      });

      if (res.ok) {
        onComplete();
      } else {
        console.error("Failed to submit score");
      }
    } catch (err) {
      console.error("Network error during submission:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeQuestion = questions[currentIdx];
  const scorePercentage = Math.round((correctAnswersCount / questions.length) * 100);

  return (
    <div className="max-w-xl w-full mx-auto bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-5 animate-fadeIn">
      
      {/* Quiz Top Header */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-3">
        <div class="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Expert Skill Certification</h3>
            <p className="text-[10px] text-slate-400 font-sans">Verifying proficiency for: <span className="text-emerald-400 font-semibold">{skillName}</span></p>
          </div>
        </div>
        <span className="text-[10px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono">
          Question {currentIdx + 1} of {questions.length}
        </span>
      </div>

      {!quizFinished ? (
        <div className="space-y-4">
          {/* Progress bar */}
          <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
            <div 
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{ width: `${((currentIdx) / questions.length) * 100}%` }}
            />
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-200 leading-relaxed font-sans bg-slate-900/40 p-3 rounded border border-slate-900">
              {activeQuestion.q}
            </h4>

            {/* Answer Options */}
            <div className="space-y-2">
              {activeQuestion.options.map((opt, i) => {
                const isSelected = selectedOpt === i;
                const showFeedback = feedbackState?.show;
                const isCorrectAnswer = i === activeQuestion.answerIdx;

                let optStyle = "bg-slate-900 hover:bg-slate-900/80 border-slate-800/80 text-slate-300";
                if (isSelected) {
                  optStyle = "bg-indigo-500/10 border-indigo-500/50 text-indigo-300";
                }

                if (showFeedback) {
                  if (isCorrectAnswer) {
                    optStyle = "bg-emerald-500/10 border-emerald-500/50 text-emerald-300";
                  } else if (isSelected) {
                    optStyle = "bg-rose-500/10 border-rose-500/50 text-rose-300";
                  } else {
                    optStyle = "bg-slate-950 border-slate-900 text-slate-500 opacity-60";
                  }
                }

                return (
                  <button
                    key={i}
                    onClick={() => handleSelectOption(i)}
                    disabled={showFeedback}
                    className={`w-full text-left text-[11px] p-3 rounded-lg border transition-all flex items-start gap-2.5 cursor-pointer ${optStyle}`}
                  >
                    <span className="w-4 h-4 rounded-full border border-slate-700 bg-slate-950 flex items-center justify-center font-mono text-[9px] font-bold shrink-0">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="leading-normal">{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-2 border-t border-slate-900 flex justify-end gap-2">
            {!feedbackState?.show ? (
              <button
                onClick={handleVerifyAnswer}
                disabled={selectedOpt === null}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold rounded-md text-[10px] flex items-center gap-1 cursor-pointer font-mono"
              >
                Confirm Answer
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-md text-[10px] flex items-center gap-1 cursor-pointer font-mono"
              >
                {currentIdx + 1 < questions.length ? "Next Question" : "Complete Assessment"}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Inline Feedback Banner */}
          {feedbackState?.show && (
            <div className={`p-3 rounded-md border flex items-start gap-2 text-[10px] animate-fadeIn ${
              feedbackState.isCorrect 
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                : "bg-rose-500/10 text-rose-400 border-rose-500/20"
            }`}>
              {feedbackState.isCorrect ? (
                <>
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                  <div>
                    <span className="font-bold">Correct Response!</span> Excellent conceptual alignment with expert programming principles.
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <div>
                    <span className="font-bold">Incorrect Answer.</span> The selected option does not align with industry-accepted expert workflows. Keep going to finish your best attempt!
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      ) : (
        /* QUIZ FINISHED VIEW */
        <div className="space-y-4 text-center py-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
            <Award className="w-8 h-8" />
          </div>

          <div class="space-y-1">
            <h4 className="text-sm font-bold text-white tracking-tight">Assessment Completed Successfully!</h4>
            <p className="text-[11px] text-slate-400">Your total technical match performance is calculated below</p>
          </div>

          <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-900 max-w-sm mx-auto space-y-2">
            <div className="flex justify-between items-center text-[11px] text-slate-400">
              <span>Correct Answers</span>
              <span className="font-mono text-white font-bold">{correctAnswersCount} of {questions.length}</span>
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-400">
              <span>Verified Level</span>
              <span className="font-mono text-emerald-400 font-bold uppercase">{scorePercentage >= 65 ? "Expert Qualified" : "Candidate Baseline"}</span>
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-400">
              <span>Verification Status</span>
              <span className="font-mono text-emerald-400 font-bold">Passed</span>
            </div>

            <div className="pt-2 border-t border-slate-950">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-200">Resulting Match Score:</span>
                <span className="font-mono text-emerald-400 font-black text-sm">{scorePercentage}%</span>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-slate-500 leading-normal max-w-xs mx-auto">
            Submitting this score will officially update your professional skill scorecard with a verified **Expert** level badge across our developer directory.
          </p>

          <div className="flex items-center gap-2 justify-center pt-2">
            <button
              onClick={handleSubmitQuizResult}
              disabled={isSubmitting}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs tracking-wide shadow-lg shadow-emerald-600/15 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? "Submitting Verification..." : "Verify & Upgrade to Expert"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
