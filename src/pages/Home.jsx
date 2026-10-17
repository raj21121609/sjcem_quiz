import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Award, Clock, Trophy, ArrowRight, CheckCircle2, ShieldCheck, BookOpen, AlertCircle, RefreshCw } from 'lucide-react';
import { useQuiz } from '../context/QuizContext';
import { leaderboardService } from '../services/leaderboardService';
import { MOCK_CONTESTS_LIST } from '../data/mockContests';
import { isLocalSandboxEnabled, setLocalSandboxEnabled } from '../services/contestService';

export default function Home() {
  const navigate = useNavigate();
  const {
    contest,
    existingAttemptStatus,
    submissionResult,
    startQuiz,
    isLoading,
    quizError,
    setQuizError
  } = useQuiz();

  const [name, setName] = useState('');
  const [branch, setBranch] = useState('Computer Engineering');
  const [errorMsg, setErrorMsg] = useState('');
  const [topWeekly, setTopWeekly] = useState([]);
  const [isSandbox, setIsSandbox] = useState(() => isLocalSandboxEnabled());

  useEffect(() => {
    async function loadPreview() {
      try {
        const list = await leaderboardService.getWeeklyLeaderboard();
        setTopWeekly(list.slice(0, 5));
      } catch (e) {
        console.error(e);
      }
    }
    loadPreview();
  }, []);

  const handleStart = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();

    if (!trimmed) {
      setErrorMsg('Please enter your full student name to begin the challenge.');
      return;
    }

    if (trimmed.length < 2) {
      setErrorMsg('Student name must be at least 2 characters long.');
      return;
    }

    if (trimmed.length > 60) {
      setErrorMsg('Student name cannot exceed 60 characters.');
      return;
    }

    setErrorMsg('');
    if (setQuizError) setQuizError(null);

    const success = await startQuiz(trimmed, branch);
    if (success) {
      navigate('/quiz');
    }
  };

  const toggleSandbox = () => {
    const nextState = !isSandbox;
    setIsSandbox(nextState);
    setLocalSandboxEnabled(nextState);
    window.location.reload();
  };

  const branches = [
    'Computer Engineering',
    'Information Technology',
    'Artificial Intelligence & Data Science',
    'Electronics & Telecommunication',
    'Mechanical Engineering',
    'Civil Engineering'
  ];

  const isContestAvailable = Boolean(contest);
  const isAlreadySubmitted = existingAttemptStatus === 'submitted';
  const isInProgress = existingAttemptStatus === 'in_progress';

  return (
    <div className="min-h-screen bg-[#F5F7F9] flex flex-col">
      {/* College Identity Header Banner */}
      <section className="bg-white border-b border-[#D9E1E8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00386B]/10 border border-[#00386B]/20 text-[#00386B] text-xs font-bold">
              <Award className="w-3.5 h-3.5 text-[#00386B]" />
              <span>St. John College of Engineering and Management • Training & Placement Cell</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#1C1C1C] tracking-tight font-heading leading-tight">
              Weekly Placement Aptitude Challenge
            </h1>

            <p className="text-base sm:text-lg text-[#5F6B76] leading-relaxed">
              Fast-paced campus recruitment benchmark test aligned with TCS NQT, Infosys, and Capgemini aptitude patterns. 20 questions, 30 seconds each, automated evaluation.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Active Contest Card & Student Entrance (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Contest Card */}
            <div className="bg-white rounded-xl border border-[#D9E1E8] shadow-xs overflow-hidden">
              <div className="bg-[#00386B] p-6 sm:p-7 text-white border-b-4 border-[#005599]">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  {isContestAvailable ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#449284] text-white">
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                      Contest Active This Week
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E31B23] text-white">
                      Unavailable
                    </span>
                  )}
                  <span className="text-xs text-white/80 font-mono">
                    {contest?.title ? 'Current Active Round' : 'System Status'}
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black font-heading text-white">
                  {isContestAvailable ? (contest.title || 'Weekly Placement Aptitude Challenge') : 'Weekly quiz is currently unavailable.'}
                </h2>
                <p className="text-xs sm:text-sm text-white/80 mt-1">
                  {isContestAvailable
                    ? 'Speed Quantitative, Logical & Verbal Aptitude • 30s Per Question'
                    : 'No active aptitude contest is open at this moment. Please check back next week.'}
                </p>

                {/* Specs Row */}
                {isContestAvailable && (
                  <div className="grid grid-cols-3 gap-3 pt-6 mt-6 border-t border-white/20 text-xs">
                    <div>
                      <span className="text-white/70 block">Questions</span>
                      <span className="text-base sm:text-lg font-bold text-white font-heading">
                        20 MCQs
                      </span>
                    </div>
                    <div>
                      <span className="text-white/70 block">Per-Question Time</span>
                      <span className="text-base sm:text-lg font-bold text-white font-heading">
                        30 Seconds
                      </span>
                    </div>
                    <div>
                      <span className="text-white/70 block">Max Duration</span>
                      <span className="text-base sm:text-lg font-bold text-white font-heading">
                        10 Minutes
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Duplicate Attempt Warning / Result Banner */}
              {isAlreadySubmitted && (
                <div className="p-6 bg-amber-50 border-b border-amber-200">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#449284] shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-[#1C1C1C]">
                        You have already attempted this week's quiz.
                      </h4>
                      <p className="text-xs text-[#5F6B76]">
                        Per SJCEM policy, only one attempt per participant is permitted each week. Your score and verified answer solutions have been saved.
                      </p>
                      <div className="pt-2">
                        <Link
                          to="/result"
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#00386B] hover:bg-[#005599] text-white text-xs font-bold transition-colors"
                        >
                          <span>View Your Result & Solutions</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* In-Progress Warning Banner */}
              {isInProgress && !isAlreadySubmitted && (
                <div className="p-4 bg-blue-50 border-b border-blue-200">
                  <div className="flex items-center justify-between gap-3 text-xs text-[#00386B]">
                    <span>You have an ongoing attempt session in progress.</span>
                    <button
                      type="button"
                      onClick={() => navigate('/quiz')}
                      className="px-3 py-1 font-bold bg-[#00386B] text-white rounded hover:bg-[#005599]"
                    >
                      Resume Attempt
                    </button>
                  </div>
                </div>
              )}

              {/* Error Notice */}
              {quizError && (
                <div className="p-4 bg-red-50 border-b border-red-200 flex items-start gap-2.5 text-xs text-[#E31B23]">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{quizError}</span>
                </div>
              )}

              {/* Entrance Form */}
              <div className="p-6 sm:p-7 bg-white">
                {!isContestAvailable ? (
                  <div className="text-center py-6 space-y-3">
                    <AlertCircle className="w-8 h-8 text-[#5F6B76] mx-auto" />
                    <p className="text-sm font-bold text-[#1C1C1C]">
                      Weekly quiz is currently unavailable.
                    </p>
                    <p className="text-xs text-[#5F6B76] max-w-sm mx-auto">
                      Please check back during the next scheduled contest window.
                    </p>
                    {/* Sandbox Mode Toggle for Local Testing if remote DB is offline */}
                    <div className="pt-4 border-t border-[#D9E1E8]">
                      <button
                        type="button"
                        onClick={toggleSandbox}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#00386B] bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>{isSandbox ? 'Disable Local Sandbox' : 'Enable Local Sandbox Mode for Testing'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleStart} className="space-y-4">
                    <div className="space-y-1">
                      <label htmlFor="student-name-input" className="block text-xs font-bold text-[#1C1C1C] uppercase tracking-wider">
                        Student Full Name *
                      </label>
                      <input
                        id="student-name-input"
                        type="text"
                        disabled={isAlreadySubmitted || isLoading}
                        placeholder="Enter your name (e.g. Siddharth Patil)"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          if (errorMsg) setErrorMsg('');
                        }}
                        className="w-full px-4 py-2.5 text-sm sm:text-base border border-[#D9E1E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00386B] focus:border-[#00386B] transition-all placeholder:text-[#5F6B76]/60 bg-[#F5F7F9] text-[#1C1C1C] disabled:opacity-50"
                      />
                      {errorMsg && (
                        <p className="text-xs text-[#E31B23] font-bold pt-1">
                          {errorMsg}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="branch-select" className="block text-xs font-bold text-[#1C1C1C] uppercase tracking-wider">
                        Department / Branch
                      </label>
                      <select
                        id="branch-select"
                        disabled={isAlreadySubmitted || isLoading}
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        className="w-full px-4 py-2.5 text-sm sm:text-base border border-[#D9E1E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00386B] focus:border-[#00386B] bg-[#F5F7F9] text-[#1C1C1C] disabled:opacity-50"
                      >
                        {branches.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isAlreadySubmitted || isLoading}
                        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#00386B] hover:bg-[#005599] text-white font-bold text-base rounded-lg shadow-xs hover:shadow transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span>{isLoading ? 'Starting Quiz Session...' : isAlreadySubmitted ? 'Quiz Already Attempted' : 'Start Speed Challenge'}</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </button>
                      <p className="text-[11px] text-center text-[#5F6B76] mt-2">
                        No account registration required. Single attempt per week.
                      </p>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Test Instructions & Anti-Cheating Rules */}
            <div className="bg-white rounded-xl border border-[#D9E1E8] shadow-xs p-6 space-y-3">
              <h3 className="text-sm font-bold text-[#00386B] uppercase tracking-wider font-heading flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#00386B]" />
                Speed Contest Rules & Anti-Cheating Policy
              </h3>
              <ul className="space-y-2.5 text-xs sm:text-sm text-[#1C1C1C]">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#449284] shrink-0 mt-0.5" />
                  <span><strong>30 seconds per question:</strong> The timer runs continuously based on absolute time. It does not pause if you leave the quiz or switch tabs.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#449284] shrink-0 mt-0.5" />
                  <span><strong>Immediate lock & advance:</strong> Selecting an option records your choice and advances to the next question immediately.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#449284] shrink-0 mt-0.5" />
                  <span><strong>Timeout policy:</strong> If the 30-second timer hits zero without a selection, 0 marks are awarded and it auto-advances.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#449284] shrink-0 mt-0.5" />
                  <span><strong>No backward navigation:</strong> Once a question is answered or times out, it is permanently locked and cannot be revisited.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right Column: Weekly Leaderboard Preview & Info (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Top 5 Leaderboard Preview */}
            <div className="bg-white rounded-xl border border-[#D9E1E8] shadow-xs overflow-hidden">
              <div className="p-5 border-b border-[#D9E1E8] bg-[#F5F7F9] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-[#00386B]" />
                  <h3 className="font-bold text-[#1C1C1C] text-sm font-heading">
                    Weekly Leaderboard (Top 5)
                  </h3>
                </div>
                <Link
                  to="/leaderboard"
                  className="text-xs font-bold text-[#00386B] hover:text-[#005599] inline-flex items-center gap-1"
                >
                  <span>Full Board</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="divide-y divide-[#D9E1E8]">
                {topWeekly.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#5F6B76]">
                    No leaderboard submissions recorded yet for this round.
                  </div>
                ) : (
                  topWeekly.map((item, idx) => (
                    <div key={idx} className="p-4 flex items-center justify-between text-xs hover:bg-[#F5F7F9]/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                          idx === 0 ? 'bg-[#D97706]/15 text-[#D97706] border border-[#D97706]/30' :
                          idx === 1 ? 'bg-slate-200 text-slate-700' :
                          idx === 2 ? 'bg-amber-100 text-amber-800' :
                          'text-[#5F6B76]'
                        }`}>
                          {item.rank}
                        </span>
                        <div>
                          <div className="font-bold text-[#1C1C1C]">{item.name}</div>
                          <div className="text-[11px] text-[#5F6B76]">{item.branch}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-[#00386B]">{item.score} / 20</div>
                        <div className="text-[11px] text-[#5F6B76] font-mono">{item.time}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Educational Commitment Note */}
            <div className="p-5 rounded-xl bg-white border border-[#D9E1E8] shadow-xs space-y-2">
              <h4 className="text-xs font-bold text-[#00386B] uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#00386B]" />
                Learning-Oriented Assessment
              </h4>
              <p className="text-xs text-[#5F6B76] leading-relaxed">
                Immediately upon completing Question 20, you will receive full verified solutions and step-by-step explanations for all 20 questions so you can review your mistakes and improve.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
