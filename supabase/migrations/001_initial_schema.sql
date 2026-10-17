-- ==============================================================================
-- SJCEM Placement Aptitude Contest Platform - Database Schema Migration
-- Migration: 001_initial_schema.sql
-- Database: Supabase PostgreSQL
-- ==============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TABLE: CONTESTS
-- Holds weekly aptitude contests. Enforces single active contest via partial unique index.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.contests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    week_start TIMESTAMPTZ NOT NULL,
    week_end TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    question_count INTEGER NOT NULL DEFAULT 20,
    time_per_question_seconds INTEGER NOT NULL DEFAULT 30,
    generated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- Constraints
    CONSTRAINT contests_status_check CHECK (status IN ('draft', 'active', 'closed')),
    CONSTRAINT contests_question_count_check CHECK (question_count = 20),
    CONSTRAINT contests_time_check CHECK (time_per_question_seconds = 30),
    CONSTRAINT contests_date_order_check CHECK (week_end > week_start)
);

-- Enforce AT MOST ONE active weekly contest at any time (0 or 1).
-- Zero active contests is valid during setup or between weeks.
-- This index prevents a second row from being set to status='active'.
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_active_contest 
ON public.contests (status) 
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_contests_status ON public.contests (status);
CREATE INDEX IF NOT EXISTS idx_contests_week_start ON public.contests (week_start DESC);

-- ==============================================================================
-- 3. TABLE: QUESTIONS (Question Bank)
-- Contains the question bank, full options, answer key and explanations.
-- CRITICAL SECURITY: Never query this table directly from anonymous student clients.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_text TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_option TEXT NOT NULL,
    explanation TEXT,
    topic TEXT,
    difficulty TEXT,
    source_type TEXT NOT NULL DEFAULT 'ORIGINAL',
    source_name TEXT,
    source_url TEXT,
    source_year INTEGER,
    verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- Constraints
    CONSTRAINT questions_correct_option_check CHECK (correct_option IN ('A', 'B', 'C', 'D')),
    CONSTRAINT questions_difficulty_check CHECK (difficulty IN ('easy', 'medium', 'hard')),
    CONSTRAINT questions_source_type_check CHECK (source_type IN ('ORIGINAL', 'AI_GENERATED', 'PYQ', 'ADMIN_CREATED'))
);

CREATE INDEX IF NOT EXISTS idx_questions_topic ON public.questions (topic);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON public.questions (difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_verified ON public.questions (verified);

-- ==============================================================================
-- 4. TABLE: CONTEST_QUESTIONS (Join Table / Ordered Roster)
-- Maps exactly 20 questions to a contest with strict sequential ordering.
-- Guarantees: every student gets the same 20 questions in the same order.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.contest_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contest_id UUID NOT NULL REFERENCES public.contests(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    question_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),

    -- Constraints
    CONSTRAINT contest_questions_order_range CHECK (question_order BETWEEN 1 AND 20),
    CONSTRAINT contest_questions_unique_order UNIQUE (contest_id, question_order),
    CONSTRAINT contest_questions_unique_question UNIQUE (contest_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_contest_questions_order ON public.contest_questions (contest_id, question_order);

-- ==============================================================================
-- 5. TABLE: ATTEMPTS
-- Records individual student contest sessions.
-- Browser participant_id prevents casual duplicate attempts for the same contest.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contest_id UUID NOT NULL REFERENCES public.contests(id) ON DELETE CASCADE,
    participant_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    started_at TIMESTAMPTZ DEFAULT now(),
    submitted_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'in_progress',
    score INTEGER,
    correct_count INTEGER,
    incorrect_count INTEGER,
    unanswered_count INTEGER,
    time_taken_seconds INTEGER,
    tab_switch_count INTEGER NOT NULL DEFAULT 0,
    answers JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),

    -- Constraints
    CONSTRAINT attempts_status_check CHECK (status IN ('in_progress', 'submitted')),
    CONSTRAINT attempts_score_check CHECK (score IS NULL OR (score BETWEEN 0 AND 20)),
    CONSTRAINT attempts_correct_check CHECK (correct_count IS NULL OR (correct_count BETWEEN 0 AND 20)),
    CONSTRAINT attempts_incorrect_check CHECK (incorrect_count IS NULL OR (incorrect_count BETWEEN 0 AND 20)),
    CONSTRAINT attempts_unanswered_check CHECK (unanswered_count IS NULL OR (unanswered_count BETWEEN 0 AND 20)),
    CONSTRAINT attempts_unique_participant_contest UNIQUE (contest_id, participant_id)
);

