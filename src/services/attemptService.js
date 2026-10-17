import { supabase } from '../supabase/client';

/**
 * Attempt Service
 * ===============
 * Handles creating, inspecting, and tracking student quiz attempt records.
 *
 * Security Constraints:
 * - Anonymous students can only initiate an in_progress attempt with scoring fields NULL.
 * - Score fields (score, correct_count, etc.) are protected by RLS and Edge Function.
 * - DB Unique constraint on (contest_id, participant_id) prevents multiple attempts.
 */

const CURRENT_ATTEMPT_KEY = 'sjcem_current_attempt';
const COMPLETED_RESULT_PREFIX = 'sjcem_completed_result_';

/**
 * Save the in-progress attempt to localStorage.
 * @param {{ attemptId: string, contestId: string, participantId: string, studentName: string, startedAt?: string }} info
 */
export function saveAttemptLocally(info) {
  try {
    localStorage.setItem(CURRENT_ATTEMPT_KEY, JSON.stringify(info));
  } catch {
    // Ignore storage quota/permission errors
  }
}

/**
 * Retrieve the current in-progress attempt from localStorage.
 * @returns {{ attemptId: string, contestId: string, participantId: string, studentName: string } | null}
 */
export function getLocalAttempt() {
  try {
    const raw = localStorage.getItem(CURRENT_ATTEMPT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Clear the in-progress attempt from localStorage.
 */
export function clearLocalAttempt() {
  try {
    localStorage.removeItem(CURRENT_ATTEMPT_KEY);
  } catch {
    // Silently ignore
  }
}

/**
 * Cache completed contest submission result locally for instant scorecard access.
 */
export function saveCompletedResultLocally(contestId, result) {
  try {
    localStorage.setItem(`${COMPLETED_RESULT_PREFIX}${contestId}`, JSON.stringify(result));
  } catch {
    // Silently ignore
  }
}

/**
 * Retrieve cached completed result if participant already submitted.
 */
export function getCompletedResultLocally(contestId) {
  try {
    const raw = localStorage.getItem(`${COMPLETED_RESULT_PREFIX}${contestId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Checks whether this participant already has an attempt for the active contest.
 * 
 * @param {string} contestId
 * @param {string} participantId
 * @returns {Promise<{ hasAttempt: boolean, status?: 'in_progress' | 'submitted', attempt?: any, localResult?: any }>}
 */
export async function checkExistingAttempt(contestId, participantId) {
  if (!contestId || !participantId) {
    return { hasAttempt: false };
  }

  // 1. Check local cache first for completed submission
  const localResult = getCompletedResultLocally(contestId);
  if (localResult) {
    return {
      hasAttempt: true,
      status: 'submitted',
      localResult
    };
  }

  // 2. Query Supabase RPC helper or attempts table
  try {
    // Try RPC first
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('check_participant_attempt', {
        p_contest_id: contestId,
        p_participant_id: participantId
      });

    if (!rpcError && rpcData && rpcData.length > 0) {
      const row = rpcData[0];
      return {
        hasAttempt: true,
        status: row.status,
        attempt: row
      };
    }
  } catch (err) {
    console.warn('[attemptService] RPC check_participant_attempt error:', err.message);
  }

  // 3. Check local in-progress attempt
  const localAttempt = getLocalAttempt();
  if (localAttempt && localAttempt.contestId === contestId) {
    return {
      hasAttempt: true,
      status: 'in_progress',
      attempt: localAttempt
    };
  }

  return { hasAttempt: false };
}

/**
 * Creates exactly ONE new attempt in Supabase for the student.
 * 
 * @param {{ contestId: string, participantId: string, studentName: string }} params
 * @returns {Promise<{ id: string, contest_id: string, participant_id: string, student_name: string, status: string, started_at: string }>}
 */
export async function createAttempt({ contestId, participantId, studentName }) {
  if (!contestId) throw new Error('MISSING_CONTEST_ID');
  if (!participantId) throw new Error('MISSING_PARTICIPANT_ID');

  const trimmedName = (studentName || '').trim();
  if (!trimmedName) throw new Error('EMPTY_STUDENT_NAME');
  if (trimmedName.length > 60) throw new Error('STUDENT_NAME_TOO_LONG');

  const attemptId = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
  const startedAt = new Date().toISOString();

  try {
    const { error } = await supabase
      .from('attempts')
      .insert({
        id: attemptId,
        contest_id: contestId,
        participant_id: participantId,
        student_name: trimmedName,
        status: 'in_progress',
        started_at: startedAt
      });

    if (error) {
      // PostgreSQL code 23505 = unique_violation (contest_id, participant_id)
      if (error.code === '23505') {
        throw new Error('ALREADY_ATTEMPTED');
      }
      console.error('[attemptService] createAttempt error:', error);
      throw new Error(error.message || 'ATTEMPT_CREATION_FAILED');
    }

    const data = {
      id: attemptId,
      contest_id: contestId,
      participant_id: participantId,
      student_name: trimmedName,
      status: 'in_progress',
      started_at: startedAt
    };

    // Persist attempt locally for state recovery
    saveAttemptLocally({
      attemptId: data.id,
      contestId: data.contest_id,
      participantId: data.participant_id,
      studentName: data.student_name,
      startedAt: data.started_at
    });

    return data;
  } catch (err) {
    if (err.message === 'ALREADY_ATTEMPTED') {
      throw err;
    }
    // Check if network failed or Supabase is offline
    if (err.message?.includes('fetch failed') || err.message?.includes('NetworkError')) {
      throw new Error('NETWORK_CONNECTION_ERROR');
    }
    throw err;
  }
}
