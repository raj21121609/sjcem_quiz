import { supabase } from '../supabase/client';
import { MOCK_ADMIN_STATS, MOCK_CONTESTS_LIST } from '../data/mockContests';
import { MOCK_QUESTIONS_DATABASE } from '../data/mockQuestions';
import { isLocalSandboxEnabled } from './contestService';

/**
 * Admin Service
 * =============
 * Handles Supabase Auth authentication, session verification against public.profiles,
 * and high-level dashboard aggregate metrics.
 */

export const adminService = {
  /**
   * Authenticate administrator using Supabase Auth and verify role = 'admin'.
   * Unauthorized accounts are immediately signed out and rejected.
   * 
   * @param {{ email: string, password: string }} credentials
   * @returns {Promise<{ user: any, profile: { id: string, role: string } }>}
   */
  async login({ email, password }) {
    if (!email || !password) {
      throw new Error('Email and password are required.');
    }

    // 1. Supabase Auth sign-in
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (authError) {
      throw new Error(authError.message || 'Authentication failed. Please check your credentials.');
    }

    const user = authData?.user;
    if (!user) {
      throw new Error('Login succeeded but user session could not be established.');
    }

    // 2. Authorize role against public.profiles
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError || !profile || profile.role !== 'admin') {
        // Sign out unauthorized user immediately
        await supabase.auth.signOut();
        throw new Error('Access Denied: Your account does not have administrator privileges.');
      }

      return { user, profile };
    } catch (err) {
      await supabase.auth.signOut().catch(() => {});
      throw err;
    }
  },

  /**
   * Terminate admin session.
   */
  async logout() {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[adminService] Error during sign out:', err.message);
    }
  },

  /**
   * Retrieve current authenticated admin or null if not authenticated/unauthorized.
   * 
   * @returns {Promise<{ user: any, profile: { id: string, role: string } } | null>}
   */
  async getCurrentAdmin() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return null;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError || !profile || profile.role !== 'admin') {
        return null;
      }

      return { user, profile };
    } catch (err) {
      console.warn('[adminService] Failed to check admin session:', err.message);
      return null;
    }
  },

  /**
   * Fetches real-time dashboard statistics:
   * - Active contest status & question count
   * - Total questions in question bank
   * - Total contests scheduled
   * - Participants and submitted attempts for current active contest
   * - Average and highest score
   */
  async getDashboardStats() {
    try {
      // 1. Fetch active contest
      const { data: activeContest, error: activeErr } = await supabase
        .from('contests')
        .select('id, title, status, question_count, week_start, week_end')
        .eq('status', 'active')
        .maybeSingle();

      // 2. Total questions count
      const { count: questionsCount } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true });

      // 3. Total contests count
      const { count: contestsCount } = await supabase
        .from('contests')
        .select('*', { count: 'exact', head: true });

      let totalParticipants = 0;
      let submittedAttempts = 0;
      let averageScore = 0;
      let highestScore = 0;

      // 4. If an active contest exists, gather attempts metrics
      if (activeContest?.id) {
        const { data: attempts, error: attErr } = await supabase
          .from('attempts')
          .select('score, status')
          .eq('contest_id', activeContest.id);

        if (!attErr && attempts) {
          totalParticipants = attempts.length;
          const completed = attempts.filter(a => a.status === 'submitted' && a.score !== null);
          submittedAttempts = completed.length;

          if (completed.length > 0) {
            const sum = completed.reduce((acc, curr) => acc + (curr.score || 0), 0);
            averageScore = Math.round((sum / completed.length) * 10) / 10;
            highestScore = Math.max(...completed.map(a => a.score || 0));
          }
        }
      }

      return {
        activeContest: activeContest || null,
        contestStatus: activeContest ? 'ACTIVE' : 'NO_ACTIVE_CONTEST',
        totalQuestionsInBank: questionsCount || 0,
        totalContests: contestsCount || 0,
        totalParticipants,
        submittedAttempts,
        averageScore,
        highestScore,
        isSandbox: false
      };
    } catch (err) {
      console.warn('[adminService] Live stats query failed:', err.message);

      // Graceful fallback if in local sandbox mode
      if (isLocalSandboxEnabled()) {
        return {
          ...MOCK_ADMIN_STATS,
          totalQuestionsInBank: MOCK_QUESTIONS_DATABASE.length,
          totalContests: MOCK_CONTESTS_LIST.length,
          isSandbox: true
        };
      }

      return {
        activeContest: null,
        contestStatus: 'NO_ACTIVE_CONTEST',
        totalQuestionsInBank: 0,
        totalContests: 0,
        totalParticipants: 0,
        submittedAttempts: 0,
        averageScore: 0,
        highestScore: 0,
        isSandbox: false
      };
    }
  },

  /**
   * Generates a 20-question weekly aptitude contest using Google Gemini
   * via the authoritative Supabase Edge Function 'generate-contest'.
   * The generated contest is validated and saved atomically in Supabase with status 'draft'.
   *
   * @param {{ week_start: string, theme?: string }} params
   * @returns {Promise<{ success: boolean, contest: any, summary: any }>}
   */
  async generateContestWithGemini({ week_start, theme }) {
    if (!week_start || typeof week_start !== 'string') {
      throw new Error('week_start is required (expected format YYYY-MM-DD).');
    }

    const trimmedWeekStart = week_start.trim();
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(trimmedWeekStart)) {
      throw new Error("Invalid date format for week_start. Expected 'YYYY-MM-DD'.");
    }

    const { data, error } = await supabase.functions.invoke('generate-contest', {
      body: {
        week_start: trimmedWeekStart,
        theme: theme ? String(theme).trim() : undefined
      }
    });

    if (error) {
      let serverErrorMsg = error.message;
      try {
        if (error.context && typeof error.context.json === 'function') {
          const body = await error.context.json();
          if (body?.message) {
            serverErrorMsg = body.message;
          } else if (body?.error) {
            serverErrorMsg = body.error;
          }
        }
      } catch {
        // Fallback to error.message
      }

      if (serverErrorMsg === 'CONTEST_ALREADY_EXISTS' || serverErrorMsg?.includes('already exists')) {
        throw new Error(`A contest already exists for the week of ${trimmedWeekStart}. Please select a different week start date.`);
      }

      throw new Error(serverErrorMsg || 'AI contest generation failed. Please check network and try again.');
    }

    if (!data || !data.success) {
      throw new Error(data?.message || data?.error || 'AI contest generation failed.');
    }

    return data;
  },

  /**
   * Alias for generateContestWithGemini
   */
  generateContest(params) {
    return this.generateContestWithGemini(params);
  }
};
