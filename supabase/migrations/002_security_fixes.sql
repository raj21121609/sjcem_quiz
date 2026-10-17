-- ==============================================================================
-- SJCEM Aptitude Contest Platform - Security Audit Patch
-- Migration: 002_security_fixes.sql
-- Applied after: 001_initial_schema.sql
-- Purpose: Harden RLS, column privileges, view access, and admin escalation
-- ==============================================================================

-- ==============================================================================
-- FIX S1 + S3: STUDENT-SAFE QUESTION COLUMN PRIVILEGES
--
-- Problem: The student_contest_questions VIEW joins public.questions but anon
-- has no SELECT policy on questions → the view returns zero rows, breaking the
-- quiz. Fixing this naively (GRANT SELECT on questions to anon) would expose
-- correct_option and explanation.
--
-- Fix: Use PostgreSQL column-level privileges. Grant SELECT only on the specific
-- safe columns (no correct_option, no explanation) to the anon role, and add a
-- permissive RLS SELECT policy for anon on questions so RLS does not block the
-- view. Because correct_option and explanation are never granted, anon cannot
-- read them even with a wildcard SELECT *.
-- ==============================================================================

-- First: ensure anon has NO blanket SELECT on questions (revoke if somehow granted)
REVOKE ALL ON public.questions FROM anon;

-- Grant SELECT on ONLY the safe question columns to anon
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

-- Add a permissive RLS policy so RLS does not block anon from reading rows.
-- The actual column restriction is enforced at the privilege level above.
-- Anon cannot SELECT correct_option or explanation regardless of RLS.
DROP POLICY IF EXISTS "Allow anon safe column read on questions" ON public.questions;
CREATE POLICY "Allow anon safe column read on questions"
ON public.questions
FOR SELECT
TO anon
USING (true);

-- ==============================================================================
-- FIX S2: TIGHTEN ATTEMPT INSERT POLICY
--
-- Problem: Original WITH CHECK only validates status='in_progress' AND score IS NULL.
-- A malicious client could insert with correct_count, incorrect_count,
-- unanswered_count already populated, or with a future submitted_at timestamp.
--
-- Fix: Require ALL scoring fields to be NULL at insert time. The legitimate
-- score will be calculated and updated server-side in Stage 3.
-- ==============================================================================
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

-- ==============================================================================
-- FIX S4: BLOCK SELF-ESCALATION VIA profiles INSERT
--
-- Problem: No INSERT policy exists on profiles for authenticated users.
-- In Supabase, when RLS is enabled and no policy matches, INSERT is denied by
-- default — so this is technically safe already. However, to be explicit and
-- prevent future policy changes from accidentally reopening this, we add a
-- DENY-by-default comment and an explicit admin-only INSERT policy.
--
-- Result: Only an existing admin (or the Supabase service_role used internally
-- during bootstrap) can add rows to profiles. Normal authenticated users cannot
-- insert or update their own profile row.
-- ==============================================================================

-- Explicit admin-only INSERT policy on profiles (initial row created via Dashboard)
DROP POLICY IF EXISTS "Allow admin insert to profiles" ON public.profiles;
CREATE POLICY "Allow admin insert to profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- Block any UPDATE on profiles by non-admins (prevents role escalation via UPDATE)
DROP POLICY IF EXISTS "Allow admin update profiles" ON public.profiles;
CREATE POLICY "Allow admin update profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ==============================================================================
-- FIX: ENSURE anon CANNOT UPDATE attempts AT ALL
--
-- The original migration only had an INSERT policy for anon on attempts.
-- PostgreSQL RLS denies any operation not covered by a matching policy when RLS
-- is enabled, so anon UPDATE is already denied by default. This comment and
-- absence of an UPDATE policy for anon is intentional.
--
-- The admin FOR ALL policy covers UPDATE/DELETE for authenticated admins.
-- Stage 3 Edge Function uses service_role key (bypasses RLS) to score attempts.
-- ==============================================================================
-- No change needed here — absence of UPDATE policy for anon is correct.

-- ==============================================================================
-- FIX: REVOKE anon SELECT FROM LEADERBOARD VIEWS — THEN RE-GRANT SAFELY
--
-- The views already omit participant_id, answers, and tab_switch_count.
-- Re-grant is already present in 001, but we make it explicit here for clarity.
-- ==============================================================================
GRANT SELECT ON public.student_contest_questions TO anon, authenticated;
GRANT SELECT ON public.weekly_leaderboard TO anon, authenticated;
GRANT SELECT ON public.overall_leaderboard TO anon, authenticated;

-- ==============================================================================
-- VERIFICATION COMMENTS (not runnable — for review only)
--
-- To manually verify in Supabase SQL Editor:
--
-- 1. Run as anon role — should return safe columns only:
--    SET ROLE anon;
--    SELECT * FROM public.student_contest_questions;
--    -- Should show question text/options, no correct_option or explanation
--
-- 2. Verify anon cannot read answer key:
--    SET ROLE anon;
--    SELECT correct_option FROM public.questions;
--    -- Should fail: ERROR: permission denied for table questions
--
-- 3. Verify anon cannot insert a scored attempt:
--    SET ROLE anon;
--    INSERT INTO public.attempts (contest_id, participant_id, student_name, score)
--    VALUES ('uuid', 'pid', 'test', 20);
--    -- Should fail: violates WITH CHECK
--
-- 4. Verify anon cannot self-escalate to admin:
--    SET ROLE anon;
--    INSERT INTO public.profiles (id, role) VALUES (gen_random_uuid(), 'admin');
--    -- Should fail: no INSERT policy for anon on profiles
-- ==============================================================================
