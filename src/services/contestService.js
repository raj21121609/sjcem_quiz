import { supabase } from '../supabase/client';
import { MOCK_CURRENT_CONTEST, MOCK_QUESTIONS_DATABASE } from '../data/mockQuestions';
import { MOCK_CONTESTS_LIST } from '../data/mockContests';

/**
 * Contest Service
 * ===============
 * Handles student contest queries and authoritative administrator contest management
 * (creation, assignment of strictly 20 questions, reordering, activation, closing).
 */

export const contestService = {
  // ==========================================
  // STUDENT FLOW METHODS (Preserved 100%)
  // ==========================================

  /**
   * Fetches the single active weekly contest from Supabase.
   * Supabase schema enforces AT MOST ONE active contest via partial index.
   * Returns null if no contest is active.
   */
  async getActiveContest() {
    try {
      const { data, error } = await supabase
        .from('contests')
        .select('id, title, description, week_start, week_end, status, question_count, time_per_question_seconds')
        .eq('status', 'active')
        .maybeSingle();

      if (error) {
        console.warn('[contestService] Error fetching active contest from Supabase:', error.message);
        if (isLocalSandboxEnabled()) {
          return { ...MOCK_CURRENT_CONTEST, isSandbox: true };
        }
        return null;
      }

      if (!data) {
        if (isLocalSandboxEnabled()) {
          return { ...MOCK_CURRENT_CONTEST, isSandbox: true };
        }
        return null;
      }

      return {
        id: data.id,
        title: data.title,
        description: data.description,
        startDate: data.week_start,
        endDate: data.week_end,
        totalQuestions: data.question_count || 20,
        secondsPerQuestion: data.time_per_question_seconds || 30,
        status: data.status,
        isSandbox: false
      };
    } catch (err) {
      console.warn('[contestService] Network exception while fetching active contest:', err.message);
      if (isLocalSandboxEnabled()) {
        return { ...MOCK_CURRENT_CONTEST, isSandbox: true };
      }
      return null;
    }
  },

  /**
   * Fetches exactly 20 student-safe questions for the active contest.
   * Uses the secure 'student_contest_questions' VIEW created in Stage 2.
   * STRICT SECURITY: Never delivers correct_option or explanation.
   */
  async getContestQuestions(contestId) {
    if (!contestId) throw new Error('MISSING_CONTEST_ID');

    if (isLocalSandboxEnabled() && contestId === MOCK_CURRENT_CONTEST.id) {
      return getSandboxQuestions();
    }

    try {
      const { data, error } = await supabase
        .from('student_contest_questions')
        .select('question_id, question_order, question_text, option_a, option_b, option_c, option_d, topic, difficulty')
        .eq('contest_id', contestId)
        .order('question_order', { ascending: true });

      if (error) {
        console.error('[contestService] Error fetching questions view:', error);
        if (isLocalSandboxEnabled()) {
          return getSandboxQuestions();
        }
        throw new Error('QUESTIONS_UNAVAILABLE');
      }

      if (!data || data.length === 0) {
        if (isLocalSandboxEnabled()) {
          return getSandboxQuestions();
        }
        throw new Error('NO_QUESTIONS_FOUND');
      }

      // STRICT VALIDATION: Exactly 20 questions
      if (data.length !== 20) {
        console.error(`[contestService] Invalid question count: expected 20, got ${data.length}`);
        throw new Error(`CONTEST_CONFIG_ERROR: Contest must contain exactly 20 questions (found ${data.length}).`);
      }

      return data.map((row) => ({
        id: row.question_id,
        questionNumber: row.question_order,
        question_order: row.question_order,
        topic: row.topic || 'General Aptitude',
        difficulty: row.difficulty || 'Medium',
        text: row.question_text,
        options: [
          { id: 'A', text: row.option_a },
          { id: 'B', text: row.option_b },
          { id: 'C', text: row.option_c },
          { id: 'D', text: row.option_d }
        ]
      }));
    } catch (err) {
      if (isLocalSandboxEnabled()) {
        return getSandboxQuestions();
      }
      throw err;
    }
  },

  /**
   * Submits all 20 answers in ONE single batch to the trusted Supabase Edge Function.
   */
  async submitContestAnswers({ attemptId, contestId, participantId, answers, tabSwitchCount = 0 }) {
    if (!attemptId) throw new Error('MISSING_ATTEMPT_ID');
    if (!contestId) throw new Error('MISSING_CONTEST_ID');
    if (!participantId) throw new Error('MISSING_PARTICIPANT_ID');

    // 1. Invoke Supabase Edge Function 'submit-attempt'
    try {
      const { data, error } = await supabase.functions.invoke('submit-attempt', {
        body: {
          attemptId,
          contestId,
          participantId,
          answers: answers || {},
          tabSwitchCount: Number(tabSwitchCount) || 0
        }
      });

      if (!error && data && data.success) {
        return data;
      }

      if (data && data.alreadySubmitted) {
        throw new Error('ALREADY_SUBMITTED');
      }

      if (error && error.context) {
        const errorBody = await error.context.json().catch(() => null);
        if (errorBody && errorBody.alreadySubmitted) {
          throw new Error('ALREADY_SUBMITTED');
        }
        if (errorBody && errorBody.error) {
          throw new Error(errorBody.error);
        }
      }
    } catch (edgeFnError) {
      if (edgeFnError.message === 'ALREADY_SUBMITTED') {
        throw edgeFnError;
      }
      console.warn('[contestService] Edge Function invoke failed, trying database RPC fallback:', edgeFnError.message);
    }

    // 2. Database RPC Fallback: 'submit_quiz_attempt'
    try {
      const { data: rpcResult, error: rpcError } = await supabase.rpc('submit_quiz_attempt', {
        p_attempt_id: attemptId,
        p_contest_id: contestId,
        p_participant_id: participantId,
        p_answers: answers || {},
        p_tab_switch_count: Number(tabSwitchCount) || 0
      });

      if (!rpcError && rpcResult) {
        if (rpcResult.alreadySubmitted) {
          throw new Error('ALREADY_SUBMITTED');
        }
        if (rpcResult.success) {
          return rpcResult;
        }
        if (rpcResult.error) {
          throw new Error(rpcResult.error);
        }
      }
    } catch (rpcErr) {
      if (rpcErr.message === 'ALREADY_SUBMITTED') {
        throw rpcErr;
      }
      console.warn('[contestService] Database RPC fallback error:', rpcErr.message);
    }

    // 3. Local Sandbox simulation (if offline testing mode enabled)
    if (isLocalSandboxEnabled()) {
      return simulateSandboxEvaluation({ contestId, answers, tabSwitchCount });
    }

    throw new Error('SUBMISSION_FAILED');
  },

  // ==========================================
  // ADMIN CONTEST MANAGEMENT METHODS
  // ==========================================

  /**
   * Retrieves all contests (Draft, Active, Closed) with metadata.
   */
  async getAllContests() {
    try {
      const { data, error } = await supabase
        .from('contests')
        .select(`
          id,
          title,
          description,
          week_start,
          week_end,
          status,
          question_count,
          time_per_question_seconds,
          created_at
        `)
        .order('week_start', { ascending: false });

      if (error) {
        console.warn('[contestService] getAllContests error:', error.message);
        if (isLocalSandboxEnabled()) return [...MOCK_CONTESTS_LIST];
        throw error;
      }

      // Fetch assigned question counts for each contest
      const contestsWithCounts = await Promise.all(
        (data || []).map(async (c) => {
          const { count: assignedCount } = await supabase
            .from('contest_questions')
            .select('*', { count: 'exact', head: true })
            .eq('contest_id', c.id);

          const { count: participantsCount } = await supabase
            .from('attempts')
            .select('*', { count: 'exact', head: true })
            .eq('contest_id', c.id);

          return {
            ...c,
            assignedCount: assignedCount || 0,
            participantsCount: participantsCount || 0
          };
        })
      );

      return contestsWithCounts;
    } catch (err) {
      if (isLocalSandboxEnabled()) return [...MOCK_CONTESTS_LIST];
      throw err;
    }
  },

  /**
   * Creates a new draft contest.
   * Lifecycle starts as 'draft'. Must have exactly 20 questions before activation.
   */
  async createDraftContest({ title, description, week_start, week_end }) {
    const trimmedTitle = (title || '').trim();
    if (!trimmedTitle) {
      throw new Error('Contest title is required.');
    }

    if (!week_start || !week_end) {
      throw new Error('Both start date and end date are required.');
    }

    const start = new Date(week_start);
    const end = new Date(week_end);
    if (end <= start) {
      throw new Error('End date must be after start date.');
    }

    const { data, error } = await supabase
      .from('contests')
      .insert({
        title: trimmedTitle,
        description: (description || '').trim(),
        week_start: start.toISOString(),
        week_end: end.toISOString(),
        status: 'draft',
        question_count: 20,
        time_per_question_seconds: 30
      })
      .select()
      .single();

    if (error) {
      console.error('[contestService] createDraftContest error:', error);
      throw new Error(error.message || 'Failed to create contest.');
    }

    return { ...data, assignedCount: 0, participantsCount: 0 };
  },

  /**
   * Updates an existing draft contest.
   * Active and closed contests CANNOT be edited.
   */
  async updateDraftContest(contestId, { title, description, week_start, week_end }) {
    if (!contestId) throw new Error('Contest ID is required.');

    // Verify contest is still 'draft'
    const { data: existing, error: checkError } = await supabase
      .from('contests')
      .select('status')
      .eq('id', contestId)
      .single();

    if (checkError || !existing) {
      throw new Error('Contest not found.');
    }

    if (existing.status !== 'draft') {
      throw new Error(`Cannot edit contest: Contests in status "${existing.status}" cannot be modified.`);
    }

    const trimmedTitle = (title || '').trim();
    if (!trimmedTitle) throw new Error('Contest title is required.');

    const start = new Date(week_start);
    const end = new Date(week_end);
    if (end <= start) throw new Error('End date must be after start date.');

    const { data, error } = await supabase
      .from('contests')
      .update({
        title: trimmedTitle,
        description: (description || '').trim(),
        week_start: start.toISOString(),
        week_end: end.toISOString()
      })
      .eq('id', contestId)
      .eq('status', 'draft')
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Failed to update contest.');
    }

    return data;
  },

  /**
   * Retrieves all questions assigned to a specific contest with their order and full details.
   */
  async getContestAssignedQuestions(contestId) {
    if (!contestId) throw new Error('Contest ID is required.');

    const { data, error } = await supabase
      .from('contest_questions')
      .select(`
        id,
        question_order,
        question_id,
        questions (
          id,
          question_text,
          option_a,
          option_b,
          option_c,
          option_d,
          correct_option,
          explanation,
          topic,
          difficulty,
          source_type,
          verified
        )
      `)
      .eq('contest_id', contestId)
      .order('question_order', { ascending: true });

    if (error) {
      console.error('[contestService] getContestAssignedQuestions error:', error);
      throw error;
    }

    return (data || []).map((row) => {
      const q = Array.isArray(row.questions) ? row.questions[0] : row.questions;
      return {
        mappingId: row.id,
        questionOrder: row.question_order,
        questionId: row.question_id,
        ...q
      };
    });
  },

  /**
   * Assigns and reorders an array of question IDs to a draft contest.
   * Enforces:
   * - Contest must be 'draft'
   * - No duplicate questions
   * - Saves question_order 1..N
   */
  async assignQuestionsToContest(contestId, questionIdsInOrder) {
    if (!contestId) throw new Error('Contest ID is required.');
    if (!Array.isArray(questionIdsInOrder)) throw new Error('questionIdsInOrder must be an array.');

    // 1. Verify contest is still 'draft'
    const { data: contest, error: checkError } = await supabase
      .from('contests')
      .select('status')
      .eq('id', contestId)
      .single();

    if (checkError || !contest) throw new Error('Contest not found.');
    if (contest.status !== 'draft') {
      throw new Error(`Cannot modify questions: Contest is in status "${contest.status}".`);
    }

    // 2. Prevent duplicate question assignment
    const uniqueIds = new Set(questionIdsInOrder);
    if (uniqueIds.size !== questionIdsInOrder.length) {
      throw new Error('Duplicate questions detected. Each question can only be assigned once per contest.');
    }

    if (questionIdsInOrder.length > 20) {
      throw new Error(`Maximum 20 questions allowed per contest (got ${questionIdsInOrder.length}).`);
    }

    // 3. Clear existing question mappings for this contest
    const { error: deleteError } = await supabase
      .from('contest_questions')
      .delete()
      .eq('contest_id', contestId);

    if (deleteError) {
      throw new Error(`Failed to clear previous questions: ${deleteError.message}`);
    }

    // 4. Insert new mapped order
    if (questionIdsInOrder.length > 0) {
      const rowsToInsert = questionIdsInOrder.map((qId, index) => ({
        contest_id: contestId,
        question_id: qId,
        question_order: index + 1
      }));

      const { error: insertError } = await supabase
        .from('contest_questions')
        .insert(rowsToInsert);

      if (insertError) {
        throw new Error(`Failed to assign questions: ${insertError.message}`);
      }
    }

    return { success: true, count: questionIdsInOrder.length };
  },

  /**
   * Activates a contest.
   * STRICT RULES:
   * - Must be currently 'draft'
   * - Must have EXACTLY 20 questions assigned
   * - At most ONE active contest allowed in the system
   */
  async activateContest(contestId) {
    if (!contestId) throw new Error('Contest ID is required.');

    // 1. Check contest status
    const { data: contest, error: checkError } = await supabase
      .from('contests')
      .select('id, title, status')
      .eq('id', contestId)
      .single();

    if (checkError || !contest) throw new Error('Contest not found.');
    if (contest.status !== 'draft') {
      throw new Error(`Only draft contests can be activated (current status: "${contest.status}").`);
    }

    // 2. Check question count — MUST BE EXACTLY 20
    const { count: assignedCount, error: countError } = await supabase
      .from('contest_questions')
      .select('*', { count: 'exact', head: true })
      .eq('contest_id', contestId);

    if (countError) throw new Error('Failed to verify assigned question count.');
    if (assignedCount !== 20) {
      throw new Error(
        `Activation Rejected: Contest must contain exactly 20 assigned questions before activation (currently has ${assignedCount || 0}/20).`
      );
    }

    // 3. Check if another contest is currently active
    const { data: existingActive } = await supabase
      .from('contests')
      .select('id, title')
      .eq('status', 'active')
      .maybeSingle();

    if (existingActive && existingActive.id !== contestId) {
      throw new Error(
        `Activation Rejected: Contest "${existingActive.title}" is already active. Please close the active contest first.`
      );
    }

    // 4. Update status to 'active'
    const { data: updated, error: updateError } = await supabase
      .from('contests')
      .update({ status: 'active' })
      .eq('id', contestId)
      .eq('status', 'draft')
      .select()
      .single();

    if (updateError) {
      throw new Error(updateError.message || 'Failed to activate contest.');
    }

    return updated;
  },

  /**
   * Closes an active contest.
   * Transitions contest status: ACTIVE -> CLOSED.
   */
  async closeContest(contestId) {
    if (!contestId) throw new Error('Contest ID is required.');

    const { data: contest, error: checkError } = await supabase
      .from('contests')
      .select('status')
      .eq('id', contestId)
      .single();

    if (checkError || !contest) throw new Error('Contest not found.');
    if (contest.status !== 'active') {
      throw new Error(`Only active contests can be closed (current status: "${contest.status}").`);
    }

    const { data: updated, error: updateError } = await supabase
      .from('contests')
      .update({ status: 'closed' })
      .eq('id', contestId)
      .eq('status', 'active')
      .select()
      .single();

    if (updateError) {
      throw new Error(updateError.message || 'Failed to close contest.');
    }

    return updated;
  }
};

