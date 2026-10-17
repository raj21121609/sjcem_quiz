# SJCEM Weekly Aptitude Contest — Question Generation Contract (Stage 5A)

> **Document Version:** 1.0.0 (Stage 5A Specification)  
> **Target System:** Gemini 2.5 Flash / Supabase Edge Functions (`generate-contest`)  
> **Status:** Active Contract & Server-Side Validator Implemented  

---

## 1. Executive Summary & Architecture Boundaries

The SJCEM Weekly Aptitude Contest operates on a weekly cycle where **all participating students receive the exact same 20 aptitude questions** in a synchronized contest format.

```
┌────────────────────────────────────────────────────────┐
│                   ADMIN DASHBOARD                      │
│ (Triggers Generation or Automated Weekly Schedule)    │
└──────────────────────────┬─────────────────────────────┘
                           │ (Authenticated / is_admin)
                           ▼
┌────────────────────────────────────────────────────────┐
│             SUPABASE EDGE FUNCTION                     │
│               `generate-contest`                       │
│                                                        │
│  1. Injects System Instructions & Contest Prompt       │
│  2. Calls Gemini API using server-side secret          │
│  3. Passes raw output through Server-Side Validator    │
│  4. Enforces 16 Hard Validation Rules                  │
│  5. Maps questions to `public.questions`               │
│  6. Creates draft contest & links 20 questions         │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│               SUPABASE POSTGRESQL                      │
│ - `public.contests` (status='draft')                   │
│ - `public.questions` (source_type='AI_GENERATED')      │
│ - `public.contest_questions` (order 1..20)             │
└────────────────────────────────────────────────────────┘
```

### Critical Security Boundaries
1. **Zero Client-Side AI Access**: The Google Gemini API key is stored exclusively as a server-side secret within Supabase Edge Functions. It is **never** embedded in React code, Vite environment variables, or client bundles.
2. **One-Time Generation**: Gemini is called **once per weekly contest**, never once per student. Generated questions are persisted permanently in Supabase PostgreSQL.
3. **Zero-Trust Server Validation**: Raw model outputs are **never** trusted blindly. Every response must pass the 16 server-side validation rules before any database insert occurs.
4. **Answer Key Secrecy**: The generated `correct_option` and `explanation` remain protected under existing database column privileges and RLS, invisible to students during the contest.

---

## 2. Weekly Contest Specifications

Every weekly contest requires exactly **20 questions** adhering to strict category and difficulty matrices.

### Category Distribution (Strictly 20 Questions)

| Category Key | Category Name | Question Count | Syllabus / Topic Scope |
|---|---|:---:|---|
| `quantitative` | Quantitative Aptitude | **6** | Speed & Distance, Time & Work, Percentages, Ratios & Proportions, Profit & Loss, Number Systems, Mensuration. |
| `logical_reasoning` | Logical Reasoning | **5** | Syllogisms, Coding-Decoding, Blood Relations, Seating Arrangements, Direction Sense, Series Completion. |
| `verbal` | Verbal Ability | **4** | Sentence Correction, Vocabulary in Context, Analogies, Reading Comprehension, Paragraph Inference. |
| `data_interpretation` | Data Interpretation | **3** | Tabular Data, Bar Charts, Numerical Series, Multi-variable Analysis (represented as structured text tables). |
| `general_aptitude` | General Aptitude / Mixed | **2** | Pattern logic, abstract reasoning, quick quantitative estimation. |
| **TOTAL** | | **20** | |

### Difficulty Distribution (Strictly 20 Questions)

| Difficulty Key | Difficulty Level | Question Count | Characteristics |
|---|---|:---:|---|
| `easy` | Easy | **6** | Direct 1–2 step calculations or immediate grammatical/logical rule application. Solvable within 25–35 seconds. |
| `medium` | Medium | **10** | Standard campus placement contest caliber (2–3 step analytical deduction). Solvable within 40–55 seconds. |
| `hard` | Hard | **4** | Multi-tier reasoning, complex constraints, or combined arithmetic-algebraic scenarios. Solvable within 60 seconds. |
| **TOTAL** | | **20** | |

### Recommended Distribution Matrix

| Category | Easy | Medium | Hard | Total |
|---|:---:|:---:|:---:|:---:|
| `quantitative` | 2 | 3 | 1 | **6** |
| `logical_reasoning` | 1 | 3 | 1 | **5** |
| `verbal` | 2 | 1 | 1 | **4** |
| `data_interpretation` | 0 | 2 | 1 | **3** |
| `general_aptitude` | 1 | 1 | 0 | **2** |
| **TOTAL** | **6** | **10** | **4** | **20** |

---

## 3. Required Gemini Output JSON Schema

Gemini must return parseable JSON conforming strictly to this format:

```json
{
  "questions": [
    {
      "text": "A train 240 m long passes a pole in 24 seconds. How long will it take to pass a platform 650 m long?",
      "option_a": "65 seconds",
      "option_b": "89 seconds",
      "option_c": "100 seconds",
      "option_d": "120 seconds",
      "correct_option": "B",
      "explanation": "Speed of train = 240 m / 24 s = 10 m/s. Total distance to pass platform = length of train + length of platform = 240 + 650 = 890 m. Time taken = 890 m / 10 m/s = 89 seconds.",
      "topic": "Speed, Time and Distance",
      "difficulty": "medium",
      "category": "quantitative"
    }
  ]
}
```

### Allowed Values
* **`correct_option`**: `"A"` | `"B"` | `"C"` | `"D"`
* **`difficulty`**: `"easy"` | `"medium"` | `"hard"`
* **`category`**: `"quantitative"` | `"logical_reasoning"` | `"verbal"` | `"data_interpretation"` | `"general_aptitude"`

