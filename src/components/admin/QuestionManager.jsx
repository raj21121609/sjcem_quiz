import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Eye, 
  CheckCircle2, 
  Edit3, 
  Lock, 
  AlertCircle,
  X,
  FileText
} from 'lucide-react';

export default function QuestionManager({ 
  questions = [], 
  onAddQuestion, 
  onUpdateQuestion, 
  onDeleteQuestion 
}) {
  const [selectedTopic, setSelectedTopic] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [previewQuestion, setPreviewQuestion] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State (Shared for Add / Edit)
  const [formText, setFormText] = useState('');
  const [formTopic, setFormTopic] = useState('Quantitative Aptitude');
  const [formDifficulty, setFormDifficulty] = useState('medium');
  const [formOptA, setFormOptA] = useState('');
  const [formOptB, setFormOptB] = useState('');
  const [formOptC, setFormOptC] = useState('');
  const [formOptD, setFormOptD] = useState('');
  const [formCorrectOpt, setFormCorrectOpt] = useState('A');
  const [formExplanation, setFormExplanation] = useState('');
  const [formSourceType, setFormSourceType] = useState('ORIGINAL');
  const [formSourceName, setFormSourceName] = useState('');
  const [formSourceUrl, setFormSourceUrl] = useState('');
  const [formSourceYear, setFormSourceYear] = useState('');
  const [formVerified, setFormVerified] = useState(true);

  const topics = ['All', 'Quantitative Aptitude', 'Logical Reasoning', 'Verbal Ability', 'Data Interpretation'];
  const difficulties = ['All', 'Easy', 'Medium', 'Hard'];

  const filteredQuestions = questions.filter((q) => {
    const qTopic = q.topic || 'Quantitative Aptitude';
    const qDiff = (q.difficulty || 'medium').toLowerCase();

    if (selectedTopic !== 'All' && qTopic !== selectedTopic) return false;
    if (selectedDifficulty !== 'All' && qDiff !== selectedDifficulty.toLowerCase()) return false;
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      const textMatch = (q.question_text || q.text || '').toLowerCase().includes(s);
      return textMatch;
    }
    return true;
  });

  const handleOpenAdd = () => {
    setErrorMsg('');
    setSuccessMsg('');
    setFormText('');
    setFormTopic('Quantitative Aptitude');
    setFormDifficulty('medium');
    setFormOptA('');
    setFormOptB('');
    setFormOptC('');
    setFormOptD('');
    setFormCorrectOpt('A');
    setFormExplanation('');
    setFormSourceType('ORIGINAL');
    setFormSourceName('');
    setFormSourceUrl('');
    setFormSourceYear('');
    setFormVerified(true);
    setShowAddModal(true);
  };

  const handleOpenEdit = (q) => {
    if (q.isLocked) {
      alert(`Cannot edit question: This question is locked because it belongs to active/closed contest "${q.lockedContestTitle || 'Contest'}".`);
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setEditingQuestion(q);
    setFormText(q.question_text || q.text || '');
    setFormTopic(q.topic || 'Quantitative Aptitude');
    setFormDifficulty((q.difficulty || 'medium').toLowerCase());
    setFormOptA(q.option_a || q.options?.[0]?.text || '');
    setFormOptB(q.option_b || q.options?.[1]?.text || '');
    setFormOptC(q.option_c || q.options?.[2]?.text || '');
    setFormOptD(q.option_d || q.options?.[3]?.text || '');
    setFormCorrectOpt(q.correct_option || q.correctOption || 'A');
    setFormExplanation(q.explanation || '');
    setFormSourceType(q.source_type || 'ORIGINAL');
    setFormSourceName(q.source_name || '');
    setFormSourceUrl(q.source_url || '');
    setFormSourceYear(q.source_year ? String(q.source_year) : '');
    setFormVerified(Boolean(q.verified));
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      await onAddQuestion({
        question_text: formText,
        option_a: formOptA,
        option_b: formOptB,
        option_c: formOptC,
        option_d: formOptD,
        correct_option: formCorrectOpt,
        explanation: formExplanation,
        topic: formTopic,
        difficulty: formDifficulty,
        source_type: formSourceType,
        source_name: formSourceName,
        source_url: formSourceUrl,
        source_year: formSourceYear,
        verified: formVerified
      });

      setShowAddModal(false);
      setSuccessMsg('Question added successfully to question bank.');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to add question.');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingQuestion) return;
    setErrorMsg('');

    try {
      await onUpdateQuestion(editingQuestion.id, {
        question_text: formText,
        option_a: formOptA,
        option_b: formOptB,
        option_c: formOptC,
        option_d: formOptD,
        correct_option: formCorrectOpt,
        explanation: formExplanation,
        topic: formTopic,
        difficulty: formDifficulty,
        source_type: formSourceType,
        source_name: formSourceName,
        source_url: formSourceUrl,
        source_year: formSourceYear,
        verified: formVerified
      });

      setEditingQuestion(null);
      setSuccessMsg('Question updated successfully.');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update question.');
    }
  };

  const handleDelete = async (q) => {
    if (q.isLocked) {
      alert(`Cannot delete question: This question is locked because it belongs to active/closed contest "${q.lockedContestTitle || 'Contest'}".`);
      return;
    }

    const confirmed = window.confirm('Are you sure you want to delete this question from the bank?');
    if (!confirmed) return;

    try {
      await onDeleteQuestion(q.id);
      setSuccessMsg('Question deleted successfully.');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to delete question.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#1C1C1C] font-heading">
            Placement Question Bank
          </h2>
          <p className="text-xs sm:text-sm text-[#5F6B76]">
            Repository of verified MCQs tagged with company patterns, difficulty, and step-by-step solutions.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#00386B] hover:bg-[#005599] text-white text-xs font-bold rounded-lg shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Aptitude MCQ</span>
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3.5 rounded-lg bg-green-50 border border-green-200 text-xs font-bold text-[#449284] flex items-center justify-between">
          <span>✓ {successMsg}</span>
          <button type="button" onClick={() => setSuccessMsg('')} className="text-sm">✕</button>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs font-bold text-[#E31B23] flex items-center justify-between">
          <span>⚠️ {errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg('')} className="text-sm">✕</button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#D9E1E8] shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-[#5F6B76]">
            <Filter className="w-3.5 h-3.5 text-[#5F6B76]" />
            <span className="font-bold text-[#1C1C1C]">Topic:</span>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-[#F5F7F9] border border-[#D9E1E8] rounded-md focus:outline-none focus:ring-2 focus:ring-[#00386B] text-[#1C1C1C]"
            >
              {topics.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-[#5F6B76]">
            <span className="font-bold text-[#1C1C1C]">Difficulty:</span>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-[#F5F7F9] border border-[#D9E1E8] rounded-md focus:outline-none focus:ring-2 focus:ring-[#00386B] text-[#1C1C1C]"
            >
              {difficulties.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-[#5F6B76] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search questions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-[#F5F7F9] border border-[#D9E1E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00386B] text-[#1C1C1C]"
          />
        </div>
      </div>

      {/* Questions Table */}
      <div className="bg-white rounded-xl border border-[#D9E1E8] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#D9E1E8] bg-[#F5F7F9] text-[#5F6B76] text-xs font-bold uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Question Text</th>
                <th className="py-3 px-4">Topic / Area</th>
                <th className="py-3 px-4 text-center">Difficulty</th>
                <th className="py-3 px-4 text-center">Answer Key</th>
                <th className="py-3 px-4 text-center">Lock Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9E1E8] text-sm">
              {filteredQuestions.length > 0 ? (
                filteredQuestions.map((q, idx) => {
                  const qText = q.question_text || q.text;
                  const correct = q.correct_option || q.correctOption;
                  const diff = (q.difficulty || 'medium').toLowerCase();

                  return (
                    <tr key={q.id || idx} className="hover:bg-[#F5F7F9] transition-colors">
                      <td className="py-3.5 px-4 text-center text-xs font-mono font-bold text-[#5F6B76]">
                        {idx + 1}
                      </td>

                      <td className="py-3.5 px-4 max-w-md">
                        <div className="font-bold text-[#1C1C1C] line-clamp-2 text-xs sm:text-sm">
                          {qText}
                        </div>
                        {q.explanation && (
                          <div className="text-[11px] text-[#5F6B76] line-clamp-1 mt-0.5">
                            {q.explanation}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-xs font-bold text-[#1C1C1C] block">
                          {q.topic || 'Quantitative Aptitude'}
                        </span>
                        <span className="text-[11px] text-[#5F6B76]">
                          {q.source_type || 'ORIGINAL'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold capitalize ${
                          diff === 'easy' ? 'bg-green-50 text-[#449284] border border-green-200' :
                          diff === 'hard' ? 'bg-red-50 text-[#E31B23] border border-red-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {diff}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono font-bold text-xs text-[#449284]">
                        Option {correct}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {q.isLocked ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-[#5F6B76] bg-slate-100 px-2 py-0.5 rounded border border-slate-200" title={`Locked in contest "${q.lockedContestTitle || 'Active Round'}"`}>
                            <Lock className="w-3 h-3 text-[#5F6B76]" />
                            Locked
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#449284] font-medium">
                            Unlocked
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPreviewQuestion(q)}
                            className="p-1.5 text-[#00386B] hover:bg-blue-50 rounded"
                            title="Preview question & solution"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            disabled={q.isLocked}
                            onClick={() => handleOpenEdit(q)}
                            className="p-1.5 text-[#5F6B76] hover:text-[#1C1C1C] hover:bg-[#F5F7F9] rounded disabled:opacity-30 disabled:cursor-not-allowed"
                            title={q.isLocked ? 'Locked by active contest' : 'Edit question'}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            disabled={q.isLocked}
                            onClick={() => handleDelete(q)}
                            className="p-1.5 text-[#E31B23] hover:bg-red-50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                            title={q.isLocked ? 'Locked by active contest' : 'Delete question'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-[#5F6B76] text-sm">
                    No questions found matching your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview Modal */}
      {previewQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl border border-[#D9E1E8] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#D9E1E8] bg-[#F5F7F9] flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-[#5F6B76] uppercase">
                  Question Detail
                </span>
                <h4 className="text-sm font-bold text-[#1C1C1C]">
                  {previewQuestion.topic} ({previewQuestion.difficulty})
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setPreviewQuestion(null)}
                className="text-[#5F6B76] hover:text-[#1C1C1C] text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="text-sm font-medium text-[#1C1C1C] leading-relaxed">
                {previewQuestion.question_text || previewQuestion.text}
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-[#5F6B76] uppercase">Multiple-Choice Options:</span>
                {[
                  { id: 'A', text: previewQuestion.option_a || previewQuestion.options?.[0]?.text },
                  { id: 'B', text: previewQuestion.option_b || previewQuestion.options?.[1]?.text },
                  { id: 'C', text: previewQuestion.option_c || previewQuestion.options?.[2]?.text },
                  { id: 'D', text: previewQuestion.option_d || previewQuestion.options?.[3]?.text },
                ].map((opt) => {
                  const isCorrect = opt.id === (previewQuestion.correct_option || previewQuestion.correctOption);
                  return (
                    <div
                      key={opt.id}
                      className={`p-2.5 rounded-lg border text-xs sm:text-sm flex items-center justify-between ${
                        isCorrect
                          ? 'bg-[#449284]/10 border-[#449284] text-[#1C1C1C] font-bold'
                          : 'bg-[#F5F7F9] border-[#D9E1E8] text-[#1C1C1C]'
                      }`}
                    >
                      <span><strong>{opt.id}.</strong> {opt.text}</span>
                      {isCorrect && (
                        <span className="text-xs text-[#449284] font-bold">✓ Authoritative Answer</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {previewQuestion.explanation && (
                <div className="p-3 bg-[#F5F7F9] border border-[#D9E1E8] rounded-lg text-xs sm:text-sm text-[#1C1C1C] space-y-1">
                  <span className="font-bold text-[#00386B] block">Explanation & Solution:</span>
                  <p className="whitespace-pre-line text-[#5F6B76] leading-relaxed">
                    {previewQuestion.explanation}
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-[#F5F7F9] border-t border-[#D9E1E8] flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewQuestion(null)}
                className="px-4 py-1.5 text-xs font-bold text-[#1C1C1C] hover:bg-[#D9E1E8] rounded-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Question Modal */}
      {(showAddModal || editingQuestion) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs overflow-y-auto">
          <div className="bg-white rounded-xl max-w-xl w-full shadow-2xl border border-[#D9E1E8] my-8 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-[#D9E1E8] bg-[#F5F7F9] flex justify-between items-center shrink-0">
              <h3 className="font-bold text-[#1C1C1C] text-base font-heading">
                {editingQuestion ? 'Edit Aptitude MCQ' : 'Add New Aptitude MCQ'}
              </h3>
              <button
                type="button"
                onClick={() => { setShowAddModal(false); setEditingQuestion(null); }}
                className="text-[#5F6B76] hover:text-[#1C1C1C] text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={editingQuestion ? handleEditSubmit : handleAddSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-[#1C1C1C] mb-1">
                  Question Text *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Enter the complete question problem statement..."
                  value={formText}
                  onChange={(e) => setFormText(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#D9E1E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00386B] bg-[#F5F7F9] text-[#1C1C1C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1C1C1C] mb-1">Topic *</label>
                  <select
                    value={formTopic}
                    onChange={(e) => setFormTopic(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#D9E1E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00386B] bg-[#F5F7F9]"
                  >
                    <option value="Quantitative Aptitude">Quantitative Aptitude</option>
                    <option value="Logical Reasoning">Logical Reasoning</option>
                    <option value="Verbal Ability">Verbal Ability</option>
                    <option value="Data Interpretation">Data Interpretation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1C1C1C] mb-1">Difficulty *</label>
                  <select
                    value={formDifficulty}
                    onChange={(e) => setFormDifficulty(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#D9E1E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00386B] bg-[#F5F7F9]"
                  >
                    <option value="easy">Easy (Campus Level 1)</option>
                    <option value="medium">Medium (Standard NQT)</option>
                    <option value="hard">Hard (Advanced)</option>
                  </select>
                </div>
              </div>

              {/* 4 Options */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#1C1C1C]">Options (All 4 Required) *</label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: 'A', val: formOptA, set: setFormOptA },
                    { id: 'B', val: formOptB, set: setFormOptB },
                    { id: 'C', val: formOptC, set: setFormOptC },
                    { id: 'D', val: formOptD, set: setFormOptD },
                  ].map((item) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-[#00386B] text-white font-bold flex items-center justify-center text-xs shrink-0 font-mono">
                        {item.id}
                      </span>
                      <input
                        type="text"
                        required
                        placeholder={`Option ${item.id} text`}
                        value={item.val}
                        onChange={(e) => item.set(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs border border-[#D9E1E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00386B] bg-[#F5F7F9]"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Correct Option Selector */}
              <div>
                <label className="block text-xs font-bold text-[#1C1C1C] mb-1">
                  Correct Answer Key *
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['A', 'B', 'C', 'D'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setFormCorrectOpt(opt)}
                      className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                        formCorrectOpt === opt
                          ? 'bg-[#449284] text-white border-[#449284] shadow-xs'
                          : 'bg-[#F5F7F9] text-[#1C1C1C] border-[#D9E1E8] hover:bg-slate-200'
                      }`}
                    >
                      Option {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step-by-Step Explanation */}
              <div>
                <label className="block text-xs font-bold text-[#1C1C1C] mb-1">
                  Official Solution & Explanation *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Step-by-step formula and mathematical derivation for student review..."
                  value={formExplanation}
                  onChange={(e) => setFormExplanation(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#D9E1E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00386B] bg-[#F5F7F9]"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-2 flex justify-end gap-2 border-t border-[#D9E1E8]">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setEditingQuestion(null); }}
                  className="px-4 py-2 border border-[#D9E1E8] rounded-lg text-xs font-bold hover:bg-[#F5F7F9]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#00386B] hover:bg-[#005599] text-white text-xs font-bold rounded-lg shadow-xs"
                >
                  {editingQuestion ? 'Update Question' : 'Save Question to Bank'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
