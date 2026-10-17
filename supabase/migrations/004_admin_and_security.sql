-- ==============================================================================
-- SJCEM Aptitude Contest Platform - Stage 4 Admin Dashboard & Security Hardening
-- Migration: 004_admin_and_security.sql
-- Applied after: 003_stage3_quiz_flow.sql
-- Purpose: Harden RLS policies against unauthorized student data leakage,
--          revoke broad anon attempts SELECT, ensure zero student SELECT on attempts,
--          and guarantee complete admin access via public.is_admin().
-- ==============================================================================

-- 1. SECURITY AUDIT FIX: REVOKE ALL ANONYMOUS / STUDENT SELECT ON ATTEMPTS
-- In Stage 3, a blanket policy "Allow participant read attempts" with USING (true)
-- was created. This would allow an anonymous user to query all students' attempts,
-- participant IDs, and answers.
-- We explicitly drop this broad policy and do NOT create any student SELECT policy.
DROP POLICY IF EXISTS "Allow participant read attempts" ON public.attempts;
DROP POLICY IF EXISTS "Allow participants read own attempts" ON public.attempts;

-- Ensure RLS is active on all tables
ALTER TABLE public.contests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. REINFORCE ATTEMPTS SECURITY MODEL
-- Students can ONLY insert an in_progress attempt with all scoring fields NULL.
-- NO SELECT policy is granted to anonymous or normal authenticated users on public.attempts.
-- Duplicate checks must use the SECURITY DEFINER function check_participant_attempt(contest_id, participant_id).
-- Final scoring is performed authoritatively server-side via the submit-attempt Edge Function.
DROP POLICY IF EXISTS "Allow anonymous attempt initiation" ON public.attempts;
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

-- Admins have full access to view, update, and manage attempts
DROP POLICY IF EXISTS "Allow admin full access to attempts" ON public.attempts;
CREATE POLICY "Allow admin full access to attempts" 
ON public.attempts 
FOR ALL 
TO authenticated 
USING (public.is_admin()) 
WITH CHECK (public.is_admin());

-- 3. REINFORCE CONTESTS SECURITY MODEL
-- Public can only view non-draft (active or closed) contests
DROP POLICY IF EXISTS "Allow public read on non-draft contests" ON public.contests;
CREATE POLICY "Allow public read on non-draft contests" 
ON public.contests 
FOR SELECT 
TO anon, authenticated 
USING (status IN ('active', 'closed') OR public.is_admin());

-- Admin full access to contests (draft, active, closed)
DROP POLICY IF EXISTS "Allow admin full access to contests" ON public.contests;
CREATE POLICY "Allow admin full access to contests" 
ON public.contests 
FOR ALL 
TO authenticated 
USING (public.is_admin()) 
WITH CHECK (public.is_admin());

-- 4. REINFORCE QUESTIONS SECURITY MODEL
-- Anonymous users are restricted via column privileges (granted only safe columns)
-- Admins have full access to questions table including correct_option and explanation
DROP POLICY IF EXISTS "Allow admin full access to questions" ON public.questions;
CREATE POLICY "Allow admin full access to questions" 
ON public.questions 
FOR ALL 
TO authenticated 
USING (public.is_admin()) 
WITH CHECK (public.is_admin());

-- 5. REINFORCE CONTEST_QUESTIONS SECURITY MODEL
-- Public can view mappings for active/closed contests
DROP POLICY IF EXISTS "Allow public read on contest_questions mapping" ON public.contest_questions;
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

-- Admin full access to assign and reorder contest questions
DROP POLICY IF EXISTS "Allow admin full access to contest_questions" ON public.contest_questions;
CREATE POLICY "Allow admin full access to contest_questions" 
ON public.contest_questions 
FOR ALL 
TO authenticated 
USING (public.is_admin()) 
WITH CHECK (public.is_admin());

-- 6. PROFILES POLICIES
-- Users can read their own profile (to check their admin role)
DROP POLICY IF EXISTS "Allow authenticated user to read own profile" ON public.profiles;
CREATE POLICY "Allow authenticated user to read own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (id = auth.uid() OR public.is_admin());

-- Only admins can insert or update profiles
DROP POLICY IF EXISTS "Allow admin to insert profiles" ON public.profiles;
CREATE POLICY "Allow admin to insert profiles" 
ON public.profiles 
FOR INSERT 
TO authenticated 
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Allow admin to update profiles" ON public.profiles;
CREATE POLICY "Allow admin to update profiles" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (public.is_admin()) 
WITH CHECK (public.is_admin());

-- 7. RE-VERIFY VIEW GRANTS
-- Public students access leaderboard rankings strictly through sanitized views
GRANT SELECT ON public.student_contest_questions TO anon, authenticated;
GRANT SELECT ON public.weekly_leaderboard TO anon, authenticated;
GRANT SELECT ON public.overall_leaderboard TO anon, authenticated;
