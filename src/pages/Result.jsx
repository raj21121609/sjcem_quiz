import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuiz } from '../context/QuizContext';
import { CheckCircle2, Clock, Trophy, Printer, Check, X, ShieldCheck, ArrowRight, Award } from 'lucide-react';
import { MOCK_QUESTIONS_DATABASE } from '../data/mockQuestions';
import { getCompletedResultLocally } from '../services/attemptService';

export default function Result() {
  const { submissionResult, contest } = useQuiz();
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'correct' | 'incorrect' | 'unattempted'

  // Retrieve cached local submission if context state was lost on page reload
  const cachedResult = contest?.id ? getCompletedResultLocally(contest.id) : null;

  // Default fallback mock matching the prompt example if visited directly:
  // Score: 17/20, Correct: 17, Incorrect: 2, Unanswered: 1
  const mockFallbackResult = {
    contestTitle: 'Weekly Placement Aptitude Challenge #14',
    studentName: 'Siddharth Patil',
    studentBranch: 'Computer Engineering',
    score: 17,
    total: 20,
    totalQuestions: 20,
    correctCount: 17,
    correct: 17,
    incorrectCount: 2,
    incorrect: 2,
    unattemptedCount: 1,
    unanswered: 1,
    accuracy: 89,
    rank: 14,
    totalParticipants: 143,
    percentile: 90,
    timeFormatted: '8m 42s',
    detailedReview: MOCK_QUESTIONS_DATABASE.slice(0, 20).map((q, idx) => {
      const isUnanswered = idx === 19;
      const isIncorrect = idx === 4 || idx === 9;
      const studentSelection = isUnanswered ? null : isIncorrect ? (q.correctOption === 'A' ? 'B' : 'A') : q.correctOption;

      return {
        id: q.id,
        questionId: q.id,
        questionNumber: idx + 1,
        questionOrder: idx + 1,
        topic: q.topic,
        subtopic: q.subtopic,
        difficulty: q.difficulty,
        text: q.text,
        questionText: q.text,
        options: q.options,
        studentSelection,
        selectedAnswer: studentSelection,
        correctOption: q.correctOption,
        correctAnswer: q.correctOption,
        isCorrect: !isUnanswered && !isIncorrect,
        isAttempted: !isUnanswered,
        explanation: q.explanation
      };
    })
  };

  const result = submissionResult || cachedResult || mockFallbackResult;

  const reviewList = (result.detailedReview || result.review || []).map((item, idx) => {
    const studentSel = item.studentSelection !== undefined ? item.studentSelection : item.selectedAnswer;
    const correctOpt = item.correctOption !== undefined ? item.correctOption : item.correctAnswer;
    const isAtt = item.isAttempted !== undefined ? item.isAttempted : Boolean(studentSel);
    const isCorr = item.isCorrect !== undefined ? item.isCorrect : (isAtt && studentSel === correctOpt);

    return {
      ...item,
      id: item.questionId || item.id || `q-${idx + 1}`,
      questionNumber: item.questionNumber || item.questionOrder || (idx + 1),
      text: item.questionText || item.text || item.question || '',
      studentSelection: studentSel,
      correctOption: correctOpt,
      isAttempted: isAtt,
      isCorrect: isCorr,
      options: item.options || [],
      explanation: item.explanation || 'No explanation provided.'
    };
  });

  const totalQuestions = result.total || result.totalQuestions || 20;
  const scoreVal = result.score !== undefined ? result.score : (result.correct || result.correctCount || 0);
  const correctCount = result.correct !== undefined ? result.correct : (result.correctCount || 0);
  const incorrectCount = result.incorrect !== undefined ? result.incorrect : (result.incorrectCount || 0);
  const unattemptedCount = result.unanswered !== undefined ? result.unanswered : (result.unattemptedCount || 0);
  const accuracyVal = result.accuracy !== undefined ? result.accuracy : (correctCount + incorrectCount > 0 ? Math.round((correctCount / (correctCount + incorrectCount)) * 100) : 0);

  // Filter review questions
  const filteredReview = reviewList.filter((item) => {
    if (filterMode === 'correct') return item.isCorrect;
    if (filterMode === 'incorrect') return item.isAttempted && !item.isCorrect;
    if (filterMode === 'unattempted') return !item.isAttempted;
    return true;
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#F5F7F9] py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Top Result Banner with SJCEM Navy */}
        <div className="bg-white rounded-xl border border-[#D9E1E8] shadow-xs overflow-hidden">
          <div className="bg-[#00386B] p-6 sm:p-8 text-white border-b-4 border-[#005599]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#449284] text-white mb-2">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Submission Received & Evaluated
                </span>
                <h1 className="text-2xl sm:text-3xl font-black font-heading text-white">
                  Contest Performance Report
                </h1>
                <p className="text-xs sm:text-sm text-white/80 mt-1">
                  {result.contestTitle || 'Weekly Placement Aptitude Challenge'} • Candidate: <strong>{result.studentName || 'Student'}</strong> {result.studentBranch ? `(${result.studentBranch})` : ''}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-start sm:self-auto no-print">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors border border-white/20"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Scorecard</span>
                </button>
                <Link
                  to="/leaderboard"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#449284] hover:bg-[#3b7e72] text-white text-xs font-bold transition-colors shadow-2xs"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>View Leaderboard</span>
                </Link>
              </div>
            </div>
          </div>

          {/* 4 Primary Highlight Metrics requested */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#D9E1E8] bg-white">
            {/* Score */}
            <div className="p-6 text-center space-y-1">
              <span className="text-xs font-bold text-[#5F6B76] uppercase tracking-wider block">
                Score
              </span>
              <div className="text-3xl sm:text-4xl font-black text-[#00386B] font-heading">
                {scoreVal} <span className="text-lg font-bold text-[#5F6B76]">/ {totalQuestions}</span>
              </div>
              <span className="text-xs font-bold text-[#449284]">
                {accuracyVal}% Accuracy
              </span>
            </div>

            {/* Correct Answers */}
            <div className="p-6 text-center space-y-1">
              <span className="text-xs font-bold text-[#5F6B76] uppercase tracking-wider block">
                Correct
              </span>
              <div className="text-3xl sm:text-4xl font-black text-[#449284] font-heading">
                {correctCount}
              </div>
              <span className="text-xs text-[#5F6B76]">
                {correctCount} Correct
              </span>
            </div>

            {/* Incorrect Answers */}
            <div className="p-6 text-center space-y-1">
              <span className="text-xs font-bold text-[#5F6B76] uppercase tracking-wider block">
                Incorrect
              </span>
              <div className="text-3xl sm:text-4xl font-black text-[#E31B23] font-heading">
                {incorrectCount}
              </div>
              <span className="text-xs text-[#5F6B76]">
                {incorrectCount} Incorrect
              </span>
            </div>

            {/* Unanswered / Timed Out */}
            <div className="p-6 text-center space-y-1">
              <span className="text-xs font-bold text-[#5F6B76] uppercase tracking-wider block">
                Unanswered
              </span>
              <div className="text-3xl sm:text-4xl font-black text-[#5F6B76] font-heading">
                {unattemptedCount}
              </div>
              <span className="text-xs text-[#5F6B76]">
                {unattemptedCount} Unanswered
              </span>
            </div>
          </div>

          {/* Time & Benchmark Summary */}
          <div className="px-6 py-4 bg-[#F5F7F9] border-t border-[#D9E1E8] flex flex-wrap items-center justify-between text-xs text-[#5F6B76] gap-3">
            <div className="flex items-center gap-4">
              <span className="font-bold text-[#1C1C1C]">
                Result: <strong className="text-[#00386B] text-sm">{scoreVal} / {totalQuestions}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#5F6B76]" />
                Time: <strong className="font-mono text-[#1C1C1C]">{result.timeFormatted || (result.timeTakenSeconds ? `${Math.floor(result.timeTakenSeconds / 60)}m ${result.timeTakenSeconds % 60}s` : '5m 00s')}</strong>
              </span>
            </div>

            <div>
              <span>Placement Benchmark: </span>
              {scoreVal >= 12 ? (
                <strong className="text-[#449284] font-bold">✓ Cleared Campus Cut-off (&ge; 12)</strong>
              ) : (
                <strong className="text-[#E31B23] font-bold">⚠️ Below Target Cut-off (&lt; 12)</strong>
              )}
            </div>
          </div>
        </div>

        {/* Question-by-Question Solution & Review Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#1C1C1C] font-heading">
                Review Your Answers
              </h2>
              <p className="text-xs text-[#5F6B76]">
                Verified solutions and step-by-step explanations for all 20 questions are revealed immediately after submission.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-[#D9E1E8] text-xs no-print">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1 rounded font-bold transition-colors ${
                  filterMode === 'all'
                    ? 'bg-[#00386B] text-white'
                    : 'text-[#5F6B76] hover:text-[#1C1C1C]'
                }`}
              >
                All ({reviewList.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('correct')}
                className={`px-3 py-1 rounded font-bold transition-colors ${
                  filterMode === 'correct'
                    ? 'bg-[#449284] text-white'
                    : 'text-[#5F6B76] hover:text-[#1C1C1C]'
                }`}
              >
                Correct ({correctCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('incorrect')}
                className={`px-3 py-1 rounded font-bold transition-colors ${
                  filterMode === 'incorrect'
                    ? 'bg-[#E31B23] text-white'
                    : 'text-[#5F6B76] hover:text-[#1C1C1C]'
                }`}
              >
                Incorrect ({incorrectCount})
              </button>
              {unattemptedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterMode('unattempted')}
                  className={`px-3 py-1 rounded font-bold transition-colors ${
                    filterMode === 'unattempted'
                      ? 'bg-[#5F6B76] text-white'
                      : 'text-[#5F6B76] hover:text-[#1C1C1C]'
                  }`}
                >
                  Unanswered ({unattemptedCount})
                </button>
              )}
            </div>
          </div>

          {/* List of Question Review Cards */}
          <div className="space-y-4">
            {filteredReview.map((item) => {
              const studentOptObj = item.options.find(o => o.id === item.studentSelection);
              const correctOptObj = item.options.find(o => o.id === item.correctOption);

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-xl border shadow-xs overflow-hidden ${
                    !item.isAttempted
                      ? 'border-[#D9E1E8]'
                      : item.isCorrect
                      ? 'border-[#449284]'
                      : 'border-[#E31B23]/40'
                  }`}
                >
                  {/* Card Header */}
                  <div
                    className={`px-5 py-3 border-b flex flex-wrap items-center justify-between gap-2 text-xs ${
                      !item.isAttempted
                        ? 'bg-[#F5F7F9] border-[#D9E1E8]'
                        : item.isCorrect
                        ? 'bg-[#449284]/10 border-[#449284]/20'
                        : 'bg-red-50/70 border-red-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#1C1C1C]">
                        Question {item.questionNumber}
                      </span>
                      <span className="text-[#D9E1E8]">•</span>
                      <span className="text-[#5F6B76] font-medium">
                        {item.topic} {item.subtopic ? `(${item.subtopic})` : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-white border border-[#D9E1E8] text-[#5F6B76]">
                        {item.difficulty || 'Medium'}
                      </span>

                      {item.isCorrect ? (
                        <span className="inline-flex items-center gap-1 font-bold text-[#449284] bg-white px-2 py-0.5 rounded border border-[#449284]/30">
                          <Check className="w-3.5 h-3.5" /> ✓ Correct (+1.0)
                        </span>
                      ) : item.isAttempted ? (
                        <span className="inline-flex items-center gap-1 font-bold text-[#E31B23] bg-white px-2 py-0.5 rounded border border-red-200">
                          <X className="w-3.5 h-3.5" /> ✗ Incorrect (0.0)
                        </span>
                      ) : (
                        <span className="font-bold text-[#5F6B76] bg-white px-2 py-0.5 rounded border border-[#D9E1E8]">
                          Not answered (0.0)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 sm:p-6 space-y-4">
                    <p className="text-sm sm:text-base font-medium text-[#1C1C1C] whitespace-pre-line leading-relaxed">
                      {item.text}
                    </p>

                    {/* Options list */}
                    {item.options && item.options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {item.options.map((opt) => {
                          const isStudentChoice = opt.id === item.studentSelection;
                          const isRightChoice = opt.id === item.correctOption;

                          let cardStyle = 'border-[#D9E1E8] bg-[#F5F7F9] text-[#1C1C1C]';
                          if (isRightChoice) {
                            cardStyle = 'border-[#449284] bg-[#449284]/10 text-[#1C1C1C] font-semibold ring-1 ring-[#449284]';
                          } else if (isStudentChoice && !item.isCorrect) {
                            cardStyle = 'border-[#E31B23] bg-red-50 text-[#1C1C1C] ring-1 ring-[#E31B23]';
                          }

                          return (
                            <div
                              key={opt.id}
                              className={`p-3 rounded-lg border text-xs sm:text-sm flex items-center justify-between ${cardStyle}`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-bold">{opt.id}.</span>
                                <span>{opt.text}</span>
                              </div>

                              <div className="text-right">
                                {isRightChoice && (
                                  <span className="text-[11px] font-bold text-[#449284] uppercase">
                                    ✓ Correct
                                  </span>
                                )}
                                {isStudentChoice && !isRightChoice && (
                                  <span className="text-[11px] font-bold text-[#E31B23] uppercase">
                                    ✗ Your Choice
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Summary row */}
                    <div className="pt-2 text-xs flex flex-wrap items-center gap-6 text-[#5F6B76] border-t border-[#D9E1E8]">
                      <div>
                        Your answer:{' '}
                        <strong className={!item.isAttempted ? 'text-[#5F6B76]' : item.isCorrect ? 'text-[#449284]' : 'text-[#E31B23]'}>
                          {item.studentSelection ? `${item.studentSelection}. ${studentOptObj?.text || item.studentSelection}` : 'Not answered'}
                        </strong>
                      </div>
                      <div>
                        Correct answer:{' '}
                        <strong className="text-[#449284]">
                          {item.correctOption}. {correctOptObj?.text || item.correctOption}
                        </strong>
                      </div>
                    </div>

                    {/* Explanation */}
                    <div className="p-4 rounded-lg bg-[#F5F7F9] border border-[#D9E1E8] text-xs sm:text-sm text-[#1C1C1C] space-y-1">
                      <span className="font-bold text-[#00386B] block text-xs uppercase tracking-wider">
                        Explanation:
                      </span>
                      <p className="whitespace-pre-line leading-relaxed text-[#5F6B76]">
                        {item.explanation}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="p-6 bg-white rounded-xl border border-[#D9E1E8] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 no-print">
          <div>
            <h4 className="text-sm font-bold text-[#1C1C1C] font-heading">
              Ready to check your campus standing?
            </h4>
            <p className="text-xs text-[#5F6B76]">
              View the updated weekly rank roster and season statistics.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="px-4 py-2 rounded-lg border border-[#D9E1E8] text-[#1C1C1C] hover:bg-[#F5F7F9] text-xs font-bold"
            >
              Back to Home
            </Link>
            <Link
              to="/leaderboard"
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#00386B] hover:bg-[#005599] text-white text-xs font-bold shadow-xs"
            >
              <span>Weekly Leaderboard</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
