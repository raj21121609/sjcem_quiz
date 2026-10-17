import React, { useState } from 'react';
import { Check, Save } from 'lucide-react';

export default function AdminSettings() {
  const [secondsPerQuestion, setSecondsPerQuestion] = useState(30);
  const [negativeMarking, setNegativeMarking] = useState(false);
  const [campusNotice, setCampusNotice] = useState('Weekly Aptitude Challenge #14 is live. Each question has a strict 30-second timer.');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-[#1C1C1C] font-heading">
          Platform Configuration & Placement Rules
        </h2>
        <p className="text-xs sm:text-sm text-[#5F6B76]">
          Global defaults for weekly test sessions, time windows, and WordPress embed settings.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-[#D9E1E8] shadow-xs p-6 max-w-3xl">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[#1C1C1C] uppercase tracking-wider font-heading pb-2 border-b border-[#D9E1E8]">
              Speed Contest Policy
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#1C1C1C] mb-1">
                  Seconds Per Question
                </label>
                <input
                  type="number"
                  value={secondsPerQuestion}
                  onChange={(e) => setSecondsPerQuestion(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-[#D9E1E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00386B] bg-[#F5F7F9] text-[#1C1C1C]"
                />
                <span className="text-[11px] text-[#5F6B76]">20 questions × 30s = 10 minutes maximum</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C1C1C] mb-1">
                  Negative Marking Policy
                </label>
                <select
                  value={negativeMarking ? 'enabled' : 'disabled'}
                  onChange={(e) => setNegativeMarking(e.target.value === 'enabled')}
                  className="w-full px-3 py-2 text-sm border border-[#D9E1E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00386B] bg-[#F5F7F9] text-[#1C1C1C]"
                >
                  <option value="disabled">Disabled (No penalty for wrong choices/timeouts)</option>
                  <option value="enabled">Enabled (-0.25 marks per wrong MCQ)</option>
                </select>
                <span className="text-[11px] text-[#5F6B76]">Standard campus tests use No Penalty</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1C1C1C] mb-1">
                College Placement Cell Notice Banner
              </label>
              <textarea
                rows={2}
                value={campusNotice}
                onChange={(e) => setCampusNotice(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#D9E1E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00386B] bg-[#F5F7F9] text-[#1C1C1C]"
              />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-[#D9E1E8]">
            <h3 className="text-sm font-bold text-[#1C1C1C] uppercase tracking-wider font-heading pb-2 border-b border-[#D9E1E8]">
              WordPress Embed Integration Readiness
            </h3>

            <div className="p-3 bg-[#F5F7F9] rounded-lg border border-[#D9E1E8] text-xs text-[#5F6B76] space-y-1">
              <span className="font-bold text-[#1C1C1C] block">Embed Iframe Target URL:</span>
              <code className="text-[#00386B] font-mono text-[11px] bg-white p-1 rounded border border-[#D9E1E8] block">
                https://placement.sjcem.edu.in/aptitude-challenge/
              </code>
              <span className="text-[11px] text-[#5F6B76] block pt-1">
                Will be embedded into college WordPress site without plugins.
              </span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            {savedSuccess && (
              <span className="text-xs font-bold text-[#449284] inline-flex items-center gap-1">
                <Check className="w-4 h-4" /> Changes saved successfully!
              </span>
            )}
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2 bg-[#00386B] hover:bg-[#005599] text-white text-sm font-bold rounded-lg shadow-xs ml-auto"
            >
              <Save className="w-4 h-4" />
              <span>Save Configuration</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
