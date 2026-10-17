import React from 'react';
import { useQuiz, TOTAL_QUESTIONS_COUNT } from '../../context/QuizContext';
import { CheckCircle2, Lock, Clock, AlertTriangle } from 'lucide-react';

export default function QuestionCard() {
  const {
    currentQuestion,
    currentQuestionIndex,
    answers,
    isQuestionLocked,
    isTimesUpBrief,
    remainingSeconds,
    selectOptionAndAdvance
  } = useQuiz();

  if (!currentQuestion) return null;

  const currentSelection = answers[currentQuestion.id] || null;

  const handleOptionClick = (optionId) => {
    if (isQuestionLocked) return;
    selectOptionAndAdvance(currentQuestion.id, optionId);
  };

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className="bg-white rounded-xl border border-[#D9E1E8] shadow-xs overflow-hidden select-none"
    >
      {/* Question Context & Discipline Tag */}
      <div className="px-6 py-4 border-b border-[#D9E1E8] bg-[#F5F7F9] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-black text-[#00386B] uppercase tracking-wider font-mono">
            Q{currentQuestionIndex + 1}
          </span>
          <span className="text-[#D9E1E8]">•</span>
          <span className="text-xs font-bold text-[#1C1C1C]">
            {currentQuestion.topic}
          </span>
          {currentQuestion.subtopic && (
            <span className="hidden sm:inline text-xs text-[#5F6B76] font-medium">
              ({currentQuestion.subtopic})
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-2.5 py-0.5 rounded border border-[#D9E1E8] bg-white text-[#5F6B76]">
            {currentQuestion.difficulty}
          </span>
          <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#00386B]/10 text-[#00386B]">
            +1.0 Mark
          </span>
        </div>
      </div>

      {/* Main Question Body */}
      <div className="p-6 sm:p-8 space-y-6">
        {/* Question Text */}
        <div className="text-[#1C1C1C] text-base sm:text-lg font-medium leading-relaxed whitespace-pre-line">
          {currentQuestion.text}
        </div>

        {/* 4 Multiple-Choice Options */}
        <div className="space-y-3 pt-2">
          {currentQuestion.options.map((option) => {
            const isSelected = currentSelection === option.id;

            return (
              <button
                key={option.id}
                type="button"
                disabled={isQuestionLocked}
                onClick={() => handleOptionClick(option.id)}
                className={`w-full text-left flex items-start gap-4 p-4 rounded-lg border transition-all ${
                  isSelected
                    ? 'border-[#00386B] bg-[#00386B]/5 ring-2 ring-[#00386B] text-[#1C1C1C]'
                    : isQuestionLocked
                    ? 'border-[#D9E1E8] bg-[#F5F7F9] opacity-70 cursor-not-allowed text-[#5F6B76]'
                    : 'border-[#D9E1E8] bg-white hover:border-[#005599] hover:bg-[#F5F7F9] text-[#1C1C1C] cursor-pointer'
                }`}
              >
                {/* Option Letter Indicator */}
                <div
                  className={`w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-[#00386B] text-white shadow-2xs'
                      : 'bg-[#F5F7F9] text-[#00386B] border border-[#D9E1E8]'
                  }`}
                >
                  {option.id}
                </div>

                <div className="flex-1 pt-0.5 text-sm sm:text-base leading-snug font-normal">
                  {option.text}
                </div>

                {isSelected && (
                  <CheckCircle2 className="w-5 h-5 text-[#00386B] shrink-0 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>

        {/* Timeout / Lock Banner */}
        {isTimesUpBrief && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-bold text-[#E31B23] flex items-center justify-center gap-2 animate-in fade-in">
            <Clock className="w-4 h-4 text-[#E31B23]" />
            <span>Time's up! Advancing to the next question...</span>
          </div>
        )}
      </div>

      {/* Speed Contest Footer Notice */}
      <div className="px-6 py-3.5 bg-[#F5F7F9] border-t border-[#D9E1E8] flex items-center justify-between text-xs text-[#5F6B76]">
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-[#5F6B76]" />
          <span>Clicking an option locks answer and advances automatically.</span>
        </div>
        <span className="font-mono font-bold text-[#00386B]">
          {remainingSeconds}s remaining
        </span>
      </div>
    </div>
  );
}
