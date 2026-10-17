import React from 'react';
import { 
  Award, 
  Users, 
  CheckCircle2, 
  TrendingUp, 
  HelpCircle, 
  Calendar, 
  ArrowRight,
  Clock,
  AlertCircle
} from 'lucide-react';

export default function AdminOverview({ stats, onNavigateTab }) {
  if (!stats) return null;

  const {
    activeContest,
    contestStatus,
    totalQuestionsInBank,
    totalContests,
    totalParticipants,
    submittedAttempts,
    averageScore,
    highestScore,
    isSandbox
  } = stats;

  const hasActive = Boolean(activeContest);

  return (
    <div className="space-y-6">
      {/* Title & Live Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#1C1C1C] font-heading">
            Placement Aptitude Admin Dashboard
          </h2>
          <p className="text-xs sm:text-sm text-[#5F6B76]">
            Real-time assessment monitoring and question bank intelligence for SJCEM campus recruitment drives.
          </p>
        </div>

        {hasActive ? (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#449284]/10 text-[#449284] border border-[#449284]/20 text-xs font-bold self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-[#449284] animate-pulse"></span>
            <span>Contest Status: ACTIVE (Round Live)</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold self-start sm:self-auto">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Contest Status: NO ACTIVE ROUND</span>
          </div>
        )}
      </div>

      {isSandbox && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-[#00386B] flex items-center justify-between">
          <span>Sandbox Mode Active: Using localized demonstration data.</span>
        </div>
      )}

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Contest */}
        <div className="bg-white p-5 rounded-xl border border-[#D9E1E8] shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-[#5F6B76]">
            <span className="text-xs font-bold uppercase tracking-wider">Active Contest</span>
            <span className="p-2 rounded-lg bg-[#00386B]/10 text-[#00386B]">
              <Award className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-[#1C1C1C] font-heading truncate">
              {hasActive ? (activeContest.title || 'Weekly Contest') : 'None Active'}
            </div>
            <p className="text-xs text-[#5F6B76]">
              {hasActive ? 'Status: Live & Open' : 'Schedule a draft contest'}
            </p>
          </div>
          <div className="pt-2 text-xs font-bold text-[#00386B] flex items-center justify-between border-t border-[#D9E1E8]">
            <span>Questions: <strong>{hasActive ? (activeContest.question_count || 20) : 0} MCQs</strong></span>
            <span className="font-mono text-[#5F6B76]">30s each</span>
          </div>
        </div>

        {/* Card 2: Total Participants */}
        <div className="bg-white p-5 rounded-xl border border-[#D9E1E8] shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-[#5F6B76]">
            <span className="text-xs font-bold uppercase tracking-wider">Total Participants</span>
            <span className="p-2 rounded-lg bg-[#449284]/10 text-[#449284]">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-[#1C1C1C] font-heading">
              {totalParticipants}
            </div>
            <p className="text-xs text-[#5F6B76]">
              Distinct student sessions started
            </p>
          </div>
          <div className="pt-2 text-xs font-bold text-[#449284] flex items-center gap-1 border-t border-[#D9E1E8]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{submittedAttempts} Submitted ({totalParticipants > 0 ? Math.round((submittedAttempts / totalParticipants) * 100) : 0}%)</span>
          </div>
        </div>

        {/* Card 3: Average Score */}
        <div className="bg-white p-5 rounded-xl border border-[#D9E1E8] shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-[#5F6B76]">
            <span className="text-xs font-bold uppercase tracking-wider">Average Score</span>
            <span className="p-2 rounded-lg bg-[#005599]/10 text-[#005599]">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-[#1C1C1C] font-heading">
              {averageScore} <span className="text-sm font-bold text-[#5F6B76]">/ 20</span>
            </div>
            <p className="text-xs text-[#5F6B76]">
              Across submitted attempts
            </p>
          </div>
          <div className="pt-2 text-xs font-medium text-[#5F6B76] flex items-center gap-1 border-t border-[#D9E1E8]">
            <span>Target campus cut-off: <strong>12.0 / 20</strong></span>
          </div>
        </div>

        {/* Card 4: Highest Score */}
        <div className="bg-white p-5 rounded-xl border border-[#D9E1E8] shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-[#5F6B76]">
            <span className="text-xs font-bold uppercase tracking-wider">Highest Score</span>
            <span className="p-2 rounded-lg bg-[#00386B]/10 text-[#00386B]">
              <Award className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-[#1C1C1C] font-heading text-[#00386B]">
              {highestScore} <span className="text-sm font-bold text-[#5F6B76]">/ 20</span>
            </div>
            <p className="text-xs text-[#5F6B76]">
              Current round top score
            </p>
          </div>
          <div className="pt-2 text-xs font-bold text-[#449284] flex items-center gap-1 border-t border-[#D9E1E8]">
            <span>Benchmark: 100% Accuracy</span>
          </div>
        </div>
      </div>

      {/* Secondary Information & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Question Bank Status */}
        <div className="bg-white p-5 rounded-xl border border-[#D9E1E8] shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#1C1C1C] font-heading flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#00386B]" />
              Question Bank Repository
            </h3>
            <span className="text-xs font-mono font-bold text-[#00386B] bg-blue-50 px-2 py-0.5 rounded">
              {totalQuestionsInBank} MCQs
            </span>
          </div>
          <p className="text-xs text-[#5F6B76] leading-relaxed">
            Verified multiple-choice questions with full step-by-step solutions, categorized by Quantitative, Logical, and Verbal topics.
          </p>
          <button
            type="button"
            onClick={() => onNavigateTab('questions')}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold bg-[#F5F7F9] hover:bg-[#D9E1E8] text-[#1C1C1C] rounded-lg border border-[#D9E1E8] transition-colors"
          >
            <span>Manage Question Bank</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Contest Scheduling Status */}
        <div className="bg-white p-5 rounded-xl border border-[#D9E1E8] shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#1C1C1C] font-heading flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#00386B]" />
              Contest Pipeline
            </h3>
            <span className="text-xs font-mono font-bold text-[#449284] bg-green-50 px-2 py-0.5 rounded">
              {totalContests} Total
            </span>
          </div>
          <p className="text-xs text-[#5F6B76] leading-relaxed">
            Create draft contests, assign exactly 20 questions with verified answer keys, and activate single weekly rounds.
          </p>
          <button
            type="button"
            onClick={() => onNavigateTab('contests')}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold bg-[#00386B] hover:bg-[#005599] text-white rounded-lg transition-colors"
          >
            <span>Open Contest Manager</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Leaderboards Quick View */}
        <div className="bg-white p-5 rounded-xl border border-[#D9E1E8] shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#1C1C1C] font-heading flex items-center gap-2">
              <Award className="w-4 h-4 text-[#00386B]" />
              Rankings & Scoring
            </h3>
            <span className="text-xs text-[#5F6B76]">
              Automated Roster
            </span>
          </div>
          <p className="text-xs text-[#5F6B76] leading-relaxed">
            Inspect real-time student submissions, accuracy rates, and cumulative season standings across campus departments.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onNavigateTab('leaderboard')}
              className="flex-1 inline-flex items-center justify-center gap-1 py-2 px-2 text-xs font-bold bg-[#F5F7F9] hover:bg-[#D9E1E8] text-[#1C1C1C] rounded-lg border border-[#D9E1E8] transition-colors"
            >
              <span>Weekly Board</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('overall')}
              className="flex-1 inline-flex items-center justify-center gap-1 py-2 px-2 text-xs font-bold bg-[#F5F7F9] hover:bg-[#D9E1E8] text-[#1C1C1C] rounded-lg border border-[#D9E1E8] transition-colors"
            >
              <span>Hall of Fame</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