---

## 4. Server-Side Validation Pipeline (The 16 Hard Rules)

The validator function `validateGeminiContestResponse(data)` enforces the following 16 rules server-side:

| # | Rule Identifier | Validation Condition | Rejection Outcome |
|---|---|---|---|
| 1 | `ROOT_OBJECT_MISSING` | Root payload must be a non-null JSON object containing `"questions"`. | Payload rejected |
| 2 | `QUESTIONS_ARRAY_REQUIRED` | Property `"questions"` must be an Array. | Payload rejected |
| 3 | `INVALID_QUESTION_COUNT` | `questions.length` must be **exactly 20**. | Payload rejected |
| 4 | `MISSING_QUESTION_TEXT` | Question `text` or `question_text` is missing, null, or whitespace-only. | Payload rejected |
| 5 | `MISSING_OPTION` | Any of `option_a`, `option_b`, `option_c`, or `option_d` is missing or not a string. | Payload rejected |
| 6 | `EXTRA_OPTIONS_DETECTED` | Any extraneous options (e.g., `option_e`) are present. | Payload rejected |
| 7 | `INVALID_CORRECT_OPTION` | `correct_option` is not one of `"A"`, `"B"`, `"C"`, `"D"`. | Payload rejected |
| 8 | `CORRECT_OPTION_TARGET_EMPTY` | Declared `correct_option` points to an option that is empty or blank. | Payload rejected |
| 9 | `MISSING_EXPLANATION` | `explanation` is missing, blank, or fewer than 5 characters. | Payload rejected |
| 10 | `INVALID_CATEGORY` | `category` is not in `ALLOWED_CATEGORIES`. | Payload rejected |
| 11 | `INVALID_DIFFICULTY` | `difficulty` is not in `ALLOWED_DIFFICULTIES`. | Payload rejected |
| 12 | `INCORRECT_CATEGORY_DISTRIBUTION` | Category counts do not match 6 quantitative, 5 logical, 4 verbal, 3 DI, 2 general. | Payload rejected |
| 13 | `INCORRECT_DIFFICULTY_DISTRIBUTION` | Difficulty counts do not match 6 easy, 10 medium, 4 hard. | Payload rejected |
| 14 | `DUPLICATE_QUESTION` | Two or more questions have identical or near-identical normalized text. | Payload rejected |
| 15 | `MEANINGLESS_QUESTION_TEXT` | Question text is fewer than 10 characters or placeholder string. | Payload rejected |
| 16 | `EMPTY_OPTION` | Any option (`option_a` through `option_d`) contains only whitespace. | Payload rejected |

---

## 5. Question Quality & Psychometric Standards

1. **Unambiguous Correct Answer**: Exactly one option must be verifiably correct. No subjective or open-ended interpretations.
2. **Self-Contained Solvability**: The question must provide all necessary facts, numbers, and premises. No dependencies on external links or unavailable charts.
3. **Distractor Quality & Length Balance**: All 4 options must be plausibly phrased and similar in length. The correct option must not be visibly longer or more detailed than the distractors.
4. **Structured Text for Data Interpretation**: Because image-based questions are prohibited at this stage, data interpretation questions must embed clean ASCII/markdown tables:
   ```
   Study the quarterly production figures (in thousands of units):
   | Quarter | Product X | Product Y |
   | Q1      | 45        | 60        |
   | Q2      | 52        | 58        |
   | Q3      | 61        | 72        |
   What was the percentage increase in Product X production from Q1 to Q3?
   ```
5. **Educational Step-by-Step Explanations**: Explanations must clearly guide the student on how to solve the problem, highlighting formulas and time-saving mental shortcuts.
6. **Copyright & Source Attribution**:
   * Questions are either original creations or standard public domain aptitude paradigms.
   * In the database, all generated questions receive:
     * `source_type = 'AI_GENERATED'`
     * `source_name = 'Gemini 2.5 Flash / Stage 5A Contract'`
     * `verified = false`

---

## 6. Anti-Hallucination & Self-Check Protocol

The prompt embeds an internal verification chain requiring Gemini to execute five self-checks before emitting each question:

1. **Mental Math Audit**: Independently calculate the arithmetic step-by-step.
2. **Key-Option Correspondence**: Verify that the declared `correct_option` corresponds exactly to the mathematically derived answer.
3. **Distractor Disqualification**: Verify that each of the three distractors is genuinely incorrect and not a valid alternative interpretation.
4. **Explanation Concordance**: Verify that the text in `explanation` explicitly concludes with the option declared in `correct_option`.
5. **Taxonomy Alignment**: Verify that the declared `category` and `difficulty` match collegiate campus recruitment standards.

---

## 7. Database Transformation Specification

When validated questions are approved for storage in Supabase PostgreSQL:

```typescript
function transformToDatabaseQuestions(questions: GeneratedQuestion[]): DatabaseQuestionInsert[] {
  return questions.map(q => ({
    question_text: q.text,
    option_a: q.option_a,
    option_b: q.option_b,
    option_c: q.option_c,
    option_d: q.option_d,
    correct_option: q.correct_option,
    explanation: q.explanation,
    topic: q.topic,
    difficulty: q.difficulty,
    source_type: 'AI_GENERATED',
    source_name: 'Gemini 2.5 Flash / Stage 5A Contract',
    source_url: null,
    source_year: null,
    verified: false
  }));
}
```

This ensures full schema fidelity with `public.questions` in migration `001_initial_schema.sql`.
