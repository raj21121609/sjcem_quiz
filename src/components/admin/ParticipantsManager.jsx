import React, { useState } from 'react';
import { Search, Download, CheckCircle2, Filter } from 'lucide-react';

export default function ParticipantsManager({ participants = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState('All');

  const branches = ['All', 'Computer Engg', 'Information Tech', 'Electronics & Telecomm', 'Mechanical Engg', 'Civil Engg'];

  const filtered = participants.filter((p) => {
    if (branchFilter !== 'All' && p.branch !== branchFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.rollNo.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Roll No,Name,Branch,Score,Accuracy,Time Taken,Status"].join(",") + "\n"
      + filtered.map(e => `${e.rollNo},${e.name},${e.branch},${e.score}/20,${e.accuracy},${e.timeTaken},${e.status}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sjcem_contest_w14_participants.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#1C1C1C] font-heading">
            Candidate Submissions (Week #14)
          </h2>
          <p className="text-xs sm:text-sm text-[#5F6B76]">
            View student assessment outcomes, timings, and download placement readiness records.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 px-4 py-2 border border-[#D9E1E8] bg-white hover:bg-[#F5F7F9] text-[#1C1C1C] text-sm font-bold rounded-lg shadow-2xs transition-colors self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-[#5F6B76]" />
          <span>Export CSV Report</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#D9E1E8] shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-[#5F6B76]">
          <Filter className="w-3.5 h-3.5 text-[#5F6B76]" />
          <span className="font-bold text-[#1C1C1C]">Department:</span>
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-[#F5F7F9] border border-[#D9E1E8] rounded-md focus:outline-none focus:ring-2 focus:ring-[#00386B] text-[#1C1C1C]"
          >
            {branches.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-[#5F6B76] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search student or roll no..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-white border border-[#D9E1E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00386B] placeholder:text-[#5F6B76]/60 text-[#1C1C1C]"
          />
        </div>
      </div>

      {/* Participants Table */}
      <div className="bg-white rounded-xl border border-[#D9E1E8] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#D9E1E8] bg-[#F5F7F9] text-[#5F6B76] text-xs font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Roll No</th>
                <th className="py-3 px-4">Candidate Name</th>
                <th className="py-3 px-4">Department / Branch</th>
                <th className="py-3 px-4 text-center">Score</th>
                <th className="py-3 px-4 text-center">Accuracy</th>
                <th className="py-3 px-4 text-right">Time Taken</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9E1E8] text-sm">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-[#F5F7F9] transition-colors">
                  <td className="py-3.5 px-4 font-mono text-xs font-bold text-[#5F6B76]">
                    {p.rollNo}
                  </td>

                  <td className="py-3.5 px-4 font-bold text-[#1C1C1C]">
                    {p.name}
                  </td>

                  <td className="py-3.5 px-4 text-xs text-[#5F6B76]">
                    {p.branch}
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#00386B]/10 text-[#00386B] border border-[#00386B]/20">
                      {p.score} / 20
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-center font-mono text-xs font-bold text-[#1C1C1C]">
                    {p.accuracy}
                  </td>

                  <td className="py-3.5 px-4 text-right font-mono text-xs text-[#5F6B76]">
                    {p.timeTaken}
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center gap-1 text-xs text-[#449284] font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Submitted
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
