import React, { useState } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  RefreshCw, 
  AlertCircle, 
  Calendar, 
  X, 
  Layers, 
  ShieldCheck, 
  ArrowRight
} from 'lucide-react';
import { adminService } from '../../services/adminService';

/**
 * Returns next Monday in YYYY-MM-DD format as a smart default for weekly contest scheduling.
 */
function getDefaultWeekStart() {
  const d = new Date();
  const day = d.getDay();
  // If today is Sunday (0), next day is Monday (+1). If Monday (1), target next Monday (+7), etc.
  const daysUntilNextMonday = day === 0 ? 1 : 8 - day;
  const nextMonday = new Date(d.getTime() + daysUntilNextMonday * 86400000);
  return nextMonday.toISOString().split('T')[0];
}

export default function GeminiContestGenerator({ 
  isOpen = true, 
  onClose, 
  onContestGenerated 
}) {
  const [weekStart, setWeekStart] = useState(() => getDefaultWeekStart());
  const [targetCompany, setTargetCompany] = useState('TCS NQT / Infosys Campus Pattern');
  const [customTheme, setCustomTheme] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [generatedResult, setGeneratedResult] = useState(null);

  if (!isOpen) return null;

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (isGenerating) return;

    if (!weekStart) {
      setErrorMsg('Please select a valid week start date (YYYY-MM-DD).');
      return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(weekStart)) {
      setErrorMsg("Invalid date format. Expected 'YYYY-MM-DD'.");
      return;
    }

    setErrorMsg('');
    setIsGenerating(true);
    setGeneratedResult(null);

    // Formulate theme string for Gemini prompt
    const themeString = customTheme.trim()
      ? `${customTheme.trim()} (${targetCompany})`
      : `Weekly Placement Aptitude Challenge — ${targetCompany}`;

    try {
      const response = await adminService.generateContestWithGemini({
        week_start: weekStart,
        theme: themeString
      });

      setGeneratedResult(response);
      if (onContestGenerated && response.contest) {
        onContestGenerated(response.contest);
      }
    } catch (err) {
      console.error('[GeminiContestGenerator] Generation failed:', err);
      setErrorMsg(err.message || 'AI contest generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    if (isGenerating) return; // Prevent accidental exit while generating
    if (onClose) onClose();
  };

  const modalBody = (
    <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl border border-[#D9E1E8] my-8 overflow-hidden flex flex-col">
      {/* Modal Header */}
      <div className="px-6 py-4 border-b border-[#D9E1E8] bg-[#F5F7F9] flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#449284]/15 border border-[#449284]/30 flex items-center justify-center text-[#449284]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-[#1C1C1C] text-base font-heading">
              AI Weekly Contest Generator
            </h3>
            <span className="text-xs text-[#5F6B76]">
              Powered by Google Gemini 2.5 Flash • Stage 5B Server-Side Contract
            </span>
          </div>
        </div>

        <button
          type="button"
          disabled={isGenerating}
          onClick={handleClose}
          className="p-1 rounded text-[#5F6B76] hover:text-[#1C1C1C] disabled:opacity-30 transition-colors"
          title="Close modal"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Modal Content */}
      <div className="p-6 overflow-y-auto space-y-5">
        {/* Error Notice */}
        {errorMsg && (
          <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-[#E31B23]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block">Contest Generation Error</span>
              <p className="leading-relaxed">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Success View */}
        {generatedResult ? (
          <div className="space-y-5">
            <div className="p-5 rounded-xl bg-green-50/70 border border-green-200 space-y-3">
              <div className="flex items-center gap-2 text-[#449284]">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-bold text-sm font-heading">
                  Contest Successfully Created in Draft Status!
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-[#1C1C1C]">
                <div>
                  <span className="text-[#5F6B76]">Title: </span>
                  <strong className="font-heading">{generatedResult.contest?.title}</strong>
                </div>
                <div>
                  <span className="text-[#5F6B76]">Contest ID: </span>
                  <code className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-green-200">
                    {generatedResult.contest?.id}
                  </code>
                </div>
                <div>
                  <span className="text-[#5F6B76]">Schedule Window: </span>
                  <span className="font-mono">
                    {new Date(generatedResult.contest?.week_start).toLocaleDateString()} – {new Date(generatedResult.contest?.week_end).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-[#5F6B76]">Status: </span>
                  <span className="font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px]">
                    {generatedResult.contest?.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Questions Breakdown Summary */}
            <div className="p-4 rounded-xl bg-[#F5F7F9] border border-[#D9E1E8] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#1C1C1C] flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#00386B]" />
                  <span>20 Questions Generated & Assigned (1–20)</span>
                </span>
                <span className="font-bold text-[#449284] bg-white px-2 py-0.5 rounded border border-[#D9E1E8]">
                  Contract Verified
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                <div className="p-2 rounded bg-white border border-[#D9E1E8]">
                  <span className="text-[#5F6B76] block">Quantitative</span>
                  <strong className="text-[#1C1C1C]">6 MCQs</strong>
                </div>
                <div className="p-2 rounded bg-white border border-[#D9E1E8]">
                  <span className="text-[#5F6B76] block">Logical Reasoning</span>
                  <strong className="text-[#1C1C1C]">5 MCQs</strong>
                </div>
                <div className="p-2 rounded bg-white border border-[#D9E1E8]">
                  <span className="text-[#5F6B76] block">Verbal Ability</span>
                  <strong className="text-[#1C1C1C]">4 MCQs</strong>
                </div>
                <div className="p-2 rounded bg-white border border-[#D9E1E8]">
                  <span className="text-[#5F6B76] block">Data Interpretation</span>
                  <strong className="text-[#1C1C1C]">3 MCQs</strong>
                </div>
                <div className="p-2 rounded bg-white border border-[#D9E1E8]">
                  <span className="text-[#5F6B76] block">General Aptitude</span>
                  <strong className="text-[#1C1C1C]">2 MCQs</strong>
                </div>
                <div className="p-2 rounded bg-white border border-[#D9E1E8]">
                  <span className="text-[#5F6B76] block">Difficulty</span>
                  <strong className="text-[#1C1C1C]">6E / 10M / 4H</strong>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                <span>
                  <strong>Faculty Review Stage:</strong> This contest is saved in <strong>Draft</strong> status. Review its questions in the Contest Roster before clicking "Activate" to open it for students.
                </span>
              </div>
            </div>

            {/* Action */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#00386B] hover:bg-[#005599] text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
              >
                <span>Done • View in Contests List</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Generation Form */
          <form onSubmit={handleGenerate} className="space-y-5">
            {/* Generating Progress State Banner */}
            {isGenerating && (
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-[#00386B] space-y-2 animate-pulse">
                <div className="flex items-center gap-2 font-bold">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#00386B]" />
                  <span>Generating 20 aptitude questions via Gemini Edge Function...</span>
                </div>
                <p className="text-[11px] text-[#5F6B76] leading-relaxed">
                  Executing 4 independent batches of 5 questions with JSON validation and quota checks. This process takes 15–30 seconds. Please keep this modal open.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#1C1C1C] uppercase tracking-wider mb-1">
                  Week Start Date *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#5F6B76]">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <input
                    type="date"
                    required
                    disabled={isGenerating}
                    value={weekStart}
                    onChange={(e) => setWeekStart(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-[#D9E1E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00386B] bg-[#F5F7F9] text-[#1C1C1C] disabled:opacity-50"
                  />
                </div>
                <span className="text-[11px] text-[#5F6B76] mt-1 block">
                  Contest window spans 7 days from start date.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C1C1C] uppercase tracking-wider mb-1">
                  Target Exam Pattern
                </label>
                <select
                  disabled={isGenerating}
                  value={targetCompany}
                  onChange={(e) => setTargetCompany(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-[#D9E1E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00386B] bg-[#F5F7F9] text-[#1C1C1C] disabled:opacity-50"
                >
                  <option value="TCS NQT / Infosys Campus Pattern">TCS NQT / Infosys Campus Pattern</option>
                  <option value="Capgemini / Cognizant GenC Pattern">Capgemini / Cognizant GenC Pattern</option>
                  <option value="AMCAT / eLitmus Standard Pattern">AMCAT / eLitmus Standard Pattern</option>
                  <option value="General High-Precision Tier-1 Tech">General High-Precision Tier-1 Tech</option>
                </select>
                <span className="text-[11px] text-[#5F6B76] mt-1 block">
                  Focuses question context towards campus placement tests.
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1C1C1C] uppercase tracking-wider mb-1">
                Custom Theme or Round Notes (Optional)
              </label>
              <input
                type="text"
                disabled={isGenerating}
                placeholder="e.g. Speed Quantitative and Data Interpretation Focus"
                value={customTheme}
                onChange={(e) => setCustomTheme(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-[#D9E1E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00386B] bg-[#F5F7F9] text-[#1C1C1C] disabled:opacity-50"
              />
            </div>

            {/* SJCEM Fixed Rules Info */}
            <div className="p-4 rounded-lg bg-[#F5F7F9] border border-[#D9E1E8] text-xs text-[#5F6B76] space-y-1.5">
              <div className="font-bold text-[#1C1C1C] flex items-center justify-between">
                <span>Contract Specifications (Strictly Enforced)</span>
                <span className="font-mono text-[#00386B]">20 MCQs • 30s Each</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                The generator produces strictly 20 multiple-choice questions (6 Quant, 5 Logical, 4 Verbal, 3 DI, 2 General Aptitude) with a calibrated difficulty curve (6 Easy, 10 Medium, 4 Hard). The contest is persisted as a <strong>Draft</strong>.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-[#D9E1E8] flex items-center justify-between">
              <button
                type="button"
                disabled={isGenerating}
                onClick={handleClose}
                className="px-4 py-2 border border-[#D9E1E8] text-[#5F6B76] hover:text-[#1C1C1C] hover:bg-[#F5F7F9] rounded-lg text-xs font-bold disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isGenerating}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#449284] hover:bg-[#387a6e] text-white text-xs font-bold rounded-lg shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Generating with Gemini 2.5 Flash...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate 20 MCQs with AI</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  if (onClose) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs overflow-y-auto">
        {modalBody}
      </div>
    );
  }

  return modalBody;
}

