import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Users, Loader2 } from 'lucide-react';
import { leaderboardService } from '../services/leaderboardService';
import { useQuiz } from '../context/QuizContext';
import WeeklyLeaderboardTable from '../components/leaderboard/WeeklyLeaderboardTable';

export default function Leaderboard() {
  const { submissionResult, contest } = useQuiz();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const data = await leaderboardService.getWeeklyLeaderboard(
          contest?.id,
          '',
          submissionResult
        );
        setEntries(data);
      } catch (err) {
        console.error('[Leaderboard] Load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [contest?.id, submissionResult]);

  return (
    <div className="min-h-screen bg-[#F5F7F9] py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00386B]/10 border border-[#00386B]/20 text-[#00386B] text-xs font-bold mb-2">
              <Trophy className="w-3.5 h-3.5 text-[#00386B]" />
              <span>Weekly Contest Standings</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#1C1C1C] font-heading">
              {contest?.title ? `${contest.title} Leaderboard` : 'Weekly Placement Aptitude Challenge Leaderboard'}
            </h1>
            <p className="text-xs sm:text-sm text-[#5F6B76]">
              Speed Aptitude Assessment • St. John College of Engineering & Management
            </p>
          </div>

          <Link
            to="/overall-leaderboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-[#D9E1E8] hover:bg-[#F5F7F9] text-[#1C1C1C] text-xs font-bold shadow-2xs transition-colors self-start sm:self-auto"
          >
            <Users className="w-4 h-4 text-[#00386B]" />
            <span>View Cumulative Season Standings →</span>
          </Link>
        </div>

        {/* Current user banner if submitted */}
        {submissionResult && (
          <div className="p-4 rounded-xl bg-white border-2 border-[#00386B] shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#00386B] text-white font-bold flex items-center justify-center font-mono">
                #{submissionResult.rank || 1}
              </div>
              <div>
                <span className="text-xs font-bold text-[#00386B] block">
                  Your Contest Result
                </span>
                <span className="text-sm font-bold text-[#1C1C1C]">
                  {submissionResult.studentName} {submissionResult.studentBranch ? `(${submissionResult.studentBranch})` : ''}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div>
                <span className="text-[#5F6B76] block">Score</span>
                <strong className="text-[#449284] font-black text-sm">{submissionResult.score} / 20</strong>
              </div>
              <div>
                <span className="text-[#5F6B76] block">Time</span>
                <strong className="text-[#1C1C1C] font-mono font-bold text-sm">{submissionResult.timeFormatted || `${submissionResult.timeSpentSeconds}s`}</strong>
              </div>
              <Link
                to="/result"
                className="px-3 py-1.5 rounded bg-[#00386B] text-white font-bold hover:bg-[#005599]"
              >
                View Solutions
              </Link>
            </div>
          </div>
        )}

        {/* Leaderboard Table */}
        {loading ? (
          <div className="bg-white rounded-xl border border-[#D9E1E8] p-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#00386B] animate-spin mx-auto" />
            <p className="text-xs font-bold text-[#5F6B76]">Loading Verified Weekly Standings...</p>
          </div>
        ) : (
          <WeeklyLeaderboardTable entries={entries} currentSubmission={submissionResult} />
        )}
      </div>
    </div>
  );
}
