-- ==============================================================================
-- SJCEM Aptitude Contest Platform - Stage 3 Real Student Quiz Flow
-- Migration: 003_stage3_quiz_flow.sql
-- Applied after: 002_security_fixes.sql
-- Purpose: Support real student attempt initiation, duplicate checking,
--          and server-side atomic scoring fallback.
-- ==============================================================================

-- 1. Allow student clients to read attempt rows so they can inspect their own
--    attempt status and retrieve the generated attempt record.
DROP POLICY IF EXISTS "Allow participant read attempts" ON public.attempts;
CREATE POLICY "Allow participant read attempts"
ON public.attempts
FOR SELECT
TO anon, authenticated
USING (true);

-- 2. Fast helper RPC to inspect existing attempts for a given participant
CREATE OR REPLACE FUNCTION public.check_participant_attempt(
    p_contest_id UUID,
    p_participant_id TEXT
)
RETURNS TABLE (
    attempt_id UUID,
    contest_id UUID,
    participant_id TEXT,
    student_name TEXT,
    status TEXT,
    score INTEGER,
    correct_count INTEGER,
    incorrect_count INTEGER,
    unanswered_count INTEGER,
    time_taken_seconds INTEGER,
    started_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id, contest_id, participant_id, student_name, status, score, correct_count, incorrect_count, unanswered_count, time_taken_seconds, started_at, submitted_at
    FROM public.attempts
    WHERE contest_id = p_contest_id AND participant_id = p_participant_id
    LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.check_participant_attempt(UUID, TEXT) TO anon, authenticated;

-- 3. Database RPC scoring procedure (server-side backup for submit-attempt Edge Function)
-- Evaluates submitted answers against questions answer key, calculates score,
-- atomically finalizes attempt, and returns educational solution review.
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(
    p_attempt_id UUID,
    p_contest_id UUID,
    p_participant_id TEXT,
    p_answers JSONB,
    p_tab_switch_count INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_attempt RECORD;
    v_contest RECORD;
    v_row RECORD;
    v_correct_count INTEGER := 0;
    v_incorrect_count INTEGER := 0;
    v_unanswered_count INTEGER := 0;
    v_score INTEGER := 0;
    v_now TIMESTAMPTZ := now();
    v_time_taken INTEGER := 0;
    v_review JSONB := '[]'::jsonb;
    v_student_choice TEXT;
    v_is_correct BOOLEAN;
    v_is_attempted BOOLEAN;
    v_question_count INTEGER := 0;
    v_updated_rows INTEGER;
BEGIN
    -- 1. Validate attempt exists
    SELECT * INTO v_attempt FROM public.attempts WHERE id = p_attempt_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Attempt record not found');
    END IF;

    -- 2. Validate contest matches
    IF v_attempt.contest_id <> p_contest_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Attempt does not belong to specified contest');
    END IF;

    -- 3. Validate participant matches
    IF v_attempt.participant_id <> p_participant_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Participant ID does not match this attempt');
    END IF;

    -- 4. Check already submitted (prevent duplicate finalization)
    IF v_attempt.status <> 'in_progress' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Attempt has already been submitted',
            'alreadySubmitted', true,
            'score', v_attempt.score,
            'correct', v_attempt.correct_count,
            'incorrect', v_attempt.incorrect_count,
            'unanswered', v_attempt.unanswered_count
        );
    END IF;

    -- 5. Validate contest exists
    SELECT * INTO v_contest FROM public.contests WHERE id = p_contest_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Contest not found');
    END IF;

    -- 6. Evaluate all 20 questions
    FOR v_row IN (
        SELECT 
            cq.question_order,
            q.id AS question_id,
            q.question_text,
            q.option_a,
            q.option_b,
            q.option_c,
            q.option_d,
            q.correct_option,
            q.explanation,
            q.topic,
            q.difficulty
        FROM public.contest_questions cq
        JOIN public.questions q ON cq.question_id = q.id
        WHERE cq.contest_id = p_contest_id
        ORDER BY cq.question_order ASC
    ) LOOP
        v_question_count := v_question_count + 1;
        v_student_choice := p_answers->>v_row.question_id::text;
        v_is_attempted := (v_student_choice IS NOT NULL AND v_student_choice <> '');
        v_is_correct := (v_is_attempted AND v_student_choice = v_row.correct_option);

        IF NOT v_is_attempted THEN
            v_unanswered_count := v_unanswered_count + 1;
        ELSIF v_is_correct THEN
            v_correct_count := v_correct_count + 1;
        ELSE
            v_incorrect_count := v_incorrect_count + 1;
        END IF;

        v_review := v_review || jsonb_build_object(
            'questionId', v_row.question_id,
            'questionNumber', v_row.question_order,
            'questionOrder', v_row.question_order,
            'topic', COALESCE(v_row.topic, 'General Aptitude'),
            'difficulty', COALESCE(v_row.difficulty, 'Medium'),
            'question', v_row.question_text,
            'questionText', v_row.question_text,
            'options', jsonb_build_array(
                jsonb_build_object('id', 'A', 'text', v_row.option_a),
                jsonb_build_object('id', 'B', 'text', v_row.option_b),
                jsonb_build_object('id', 'C', 'text', v_row.option_c),
                jsonb_build_object('id', 'D', 'text', v_row.option_d)
            ),
            'selectedAnswer', v_student_choice,
            'correctAnswer', v_row.correct_option,
            'correctOption', v_row.correct_option,
            'studentSelection', v_student_choice,
            'isCorrect', v_is_correct,
            'isAttempted', v_is_attempted,
            'explanation', COALESCE(v_row.explanation, 'Step-by-step solution not provided.')
        );
    END LOOP;

    IF v_question_count <> 20 THEN
        RETURN jsonb_build_object('success', false, 'error', format('Contest must contain 20 questions, found %s', v_question_count));
    END IF;

    v_score := v_correct_count;
    v_time_taken := GREATEST(1, EXTRACT(EPOCH FROM (v_now - v_attempt.started_at))::INTEGER);

    -- 7. Atomic update (only update if still in_progress)
    UPDATE public.attempts
    SET 
        status = 'submitted',
        score = v_score,
        correct_count = v_correct_count,
        incorrect_count = v_incorrect_count,
        unanswered_count = v_unanswered_count,
        submitted_at = v_now,
        time_taken_seconds = v_time_taken,
        answers = p_answers,
        tab_switch_count = COALESCE(p_tab_switch_count, 0)
    WHERE id = p_attempt_id AND status = 'in_progress';

    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
    IF v_updated_rows = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Race condition: attempt already submitted by another request');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'contestId', p_contest_id,
        'contestTitle', v_contest.title,
        'studentName', v_attempt.student_name,
        'score', v_score,
        'correct', v_correct_count,
        'correctCount', v_correct_count,
        'incorrect', v_incorrect_count,
        'incorrectCount', v_incorrect_count,
        'unanswered', v_unanswered_count,
        'unattemptedCount', v_unanswered_count,
        'total', 20,
        'totalQuestions', 20,
        'accuracy', CASE WHEN (v_correct_count + v_incorrect_count) > 0 THEN ROUND((v_correct_count::numeric / (v_correct_count + v_incorrect_count)::numeric) * 100) ELSE 0 END,
        'timeTakenSeconds', v_time_taken,
        'timeSpentSeconds', v_time_taken,
        'timeFormatted', format('%sm %ss', v_time_taken / 60, lpad((v_time_taken % 60)::text, 2, '0')),
        'submittedAt', v_now,
        'review', v_review,
        'detailedReview', v_review
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(UUID, UUID, TEXT, JSONB, INTEGER) TO anon, authenticated;
