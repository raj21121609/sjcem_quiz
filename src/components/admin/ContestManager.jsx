import React, { useState } from 'react';
import { 
  Plus, 
  Calendar, 
  Eye, 
  Edit3, 
  AlertCircle, 
  X, 
  HelpCircle, 
  ArrowUp, 
  ArrowDown, 
  Trash2, 
  Power, 
  Lock,
  Search,
  Check,
  Sparkles,
  Lightbulb
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { contestService } from '../../services/contestService';
import { questionService } from '../../services/questionService';
import GeminiContestGenerator from './GeminiContestGenerator';

export default function ContestManager({ contests = [], onRefreshContests }) {
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [editingContest, setEditingContest] = useState(null);
  const [assigningContest, setAssigningContest] = useState(null);
  const [assignedQuestions, setAssignedQuestions] = useState([]);
  const [questionBank, setQuestionBank] = useState([]);
  const [bankSearch, setBankSearch] = useState('');
  const [bankTopic, setBankTopic] = useState('All');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Review modal view & filter states
  const [reviewTab, setReviewTab] = useState('detailed'); // 'detailed' | 'bank'
  const [reviewFilterTopic, setReviewFilterTopic] = useState('All');
  const [reviewFilterDiff, setReviewFilterDiff] = useState('All');
  const [reviewSearch, setReviewSearch] = useState('');

  // Question Edit modal state (within contest review)
  const [editingReviewQuestion, setEditingReviewQuestion] = useState(null);
  const [editFormText, setEditFormText] = useState('');
  const [editFormTopic, setEditFormTopic] = useState('Quantitative Aptitude');
  const [editFormDifficulty, setEditFormDifficulty] = useState('medium');
  const [editFormOptA, setEditFormOptA] = useState('');
  const [editFormOptB, setEditFormOptB] = useState('');
  const [editFormOptC, setEditFormOptC] = useState('');
  const [editFormOptD, setEditFormOptD] = useState('');
  const [editFormCorrectOpt, setEditFormCorrectOpt] = useState('A');
  const [editFormExplanation, setEditFormExplanation] = useState('');
  const [editFormSaving, setEditFormSaving] = useState(false);
  const [editFormError, setEditFormError] = useState('');

  // Form states for Create/Edit
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formWeekStart, setFormWeekStart] = useState('');
  const [formWeekEnd, setFormWeekEnd] = useState('');

  // Open Create Modal
  const handleOpenCreate = () => {
    setErrorMsg('');
    setSuccessMsg('');
    setFormTitle('');
    setFormDescription('');
    const now = new Date();
    const nextWeek = new Date(Date.now() + 7 * 86400000);
    setFormWeekStart(now.toISOString().slice(0, 16));
    setFormWeekEnd(nextWeek.toISOString().slice(0, 16));
    setShowCreateModal(true);
  };

  // Handle AI-generated draft contest completion
  const handleAiContestGenerated = (newContest) => {
    setSuccessMsg(`Draft contest "${newContest?.title || 'Weekly Contest'}" generated with Gemini and saved to draft queue.`);
    if (onRefreshContests) onRefreshContests();
  };

  // Open Edit Modal
  const handleOpenEdit = (contest) => {
    if (contest.status !== 'draft') {
      alert(`Cannot edit contest: Contest in status "${contest.status}" is locked.`);
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    setEditingContest(contest);
    setFormTitle(contest.title || '');
    setFormDescription(contest.description || '');
    setFormWeekStart(contest.week_start ? new Date(contest.week_start).toISOString().slice(0, 16) : '');
    setFormWeekEnd(contest.week_end ? new Date(contest.week_end).toISOString().slice(0, 16) : '');
  };

  // Submit Create Draft Contest
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      await contestService.createDraftContest({
        title: formTitle,
        description: formDescription,
        week_start: formWeekStart,
        week_end: formWeekEnd
      });

      setShowCreateModal(false);
      setSuccessMsg('Draft contest created successfully.');
      if (onRefreshContests) onRefreshContests();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create contest.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Edit Draft Contest
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingContest) return;
    setErrorMsg('');
    setLoading(true);

    try {
      await contestService.updateDraftContest(editingContest.id, {
        title: formTitle,
        description: formDescription,
        week_start: formWeekStart,
        week_end: formWeekEnd
      });

      setEditingContest(null);
      setSuccessMsg('Contest details updated successfully.');
      if (onRefreshContests) onRefreshContests();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update contest.');
    } finally {
      setLoading(false);
    }
  };

  // Open Question Assignment & Detailed Review Workspace
  const handleOpenAssignQuestions = async (contest) => {
    setErrorMsg('');
    setSuccessMsg('');
    setAssigningContest(contest);
    setReviewTab('detailed');
    setReviewFilterTopic('All');
    setReviewFilterDiff('All');
    setReviewSearch('');
    setEditingReviewQuestion(null);
    setLoading(true);

    try {
      // 1. Fetch currently assigned questions for this contest
      const assigned = await contestService.getContestAssignedQuestions(contest.id);
      setAssignedQuestions(assigned);

      // 2. Fetch full question bank to allow selecting
      const bank = await questionService.getQuestions();
      setQuestionBank(bank);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load contest questions.');
    } finally {
      setLoading(false);
    }
  };

  // Open Question Editor Modal during review
  const handleOpenEditQuestion = (q, index) => {
    setEditingReviewQuestion({ ...q, orderIndex: index + 1 });
    setEditFormText(q.question_text || q.text || '');
    setEditFormTopic(q.topic || 'Quantitative Aptitude');
    setEditFormDifficulty((q.difficulty || 'medium').toLowerCase());
    setEditFormOptA(q.option_a || (q.options && q.options[0]?.text) || '');
    setEditFormOptB(q.option_b || (q.options && q.options[1]?.text) || '');
    setEditFormOptC(q.option_c || (q.options && q.options[2]?.text) || '');
    setEditFormOptD(q.option_d || (q.options && q.options[3]?.text) || '');
    setEditFormCorrectOpt((q.correct_option || q.correctOption || 'A').toUpperCase());
    setEditFormExplanation(q.explanation || '');
    setEditFormError('');
  };

  // Save Question Correction via questionService.updateQuestion
  const handleSaveQuestionEdit = async (e) => {
    e.preventDefault();
    if (!editingReviewQuestion) return;
    setEditFormError('');
    setEditFormSaving(true);

    const targetId = editingReviewQuestion.questionId || editingReviewQuestion.id;

    try {
      const payload = {
        question_text: editFormText.trim(),
        option_a: editFormOptA.trim(),
        option_b: editFormOptB.trim(),
        option_c: editFormOptC.trim(),
        option_d: editFormOptD.trim(),
        correct_option: editFormCorrectOpt.toUpperCase(),
        explanation: (editFormExplanation || '').trim(),
        topic: editFormTopic.trim(),
        difficulty: editFormDifficulty.toLowerCase(),
        source_type: editingReviewQuestion.source_type || 'AI_GENERATED',
        source_name: editingReviewQuestion.source_name || null,
        source_url: editingReviewQuestion.source_url || null,
        source_year: editingReviewQuestion.source_year ? Number(editingReviewQuestion.source_year) : null,
        verified: editingReviewQuestion.verified !== undefined ? Boolean(editingReviewQuestion.verified) : true
      };

      const updated = await questionService.updateQuestion(targetId, payload);

      // Update in assignedQuestions immediately
      setAssignedQuestions(prev => prev.map(item => {
        const itemId = item.questionId || item.id;
        if (itemId === targetId) {
          return {
            ...item,
            ...updated,
            question_text: updated.question_text,
            option_a: updated.option_a,
            option_b: updated.option_b,
            option_c: updated.option_c,
            option_d: updated.option_d,
            correct_option: updated.correct_option,
            explanation: updated.explanation,
            topic: updated.topic,
            difficulty: updated.difficulty
          };
        }
        return item;
      }));

      // Update in questionBank if present
      setQuestionBank(prev => prev.map(item => {
        if (item.id === targetId) {
          return {
            ...item,
            ...updated
          };
        }
        return item;
      }));

      const orderNumber = editingReviewQuestion.orderIndex || '';
      setEditingReviewQuestion(null);
      setSuccessMsg(`Question ${orderNumber ? `#${orderNumber} ` : ''}updated and verified.`);
    } catch (err) {
      setEditFormError(err.message || 'Failed to update question.');
    } finally {
      setEditFormSaving(false);
    }
  };

  // Add Question to assigned list
  const handleAddQuestionToContest = (question) => {
    if (assignedQuestions.some(q => q.id === question.id || q.questionId === question.id)) {
      return;
    }
    if (assignedQuestions.length >= 20) {
      alert('Contest already has maximum of 20 questions assigned.');
      return;
    }

    const updated = [
      ...assignedQuestions,
      {
        ...question,
        questionId: question.id,
        questionOrder: assignedQuestions.length + 1
      }
    ];
    setAssignedQuestions(updated);
  };

  // Remove question from assignment
  const handleRemoveQuestion = (index) => {
    const updated = assignedQuestions
      .filter((_, idx) => idx !== index)
      .map((q, idx) => ({ ...q, questionOrder: idx + 1 }));
    setAssignedQuestions(updated);
  };

  // Move Question Up
  const handleMoveUp = (index) => {
    if (index === 0) return;
    const updated = [...assignedQuestions];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    const reordered = updated.map((q, idx) => ({ ...q, questionOrder: idx + 1 }));
    setAssignedQuestions(reordered);
  };

  // Move Question Down
  const handleMoveDown = (index) => {
    if (index === assignedQuestions.length - 1) return;
    const updated = [...assignedQuestions];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    const reordered = updated.map((q, idx) => ({ ...q, questionOrder: idx + 1 }));
    setAssignedQuestions(reordered);
  };

  // Save Question Assignments to Database
  const handleSaveAssignments = async () => {
    if (!assigningContest) return;
    setErrorMsg('');
    setLoading(true);

    try {
      const questionIds = assignedQuestions.map(q => q.questionId || q.id);
      await contestService.assignQuestionsToContest(assigningContest.id, questionIds);

      setSuccessMsg(`Successfully saved ${questionIds.length} assigned questions.`);
      if (onRefreshContests) onRefreshContests();
      setAssigningContest(null);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save question assignments.');
    } finally {
      setLoading(false);
    }
  };

  // Activate Contest
  const handleActivate = async (contest) => {
    if (contest.status !== 'draft') return;
    if (contest.assignedCount !== 20) {
      alert(`Cannot activate contest: Exactly 20 questions must be assigned (currently ${contest.assignedCount || 0}/20).`);
      return;
    }

    const confirmed = window.confirm(
      `Activate "${contest.title}" now?\n\nThis will make it the live contest for students. Ensure no other round is active.`
    );
    if (!confirmed) return;

    setErrorMsg('');
    setLoading(true);
    try {
      await contestService.activateContest(contest.id);
      setSuccessMsg(`Contest "${contest.title}" is now ACTIVE.`);
      if (onRefreshContests) onRefreshContests();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to activate contest.');
    } finally {
      setLoading(false);
    }
  };

  // Close Contest
  const handleClose = async (contest) => {
    if (contest.status !== 'active') return;

    const confirmed = window.confirm(
      `Close contest "${contest.title}"?\n\nOnce closed, no new student attempts can be started.`
    );
    if (!confirmed) return;

    setErrorMsg('');
    setLoading(true);
    try {
      await contestService.closeContest(contest.id);
      setSuccessMsg(`Contest "${contest.title}" is now CLOSED.`);
      if (onRefreshContests) onRefreshContests();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to close contest.');
    } finally {
      setLoading(false);
    }
  };

  // Filter question bank in assignment modal
  const filteredBank = questionBank.filter(q => {
    const matchesTopic = bankTopic === 'All' || q.topic === bankTopic;
    const matchesSearch = !bankSearch.trim() || q.question_text.toLowerCase().includes(bankSearch.toLowerCase());
    return matchesTopic && matchesSearch;
  });

  // Computed summary metrics for assigned contest questions
  const assignedStats = {
    total: assignedQuestions.length,
    quant: assignedQuestions.filter(q => q.topic === 'Quantitative Aptitude').length,
    logical: assignedQuestions.filter(q => q.topic === 'Logical Reasoning').length,
    verbal: assignedQuestions.filter(q => q.topic === 'Verbal Ability').length,
    di: assignedQuestions.filter(q => q.topic === 'Data Interpretation').length,
    easy: assignedQuestions.filter(q => (q.difficulty || '').toLowerCase() === 'easy').length,
    medium: assignedQuestions.filter(q => (q.difficulty || '').toLowerCase() === 'medium').length,
    hard: assignedQuestions.filter(q => (q.difficulty || '').toLowerCase() === 'hard').length
  };

  // Filter assigned questions in detailed review tab
  const filteredAssignedQuestions = assignedQuestions.filter((q) => {
    if (reviewFilterTopic !== 'All' && q.topic !== reviewFilterTopic) {
      return false;
    }
    if (reviewFilterDiff !== 'All' && (q.difficulty || '').toLowerCase() !== reviewFilterDiff.toLowerCase()) {
      return false;
    }
    if (reviewSearch.trim()) {
      const term = reviewSearch.toLowerCase();
      const text = (q.question_text || q.text || '').toLowerCase();
      const explanation = (q.explanation || '').toLowerCase();
      return text.includes(term) || explanation.includes(term);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#1C1C1C] font-heading">
            Contest Management
          </h2>
          <p className="text-xs sm:text-sm text-[#5F6B76]">
            Schedule, assign 20 questions, and control the lifecycle of SJCEM weekly speed aptitude contests.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setShowAiModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#449284] hover:bg-[#387a6e] text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate with AI (Gemini)</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#00386B] hover:bg-[#005599] text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Draft Contest</span>
          </button>
        </div>
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

      {/* Contests Table */}
      <div className="bg-white rounded-xl border border-[#D9E1E8] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#D9E1E8] bg-[#F5F7F9] text-[#5F6B76] text-xs font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Contest Title</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Schedule Window</th>
                <th className="py-3.5 px-4 text-center">Assigned Questions</th>
                <th className="py-3.5 px-4 text-center">Participants</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9E1E8] text-sm">
              {contests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-[#5F6B76]">
                    No contests created yet. Click "Create Draft Contest" to schedule one.
                  </td>
                </tr>
              ) : (
                contests.map((c) => {
                  const isDraft = c.status === 'draft';
                  const isActive = c.status === 'active';
                  const isClosed = c.status === 'closed';
                  const assignedCount = c.assignedCount || 0;
                  const has20Questions = assignedCount === 20;

                  return (
                    <tr key={c.id} className="hover:bg-[#F5F7F9] transition-colors">
                      <td className="py-4 px-4">
                        <div>
                          <span className="font-bold text-[#1C1C1C] block font-heading">
                            {c.title}
                          </span>
                          {c.description && (
                            <span className="text-xs text-[#5F6B76] line-clamp-1">
                              {c.description}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#449284]/15 text-[#449284] border border-[#449284]/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#449284] animate-pulse"></span>
                            ACTIVE LIVE
                          </span>
                        ) : isDraft ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            DRAFT
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            CLOSED
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-xs text-[#5F6B76] font-mono">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-[#5F6B76]" />
                          <span>
                            {c.week_start ? new Date(c.week_start).toLocaleDateString() : 'N/A'} – {c.week_end ? new Date(c.week_end).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-center text-xs">
                        <span className={`font-mono font-bold px-2 py-0.5 rounded ${
                          has20Questions ? 'bg-green-50 text-[#449284] border border-green-200' : 'bg-red-50 text-[#E31B23] border border-red-200'
                        }`}>
                          {assignedCount} / 20 MCQs
                        </span>
                      </td>

                      <td className="py-4 px-4 text-center font-mono text-xs font-bold text-[#1C1C1C]">
                        {c.participantsCount || 0}
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isDraft && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenAssignQuestions(c)}
                                className="px-2.5 py-1 text-xs font-bold bg-blue-50 text-[#00386B] border border-blue-200 rounded hover:bg-blue-100 transition-colors flex items-center gap-1.5"
                                title="Review complete question statements, options, answers, explanations, and sequence before activation"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Review Questions ({assignedCount}/20)</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenEdit(c)}
                                className="p-1.5 rounded text-[#5F6B76] hover:text-[#1C1C1C] hover:bg-[#F5F7F9]"
                                title="Edit Dates/Title"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                disabled={!has20Questions}
                                onClick={() => handleActivate(c)}
                                className={`px-2.5 py-1 text-xs font-bold rounded flex items-center gap-1 transition-colors ${
                                  has20Questions
                                    ? 'bg-[#449284] text-white hover:bg-[#3b7e72]'
                                    : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                }`}
                                title={has20Questions ? 'Activate contest for students' : 'Must assign exactly 20 questions before activating'}
                              >
                                <Power className="w-3.5 h-3.5" />
                                <span>Activate</span>
                              </button>
                            </>
                          )}

                          {isActive && (
                            <>
                              <Link
                                to="/quiz"
                                target="_blank"
                                className="p-1.5 rounded text-[#00386B] hover:bg-blue-50"
                                title="Preview Student Experience"
                              >
                                <Eye className="w-4 h-4" />
                              </Link>

                              <button
                                type="button"
                                onClick={() => handleClose(c)}
                                className="px-2.5 py-1 text-xs font-bold bg-red-50 text-[#E31B23] border border-red-200 rounded hover:bg-red-100"
                                title="Close active contest"
                              >
                                Close Round
                              </button>
                            </>
                          )}

                          {isClosed && (
                            <span className="text-xs text-[#5F6B76] font-medium flex items-center gap-1">
                              <Lock className="w-3.5 h-3.5" />
                              Locked
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Create Draft Contest */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl border border-[#D9E1E8] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#D9E1E8] bg-[#F5F7F9] flex justify-between items-center">
              <h3 className="font-bold text-[#1C1C1C] text-base font-heading">
                Create New Draft Contest
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-[#5F6B76] hover:text-[#1C1C1C] text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1C1C1C] mb-1">
                  Contest Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weekly Placement Aptitude Challenge #15"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#D9E1E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00386B] bg-[#F5F7F9] text-[#1C1C1C]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C1C1C] mb-1">
                  Description / Topic Focus
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Speed Quantitative, Logical & Verbal Aptitude for TCS & Infosys"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#D9E1E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00386B] bg-[#F5F7F9] text-[#1C1C1C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1C1C1C] mb-1">
                    Week Start *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formWeekStart}
                    onChange={(e) => setFormWeekStart(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#D9E1E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00386B] bg-[#F5F7F9] text-[#1C1C1C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1C1C1C] mb-1">
                    Week End *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formWeekEnd}
                    onChange={(e) => setFormWeekEnd(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#D9E1E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00386B] bg-[#F5F7F9] text-[#1C1C1C]"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-[#00386B] space-y-1">
                <strong>Contest Lifecycle Rule:</strong>
                <p>New contests are created as <em>Draft</em>. You must assign exactly 20 questions before the contest can be activated.</p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-[#D9E1E8] rounded-lg text-xs font-bold hover:bg-[#F5F7F9]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-[#00386B] hover:bg-[#005599] text-white text-xs font-bold rounded-lg disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Draft Contest'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Edit Draft Contest */}
      {editingContest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl border border-[#D9E1E8] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#D9E1E8] bg-[#F5F7F9] flex justify-between items-center">
              <h3 className="font-bold text-[#1C1C1C] text-base font-heading">
                Edit Draft Contest
              </h3>
              <button
                type="button"
                onClick={() => setEditingContest(null)}
                className="text-[#5F6B76] hover:text-[#1C1C1C] text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1C1C1C] mb-1">
                  Contest Title *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#D9E1E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00386B] bg-[#F5F7F9] text-[#1C1C1C]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C1C1C] mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#D9E1E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00386B] bg-[#F5F7F9] text-[#1C1C1C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1C1C1C] mb-1">
                    Week Start
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formWeekStart}
                    onChange={(e) => setFormWeekStart(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#D9E1E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00386B] bg-[#F5F7F9] text-[#1C1C1C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1C1C1C] mb-1">
                    Week End
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formWeekEnd}
                    onChange={(e) => setFormWeekEnd(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#D9E1E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00386B] bg-[#F5F7F9] text-[#1C1C1C]"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingContest(null)}
                  className="px-4 py-2 border border-[#D9E1E8] rounded-lg text-xs font-bold hover:bg-[#F5F7F9]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-[#00386B] hover:bg-[#005599] text-white text-xs font-bold rounded-lg disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Review, Assign & Reorder Questions */}
      {assigningContest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-2xs overflow-y-auto">
          <div className="bg-white rounded-xl max-w-5xl w-full shadow-2xl border border-[#D9E1E8] my-4 sm:my-8 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#D9E1E8] bg-[#F5F7F9] flex flex-wrap justify-between items-center gap-3 shrink-0">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-[#1C1C1C] text-base font-heading">
                    Review Contest Questions — {assigningContest.title}
                  </h3>
                  <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded uppercase">
                    Draft Round
                  </span>
                </div>
                <p className="text-xs text-[#5F6B76]">
                  Inspect full problem statements, options A–D, answer keys, and explanations before activating for students.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-black font-mono border ${
                  assignedQuestions.length === 20
                    ? 'bg-green-50 text-[#449284] border-green-300'
                    : 'bg-amber-50 text-amber-700 border-amber-300'
                }`}>
                  {assignedQuestions.length} / 20 Assigned
                </span>

                <button
                  type="button"
                  onClick={() => setAssigningContest(null)}
                  className="text-[#5F6B76] hover:text-[#1C1C1C] font-bold text-lg p-1"
                  title="Close Modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="px-6 border-b border-[#D9E1E8] bg-white flex items-center gap-4 shrink-0">
              <button
                type="button"
                onClick={() => setReviewTab('detailed')}
                className={`py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
                  reviewTab === 'detailed'
                    ? 'border-[#00386B] text-[#00386B]'
                    : 'border-transparent text-[#5F6B76] hover:text-[#1C1C1C]'
                }`}
              >
                <Eye className="w-4 h-4" />
                <span>Detailed Question Review ({assignedQuestions.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setReviewTab('bank')}
                className={`py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
                  reviewTab === 'bank'
                    ? 'border-[#00386B] text-[#00386B]'
                    : 'border-transparent text-[#5F6B76] hover:text-[#1C1C1C]'
                }`}
              >
                <Search className="w-4 h-4" />
                <span>Question Bank & Reorder Pool</span>
              </button>
            </div>

            {/* View 1: Detailed Question Review */}
            {reviewTab === 'detailed' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Distribution & Filter Bar */}
                <div className="p-4 bg-[#F5F7F9] border-b border-[#D9E1E8] space-y-3 shrink-0">
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                    {/* Category Breakdown */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold text-[#5F6B76] uppercase">Topics:</span>
                      <span className="px-2 py-0.5 rounded bg-blue-100/70 text-[#00386B] text-[11px] font-semibold">
                        Quant: {assignedStats.quant}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-indigo-100/70 text-indigo-800 text-[11px] font-semibold">
                        Logical: {assignedStats.logical}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-100/70 text-emerald-800 text-[11px] font-semibold">
                        Verbal: {assignedStats.verbal}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-purple-100/70 text-purple-800 text-[11px] font-semibold">
                        DI: {assignedStats.di}
                      </span>
                      <span className="text-slate-300">|</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                        Easy: {assignedStats.easy}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-semibold">
                        Med: {assignedStats.medium}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-semibold">
                        Hard: {assignedStats.hard}
                      </span>
                    </div>

                    {assignedQuestions.length < 20 && (
                      <button
                        type="button"
                        onClick={() => setReviewTab('bank')}
                        className="text-xs font-bold text-[#00386B] hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add questions from bank ({20 - assignedQuestions.length} remaining)</span>
                      </button>
                    )}
                  </div>

                  {/* Search and Filters */}
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#5F6B76]" />
                      <input
                        type="text"
                        placeholder="Search question statements or explanations..."
                        value={reviewSearch}
                        onChange={(e) => setReviewSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#D9E1E8] rounded-lg bg-white text-[#1C1C1C]"
                      />
                    </div>

                    <select
                      value={reviewFilterTopic}
                      onChange={(e) => setReviewFilterTopic(e.target.value)}
                      className="px-2.5 py-1.5 text-xs border border-[#D9E1E8] rounded-lg bg-white text-[#1C1C1C]"
                    >
                      <option value="All">All Topics ({assignedQuestions.length})</option>
                      <option value="Quantitative Aptitude">Quantitative Aptitude</option>
                      <option value="Logical Reasoning">Logical Reasoning</option>
                      <option value="Verbal Ability">Verbal Ability</option>
                      <option value="Data Interpretation">Data Interpretation</option>
                    </select>

                    <select
                      value={reviewFilterDiff}
                      onChange={(e) => setReviewFilterDiff(e.target.value)}
                      className="px-2.5 py-1.5 text-xs border border-[#D9E1E8] rounded-lg bg-white text-[#1C1C1C]"
                    >
                      <option value="All">All Difficulties</option>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>

                    {(reviewSearch || reviewFilterTopic !== 'All' || reviewFilterDiff !== 'All') && (
                      <button
                        type="button"
                        onClick={() => {
                          setReviewSearch('');
                          setReviewFilterTopic('All');
                          setReviewFilterDiff('All');
                        }}
                        className="text-xs text-[#5F6B76] hover:text-[#1C1C1C] underline font-medium"
                      >
                        Reset filters
                      </button>
                    )}
                  </div>
                </div>

                {/* Question Cards List */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
                  {assignedQuestions.length === 0 ? (
                    <div className="p-12 border-2 border-dashed border-[#D9E1E8] rounded-xl text-center text-xs text-[#5F6B76] space-y-2">
                      <HelpCircle className="w-10 h-10 text-[#5F6B76] mx-auto opacity-50" />
                      <p className="font-bold text-sm text-[#1C1C1C]">No questions assigned yet.</p>
                      <p>Switch to the "Question Bank & Reorder Pool" tab to populate this contest.</p>
                      <button
                        type="button"
                        onClick={() => setReviewTab('bank')}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#00386B] text-white font-bold rounded-lg"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>Open Question Bank</span>
                      </button>
                    </div>
                  ) : filteredAssignedQuestions.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#5F6B76]">
                      No questions match your current search/topic filter.
                    </div>
                  ) : (
                    filteredAssignedQuestions.map((q, filteredIdx) => {
                      const globalIndex = assignedQuestions.findIndex(
                        aq => (aq.questionId || aq.id) === (q.questionId || q.id)
                      );
                      const actualIndex = globalIndex >= 0 ? globalIndex : filteredIdx;
                      const questionNumber = actualIndex + 1;

                      const options = [
                        { id: 'A', text: q.option_a || (q.options && q.options[0]?.text) || '' },
                        { id: 'B', text: q.option_b || (q.options && q.options[1]?.text) || '' },
                        { id: 'C', text: q.option_c || (q.options && q.options[2]?.text) || '' },
                        { id: 'D', text: q.option_d || (q.options && q.options[3]?.text) || '' }
                      ];
                      const correctOpt = (q.correct_option || q.correctOption || 'A').toUpperCase();

                      const diffStr = (q.difficulty || 'medium').toLowerCase();
                      const diffBadgeClass = diffStr === 'easy'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : diffStr === 'hard'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200';

                      return (
                        <div
                          key={q.id || q.questionId || actualIndex}
                          className="bg-white border border-[#D9E1E8] rounded-xl shadow-xs overflow-hidden transition-all hover:border-[#00386B]/40"
                        >
                          {/* Card Top Banner */}
                          <div className="px-4 py-3 bg-[#F5F7F9] border-b border-[#D9E1E8] flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="w-8 h-8 rounded-lg bg-[#00386B] text-white font-black flex items-center justify-center font-mono text-xs shadow-xs">
                                #{questionNumber}
                              </span>

                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-[#00386B] border border-blue-200">
                                {q.topic || 'Quantitative Aptitude'}
                              </span>

                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border capitalize ${diffBadgeClass}`}>
                                {diffStr}
                              </span>

                              {q.source_type && (
                                <span className="text-[10px] text-[#5F6B76] bg-white px-2 py-0.5 rounded border border-[#D9E1E8]">
                                  {q.source_type === 'AI_GENERATED' ? '✨ Gemini AI' : q.source_type}
                                </span>
                              )}
                            </div>

                            {/* Action Controls */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={actualIndex === 0}
                                onClick={() => handleMoveUp(actualIndex)}
                                className="p-1.5 rounded hover:bg-[#D9E1E8] disabled:opacity-30 text-[#1C1C1C] transition-colors"
                                title="Move Question Up"
                              >
                                <ArrowUp className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                disabled={actualIndex === assignedQuestions.length - 1}
                                onClick={() => handleMoveDown(actualIndex)}
                                className="p-1.5 rounded hover:bg-[#D9E1E8] disabled:opacity-30 text-[#1C1C1C] transition-colors"
                                title="Move Question Down"
                              >
                                <ArrowDown className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditQuestion(q, actualIndex)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-[#00386B] bg-white border border-[#D9E1E8] rounded-md hover:bg-blue-50 transition-colors ml-1"
                                title="Edit question statement, options, or answer key"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveQuestion(actualIndex)}
                                className="p-1.5 rounded hover:bg-red-50 text-[#E31B23] transition-colors ml-1"
                                title="Remove Question from Contest"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Card Content */}
                          <div className="p-4 sm:p-5 space-y-4">
                            {/* Question Statement */}
                            <div className="text-sm sm:text-base font-semibold text-[#1C1C1C] leading-relaxed whitespace-pre-line">
                              {q.question_text || q.text}
                            </div>

                            {/* Options A - D */}
                            <div className="space-y-1.5">
                              <span className="text-[11px] font-bold text-[#5F6B76] uppercase tracking-wider block">
                                Multiple-Choice Options (A–D):
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {options.map((opt) => {
                                  const isCorrect = opt.id === correctOpt;
                                  return (
                                    <div
                                      key={opt.id}
                                      className={`p-3 rounded-lg border text-xs sm:text-sm flex items-start justify-between gap-2.5 transition-all ${
                                        isCorrect
                                          ? 'bg-emerald-50/70 border-emerald-400 font-bold text-[#1C1C1C] ring-1 ring-emerald-300'
                                          : 'bg-white border-[#D9E1E8] text-[#2D3748]'
                                      }`}
                                    >
                                      <div className="flex items-start gap-2.5">
                                        <span className={`w-5 h-5 rounded-md flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5 ${
                                          isCorrect
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-slate-200 text-slate-700'
                                        }`}>
                                          {opt.id}
                                        </span>
                                        <span className="leading-snug break-words">
                                          {opt.text || <em className="text-slate-400 font-normal">Empty option text</em>}
                                        </span>
                                      </div>

                                      {isCorrect && (
                                        <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded shrink-0">
                                          <Check className="w-3 h-3" /> Correct Key
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Official Solution & Explanation */}
                            <div className="mt-2 p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm space-y-1">
                              <div className="flex items-center gap-1.5 font-bold text-[#00386B]">
                                <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                <span>Official Solution & Explanation:</span>
                              </div>
                              {q.explanation ? (
                                <p className="whitespace-pre-line text-[#4A5568] leading-relaxed pt-0.5 pl-5 text-xs sm:text-sm">
                                  {q.explanation}
                                </p>
                              ) : (
                                <p className="text-slate-400 italic pl-5 text-xs">
                                  No explanation provided for this question.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* View 2: Split View for Question Bank & Quick Swap */}
            {reviewTab === 'bank' && (
              <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Assigned Questions (7 cols) */}
                <div className="lg:col-span-7 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[#00386B] uppercase tracking-wider">
                      Contest Roster (Questions 1–20)
                    </h4>
                    <span className="text-xs text-[#5F6B76]">
                      Sequence students will receive
                    </span>
                  </div>

                  {assignedQuestions.length === 0 ? (
                    <div className="p-8 border-2 border-dashed border-[#D9E1E8] rounded-xl text-center text-xs text-[#5F6B76] space-y-2">
                      <HelpCircle className="w-8 h-8 text-[#5F6B76] mx-auto opacity-50" />
                      <p className="font-bold text-[#1C1C1C]">No questions assigned yet.</p>
                      <p>Select questions from the right bank to populate this contest.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {assignedQuestions.map((q, idx) => (
                        <div
                          key={q.id || q.questionId || idx}
                          className="p-3 bg-[#F5F7F9] rounded-lg border border-[#D9E1E8] flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <span className="w-6 h-6 rounded-md bg-[#00386B] text-white font-bold flex items-center justify-center font-mono shrink-0">
                              {idx + 1}
                            </span>
                            <div className="truncate">
                              <span className="font-medium text-[#1C1C1C] block truncate">
                                {q.question_text || q.text}
                              </span>
                              <span className="text-[11px] text-[#5F6B76]">
                                {q.topic} • {q.difficulty} • Correct: <strong className="text-[#449284]">{q.correct_option || q.correctOption}</strong>
                              </span>
                            </div>
                          </div>

                          {/* Order Controls */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveUp(idx)}
                              className="p-1 rounded hover:bg-[#D9E1E8] disabled:opacity-30"
                              title="Move Up"
                            >
                              <ArrowUp className="w-3.5 h-3.5 text-[#1C1C1C]" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === assignedQuestions.length - 1}
                              onClick={() => handleMoveDown(idx)}
                              className="p-1 rounded hover:bg-[#D9E1E8] disabled:opacity-30"
                              title="Move Down"
                            >
                              <ArrowDown className="w-3.5 h-3.5 text-[#1C1C1C]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditQuestion(q, idx)}
                              className="p-1 rounded hover:bg-blue-50 text-[#00386B]"
                              title="Edit Question"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveQuestion(idx)}
                              className="p-1 rounded hover:bg-red-50 text-[#E31B23]"
                              title="Remove Question"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right Column: Question Bank Picker (5 cols) */}
                <div className="lg:col-span-5 space-y-3 bg-[#F5F7F9] p-4 rounded-xl border border-[#D9E1E8]">
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-[#1C1C1C] uppercase tracking-wider">
                      Question Bank Repository
                    </h4>

                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#5F6B76]" />
                        <input
                          type="text"
                          placeholder="Search questions..."
                          value={bankSearch}
                          onChange={(e) => setBankSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#D9E1E8] rounded-lg bg-white"
                        />
                      </div>

                      <select
                        value={bankTopic}
                        onChange={(e) => setBankTopic(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-[#D9E1E8] rounded-lg bg-white"
                      >
                        <option value="All">All Topics</option>
                        <option value="Quantitative Aptitude">Quantitative Aptitude</option>
                        <option value="Logical Reasoning">Logical Reasoning</option>
                        <option value="Verbal Ability">Verbal Ability</option>
                        <option value="Data Interpretation">Data Interpretation</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {filteredBank.map((q) => {
                      const isAlreadyAssigned = assignedQuestions.some(
                        aq => aq.id === q.id || aq.questionId === q.id
                      );

                      return (
                        <div
                          key={q.id}
                          className={`p-2.5 rounded-lg border text-xs space-y-1.5 transition-colors ${
                            isAlreadyAssigned
                              ? 'bg-green-50/60 border-green-200'
                              : 'bg-white border-[#D9E1E8] hover:border-[#00386B]'
                          }`}
                        >
                          <p className="line-clamp-2 text-[#1C1C1C]">
                            {q.question_text || q.text}
                          </p>
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] text-[#5F6B76]">
                              {q.topic} • {q.difficulty}
                            </span>
                            {isAlreadyAssigned ? (
                              <span className="text-[10px] font-bold text-[#449284] flex items-center gap-0.5">
                                <Check className="w-3 h-3" /> Assigned
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={assignedQuestions.length >= 20}
                                onClick={() => handleAddQuestionToContest(q)}
                                className="px-2 py-0.5 text-[10px] font-bold bg-[#00386B] text-white rounded hover:bg-[#005599] disabled:opacity-50"
                              >
                                + Add
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-[#D9E1E8] bg-[#F5F7F9] flex flex-wrap items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-[#5F6B76]">
                {assignedQuestions.length === 20 ? (
                  <strong className="text-[#449284]">✓ Ready for activation (20/20 questions assigned)</strong>
                ) : (
                  <span>Need <strong>{20 - assignedQuestions.length}</strong> more question(s) to reach required 20 count.</span>
                )}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAssigningContest(null)}
                  className="px-4 py-2 border border-[#D9E1E8] rounded-lg text-xs font-bold hover:bg-[#F5F7F9]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSaveAssignments}
                  className="px-5 py-2 bg-[#00386B] hover:bg-[#005599] text-white text-xs font-bold rounded-lg shadow-xs disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Question Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3B: Question Safe Editor during Review */}
      {editingReviewQuestion && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-2xs overflow-y-auto">
          <div className="bg-white rounded-xl max-w-xl w-full shadow-2xl border border-[#D9E1E8] my-6 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-[#D9E1E8] bg-[#F5F7F9] flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-bold text-[#1C1C1C] text-base font-heading">
                  Edit Contest Question #{editingReviewQuestion.orderIndex || ''}
                </h3>
                <span className="text-xs text-[#5F6B76]">
                  Safe correction for draft contest before activation.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingReviewQuestion(null)}
                className="text-[#5F6B76] hover:text-[#1C1C1C] text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuestionEdit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {editFormError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{editFormError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#1C1C1C] mb-1">
                  Question Problem Statement *
                </label>
                <textarea
                  required
                  rows={3}
                  value={editFormText}
                  onChange={(e) => setEditFormText(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#D9E1E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00386B] bg-[#F5F7F9] text-[#1C1C1C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1C1C1C] mb-1">Topic *</label>
                  <select
                    value={editFormTopic}
                    onChange={(e) => setEditFormTopic(e.target.value)}
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
                    value={editFormDifficulty}
                    onChange={(e) => setEditFormDifficulty(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#D9E1E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00386B] bg-[#F5F7F9]"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              {/* Options A - D */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#1C1C1C]">Options (All 4 Required) *</label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: 'A', val: editFormOptA, set: setEditFormOptA },
                    { id: 'B', val: editFormOptB, set: setEditFormOptB },
                    { id: 'C', val: editFormOptC, set: setEditFormOptC },
                    { id: 'D', val: editFormOptD, set: setEditFormOptD },
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

              {/* Correct Answer Key Selector */}
              <div>
                <label className="block text-xs font-bold text-[#1C1C1C] mb-1">
                  Correct Answer Key *
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['A', 'B', 'C', 'D'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setEditFormCorrectOpt(opt)}
                      className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                        editFormCorrectOpt === opt
                          ? 'bg-[#449284] text-white border-[#449284] shadow-xs'
                          : 'bg-[#F5F7F9] text-[#1C1C1C] border-[#D9E1E8] hover:bg-slate-200'
                      }`}
                    >
                      Option {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Explanation */}
              <div>
                <label className="block text-xs font-bold text-[#1C1C1C] mb-1">
                  Official Solution & Explanation *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Step-by-step derivation and reasoning for student review..."
                  value={editFormExplanation}
                  onChange={(e) => setEditFormExplanation(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#D9E1E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00386B] bg-[#F5F7F9]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#D9E1E8]">
                <button
                  type="button"
                  onClick={() => setEditingReviewQuestion(null)}
                  className="px-4 py-2 border border-[#D9E1E8] rounded-lg text-xs font-bold hover:bg-[#F5F7F9]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editFormSaving}
                  className="px-5 py-2 bg-[#00386B] hover:bg-[#005599] text-white text-xs font-bold rounded-lg shadow-xs disabled:opacity-50"
                >
                  {editFormSaving ? 'Saving...' : 'Save Question Correction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal 4: AI Contest Generator */}
      {showAiModal && (
        <GeminiContestGenerator
          isOpen={showAiModal}
          onClose={() => setShowAiModal(false)}
          onContestGenerated={handleAiContestGenerated}
        />
      )}
    </div>
  );
}