-- Leaderboard and look-up performance indexes
CREATE INDEX IF NOT EXISTS idx_attempts_contest_id ON public.attempts (contest_id);
CREATE INDEX IF NOT EXISTS idx_attempts_participant_id ON public.attempts (participant_id);
CREATE INDEX IF NOT EXISTS idx_attempts_leaderboard_rank 
ON public.attempts (contest_id, score DESC, time_taken_seconds ASC) 
WHERE status = 'submitted';

CREATE INDEX IF NOT EXISTS idx_attempts_submitted_at 
ON public.attempts (contest_id, submitted_at DESC) 
WHERE status = 'submitted';

-- ==============================================================================
-- 6. TABLE: PROFILES (Admin Role Authorization)
-- Simple role table linked to Supabase Auth (auth.users).
-- Students are anonymous and NEVER have rows in this table.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT profiles_role_check CHECK (role = 'admin')
);

-- Helper function to check if the current requester is an authenticated admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ==============================================================================
-- 7. DATABASE VIEWS
-- ==============================================================================

-- 7.1 Student-Safe Question View:
-- Exposes question content and options WITHOUT correct_option or explanation.
CREATE OR REPLACE VIEW public.student_contest_questions
WITH (security_barrier = true)
AS
SELECT 
    cq.contest_id,
    cq.question_order,
    q.id AS question_id,
    q.question_text,
    q.option_a,
    q.option_b,
    q.option_c,
    q.option_d,
    q.topic,
    q.difficulty
FROM public.contest_questions cq
JOIN public.questions q ON cq.question_id = q.id
JOIN public.contests c ON cq.contest_id = c.id
WHERE c.status = 'active';

-- 7.2 Weekly Leaderboard View:
-- Exposes only submitted attempts with public statistics.
-- Omits sensitive participant_id, answers, and tab_switch_count.
CREATE OR REPLACE VIEW public.weekly_leaderboard
WITH (security_barrier = true)
AS
SELECT 
    a.id AS attempt_id,
    a.contest_id,
    a.student_name,
    a.score,
    a.correct_count,
    a.incorrect_count,
    a.unanswered_count,
    a.time_taken_seconds,
    a.submitted_at
FROM public.attempts a
WHERE a.status = 'submitted';

-- 7.3 Overall Season Leaderboard View:
-- Aggregates performance across all historical completed contests.
CREATE OR REPLACE VIEW public.overall_leaderboard
WITH (security_barrier = true)
AS
SELECT 
    a.student_name,
    COUNT(DISTINCT a.contest_id) AS contests_attended,
    ROUND(AVG(a.score)::numeric, 2) AS average_score,
    SUM(a.score) AS total_points,
    MIN(a.time_taken_seconds) AS best_time_seconds,
    MAX(a.submitted_at) AS last_active_at
FROM public.attempts a
WHERE a.status = 'submitted'
GROUP BY a.student_name;

-- ==============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.contests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 8.1 CONTESTS POLICIES
-- Anyone (anonymous students) can view active or closed contests.
CREATE POLICY "Allow public read on non-draft contests" 
ON public.contests 
FOR SELECT 
TO anon, authenticated 
USING (status IN ('active', 'closed') OR public.is_admin());

-- Only admins can insert, update, delete contests
CREATE POLICY "Allow admin full access to contests" 
ON public.contests 
FOR ALL 
TO authenticated 
USING (public.is_admin()) 
WITH CHECK (public.is_admin());

-- 8.2 QUESTIONS POLICIES
-- CRITICAL: Anonymous students cannot access correct_option or explanation.
-- Two-layer protection:
--   Layer 1 (column privileges): GRANT SELECT only on safe columns to anon.
--                                 correct_option and explanation are never granted.
--   Layer 2 (RLS): A permissive USING(true) policy for anon so that RLS does not
--                  block row access; column privileges alone restrict the data.
--
-- Result: anon role CAN query the student_contest_questions view (which joins
-- questions) but CANNOT read correct_option or explanation under any circumstance.

