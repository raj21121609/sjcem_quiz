import { supabase } from '../supabase/client';
import { MOCK_QUESTIONS_DATABASE } from '../data/mockQuestions';
import { isLocalSandboxEnabled } from './contestService';

/**
 * Question Service
 * ================
 * Handles authenticated administrator question bank operations.
 * Enforces question locking: questions referenced by active or closed contests
 * CANNOT be modified or deleted.
 */

export const questionService = {
  /**
   * Fetches questions from the question bank with optional filtering.
   * 
   * @param {{ search?: string, topic?: string, difficulty?: string }} filters
   * @returns {Promise<Array<any>>}
   */
  async getQuestions(filters = {}) {
    try {
      let query = supabase
        .from('questions')
        .select(`
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
          source_name,
          source_url,
          source_year,
          verified,
          created_at,
          contest_questions (
            contest_id,
            contests (
              id,
              title,
              status
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (filters.topic && filters.topic !== 'All') {
        query = query.eq('topic', filters.topic);
      }

      if (filters.difficulty && filters.difficulty !== 'All') {
        query = query.eq('difficulty', filters.difficulty.toLowerCase());
      }

      if (filters.search && filters.search.trim()) {
        query = query.ilike('question_text', `%${filters.search.trim()}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('[questionService] getQuestions error:', error.message);
        if (isLocalSandboxEnabled()) return getSandboxQuestionsWithFilter(filters);
        throw error;
      }

      // Compute locked status based on whether it is assigned to an active/closed contest
      return (data || []).map((q) => {
        const usages = q.contest_questions || [];
        const activeOrClosedUsage = usages.find(cq => {
          const c = Array.isArray(cq.contests) ? cq.contests[0] : cq.contests;
          return c?.status === 'active' || c?.status === 'closed';
        });

        const isLocked = Boolean(activeOrClosedUsage);
        const lockedContestTitle = activeOrClosedUsage?.contests?.title || null;

        return {
          ...q,
          isLocked,
          lockedContestTitle,
          options: [
            { id: 'A', text: q.option_a },
            { id: 'B', text: q.option_b },
            { id: 'C', text: q.option_c },
            { id: 'D', text: q.option_d }
          ]
        };
      });
    } catch (err) {
      if (isLocalSandboxEnabled()) return getSandboxQuestionsWithFilter(filters);
      throw err;
    }
  },

  /**
   * Retrieves single question by ID.
   */
  async getQuestionById(id) {
    if (!id) throw new Error('Question ID is required.');

    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Creates a new question in the question bank.
   */
  async createQuestion(questionData) {
    validateQuestionPayload(questionData);

    const { data, error } = await supabase
      .from('questions')
      .insert({
        question_text: questionData.question_text.trim(),
        option_a: questionData.option_a.trim(),
        option_b: questionData.option_b.trim(),
        option_c: questionData.option_c.trim(),
        option_d: questionData.option_d.trim(),
        correct_option: questionData.correct_option.toUpperCase(),
        explanation: (questionData.explanation || '').trim(),
        topic: (questionData.topic || 'Quantitative Aptitude').trim(),
        difficulty: (questionData.difficulty || 'medium').toLowerCase(),
        source_type: questionData.source_type || 'ORIGINAL',
        source_name: questionData.source_name ? questionData.source_name.trim() : null,
        source_url: questionData.source_url ? questionData.source_url.trim() : null,
        source_year: questionData.source_year ? Number(questionData.source_year) : null,
        verified: Boolean(questionData.verified)
      })
      .select()
      .single();

    if (error) {
      console.error('[questionService] createQuestion error:', error);
      throw new Error(error.message || 'Failed to create question.');
    }

    return {
      ...data,
      isLocked: false,
      options: [
        { id: 'A', text: data.option_a },
        { id: 'B', text: data.option_b },
        { id: 'C', text: data.option_c },
        { id: 'D', text: data.option_d }
      ]
    };
  },

  /**
   * Updates an existing question.
   * LOCKED RULE: Questions used in active or closed contests CANNOT be edited.
   */
  async updateQuestion(id, questionData) {
    if (!id) throw new Error('Question ID is required.');
    validateQuestionPayload(questionData);

    // 1. Check if question is locked
    const lockedInfo = await this.checkIfQuestionIsLocked(id);
    if (lockedInfo.isLocked) {
      throw new Error(
        `Cannot edit question: This question is locked because it belongs to ${lockedInfo.contestStatus} contest "${lockedInfo.contestTitle}".`
      );
    }

    // 2. Perform update
    const { data, error } = await supabase
      .from('questions')
      .update({
        question_text: questionData.question_text.trim(),
        option_a: questionData.option_a.trim(),
        option_b: questionData.option_b.trim(),
        option_c: questionData.option_c.trim(),
        option_d: questionData.option_d.trim(),
        correct_option: questionData.correct_option.toUpperCase(),
        explanation: (questionData.explanation || '').trim(),
        topic: (questionData.topic || 'Quantitative Aptitude').trim(),
        difficulty: (questionData.difficulty || 'medium').toLowerCase(),
        source_type: questionData.source_type || 'ORIGINAL',
        source_name: questionData.source_name ? questionData.source_name.trim() : null,
        source_url: questionData.source_url ? questionData.source_url.trim() : null,
        source_year: questionData.source_year ? Number(questionData.source_year) : null,
        verified: Boolean(questionData.verified)
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Failed to update question.');
    }

    return {
      ...data,
      isLocked: false,
      options: [
        { id: 'A', text: data.option_a },
        { id: 'B', text: data.option_b },
        { id: 'C', text: data.option_c },
        { id: 'D', text: data.option_d }
      ]
    };
  },

  /**
   * Deletes a question from the question bank.
   * LOCKED RULE: Questions used in active or closed contests CANNOT be deleted.
   */
  async deleteQuestion(id) {
    if (!id) throw new Error('Question ID is required.');

    // 1. Check if locked
    const lockedInfo = await this.checkIfQuestionIsLocked(id);
    if (lockedInfo.isLocked) {
      throw new Error(
        `Cannot delete question: This question is locked because it is assigned to ${lockedInfo.contestStatus} contest "${lockedInfo.contestTitle}".`
      );
    }

    // 2. Perform delete
    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message || 'Failed to delete question.');
    }

    return { success: true, id };
  },

  /**
   * Helper to verify if a question is locked by any active or closed contest.
   */
  async checkIfQuestionIsLocked(questionId) {
    try {
      const { data, error } = await supabase
        .from('contest_questions')
        .select(`
          contest_id,
          contests (
            id,
            title,
            status
          )
        `)
        .eq('question_id', questionId);

      if (error || !data) return { isLocked: false };

      const activeOrClosed = data.find(item => {
        const c = Array.isArray(item.contests) ? item.contests[0] : item.contests;
        return c?.status === 'active' || c?.status === 'closed';
      });

      if (activeOrClosed) {
        const c = Array.isArray(activeOrClosed.contests) ? activeOrClosed.contests[0] : activeOrClosed.contests;
        return {
          isLocked: true,
          contestTitle: c?.title || 'Contest',
          contestStatus: c?.status || 'active'
        };
      }

      return { isLocked: false };
    } catch {
      return { isLocked: false };
    }
  }
};

