import { supabase } from '../supabase/client';
import { MOCK_WEEKLY_LEADERBOARD, MOCK_OVERALL_LEADERBOARD } from '../data/mockLeaderboard';
import { isLocalSandboxEnabled, formatSecondsToMinutes } from './contestService';

/**
 * Leaderboard Service
 * ===================
 * Queries sanitized Supabase database views:
 * - public.weekly_leaderboard
 * - public.overall_leaderboard
 * 
 * STRICT PRIVACY:
 * Does NOT expose participant_id, answers JSON, or internal private attempt fields.
 */

export const leaderboardService = {
  /**
   * Fetches weekly leaderboard entries for a contest.
   * Ranked strictly by:
   * 1. score DESC
   * 2. time_taken_seconds ASC
   * 3. submitted_at ASC
   * 
   * @param {string} [contestId]
   * @param {string} [searchQuery]
   * @param {object} [currentUserSubmission]
   * @returns {Promise<Array<any>>}
   */
  async getWeeklyLeaderboard(contestId, searchQuery = '', currentUserSubmission = null) {
    try {
      let query = supabase
        .from('weekly_leaderboard')
        .select(`
          attempt_id,
          contest_id,
          student_name,
          score,
          correct_count,
          incorrect_count,
          unanswered_count,
          time_taken_seconds,
          submitted_at
        `)
        .order('score', { ascending: false })
        .order('time_taken_seconds', { ascending: true })
        .order('submitted_at', { ascending: true });

      if (contestId) {
        query = query.eq('contest_id', contestId);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('[leaderboardService] Error querying weekly_leaderboard view:', error.message);
        if (isLocalSandboxEnabled() || error.code === 'PGRST116') {
          return getMockWeeklyWithFilter(searchQuery, currentUserSubmission);
        }
        throw error;
      }

      if (!data || data.length === 0) {
        if (isLocalSandboxEnabled()) {
          return getMockWeeklyWithFilter(searchQuery, currentUserSubmission);
        }
        // If current user just submitted in this session, show their entry
        if (currentUserSubmission) {
          return [{
            rank: 1,
            name: currentUserSubmission.studentName,
            branch: currentUserSubmission.studentBranch || 'Engineering',
            score: currentUserSubmission.score,
            time: currentUserSubmission.timeFormatted || `${currentUserSubmission.timeSpentSeconds}s`,
            timeSeconds: currentUserSubmission.timeSpentSeconds || 0,
            submittedAt: currentUserSubmission.submittedAt,
            isCurrentUser: true
          }];
        }
        return [];
      }

      // Map sanitized view rows and compute sequential ranks
      let list = data.map((row, index) => ({
        id: row.attempt_id,
        rank: index + 1,
        name: row.student_name,
        branch: 'Engineering', // Generic campus branch default
        score: row.score,
        total: 20,
        time: formatSecondsToMinutes(row.time_taken_seconds || 0),
        timeSeconds: row.time_taken_seconds || 0,
        submittedAt: row.submitted_at,
        isCurrentUser: currentUserSubmission ? currentUserSubmission.studentName === row.student_name : false
      }));

      // Apply search filter if present
      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        list = list.filter(item => item.name.toLowerCase().includes(q));
      }

      return list;
    } catch (err) {
      console.warn('[leaderboardService] Falling back to local data:', err.message);
      return getMockWeeklyWithFilter(searchQuery, currentUserSubmission);
    }
  },

  /**
   * Fetches cumulative overall leaderboard aggregated across all submitted contests.
   * 
   * @param {string} [searchQuery]
   * @returns {Promise<Array<any>>}
   */
  async getOverallLeaderboard(searchQuery = '') {
    try {
      const { data, error } = await supabase
        .from('overall_leaderboard')
        .select(`
          student_name,
          contests_attended,
          average_score,
          total_points,
          best_time_seconds,
          last_active_at
        `)
        .order('total_points', { ascending: false })
        .order('average_score', { ascending: false });

      if (error) {
        console.warn('[leaderboardService] Error querying overall_leaderboard view:', error.message);
        if (isLocalSandboxEnabled()) {
          return getMockOverallWithFilter(searchQuery);
        }
        throw error;
      }

      if (!data || data.length === 0) {
        if (isLocalSandboxEnabled()) {
          return getMockOverallWithFilter(searchQuery);
        }
        return [];
      }

      let list = data.map((row, index) => ({
        rank: index + 1,
        name: row.student_name,
        branch: 'Engineering',
        contestsAttended: row.contests_attended,
        totalScore: row.total_points,
        averageScore: Number(row.average_score) || 0,
        bestTime: formatSecondsToMinutes(row.best_time_seconds || 0),
        lastActive: row.last_active_at
      }));

      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        list = list.filter(item => item.name.toLowerCase().includes(q));
      }

      return list;
    } catch (err) {
      console.warn('[leaderboardService] Overall query error:', err.message);
      return getMockOverallWithFilter(searchQuery);
    }
  }
};

function getMockWeeklyWithFilter(searchQuery, currentUserSubmission) {
  let list = [...MOCK_WEEKLY_LEADERBOARD.map(item => ({ ...item, isCurrentUser: false }))];

  if (currentUserSubmission && !list.some(p => p.name === currentUserSubmission.studentName)) {
    list.push({
      rank: 0,
      name: currentUserSubmission.studentName,
      branch: currentUserSubmission.studentBranch || 'Engineering',
      score: currentUserSubmission.score,
      time: currentUserSubmission.timeFormatted || '5m 00s',
      timeSeconds: currentUserSubmission.timeSpentSeconds || 300,
      submittedAt: currentUserSubmission.submittedAt || new Date().toISOString(),
      isCurrentUser: true
    });

    list.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.timeSeconds - b.timeSeconds;
    });

    list.forEach((item, index) => {
      item.rank = index + 1;
    });
  }

  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    list = list.filter(item => item.name.toLowerCase().includes(q) || (item.branch && item.branch.toLowerCase().includes(q)));
  }

  return list;
}

function getMockOverallWithFilter(searchQuery) {
  let list = [...MOCK_OVERALL_LEADERBOARD];
  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    list = list.filter(item => item.name.toLowerCase().includes(q) || (item.branch && item.branch.toLowerCase().includes(q)));
  }
  return list;
}
