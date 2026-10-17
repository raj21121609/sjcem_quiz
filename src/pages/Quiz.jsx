import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuiz } from '../context/QuizContext';
import QuizHeader from '../components/quiz/QuizHeader';
import QuestionCard from '../components/quiz/QuestionCard';
import { Loader2, AlertCircle, ShieldAlert, ArrowLeft } from 'lucide-react';

export default function Quiz() {
  const navigate = useNavigate();
  const {
    isQuizActive,
    questions,
    submissionResult,
    isSubmitting,
    quizError,
    tabSwitchCount
  } = useQuiz();

  // Navigate to result as soon as submissionResult is ready
  useEffect(() => {
    if (submissionResult) {
      navigate('/result');
    }
  }, [submissionResult, navigate]);

  // If visited directly without an active quiz session, redirect back to Home
  useEffect(() => {
    if (!isQuizActive && !submissionResult && !isSubmitting && questions.length === 0) {
      const timeout = setTimeout(() => {
        navigate('/');
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [isQuizActive, submissionResult, isSubmitting, questions.length, navigate]);

  // Display error if quiz encountered a configuration or loading failure
  if (quizError) {
    return (
      <div className="min-h-screen bg-[#F5F7F9] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl border border-red-200 shadow-sm max-w-md w-full text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-[#E31B23] mx-auto" />
          <h2 className="text-lg font-bold text-[#1C1C1C]">Quiz Notice</h2>
          <p className="text-sm text-[#5F6B76]">{quizError}</p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#00386B] text-white font-bold text-sm rounded-lg hover:bg-[#005599] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Home</span>
          </button>
        </div>
      </div>
    );
  }

  // Submitting evaluation screen
  if (isSubmitting) {
    return (
      <div className="min-h-screen bg-[#F5F7F9] flex items-center justify-center p-4">
        <div className="text-center space-y-4 bg-white p-8 rounded-xl border border-[#D9E1E8] shadow-sm max-w-md w-full">
          <Loader2 className="w-10 h-10 text-[#00386B] animate-spin mx-auto" />
          <h2 className="text-lg font-bold text-[#1C1C1C]">Evaluating Answers...</h2>
          <p className="text-xs text-[#5F6B76]">
            Authoritative scoring in progress via Supabase server. Compiling verified solutions and explanations.
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (!isQuizActive || questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#F5F7F9] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-[#00386B] animate-spin mx-auto" />
          <p className="text-sm font-bold text-[#1C1C1C]">
            Preparing SJCEM Aptitude Test Session...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7F9] flex flex-col">
      {/* Quiz Header with 30s Countdown Timer */}
      <QuizHeader />

      {/* Main Focus Area (Single-Column speed layout, no palette, strictly sequential) */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-4">
        {/* Speed Contest Rule Note */}
        <div className="p-3.5 rounded-lg bg-white border border-[#D9E1E8] shadow-2xs flex items-center justify-between gap-3 text-xs text-[#5F6B76]">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#00386B] shrink-0" />
            <span>
              <strong>Speed Contest Rules:</strong> 30 seconds per question. Timer continues running if you switch tabs. Once answered or timed out, questions cannot be revisited.
            </span>
          </div>

          {tabSwitchCount > 0 && (
            <span className="text-[11px] font-bold text-[#E31B23] bg-red-50 px-2.5 py-0.5 rounded border border-red-200 shrink-0">
              Tab switches: {tabSwitchCount}
            </span>
          )}
        </div>

        {/* Question Card */}
        <QuestionCard />
      </main>
    </div>
  );
}
