# SJCEM Aptitude Contest Platform — Database Documentation

> **Stage 2 — Supabase PostgreSQL Schema**
> Covers: Tables, views, indexes, constraints, RLS policies, security model.

---

## 1. Architecture Overview

```
Browser (anon student)
    │
    │ Uses: VITE_SUPABASE_ANON_KEY  ← public, safe to expose
    ▼
Supabase PostgREST API
    │
    ├── student_contest_questions view  ← safe columns only
    ├── weekly_leaderboard view
    ├── overall_leaderboard view
    └── attempts table (INSERT only, scored fields must be NULL)

Admin Browser
    │
    │ Uses: Supabase Auth (email/password) → profiles.role = 'admin'
    ▼
Supabase PostgREST API (authenticated role)
    │
    └── All tables (full access via is_admin() RLS)

Supabase Edge Function (Stage 3 — not yet built)
    │
    │ Uses: SUPABASE_SERVICE_ROLE_KEY  ← server-side ONLY, never in browser
    ▼
Bypasses RLS → updates attempts with score, correct_count, etc.
```

### Key Terminology

| Term | Description |
|------|-------------|
| **`anon` role** | The Supabase default role for unauthenticated (student) requests. Identified by the public `VITE_SUPABASE_ANON_KEY`. |
| **`authenticated` role** | A Supabase Auth-logged-in user. Admin users are `authenticated` users who additionally have a row in `public.profiles`. |
| **Application admin** | A normal Supabase Auth user (`email/password`) with `profiles.role = 'admin'`. This is the person who manages contests and questions. |
| **`service_role` key** | A privileged **server-side-only** credential for Supabase. **Never expose to the frontend or browser.** Used by Edge Functions in Stage 3 to bypass RLS for trusted server-side operations (e.g., scoring an attempt). |

> ⚠️ **Do NOT confuse** the application admin with the `service_role`. They are completely separate:
> - Application admin → normal Auth user + `profiles` row
> - `service_role` → a secret credential used only inside Edge Functions

---

## 2. Tables

### `public.contests`

Holds weekly aptitude contests.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `UUID` PK | Auto-generated |
| `title` | `TEXT` | Contest title |
| `description` | `TEXT` | Optional description |
| `week_start` | `TIMESTAMPTZ` | Contest window start |
| `week_end` | `TIMESTAMPTZ` | Contest window end |
| `status` | `TEXT` | `draft` / `active` / `closed` |
| `question_count` | `INTEGER` | Always 20 (enforced by CHECK) |
| `time_per_question_seconds` | `INTEGER` | Always 30 (enforced by CHECK) |
| `generated_at` | `TIMESTAMPTZ` | When AI generated questions (nullable) |
| `created_at` | `TIMESTAMPTZ` | Row creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | Row update timestamp |

**Key Constraints:**
- `status IN ('draft', 'active', 'closed')`
- `question_count = 20`
- `time_per_question_seconds = 30`
- `week_end > week_start`
- **Partial unique index** on `status WHERE status = 'active'` → enforces **at most one** active contest (0 or 1). Zero active contests is valid during setup or between weeks.

---

### `public.questions`

The full question bank including answer keys and explanations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `UUID` PK | Auto-generated |
| `question_text` | `TEXT` | The question |
| `option_a–d` | `TEXT` | Four options |
| `correct_option` | `TEXT` | Answer key: `A`, `B`, `C`, or `D` |
| `explanation` | `TEXT` | Solution explanation |
| `topic` | `TEXT` | e.g., Quantitative, Logical Reasoning |
| `difficulty` | `TEXT` | `easy` / `medium` / `hard` |
| `source_type` | `TEXT` | `ORIGINAL` / `AI_GENERATED` / `PYQ` / `ADMIN_CREATED` |
| `verified` | `BOOLEAN` | Whether question has been admin-verified |

> 🔒 **`correct_option` and `explanation` are NEVER accessible to the anon role.**
> Protected by two layers: RLS (anon has no SELECT on those columns) AND column-level `GRANT` (only safe columns granted to `anon`). See Section 4.

---

### `public.contest_questions`

Ordered join table mapping exactly 20 questions to each contest.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `UUID` PK | |
| `contest_id` | `UUID` FK → `contests` | |
| `question_id` | `UUID` FK → `questions` | |
| `question_order` | `INTEGER` | 1–20, unique per contest |

