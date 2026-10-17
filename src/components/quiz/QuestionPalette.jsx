import React from 'react';
import { useQuiz } from '../../context/QuizContext';

export default function QuestionPalette() {
  const {
    questions,
    currentQuestionIndex,
    answers,
    markedForReview,
    goToQuestion,
    answeredCount,
    unansweredCount,
    markedCount
  } = useQuiz();

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col gap-5">
      <div>
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-heading mb-1">
          Question Palette
        </h3>
        <p className="text-xs text-slate-500">
          Click any number to jump directly to that question.
        </p>
      </div>

      {/* Palette Grid 1 - 20 */}
      <div className="grid grid-cols-5 gap-2">
        {questions.map((q, idx) => {
          const isCurrent = idx === currentQuestionIndex;
          const isAnswered = Boolean(answers[q.id]);
          const isMarked = markedForReview.has(q.id);

          // State styling
          let bgClass = 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200';
          if (isAnswered) {
            bgClass = 'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600 font-semibold shadow-xs';
          }
          if (isMarked) {
            bgClass = isAnswered 
              ? 'bg-amber-600 text-white hover:bg-amber-700 border-amber-600 font-semibold shadow-xs'
              : 'bg-amber-100 text-amber-900 hover:bg-amber-200 border-amber-300 font-semibold';
          }

          const ringClass = isCurrent ? 'ring-2 ring-blue-600 ring-offset-2 font-bold' : '';

          return (
            <button
              key={q.id}
              type="button"
              onClick={() => goToQuestion(idx)}
              className={`relative h-10 rounded-md text-xs border flex items-center justify-center transition-all ${bgClass} ${ringClass}`}
              title={`Question ${idx + 1}: ${isAnswered ? 'Answered' : 'Unanswered'}${isMarked ? ' (Marked for review)' : ''}`}
            >
              <span>{idx + 1}</span>

              {/* Little dot indicator if marked for review */}
              {isMarked && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border border-white" />
              )}
            </button>
          );
        })}
      </div>

      {/* Status Legend */}
      <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
        <div className="flex items-center justify-between text-slate-600">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded bg-emerald-600 border border-emerald-600 shrink-0" />
            <span>Answered</span>
          </div>
          <span className="font-semibold text-slate-900">{answeredCount}</span>
        </div>

        <div className="flex items-center justify-between text-slate-600">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded bg-amber-100 border border-amber-300 shrink-0" />
            <span>Marked for Review</span>
          </div>
          <span className="font-semibold text-slate-900">{markedCount}</span>
        </div>

        <div className="flex items-center justify-between text-slate-600">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded bg-slate-100 border border-slate-300 shrink-0" />
            <span>Unanswered</span>
          </div>
          <span className="font-semibold text-slate-900">{unansweredCount}</span>
        </div>

        <div className="flex items-center justify-between text-slate-600">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded bg-white border-2 border-blue-600 shrink-0" />
            <span>Current Question</span>
          </div>
          <span className="font-semibold text-slate-900">Q{currentQuestionIndex + 1}</span>
        </div>
      </div>
    </div>
  );
}