-- Revoke any blanket select on questions for anon (safety)
REVOKE ALL ON public.questions FROM anon;

-- Grant SELECT only on safe columns (NO correct_option, NO explanation)
GRANT SELECT (
    id,
    question_text,
    option_a,
    option_b,
    option_c,
    option_d,
    topic,
    difficulty,
    source_type,
    created_at
) ON public.questions TO anon;

-- RLS SELECT policy for anon (column privileges enforce the actual restriction)
CREATE POLICY "Allow anon safe column read on questions"
ON public.questions
FOR SELECT
TO anon
USING (true);

-- Full access for authenticated admins only
CREATE POLICY "Allow admin full access to questions" 
ON public.questions 
FOR ALL 
TO authenticated 
USING (public.is_admin()) 
WITH CHECK (public.is_admin());

-- 8.3 CONTEST_QUESTIONS POLICIES
-- Public can read question order mapping for active/closed contests.
CREATE POLICY "Allow public read on contest_questions mapping" 
ON public.contest_questions 
FOR SELECT 
TO anon, authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.contests c 
        WHERE c.id = contest_id AND c.status IN ('active', 'closed')
    ) 
    OR public.is_admin()
);

CREATE POLICY "Allow admin full access to contest_questions" 
ON public.contest_questions 
FOR ALL 
TO authenticated 
USING (public.is_admin()) 
WITH CHECK (public.is_admin());

-- 8.4 ATTEMPTS POLICIES
-- Students can only initiate a fresh attempt. ALL scoring fields must be NULL.
-- Scoring is performed server-side in Stage 3 via a trusted Edge Function.
CREATE POLICY "Allow anonymous attempt initiation" 
ON public.attempts 
FOR INSERT 
TO anon, authenticated 
WITH CHECK (
    status = 'in_progress'
    AND score IS NULL
    AND correct_count IS NULL
    AND incorrect_count IS NULL
    AND unanswered_count IS NULL
    AND submitted_at IS NULL
);

-- Anon has NO SELECT, UPDATE, or DELETE policy on attempts — denied by RLS default.
-- Attempt scoring (UPDATE with score/correct_count/etc.) will be performed in Stage 3
-- via a Supabase Edge Function that uses the service_role key server-side.
-- The service_role key is a privileged server-side credential; it is NEVER exposed
-- to the frontend, browser, or anon clients.
CREATE POLICY "Allow admin full access to attempts" 
ON public.attempts 
FOR ALL 
TO authenticated 
USING (public.is_admin()) 
WITH CHECK (public.is_admin());

-- 8.5 PROFILES POLICIES
-- The profiles table links Supabase Auth users to the application admin role.
-- Students are fully anonymous and NEVER appear in this table.
--
-- SELF-ESCALATION PROTECTION:
-- When RLS is enabled and no matching INSERT policy exists, Supabase denies the
-- operation by default. However, we add an explicit admin-only INSERT policy to
-- make this restriction intentional and auditable.
--
-- IMPORTANT: The initial admin row must be created manually via the Supabase
-- Dashboard SQL editor using:
--   INSERT INTO public.profiles (id, role) VALUES ('<auth_user_uuid>', 'admin');
-- This is a one-time bootstrap step performed with the service_role key (which is
-- a privileged server-side credential, NOT exposed to the frontend or anon clients).

-- Authenticated users can read only their own profile
CREATE POLICY "Allow authenticated user to read own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (id = auth.uid());

-- Only existing admins can insert new admin rows (prevents self-escalation)
CREATE POLICY "Allow admin to insert profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- Only existing admins can update profile rows (prevents role tampering)
CREATE POLICY "Allow admin to update profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 8.6 VIEW PERMISSIONS
GRANT SELECT ON public.student_contest_questions TO anon, authenticated;
GRANT SELECT ON public.weekly_leaderboard TO anon, authenticated;
GRANT SELECT ON public.overall_leaderboard TO anon, authenticated;