/**
 * Validates question payload against schema constraints
 */
function validateQuestionPayload(q) {
  if (!q.question_text || !q.question_text.trim()) {
    throw new Error('Question text is required.');
  }

  if (!q.option_a?.trim() || !q.option_b?.trim() || !q.option_c?.trim() || !q.option_d?.trim()) {
    throw new Error('All 4 options (A, B, C, D) are required.');
  }

  const validOptions = ['A', 'B', 'C', 'D'];
  if (!validOptions.includes(q.correct_option?.toUpperCase())) {
    throw new Error('Correct option must be one of: A, B, C, or D.');
  }

  const validDifficulties = ['easy', 'medium', 'hard'];
  if (q.difficulty && !validDifficulties.includes(q.difficulty.toLowerCase())) {
    throw new Error('Difficulty must be easy, medium, or hard.');
  }
}

/**
 * Fallback sandbox questions with filtering
 */
function getSandboxQuestionsWithFilter(filters) {
  let list = MOCK_QUESTIONS_DATABASE.map(q => ({
    id: q.id,
    question_text: q.text,
    option_a: q.options[0]?.text || '',
    option_b: q.options[1]?.text || '',
    option_c: q.options[2]?.text || '',
    option_d: q.options[3]?.text || '',
    correct_option: q.correctOption,
    explanation: q.explanation,
    topic: q.topic,
    difficulty: q.difficulty.toLowerCase(),
    source_type: 'ORIGINAL',
    verified: true,
    isLocked: false,
    options: q.options
  }));

  if (filters.topic && filters.topic !== 'All') {
    list = list.filter(q => q.topic === filters.topic);
  }
  if (filters.difficulty && filters.difficulty !== 'All') {
    list = list.filter(q => q.difficulty === filters.difficulty.toLowerCase());
  }
  if (filters.search && filters.search.trim()) {
    const s = filters.search.toLowerCase();
    list = list.filter(q => q.question_text.toLowerCase().includes(s));
  }

  return list;
}
