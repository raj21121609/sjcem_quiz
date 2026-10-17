import React, { useState } from 'react';
import { Search, Trophy, Clock, UserCheck } from 'lucide-react';

export default function WeeklyLeaderboardTable({ entries = [], currentSubmission = null }) {
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
      {/* Search & Header Bar */}
      <div className="p-4 sm:p-5 border-b border-[#D9E1E8] bg-[#F5F7F9] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-[#00386B]" />
          <span className="font-bold text-[#1C1C1C] text-sm sm:text-base font-heading">
            Official Weekly Standings
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-white text-[#00386B] font-bold border border-[#D9E1E8]">
            {entries.length} participants
          </span>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-[#5F6B76] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search student or branch..."
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
              <th className="py-3 px-4 text-center">Score</th>
              <th className="py-3 px-4 text-right">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D9E1E8] text-sm">
            {filteredEntries.length > 0 ? (
              filteredEntries.map((row) => {
                const isCurrentUser = row.isCurrentUser || (currentSubmission && row.name === currentSubmission.studentName);

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
                  <tr
                    key={`${row.rank}-${row.name}`}
                    className={`transition-colors ${
                      isCurrentUser
                        ? 'bg-[#00386B]/5 font-medium border-l-4 border-l-[#00386B]'
                        : 'hover:bg-[#F5F7F9]'
                    }`}
                  >
                    <td className="py-3.5 px-4 text-center">
                      {rankBadge}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${isCurrentUser ? 'text-[#00386B]' : 'text-[#1C1C1C]'}`}>
                          {row.name}
                        </span>
                        {isCurrentUser && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#00386B] text-white">
                            <UserCheck className="w-3 h-3" /> You
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-[#5F6B76] text-xs hidden sm:table-cell">
                      {row.branch || 'Engineering'}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#449284]/10 text-[#449284] border border-[#449284]/20">
                        {row.score} / 20
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono text-xs font-medium text-[#5F6B76]">
                      <span className="inline-flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3 text-[#5F6B76]" />
                        {row.time}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="5" className="py-8 text-center text-[#5F6B76] text-sm">
                  No participants matched your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
