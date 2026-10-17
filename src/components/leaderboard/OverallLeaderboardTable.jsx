import React, { useState } from 'react';
import { Search, Award, TrendingUp } from 'lucide-react';

export default function OverallLeaderboardTable({ entries = [] }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEntries = entries.filter((item) => {
    const q = searchTerm.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      (item.branch && item.branch.toLowerCase().includes(q))
    );
  });

  return (
    <div className="bg-white rounded-xl border border-[#D9E1E8] shadow-xs overflow-hidden">
      {/* Search & Header bar */}
      <div className="p-4 sm:p-5 border-b border-[#D9E1E8] bg-[#F5F7F9] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-[#00386B]" />
          <span className="font-bold text-[#1C1C1C] text-sm sm:text-base font-heading">
            Cumulative Season Standings (All Contests)
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-white text-[#00386B] border border-[#D9E1E8] font-bold">
            {entries.length} ranked students
          </span>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-[#5F6B76] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search candidate..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-white border border-[#D9E1E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00386B] text-[#1C1C1C] placeholder:text-[#5F6B76]/60"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#D9E1E8] bg-[#F5F7F9] text-[#5F6B76] text-xs font-bold uppercase tracking-wider">
              <th className="py-3 px-4 w-20 text-center">Rank</th>
              <th className="py-3 px-4">Student Name</th>
              <th className="py-3 px-4 hidden sm:table-cell">Branch</th>
              <th className="py-3 px-4 text-center">Contests</th>
              <th className="py-3 px-4 text-center">Avg. Score</th>
              <th className="py-3 px-4 text-right">Total Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D9E1E8] text-sm">
            {filteredEntries.length > 0 ? (
              filteredEntries.map((row) => {
                let rankBadge = (
                  <span className="font-bold text-[#5F6B76] text-sm font-mono">
                    #{row.rank}
                  </span>
                );

                if (row.rank === 1) {
                  rankBadge = (
                    <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#00386B] text-white font-black text-xs shadow-2xs">
                      1
                    </div>
                  );
                } else if (row.rank === 2) {
                  rankBadge = (
                    <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#005599] text-white font-black text-xs">
                      2
                    </div>
                  );
                } else if (row.rank === 3) {
                  rankBadge = (
                    <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#449284] text-white font-black text-xs">
                      3
                    </div>
                  );
                }

                return (
                  <tr key={row.rank} className="hover:bg-[#F5F7F9] transition-colors">
                    <td className="py-3.5 px-4 text-center">
                      {rankBadge}
                    </td>

                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-bold text-[#1C1C1C]">
                          {row.name}
                        </span>
                        <div className="text-[11px] text-[#5F6B76] sm:hidden">
                          {row.branch}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-[#5F6B76] text-xs hidden sm:table-cell">
                      {row.branch || 'Engineering'}
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono text-xs font-bold text-[#1C1C1C]">
                      <span className="px-2 py-0.5 rounded bg-[#F5F7F9] border border-[#D9E1E8]">
                        {row.contestsAttended ?? row.contests ?? 0}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="font-bold text-[#1C1C1C] text-sm font-mono">
                        {Number(row.averageScore ?? 0).toFixed(2)}
                      </span>
                      <span className="text-[11px] text-[#5F6B76]"> / 20</span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <span className="inline-flex items-center gap-1 font-black text-[#00386B] text-sm font-mono bg-[#00386B]/5 px-2.5 py-1 rounded-md border border-[#00386B]/20">
                        <TrendingUp className="w-3.5 h-3.5 text-[#00386B]" />
                        {row.totalScore ?? row.totalPoints ?? 0} pts
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="6" className="py-8 text-center text-[#5F6B76] text-sm">
                  No records match your search criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
