import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Award, ArrowLeft } from 'lucide-react';
import { leaderboardService } from '../services/leaderboardService';
import OverallLeaderboardTable from '../components/leaderboard/OverallLeaderboardTable';

export default function OverallLeaderboard() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const data = await leaderboardService.getOverallLeaderboard();
        setEntries(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F7F9] py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00386B]/10 border border-[#00386B]/20 text-[#00386B] text-xs font-bold mb-2">
              <Award className="w-3.5 h-3.5 text-[#00386B]" />
              <span>Campus Season Standings</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#1C1C1C] font-heading">
              Overall Placement Aptitude Hall of Fame
            </h1>
            <p className="text-xs sm:text-sm text-[#5F6B76]">
              Aggregated performance across all weekly contests • Consistent top performers
            </p>
          </div>

          <Link
            to="/leaderboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-[#D9E1E8] hover:bg-[#F5F7F9] text-[#1C1C1C] text-xs font-bold shadow-2xs transition-colors self-start sm:self-auto"
          >
            <ArrowLeft className="w-4 h-4 text-[#5F6B76]" />
            <span>Back to Weekly Leaderboard</span>
          </Link>
        </div>

        {/* Overall Table */}
        <OverallLeaderboardTable entries={entries} />
      </div>
    </div>
  );
}