**Constraints:**
- `question_order BETWEEN 1 AND 20`
- `UNIQUE(contest_id, question_order)` → no two questions share a position
- `UNIQUE(contest_id, question_id)` → no duplicate questions per contest

---

### `public.attempts`

Records individual student contest sessions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `UUID` PK | |
| `contest_id` | `UUID` FK → `contests` | |
| `participant_id` | `TEXT` | Client-generated UUID stored in localStorage |
| `student_name` | `TEXT` | Student's entered name |
| `started_at` | `TIMESTAMPTZ` | When quiz started |
| `submitted_at` | `TIMESTAMPTZ` | When submitted (NULL until scored) |
| `status` | `TEXT` | `in_progress` / `submitted` |
| `score` | `INTEGER` | 0–20 (NULL until scored) |
| `correct_count` | `INTEGER` | (NULL until scored) |
| `incorrect_count` | `INTEGER` | (NULL until scored) |
| `unanswered_count` | `INTEGER` | (NULL until scored) |
| `time_taken_seconds` | `INTEGER` | (NULL until scored) |
| `tab_switch_count` | `INTEGER` | Suspicious behaviour counter |
| `answers` | `JSONB` | `{ "q_uuid": "A", ... }` |

**Key Constraints:**
- `UNIQUE(contest_id, participant_id)` → casual duplicate attempt prevention

> ⚠️ **`participant_id` is a client-generated UUID.** This constraint prevents accidental double-submits from the same browser session but is **not identity verification**. A motivated user could generate a new UUID to attempt again.

---

### `public.profiles`

Links Supabase Auth users to the `admin` application role.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `UUID` PK | Must match `auth.users.id` |
| `role` | `TEXT` | Always `admin` (enforced by CHECK) |
| `created_at` | `TIMESTAMPTZ` | |

**Students are anonymous and never have rows here.**

---

## 3. Views

### `public.student_contest_questions`

**Purpose:** The only way anonymous students receive question data. Exposes no answer key.

| Column | Exposed |
|--------|---------|
| `contest_id` | ✅ |
| `question_order` | ✅ |
| `question_id` | ✅ |
| `question_text` | ✅ |
| `option_a–d` | ✅ |
| `topic` | ✅ |
| `difficulty` | ✅ |
| `correct_option` | ❌ Never |
| `explanation` | ❌ Never |

**Security:** `WITH (security_barrier = true)` prevents query optimisations that could leak data through WHERE-clause side effects. The underlying `questions` table additionally restricts anon to only safe column grants.

**Filter:** Only returns questions from contests where `status = 'active'`.

---

### `public.weekly_leaderboard`

Shows submitted attempts with public statistics. Omits `participant_id`, `answers`, `tab_switch_count`.

---

### `public.overall_leaderboard`

Aggregates scores across all closed contests by student name.

---

## 4. Answer Key Security Model

The answer key (`correct_option`, `explanation`) is protected by **two independent layers**:

```
Layer 1: Column-level GRANT
  GRANT SELECT (id, question_text, option_a, option_b, option_c, option_d, topic, difficulty)
  ON public.questions TO anon;
  -- correct_option and explanation are NOT in this list.
  -- Even if an anon client queries: SELECT * FROM questions → permission denied.

Layer 2: RLS policy (anon)
  CREATE POLICY "Allow anon safe column read on questions"
  ON public.questions FOR SELECT TO anon USING (true);
  -- Permits row access; column privileges enforce the actual restriction.

Layer 3: View (student_contest_questions)
  -- Does not SELECT correct_option or explanation in its column list.
  -- Only shows questions from active contests.
  -- security_barrier = true prevents optimiser leaks.
```

If all three layers are in place, an anon client **cannot obtain the answer key** through:
- Direct `SELECT * FROM questions`
- Direct `SELECT correct_option FROM questions`
- Querying via `student_contest_questions` view
- Any PostgREST API call

---

## 5. RLS Policy Matrix

