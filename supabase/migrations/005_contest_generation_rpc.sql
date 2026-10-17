-- ==============================================================================
-- SJCEM Aptitude Contest Platform - Stage 5B Atomic Contest Generation RPC
-- Migration: 005_contest_generation_rpc.sql
-- Applied after: 004_admin_and_security.sql
-- Purpose: Provides an atomic, transactional PostgreSQL procedure to insert a
--          weekly contest, exactly 20 AI-generated questions, and 20 ordered
--          contest_questions mappings in a single atomic database transaction.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.create_generated_contest(
    p_title TEXT,
    p_description TEXT,
    p_week_start TIMESTAMPTZ,
    p_week_end TIMESTAMPTZ,
    p_questions JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_contest_id UUID;
    v_question_id UUID;
    v_idx INTEGER;
    v_q JSONB;
BEGIN
    -- 1. Security Check: Only authenticated admins or service_role can execute
    IF NOT (public.is_admin() OR current_user = 'service_role' OR COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role') THEN
        RAISE EXCEPTION 'FORBIDDEN_NOT_ADMIN: Admin privileges required to generate contests.';
    END IF;

    -- 2. Idempotency Check: Prevent duplicate weekly contests for overlapping or matching dates
    IF EXISTS (
        SELECT 1 FROM public.contests 
        WHERE week_start = p_week_start
           OR (week_start <= p_week_start AND week_end > p_week_start)
    ) THEN
        RAISE EXCEPTION 'CONTEST_ALREADY_EXISTS_FOR_WEEK: A contest already exists for the specified week.';
    END IF;

    -- 3. Validation: Exactly 20 questions required
    IF jsonb_array_length(p_questions) <> 20 THEN
        RAISE EXCEPTION 'INVALID_QUESTION_COUNT: Exactly 20 questions required, received %', jsonb_array_length(p_questions);
    END IF;

    -- 4. Insert Draft Contest (status='draft', question_count=20, time_per_question_seconds=30)
    INSERT INTO public.contests (
        title,
        description,
        week_start,
        week_end,
        status,
        question_count,
        time_per_question_seconds,
        generated_at
    ) VALUES (
        p_title,
        p_description,
        p_week_start,
        p_week_end,
        'draft',
        20,
        30,
        now()
    ) RETURNING id INTO v_contest_id;

    -- 5. Atomically insert all 20 questions and their ordered mappings (1..20)
    FOR v_idx IN 0..19 LOOP
        v_q := p_questions->v_idx;

        INSERT INTO public.questions (
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
            verified
        ) VALUES (
            v_q->>'question_text',
            v_q->>'option_a',
            v_q->>'option_b',
            v_q->>'option_c',
            v_q->>'option_d',
            v_q->>'correct_option',
            v_q->>'explanation',
            v_q->>'topic',
            v_q->>'difficulty',
            'AI_GENERATED',
            COALESCE(v_q->>'source_name', 'Gemini 2.5 Flash / Stage 5A Contract'),
            NULL,
            NULL,
            false
        ) RETURNING id INTO v_question_id;

        INSERT INTO public.contest_questions (
            contest_id,
            question_id,
            question_order
        ) VALUES (
            v_contest_id,
            v_question_id,
            v_idx + 1
        );
    END LOOP;

    -- 6. Return successful creation summary
    RETURN jsonb_build_object(
        'success', true,
        'contest_id', v_contest_id,
        'title', p_title,
        'status', 'draft',
        'question_count', 20,
        'time_per_question_seconds', 30,
        'week_start', p_week_start,
        'week_end', p_week_end
    );
END;
$$;

-- Revoke all public/anon execution; grant strictly to authenticated and service_role
REVOKE ALL ON FUNCTION public.create_generated_contest(TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_generated_contest(TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, JSONB) TO authenticated, service_role;
