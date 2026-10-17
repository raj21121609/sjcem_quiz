import React from 'react';
import { Clock, User, AlertCircle, AlertTriangle } from 'lucide-react';
import { useQuiz, QUESTION_TIME_LIMIT_SECONDS, TOTAL_QUESTIONS_COUNT } from '../../context/QuizContext';

export default function QuizHeader() {
  const {
    contest,
    currentQuestionIndex,
    studentName,
    remainingSeconds,
    isTimesUpBrief
  } = useQuiz();

  // Timer states requested:
  // 30–11 seconds: SJCEM Navy (#00386B)
  // 10–6 seconds: Warning/orange state (#D97706)
  // 5–0 seconds: SJCEM red / critical state (#E31B23)
  let timerClasses = 'bg-[#00386B] text-white border-[#00284D]';
  let timerText = `${remainingSeconds}s`;

  if (isTimesUpBrief || remainingSeconds === 0) {
    timerClasses = 'bg-[#E31B23] text-white border-red-700 animate-pulse';
    timerText = "Time's up";
  } else if (remainingSeconds <= 5) {
    timerClasses = 'bg-[#E31B23] text-white border-red-700';
  } else if (remainingSeconds <= 10) {
    timerClasses = 'bg-[#D97706] text-white border-amber-700';
  }

  // Progress percentage across the 20 questions
  const progressPercent = Math.round(((currentQuestionIndex + 1) / TOTAL_QUESTIONS_COUNT) * 100);

  return (
    <header className="bg-[#00386B] text-white border-b-2 border-[#005599] sticky top-0 z-20 shadow-sm">
      {/* Main bar */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex items-center justify-between gap-4">
          {/* Question Number & Contest Title */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-white/70">
                SJCEM Placement Challenge
              </span>
              <span className="text-white/40">•</span>
              <span className="text-xs text-white/80 font-medium hidden sm:inline">
                Candidate: <strong className="text-white font-bold">{studentName || 'Student'}</strong>
              </span>
            </div>

            <div className="text-lg sm:text-xl font-extrabold text-white font-heading tracking-tight mt-0.5">
              Question {currentQuestionIndex + 1} of {TOTAL_QUESTIONS_COUNT}
            </div>
          </div>

          {/* Prominent Per-Question Countdown Timer */}
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-mono text-base sm:text-lg font-black tracking-tight transition-colors shadow-xs ${timerClasses}`}
              title="Time remaining for this question"
            >
              <Clock className="w-5 h-5 shrink-0" />
              <span className="min-w-[4.5rem] text-center">
                {timerText}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Line */}
      <div className="w-full bg-[#00284D] h-1.5 overflow-hidden">
        <div
          className="bg-[#449284] h-1.5 transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </header>
  );
}
