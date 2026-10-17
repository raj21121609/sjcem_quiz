import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { contestService } from '../services/contestService';
import {
  createAttempt,
  checkExistingAttempt,
  getLocalAttempt,
  clearLocalAttempt,
  saveCompletedResultLocally,
  getCompletedResultLocally
} from '../services/attemptService';
import { getParticipantId } from '../lib/participantId';

const QuizContext = createContext(null);

export const QUESTION_TIME_LIMIT_SECONDS = 30;
export const TOTAL_QUESTIONS_COUNT = 20;

export function QuizProvider({ children }) {
  // Student identification & Anonymous Participant ID
  const [participantId] = useState(() => getParticipantId());
  const [studentName, setStudentName] = useState('');
  const [studentBranch, setStudentBranch] = useState('Computer Engineering');

  // Contest & Attempt session
  const [contest, setContest] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  const [existingAttemptStatus, setExistingAttemptStatus] = useState(null); // null | 'in_progress' | 'submitted'

  // Questions batch (strictly 20 questions)
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Question lifecycles: 'UNSEEN' | 'ACTIVE' | 'ANSWERED' | 'TIMED_OUT'
  const [questionStatuses, setQuestionStatuses] = useState(
    Array(TOTAL_QUESTIONS_COUNT).fill('UNSEEN')
  );

  // Student Responses: { [questionId]: 'A' | 'B' | 'C' | 'D' }
  const [answers, setAnswers] = useState({});

  // Timestamps for accurate deadline calculations (prevents timer drift)
  const [questionStartedAt, setQuestionStartedAt] = useState(null);
  const [questionDeadline, setQuestionDeadline] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(QUESTION_TIME_LIMIT_SECONDS);

  // Question lock & "Time's up" states
  const [isQuestionLocked, setIsQuestionLocked] = useState(false);
  const [isTimesUpBrief, setIsTimesUpBrief] = useState(false);

  // Page Visibility API tracking
  const [tabSwitchCount, setTabSwitchCount] = useState(0);

  // Active status & submission
  const [isQuizActive, setIsQuizActive] = useState(false);
  const [totalQuizStartTime, setTotalQuizStartTime] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [quizError, setQuizError] = useState(null);

  // Mutable refs to prevent stale closures in timers and asynchronous callbacks
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const currentIndexRef = useRef(currentQuestionIndex);
  currentIndexRef.current = currentQuestionIndex;

  const deadlineRef = useRef(questionDeadline);
  deadlineRef.current = questionDeadline;

  const isLockedRef = useRef(isQuestionLocked);
  isLockedRef.current = isQuestionLocked;

  const isQuizActiveRef = useRef(isQuizActive);
  isQuizActiveRef.current = isQuizActive;

  const questionsRef = useRef(questions);
  questionsRef.current = questions;

  const contestRef = useRef(contest);
  contestRef.current = contest;

  const attemptIdRef = useRef(attemptId);
  attemptIdRef.current = attemptId;

  const tabSwitchCountRef = useRef(tabSwitchCount);
  tabSwitchCountRef.current = tabSwitchCount;

  // Load active contest on mount and check participant attempt status
  useEffect(() => {
    let isMounted = true;

    async function initializeContest() {
      try {
        const activeContest = await contestService.getActiveContest();
        if (!isMounted) return;

        setContest(activeContest);

        if (activeContest) {
          // Check if this participant already has an attempt
          const check = await checkExistingAttempt(activeContest.id, participantId);
          if (!isMounted) return;

          if (check.hasAttempt) {
            setExistingAttemptStatus(check.status);
            if (check.status === 'submitted' && check.localResult) {
              setSubmissionResult(check.localResult);
            }
          }
        }
      } catch (err) {
        console.error('[QuizContext] Error initializing contest:', err);
      }
    }

    initializeContest();
    return () => { isMounted = false; };
  }, [participantId]);

  // Finalize all answers in one batch submission to the Supabase Edge Function
  const finalizeQuizSubmission = useCallback(async (finalAnswers) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setIsQuizActive(false);

    const activeContestId = contestRef.current?.id;
    const currentAttempt = attemptIdRef.current;
    const currentTabs = tabSwitchCountRef.current;

    try {
      const result = await contestService.submitContestAnswers({
        attemptId: currentAttempt,
        contestId: activeContestId,
        participantId: participantId,
        answers: finalAnswers || answersRef.current,
        tabSwitchCount: currentTabs
      });

      setSubmissionResult(result);
      setExistingAttemptStatus('submitted');

      // Clear in-progress session and cache completed result locally
      clearLocalAttempt();
      if (activeContestId) {
        saveCompletedResultLocally(activeContestId, result);
      }

      return result;
    } catch (err) {
      console.error('[QuizContext] Submission error:', err);
      let userMsg = 'Unable to complete submission. Please check your internet connection.';
      if (err.message === 'ALREADY_SUBMITTED') {
        userMsg = 'This attempt has already been submitted and scored.';
      } else if (err.message) {
        userMsg = err.message;
      }
      setQuizError(userMsg);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [participantId, isSubmitting]);

  // Advance helper to move to next question or finalize submission
  const advanceToNext = useCallback((nextIndex, updatedAnswers) => {
    if (nextIndex >= TOTAL_QUESTIONS_COUNT) {
      // Completed all 20 questions -> submit once
      finalizeQuizSubmission(updatedAnswers || answersRef.current);
      return;
    }

    const now = Date.now();
    const nextDeadline = now + QUESTION_TIME_LIMIT_SECONDS * 1000;

    setCurrentQuestionIndex(nextIndex);
    setQuestionStartedAt(now);
    setQuestionDeadline(nextDeadline);
    deadlineRef.current = nextDeadline;
    setRemainingSeconds(QUESTION_TIME_LIMIT_SECONDS);

    setQuestionStatuses((prev) => {
      const next = [...prev];
      next[nextIndex] = 'ACTIVE';
      return next;
    });

    setIsQuestionLocked(false);
    setIsTimesUpBrief(false);
  }, [finalizeQuizSubmission]);

  // Handle timeout for current question (30 seconds elapsed)
  const handleQuestionTimeout = useCallback(() => {
    if (isLockedRef.current || !isQuizActiveRef.current) return;

    const currIdx = currentIndexRef.current;
    const currentQ = questionsRef.current[currIdx];
    if (!currentQ) return;

    setIsQuestionLocked(true);
    setIsTimesUpBrief(true);

    // Mark as TIMED_OUT (no answer recorded, score will treat as unanswered)
    setQuestionStatuses((prev) => {
      const next = [...prev];
      next[currIdx] = 'TIMED_OUT';
      return next;
    });

    // Briefly display "Time's up" for 500ms, then advance automatically
    setTimeout(() => {
      advanceToNext(currIdx + 1, answersRef.current);
    }, 500);
  }, [advanceToNext]);

  // Timer loop based on absolute timestamp deadline (prevents drift)
  useEffect(() => {
    if (!isQuizActive || !questionDeadline || isQuestionLocked) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((deadlineRef.current - now) / 1000));
      setRemainingSeconds(remaining);

      if (now >= deadlineRef.current) {
        clearInterval(interval);
        handleQuestionTimeout();
      }
    }, 150);

    return () => clearInterval(interval);
  }, [isQuizActive, questionDeadline, isQuestionLocked, handleQuestionTimeout]);

  // Page Visibility API handler (timer does NOT pause when hidden!)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!isQuizActiveRef.current) return;

      if (document.hidden) {
        setTabSwitchCount((prev) => {
          const updated = prev + 1;
          tabSwitchCountRef.current = updated;
          return updated;
        });
      } else {
        // Returned to tab: immediately calculate based on absolute deadline
        const now = Date.now();
        if (deadlineRef.current && now >= deadlineRef.current) {
          handleQuestionTimeout();
        } else if (deadlineRef.current) {
          setRemainingSeconds(Math.max(0, Math.ceil((deadlineRef.current - now) / 1000)));
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [handleQuestionTimeout]);

  // Start Challenge Action: creates 1 in_progress attempt and loads 20 safe questions
  const startQuiz = useCallback(async (name, branch) => {
    setIsLoading(true);
    setQuizError(null);

    const trimmedName = (name || '').trim();
    if (!trimmedName) {
      setQuizError('Please enter your full student name.');
      setIsLoading(false);
      return false;
    }

    if (trimmedName.length > 60) {
      setQuizError('Name cannot exceed 60 characters.');
      setIsLoading(false);
      return false;
    }

    try {
      // 1. Ensure active contest is loaded
      let activeContest = contestRef.current;
      if (!activeContest) {
        activeContest = await contestService.getActiveContest();
        setContest(activeContest);
      }

      if (!activeContest) {
        setQuizError('Weekly quiz is currently unavailable.');
        setIsLoading(false);
        return false;
      }

      // 2. Check existing attempt for duplicate prevention
      const check = await checkExistingAttempt(activeContest.id, participantId);
      if (check.hasAttempt) {
        if (check.status === 'submitted') {
          setExistingAttemptStatus('submitted');
          setQuizError("You have already attempted this week's quiz.");
          setIsLoading(false);
          return false;
        }

        // If in_progress attempt exists, reuse it safely instead of creating a second attempt
        if (check.status === 'in_progress' && check.attempt?.id) {
          setAttemptId(check.attempt.id);
          attemptIdRef.current = check.attempt.id;
        }
      }

      // 3. Create ONE attempt if none exists yet
      let currentAttId = attemptIdRef.current;
      if (!currentAttId) {
        try {
          const newAttempt = await createAttempt({
            contestId: activeContest.id,
            participantId,
            studentName: trimmedName
          });
          currentAttId = newAttempt.id;
          setAttemptId(currentAttId);
          attemptIdRef.current = currentAttId;
        } catch (attemptErr) {
          if (attemptErr.message === 'ALREADY_ATTEMPTED') {
            setExistingAttemptStatus('submitted');
            setQuizError("You have already attempted this week's quiz.");
            setIsLoading(false);
            return false;
          }
          throw attemptErr;
        }
      }

      // 4. Retrieve exactly 20 student-safe questions
      const questionBatch = await contestService.getContestQuestions(activeContest.id);

      if (!questionBatch || questionBatch.length !== 20) {
        setQuizError(
          `Configuration error: Contest must contain exactly 20 questions (found ${questionBatch ? questionBatch.length : 0}).`
        );
        setIsLoading(false);
        return false;
      }

      setQuestions(questionBatch);
      questionsRef.current = questionBatch;
      setStudentName(trimmedName);
      if (branch) setStudentBranch(branch);

      // Reset state for new speed contest session
      setAnswers({});
      answersRef.current = {};

      const initialStatuses = Array(TOTAL_QUESTIONS_COUNT).fill('UNSEEN');
      initialStatuses[0] = 'ACTIVE';
      setQuestionStatuses(initialStatuses);

      setCurrentQuestionIndex(0);
      setTabSwitchCount(0);
      tabSwitchCountRef.current = 0;
      setIsQuestionLocked(false);
      setIsTimesUpBrief(false);
      setSubmissionResult(null);

      const now = Date.now();
      const firstDeadline = now + QUESTION_TIME_LIMIT_SECONDS * 1000;
      setQuestionStartedAt(now);
      setQuestionDeadline(firstDeadline);
      deadlineRef.current = firstDeadline;
      setRemainingSeconds(QUESTION_TIME_LIMIT_SECONDS);

      setTotalQuizStartTime(now);
      setIsQuizActive(true);
      return true;
    } catch (err) {
      console.error('[QuizContext] Failed to start quiz:', err);
      let message = 'Failed to start quiz session. Please try again.';
      if (err.message === 'QUESTIONS_UNAVAILABLE' || err.message === 'NO_QUESTIONS_FOUND') {
        message = 'Contest questions are currently unavailable. Please contact the administrator.';
      } else if (err.message?.startsWith('CONTEST_CONFIG_ERROR')) {
        message = err.message;
      } else if (err.message === 'NETWORK_CONNECTION_ERROR') {
        message = 'Unable to connect to the quiz server. Please check your internet connection.';
      }
      setQuizError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [participantId]);

  // Option selection: records answer, locks question, and immediately advances
  const selectOptionAndAdvance = useCallback((questionId, optionId) => {
    if (isLockedRef.current || !isQuizActiveRef.current) return;

    const currIdx = currentIndexRef.current;
    setIsQuestionLocked(true);

    const updatedAnswers = {
      ...answersRef.current,
      [questionId]: optionId
    };
    setAnswers(updatedAnswers);
    answersRef.current = updatedAnswers;

    setQuestionStatuses((prev) => {
      const next = [...prev];
      next[currIdx] = 'ANSWERED';
      return next;
    });

    // Provide a brief 200ms visual confirmation of selection before auto-advancing
    setTimeout(() => {
      advanceToNext(currIdx + 1, updatedAnswers);
    }, 200);
  }, [advanceToNext]);

  // Statistics
  const answeredCount = Object.keys(answers).length;
  const timedOutCount = questionStatuses.filter((s) => s === 'TIMED_OUT').length;
  const currentQuestion = questions[currentQuestionIndex] || null;

  const value = {
    participantId,
    studentName,
    studentBranch,
    setStudentName,
    setStudentBranch,
    contest,
    attemptId,
    existingAttemptStatus,
    questions,
    currentQuestionIndex,
    currentQuestion,
    questionStatuses,
    answers,
    remainingSeconds,
    isQuestionLocked,
    isTimesUpBrief,
    tabSwitchCount,
    isQuizActive,
    isLoading,
    isSubmitting,
    submissionResult,
    quizError,
    setQuizError,
    answeredCount,
    timedOutCount,
    // Actions
    startQuiz,
    selectOptionAndAdvance,
    finalizeQuizSubmission
  };

  return <QuizContext.Provider value={value}>{children}</QuizContext.Provider>;
}

export function useQuiz() {
  const context = useContext(QuizContext);
  if (!context) {
    throw new Error('useQuiz must be used within a QuizProvider');
  }
  return context;
}
