import React from 'react';
import { AlertCircle, CheckCircle2, Clock, HelpCircle, Bookmark, Loader2 } from 'lucide-react';
import { useQuiz } from '../../context/QuizContext';

export default function SubmitConfirmModal({ isOpen, onClose, onConfirm }) {
  const {
    questions,
    answeredCount,
    unansweredCount,
    markedCount,
    timeLeftSeconds,
    isSubmitting
  } = useQuiz();

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeftSeconds / 60);
  const seconds = timeLeftSeconds % 60;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="bg-white rounded-xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden transform transition-all">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 font-heading">
              Submit Contest Attempt?
            </h3>
            <p className="text-xs text-slate-500">
              Please review your question status before finalizing.
            </p>
          </div>
        </div>

        {/* Attempt Breakdown */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
              <span className="text-2xl font-black text-emerald-700 block font-heading">
                {answeredCount}
              </span>
              <span className="text-xs font-semibold text-emerald-800">
                Answered
              </span>
            </div>

            <div className="bg-slate-100 border border-slate-200 rounded-lg p-3 text-center">
              <span className="text-2xl font-black text-slate-700 block font-heading">
                {unansweredCount}
              </span>
              <span className="text-xs font-semibold text-slate-600">
                Unanswered
              </span>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
              <span className="text-2xl font-black text-amber-700 block font-heading">
                {markedCount}
              </span>
              <span className="text-xs font-semibold text-amber-800">
                Marked
              </span>
            </div>
          </div>

          {unansweredCount > 0 && (
            <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
              <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                You still have <strong>{unansweredCount} unanswered questions</strong>. Unanswered questions award 0 points. There is no negative marking.
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Time remaining:
            </span>
            <span className="font-mono font-bold text-slate-800">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded-md transition-colors"
          >
            Review Answers
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-xs hover:shadow transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & Submit</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