| Table | anon SELECT | anon INSERT | anon UPDATE | anon DELETE | admin ALL |
|-------|-------------|-------------|-------------|-------------|-----------|
| `contests` | ✅ (active/closed only) | ❌ | ❌ | ❌ | ✅ |
| `questions` | ✅ (safe columns only) | ❌ | ❌ | ❌ | ✅ |
| `contest_questions` | ✅ (active/closed contests only) | ❌ | ❌ | ❌ | ✅ |
| `attempts` | ❌ | ✅ (in_progress, all scores NULL) | ❌ | ❌ | ✅ |
| `profiles` | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 6. `public.is_admin()` Function

```sql
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
```

**Security analysis:**

| Property | Value | Rationale |
|----------|-------|-----------|
| `SECURITY DEFINER` | ✅ | Function runs as its owner (typically `postgres`), allowing it to read `profiles` even from within an RLS context without causing recursion |
| `SET search_path = public` | ✅ | Prevents search_path injection attacks where a malicious user creates a function with the same name in a different schema |
| `STABLE` | ✅ | Result can be cached within a query; reduces repeated DB lookups per RLS evaluation |
| RLS recursion risk | None | `is_admin()` is `SECURITY DEFINER` and reads `profiles` with owner privileges; it does not call itself |

---

## 7. Indexes

| Index | Table | Columns | Type | Purpose |
|-------|-------|---------|------|---------|
| `idx_single_active_contest` | `contests` | `status` WHERE `status='active'` | Unique partial | At most one active contest |
| `idx_contests_status` | `contests` | `status` | B-tree | Status filter lookups |
| `idx_contests_week_start` | `contests` | `week_start DESC` | B-tree | Recent contests first |
| `idx_questions_topic` | `questions` | `topic` | B-tree | Filter by topic |
| `idx_questions_difficulty` | `questions` | `difficulty` | B-tree | Filter by difficulty |
| `idx_questions_verified` | `questions` | `verified` | B-tree | Admin QA filter |
| `idx_contest_questions_order` | `contest_questions` | `(contest_id, question_order)` | B-tree | Ordered question fetch |
| `idx_attempts_contest_id` | `attempts` | `contest_id` | B-tree | Per-contest lookups |
| `idx_attempts_participant_id` | `attempts` | `participant_id` | B-tree | Per-student lookups |
| `idx_attempts_leaderboard_rank` | `attempts` | `(contest_id, score DESC, time_taken_seconds ASC)` WHERE `status='submitted'` | Partial | Fast leaderboard sort |
| `idx_attempts_submitted_at` | `attempts` | `(contest_id, submitted_at DESC)` WHERE `status='submitted'` | Partial | Recent submissions |

---

## 8. Manual Supabase Dashboard Steps

> These cannot be scripted via migration — they require manual action.

### Step 1: Apply Migrations

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Link to your remote project
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Push migrations (applies 001 then 002)
supabase db push
```

### Step 2: Configure Environment Variables

Copy `.env.example` to `.env` (local) or `.env.local`:

```bash
VITE_SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_PUBLIC_KEY
```

**Never commit `.env` or `.env.local`.** The `VITE_SUPABASE_ANON_KEY` is the public anon key (safe to expose to the browser). The `service_role` key is **never** added to `.env` frontend files.

### Step 3: Create the First Admin User

1. In **Supabase Dashboard → Auth → Users → Create new user** (email/password)
2. Copy the new user's UUID
3. In **Dashboard → SQL Editor**, run:

```sql
INSERT INTO public.profiles (id, role)
VALUES ('<paste-auth-user-uuid-here>', 'admin');
```

This is the only bootstrap step that requires using the Dashboard SQL editor (which implicitly uses service_role privileges). After this, the first admin can create other admins via the application.

### Step 4: Verify Answer Key Isolation

In the SQL Editor, run as the anon role:

```sql
SET ROLE anon;

-- Should FAIL: permission denied
SELECT correct_option FROM public.questions;

-- Should SUCCEED: returns safe columns only
SELECT * FROM public.student_contest_questions;
```

### Step 5: Set Auth Settings

In **Dashboard → Auth → Settings**:
- Enable **anonymous sign-ins**: `ON` (allows anon students to use the platform)
- Disable email confirmation for admin testing if desired

---

## 9. Migrations Index

| File | Purpose |
|------|---------|
| `001_initial_schema.sql` | Full schema: tables, indexes, constraints, views, RLS, column grants |
| `002_security_fixes.sql` | Idempotent security patch for existing deployments (same fixes as 001; safe to re-apply) |
