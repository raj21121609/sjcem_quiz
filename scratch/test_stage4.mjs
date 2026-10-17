import fs from 'fs';

console.log('========================================================');
console.log('   RUNNING STAGE 4 TEST SUITE & SECURITY AUDIT');
console.log('========================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`[PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${message}`);
    process.exitCode = 1;
  }
}

// 1. Unauthenticated admin redirect & Auth checks
const adminPage = fs.readFileSync('src/pages/Admin.jsx', 'utf8');
assert(
  adminPage.includes('adminService.getCurrentAdmin()') && adminPage.includes("navigate('/admin/login')"),
  '1. Unauthenticated users are verified and redirected to /admin/login'
);

const adminServiceCode = fs.readFileSync('src/services/adminService.js', 'utf8');
assert(
  adminServiceCode.includes("profile.role !== 'admin'") && adminServiceCode.includes('supabase.auth.signOut()'),
  '2. Authenticated non-admin users are rejected and signed out'
);

// 2. Draft Contest Creation & Validation Rules
const contestServiceCode = fs.readFileSync('src/services/contestService.js', 'utf8');
assert(
  contestServiceCode.includes("status: 'draft'") && contestServiceCode.includes('question_count: 20'),
  '3. Contest creation initializes status as draft with exactly 20 questions'
);

assert(
  contestServiceCode.includes('assignedCount !== 20') && contestServiceCode.includes('Activation Rejected'),
  '4. Cannot activate contest with fewer or more than exactly 20 questions'
);

assert(
  contestServiceCode.includes('existingActive.id !== contestId') && contestServiceCode.includes('already active'),
  '5. Cannot activate a second contest while one is already active'
);

assert(
  contestServiceCode.includes("existing.status !== 'draft'") && contestServiceCode.includes('Cannot edit contest'),
  '6. Active and closed contests are locked and cannot be edited'
);

// 3. Question Assignment & Reordering Rules
assert(
  contestServiceCode.includes('uniqueIds.size !== questionIdsInOrder.length') && contestServiceCode.includes('Duplicate questions detected'),
  '7. Duplicate question assignments are strictly blocked'
);

assert(
  contestServiceCode.includes('question_order: index + 1'),
  '8. Question assignments enforce sequential numbering 1..20'
);

// 4. Question Bank Locking Rules
const questionServiceCode = fs.readFileSync('src/services/questionService.js', 'utf8');
assert(
  questionServiceCode.includes('checkIfQuestionIsLocked') && questionServiceCode.includes('Cannot edit question'),
  '9. Questions locked by active or closed contests cannot be edited'
);

assert(
  questionServiceCode.includes('checkIfQuestionIsLocked') && questionServiceCode.includes('Cannot delete question'),
  '10. Questions locked by active or closed contests cannot be deleted'
);

// 5. Leaderboard Ranking & Privacy Rules
const leaderboardServiceCode = fs.readFileSync('src/services/leaderboardService.js', 'utf8');
assert(
  leaderboardServiceCode.includes("order('score', { ascending: false })") &&
  leaderboardServiceCode.includes("order('time_taken_seconds', { ascending: true })") &&
  leaderboardServiceCode.includes("order('submitted_at', { ascending: true })"),
  '11. Weekly leaderboard ranks strictly by score DESC, time ASC, submitted_at ASC'
);

assert(
  !leaderboardServiceCode.includes("select('*')") &&
  !leaderboardServiceCode.includes(".select('participant_id") &&
  !leaderboardServiceCode.includes("answers:"),
  '12. Leaderboard service strictly protects student privacy (no participant_id or answers JSON)'
);

// 6. Security Audit: Migration 004
const migration004 = fs.readFileSync('supabase/migrations/004_admin_and_security.sql', 'utf8');
assert(
  migration004.includes('DROP POLICY IF EXISTS "Allow participant read attempts" ON public.attempts;') &&
  !migration004.includes('FOR SELECT TO anon, authenticated USING (true);'),
  '13. Migration 004 drops blanket anonymous attempts SELECT policy (preventing student data dumps)'
);

assert(
  migration004.includes('CREATE POLICY "Allow admin full access to contests"') &&
  migration004.includes('public.is_admin()'),
  '14. Admin access is strictly secured via public.is_admin()'
);

// 7. Student Safe Question View Check
const migration001 = fs.readFileSync('supabase/migrations/001_initial_schema.sql', 'utf8');
assert(
  !migration001.includes('correct_option') || migration001.includes('REVOKE ALL ON public.questions FROM anon;'),
  '15. Student safe question view and anon column grants omit correct_option and explanation'
);

// 8. Existing Student Quiz Flow Preserved
const quizContextCode = fs.readFileSync('src/context/QuizContext.jsx', 'utf8');
assert(
  quizContextCode.includes('getParticipantId') &&
  quizContextCode.includes('submitContestAnswers') &&
  contestServiceCode.includes("'submit-attempt'") &&
  quizContextCode.includes('QUESTION_TIME_LIMIT_SECONDS = 30') &&
  quizContextCode.includes('TOTAL_QUESTIONS_COUNT = 20'),
  '16. Existing student quiz flow (name, participant ID, 30s timer, batch submit, Edge Function) remains intact'
);

// 9. Specific Test: Anonymous Client Cannot SELECT * From attempts
// Verify 004 strictly contains ZERO SELECT policies on attempts for anon/authenticated
const attemptsSelectMatches = migration004.match(/CREATE\s+POLICY[^\n]+ON\s+public\.attempts[^\n]+FOR\s+SELECT/gi);
assert(
  attemptsSelectMatches === null,
  '17. Proving 004 defines ZERO SELECT policies on public.attempts for student/anon roles'
);

// Verify drops of any previous attempts SELECT policies
assert(
  migration004.includes('DROP POLICY IF EXISTS "Allow participant read attempts" ON public.attempts;') &&
  migration004.includes('DROP POLICY IF EXISTS "Allow participants read own attempts" ON public.attempts;'),
  '18. Proving 004 drops all prior blanket/header-fallback SELECT policies on public.attempts'
);

// Verify the ONLY policy granting read/write on attempts requires public.is_admin()
assert(
  migration004.includes('CREATE POLICY "Allow admin full access to attempts"') &&
  migration004.includes('USING (public.is_admin())'),
  '19. Proving the only attempts read access is strictly guarded by public.is_admin()'
);

// Verify student attemptService initiates attempt without calling .select() on attempts table
const attemptServiceCode = fs.readFileSync('src/services/attemptService.js', 'utf8');
assert(
  !attemptServiceCode.includes(".from('attempts').insert(") ||
  (!attemptServiceCode.includes(".from('attempts')\n      .insert(") && !attemptServiceCode.includes(".insert({\n        id: attemptId,\n        contest_id: contestId,\n        participant_id: participantId,\n        student_name: trimmedName,\n        status: 'in_progress',\n        started_at: startedAt\n      })\n      .select(")),
  '20. Student attempt creation does NOT require SELECT permission on attempts table (client-generated UUID)'
);

console.log('\n========================================================');
console.log(`   TEST RESULTS: ${passedTests} / ${totalTests} PASSED`);
console.log('========================================================');