/**
 * Check if local sandbox mode is enabled in localStorage
 */
export function isLocalSandboxEnabled() {
  try {
    return localStorage.getItem('sjcem_sandbox_mode') === 'true';
  } catch {
    return false;
  }
}

export function setLocalSandboxEnabled(enabled) {
  try {
    if (enabled) {
      localStorage.setItem('sjcem_sandbox_mode', 'true');
    } else {
      localStorage.removeItem('sjcem_sandbox_mode');
    }
  } catch {
    // Ignore
  }
}

/**
 * Helper to get 20 safe questions for local sandbox mode
 */
function getSandboxQuestions() {
  return MOCK_QUESTIONS_DATABASE.slice(0, 20).map((q, idx) => ({
    id: q.id,
    questionNumber: idx + 1,
    question_order: idx + 1,
    topic: q.topic,
    difficulty: q.difficulty,
    text: q.text,
    options: q.options
  }));
}

/**
 * Sandbox scoring simulation for local offline preview
 */
function simulateSandboxEvaluation({ contestId, answers, tabSwitchCount }) {
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;

  const review = MOCK_QUESTIONS_DATABASE.slice(0, 20).map((q, idx) => {
    const studentChoice = answers[q.id] || null;
    const isAttempted = Boolean(studentChoice);
    const isCorrect = isAttempted && (studentChoice === q.correctOption);

    if (!isAttempted) {
      unansweredCount++;
    } else if (isCorrect) {
      correctCount++;
    } else {
      incorrectCount++;
    }

    return {
      questionId: q.id,
      questionNumber: idx + 1,
      questionOrder: idx + 1,
      topic: q.topic,
      difficulty: q.difficulty,
      question: q.text,
      questionText: q.text,
      options: q.options,
      selectedAnswer: studentChoice,
      correctAnswer: q.correctOption,
      correctOption: q.correctOption,
      studentSelection: studentChoice,
      isCorrect,
      isAttempted,
      explanation: q.explanation
    };
  });

  const totalQuestions = 20;
  const score = correctCount;
  const timeTakenSeconds = 300;
  const minutes = Math.floor(timeTakenSeconds / 60);
  const seconds = timeTakenSeconds % 60;
  const timeFormatted = `${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`;
  const accuracy = correctCount + incorrectCount > 0
    ? Math.round((correctCount / (correctCount + incorrectCount)) * 100)
    : 0;

  return {
    success: true,
    contestId: contestId || MOCK_CURRENT_CONTEST.id,
    contestTitle: MOCK_CURRENT_CONTEST.title,
    studentName: 'Student Participant',
    score,
    correct: correctCount,
    correctCount,
    incorrect: incorrectCount,
    incorrectCount,
    unanswered: unansweredCount,
    unattemptedCount: unansweredCount,
    total: totalQuestions,
    totalQuestions,
    accuracy,
    rank: 1,
    totalParticipants: 50,
    timeTakenSeconds,
    timeSpentSeconds: timeTakenSeconds,
    timeFormatted,
    submittedAt: new Date().toISOString(),
    tabSwitchCount: tabSwitchCount || 0,
    review,
    detailedReview: review
  };
}

export function formatSecondsToMinutes(totalSeconds) {
  const mins = Math.floor((totalSeconds || 0) / 60);
  const secs = (totalSeconds || 0) % 60;
  return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
}
