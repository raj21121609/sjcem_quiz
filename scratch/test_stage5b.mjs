import { handleGenerateContestRequest } from '../supabase/functions/generate-contest/handler.js';

console.log('========================================================');
console.log('   RUNNING STAGE 5B — GENERATE-CONTEST TEST SUITE');
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
  }
}

// Generate valid 20-question payload conforming to Stage 5A
function createValidGeminiApiResponse() {
  const spec = [
    { cat: 'quantitative', diff: 'easy', topic: 'Percentages' },
    { cat: 'quantitative', diff: 'easy', topic: 'Ratios' },
    { cat: 'quantitative', diff: 'medium', topic: 'Time and Work' },
    { cat: 'quantitative', diff: 'medium', topic: 'Speed and Distance' },
    { cat: 'quantitative', diff: 'medium', topic: 'Profit and Loss' },
    { cat: 'quantitative', diff: 'hard', topic: 'Permutations and Combinations' },
    { cat: 'logical_reasoning', diff: 'easy', topic: 'Coding Decoding' },
    { cat: 'logical_reasoning', diff: 'medium', topic: 'Syllogisms' },
    { cat: 'logical_reasoning', diff: 'medium', topic: 'Blood Relations' },
    { cat: 'logical_reasoning', diff: 'medium', topic: 'Seating Arrangement' },
    { cat: 'logical_reasoning', diff: 'hard', topic: 'Complex Analytical Puzzles' },
    { cat: 'verbal', diff: 'easy', topic: 'Synonyms and Antonyms' },
    { cat: 'verbal', diff: 'easy', topic: 'Sentence Correction' },
    { cat: 'verbal', diff: 'medium', topic: 'Reading Comprehension' },
    { cat: 'verbal', diff: 'hard', topic: 'Paragraph Inference' },
    { cat: 'data_interpretation', diff: 'medium', topic: 'Bar Chart Interpretation' },
    { cat: 'data_interpretation', diff: 'medium', topic: 'Table Interpretation' },
    { cat: 'data_interpretation', diff: 'hard', topic: 'Multi-variable Pie Chart Analysis' },
    { cat: 'general_aptitude', diff: 'easy', topic: 'Pattern Recognition' },
    { cat: 'general_aptitude', diff: 'medium', topic: 'Logical Sequence and Series' }
  ];

  const questions = spec.map((item, idx) => ({
    text: `Question #${idx + 1}: Find the solution for aptitude problem on ${item.topic}.`,
    option_a: `Choice A for question ${idx + 1}`,
    option_b: `Choice B for question ${idx + 1}`,
    option_c: `Choice C for question ${idx + 1}`,
    option_d: `Choice D for question ${idx + 1}`,
    correct_option: ['A', 'B', 'C', 'D'][idx % 4],
    explanation: `Step-by-step mathematical reasoning for ${item.topic}.`,
    topic: item.topic,
    difficulty: item.diff,
    category: item.cat
  }));

  return {
    candidates: [
      {
        content: {
          parts: [
            { text: JSON.stringify({ questions }) }
          ]
        }
      }
    ]
  };
}

// In-memory mock database state
function createMockDatabase() {
  const state = {
    users: {
      'admin-token-123': { id: 'admin-user-id', email: 'admin@sjcem.edu.in' },
      'student-token-456': { id: 'student-user-id', email: 'student@sjcem.edu.in' }
    },
    profiles: {
      'admin-user-id': { id: 'admin-user-id', role: 'admin' },
      'student-user-id': { id: 'student-user-id', role: 'student' }
    },
    contests: [],
    questions: [],
    contest_questions: [],
    rpcCalls: []
  };

  const client = {
    auth: {
      getUser: async (token) => {
        const user = state.users[token];
        if (user) return { data: { user }, error: null };
        return { data: { user: null }, error: new Error('Invalid token') };
      }
    },
    from: (table) => {
      let currentFilter = {};
      let orFilter = null;

      return {
        select: (cols) => {
          return {
            eq: (col, val) => {
              currentFilter[col] = val;
              return {
                maybeSingle: async () => {
                  const rows = state[table] ? (Array.isArray(state[table]) ? state[table] : Object.values(state[table])) : [];
                  const found = rows.find(r => r[col] === val);
                  return { data: found || null, error: null };
                },
                single: async () => {
                  const rows = state[table] ? (Array.isArray(state[table]) ? state[table] : Object.values(state[table])) : [];
                  const found = rows.find(r => r[col] === val);
                  if (found) return { data: found, error: null };
                  return { data: null, error: new Error('Row not found') };
                }
              };
            },
            or: (expr) => {
              orFilter = expr;
              return {
                async then(resolve) {
                  // Check existing contests
                  const matched = state.contests.filter(c => {
                    // check if week overlaps
                    return expr.includes(c.week_start);
                  });
                  return resolve({ data: matched, error: null });
                }
              };
            }
          };
        },
        insert: (rowOrRows) => {
          return {
            select: () => ({
              single: async () => {
                const row = Array.isArray(rowOrRows) ? rowOrRows[0] : rowOrRows;
                const inserted = { id: `mock-${table}-${Date.now()}-${Math.random()}`, ...row };
                state[table].push(inserted);
                return { data: inserted, error: null };
              }
            }),
            async then(resolve) {
              const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
              rows.forEach(r => {
                const inserted = { id: `mock-${table}-${Date.now()}-${Math.random()}`, ...r };
                state[table].push(inserted);
              });
              return resolve({ data: rows, error: null });
            }
          };
        },
        delete: () => ({
          eq: (col, val) => {
            const idx = state[table].findIndex(r => r[col] === val);
            if (idx >= 0) state[table].splice(idx, 1);
            return Promise.resolve({ data: null, error: null });
          }
        })
      };
    },
    rpc: async (funcName, params) => {
      state.rpcCalls.push({ funcName, params });
      // Simulate create_generated_contest RPC
      if (funcName === 'create_generated_contest') {
        const { p_title, p_description, p_week_start, p_week_end, p_questions } = params;

        // Check duplicate
        if (state.contests.some(c => c.week_start === p_week_start)) {
          return { data: null, error: new Error('CONTEST_ALREADY_EXISTS_FOR_WEEK') };
        }

        if (!p_questions || p_questions.length !== 20) {
          return { data: null, error: new Error('INVALID_QUESTION_COUNT') };
        }

        const contestId = `contest-${Date.now()}`;
        state.contests.push({
          id: contestId,
          title: p_title,
          description: p_description,
          week_start: p_week_start,
          week_end: p_week_end,
          status: 'draft',
          question_count: 20,
          time_per_question_seconds: 30,
          generated_at: new Date().toISOString()
        });

        p_questions.forEach((q, idx) => {
          const qId = `q-${contestId}-${idx + 1}`;
          state.questions.push({ id: qId, ...q });
          state.contest_questions.push({
            contest_id: contestId,
            question_id: qId,
            question_order: idx + 1
          });
        });

        return {
          data: {
            success: true,
            contest_id: contestId,
            title: p_title,
            status: 'draft',
            question_count: 20
          },
          error: null
        };
      }
      return { data: null, error: new Error(`Unknown RPC ${funcName}`) };
    }
  };

  return { state, client };
}

async function runAllTests() {
  const env = {
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    GEMINI_API_KEY: 'test-gemini-key',
    GEMINI_MODEL: 'gemini-2.5-flash'
  };

  // --------------------------------------------------------------------------
  // TEST 1: Unauthenticated request -> 401
  // --------------------------------------------------------------------------
  const { client: db1 } = createMockDatabase();
  const req1 = new Request('http://localhost/generate-contest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ week_start: '2026-10-12' })
  });
  const res1 = await handleGenerateContestRequest(req1, {
    supabaseAdmin: db1,
    envGet: (k) => env[k]
  });
  assert(res1.status === 401, '1. Unauthenticated request returns HTTP 401');

  // --------------------------------------------------------------------------
  // TEST 2: Authenticated non-admin -> 403
  // --------------------------------------------------------------------------
  const { client: db2 } = createMockDatabase();
  const req2 = new Request('http://localhost/generate-contest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer student-token-456'
    },
    body: JSON.stringify({ week_start: '2026-10-12' })
  });
  const res2 = await handleGenerateContestRequest(req2, {
    supabaseAdmin: db2,
    envGet: (k) => env[k]
  });
  assert(res2.status === 403, '2. Authenticated non-admin request returns HTTP 403');

  // --------------------------------------------------------------------------
  // TEST 3: Invalid week_start -> 400
  // --------------------------------------------------------------------------
  const { client: db3 } = createMockDatabase();
  const req3 = new Request('http://localhost/generate-contest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer admin-token-123'
    },
    body: JSON.stringify({ week_start: 'not-a-date' })
  });
  const res3 = await handleGenerateContestRequest(req3, {
    supabaseAdmin: db3,
    envGet: (k) => env[k]
  });
  assert(res3.status === 400, '3. Invalid week_start format returns HTTP 400');

  // --------------------------------------------------------------------------
  // TEST 4: Existing weekly contest -> 409
  // --------------------------------------------------------------------------
  const { state: st4, client: db4 } = createMockDatabase();
  st4.contests.push({
    id: 'existing-contest-1',
    title: 'Existing Challenge',
    status: 'active',
    week_start: '2026-10-12T00:00:00.000Z',
    week_end: '2026-10-19T00:00:00.000Z'
  });
  let geminiCalled = false;
  const mockFetch4 = async () => {
    geminiCalled = true;
    return new Response('{}');
  };
  const req4 = new Request('http://localhost/generate-contest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer admin-token-123'
    },
    body: JSON.stringify({ week_start: '2026-10-12' })
  });
  const res4 = await handleGenerateContestRequest(req4, {
    supabaseAdmin: db4,
    envGet: (k) => env[k],
    fetchImpl: mockFetch4
  });
  assert(
    res4.status === 409 && geminiCalled === false,
    '4. Existing weekly contest returns HTTP 409 and does NOT call Gemini'
  );

  // --------------------------------------------------------------------------
  // TEST 5: Gemini API failure -> no DB records created (502)
  // --------------------------------------------------------------------------
  const { state: st5, client: db5 } = createMockDatabase();
  const mockFetch5 = async () => new Response('Internal Server Error from AI', { status: 500 });
  const req5 = new Request('http://localhost/generate-contest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer admin-token-123'
    },
    body: JSON.stringify({ week_start: '2026-10-12' })
  });
  const res5 = await handleGenerateContestRequest(req5, {
    supabaseAdmin: db5,
    envGet: (k) => env[k],
    fetchImpl: mockFetch5
  });
  assert(
    res5.status === 502 && st5.contests.length === 0 && st5.questions.length === 0,
    '5. Gemini API failure returns HTTP 502 and creates zero DB records'
  );

  // --------------------------------------------------------------------------
  // TEST 6: Invalid Gemini JSON -> no DB records created (422)
  // --------------------------------------------------------------------------
  const { state: st6, client: db6 } = createMockDatabase();
  const mockFetch6 = async () => new Response(JSON.stringify({
    candidates: [{ content: { parts: [{ text: 'NOT VALID JSON {{{' }] } }]
  }));
  const req6 = new Request('http://localhost/generate-contest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer admin-token-123'
    },
    body: JSON.stringify({ week_start: '2026-10-12' })
  });
  const res6 = await handleGenerateContestRequest(req6, {
    supabaseAdmin: db6,
    envGet: (k) => env[k],
    fetchImpl: mockFetch6
  });
  assert(
    res6.status === 422 && st6.contests.length === 0,
    '6. Malformed Gemini JSON returns HTTP 422 and creates zero DB records'
  );

  // --------------------------------------------------------------------------
  // TEST 7: 19 questions -> validation failure + no DB records (422)
  // --------------------------------------------------------------------------
  const { state: st7, client: db7 } = createMockDatabase();
  const raw19 = createValidGeminiApiResponse();
  const questions19 = JSON.parse(raw19.candidates[0].content.parts[0].text).questions;
  questions19.pop();
  raw19.candidates[0].content.parts[0].text = JSON.stringify({ questions: questions19 });

  const mockFetch7 = async () => new Response(JSON.stringify(raw19));
  const req7 = new Request('http://localhost/generate-contest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer admin-token-123'
    },
    body: JSON.stringify({ week_start: '2026-10-12' })
  });
  const res7 = await handleGenerateContestRequest(req7, {
    supabaseAdmin: db7,
    envGet: (k) => env[k],
    fetchImpl: mockFetch7
  });
  const body7 = await res7.json();
  assert(
    res7.status === 422 &&
    body7.validationErrors.some(e => e.rule === 'INVALID_QUESTION_COUNT') &&
    st7.contests.length === 0,
    '7. 19 questions payload returns HTTP 422 with INVALID_QUESTION_COUNT and zero DB records'
  );

  // --------------------------------------------------------------------------
  // TEST 8: Wrong distribution -> validation failure + no DB records (422)
  // --------------------------------------------------------------------------
  const { state: st8, client: db8 } = createMockDatabase();
  const rawBadDist = createValidGeminiApiResponse();
  const questionsBadDist = JSON.parse(rawBadDist.candidates[0].content.parts[0].text).questions;
  // change 1 quantitative question to verbal (making quantitative 5 instead of 6)
  questionsBadDist[0].category = 'verbal';
  rawBadDist.candidates[0].content.parts[0].text = JSON.stringify({ questions: questionsBadDist });

  const mockFetch8 = async () => new Response(JSON.stringify(rawBadDist));
  const req8 = new Request('http://localhost/generate-contest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer admin-token-123'
    },
    body: JSON.stringify({ week_start: '2026-10-12' })
  });
  const res8 = await handleGenerateContestRequest(req8, {
    supabaseAdmin: db8,
    envGet: (k) => env[k],
    fetchImpl: mockFetch8
  });
  const body8 = await res8.json();
  assert(
    res8.status === 422 &&
    body8.validationErrors.some(e => e.rule === 'INCORRECT_CATEGORY_DISTRIBUTION') &&
    st8.contests.length === 0,
    '8. Incorrect category distribution returns HTTP 422 and creates zero DB records'
  );

  // --------------------------------------------------------------------------
  // TEST 9: Valid 20-question response -> contest + 20 questions + 20 mappings (201)
  // --------------------------------------------------------------------------
  const { state: st9, client: db9 } = createMockDatabase();
  const rawValid = createValidGeminiApiResponse();
  const mockFetch9 = async () => new Response(JSON.stringify(rawValid));
  const req9 = new Request('http://localhost/generate-contest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer admin-token-123'
    },
    body: JSON.stringify({ week_start: '2026-10-19' })
  });
  const res9 = await handleGenerateContestRequest(req9, {
    supabaseAdmin: db9,
    envGet: (k) => env[k],
    fetchImpl: mockFetch9
  });
  const body9 = await res9.json();
  assert(
    res9.status === 201 &&
    body9.success === true &&
    st9.contests.length === 1 &&
    st9.questions.length === 20 &&
    st9.contest_questions.length === 20,
    '9. Valid 20-question response creates contest, 20 questions, and 20 mappings'
  );

  // --------------------------------------------------------------------------
  // TEST 10: Second generation for same week -> blocked with 409
  // --------------------------------------------------------------------------
  const req10 = new Request('http://localhost/generate-contest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer admin-token-123'
    },
    body: JSON.stringify({ week_start: '2026-10-19' })
  });
  const res10 = await handleGenerateContestRequest(req10, {
    supabaseAdmin: db9,
    envGet: (k) => env[k],
    fetchImpl: mockFetch9
  });
  assert(
    res10.status === 409,
    '10. Second generation request for the same week is blocked with HTTP 409'
  );

  // --------------------------------------------------------------------------
  // TEST 11: Contest question order is 1–20
  // --------------------------------------------------------------------------
  const orders = st9.contest_questions.map(cq => cq.question_order).sort((a, b) => a - b);
  const isSequential1to20 = orders.length === 20 && orders.every((val, idx) => val === idx + 1);
  assert(isSequential1to20, '11. Contest questions mappings are sequentially ordered 1 through 20');

  // --------------------------------------------------------------------------
  // TEST 12: Generated contest is draft
  // --------------------------------------------------------------------------
  const contestRecord = st9.contests[0];
  assert(contestRecord.status === 'draft', '12. Generated contest status is strictly "draft"');

  // --------------------------------------------------------------------------
  // TEST 13: question_count = 20
  // --------------------------------------------------------------------------
  assert(contestRecord.question_count === 20, '13. Contest question_count is strictly 20');

  // --------------------------------------------------------------------------
  // TEST 14: time_per_question_seconds = 30
  // --------------------------------------------------------------------------
  assert(contestRecord.time_per_question_seconds === 30, '14. Contest time_per_question_seconds is strictly 30');

  // --------------------------------------------------------------------------
  // TEST 15: source_type = AI_GENERATED
  // --------------------------------------------------------------------------
  const allAiGenerated = st9.questions.every(q => q.source_type === 'AI_GENERATED');
  assert(allAiGenerated, '15. All 20 inserted questions have source_type = "AI_GENERATED"');

  // --------------------------------------------------------------------------
  // TEST 16: verified = false
  // --------------------------------------------------------------------------
  const allUnverified = st9.questions.every(q => q.verified === false);
  assert(allUnverified, '16. All 20 inserted questions have verified = false');

  // ==========================================================================
  // REGRESSION TEST SUITE: Gemini Error Handling & Safe Diagnostics
  // ==========================================================================

  // TEST 17: Mocked regression test — Empty candidates array returns HTTP 502 (AI_EMPTY_CANDIDATES)
  const { state: st17, client: db17 } = createMockDatabase();
  const mockFetch17 = async () => new Response(JSON.stringify({ candidates: [] }));
  const req17 = new Request('http://localhost/generate-contest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer admin-token-123' },
    body: JSON.stringify({ week_start: '2026-11-02' })
  });
  const res17 = await handleGenerateContestRequest(req17, {
    supabaseAdmin: db17,
    envGet: (k) => env[k],
    fetchImpl: mockFetch17
  });
  const body17 = await res17.json();
  assert(
    res17.status === 502 && body17.error === 'AI_EMPTY_CANDIDATES' && st17.contests.length === 0,
    '17. Mocked regression test: Empty candidates array returns HTTP 502 (AI_EMPTY_CANDIDATES)'
  );

  // TEST 18: Mocked regression test — Blocked prompt (promptFeedback.blockReason) returns HTTP 502 (AI_PROMPT_BLOCKED)
  const { state: st18, client: db18 } = createMockDatabase();
  const mockFetch18 = async () => new Response(JSON.stringify({
    promptFeedback: { blockReason: 'SAFETY' },
    candidates: []
  }));
  const req18 = new Request('http://localhost/generate-contest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer admin-token-123' },
    body: JSON.stringify({ week_start: '2026-11-09' })
  });
  const res18 = await handleGenerateContestRequest(req18, {
    supabaseAdmin: db18,
    envGet: (k) => env[k],
    fetchImpl: mockFetch18
  });
  const body18 = await res18.json();
  assert(
    res18.status === 502 &&
    body18.error === 'AI_PROMPT_BLOCKED' &&
    body18.blockReason === 'SAFETY' &&
    st18.contests.length === 0,
    '18. Mocked regression test: Blocked prompt (promptFeedback.blockReason) returns HTTP 502 (AI_PROMPT_BLOCKED)'
  );

  // TEST 19: Mocked regression test — Candidate blocked by safety filter returns HTTP 502 (AI_PROMPT_BLOCKED)
  const { state: st19, client: db19 } = createMockDatabase();
  const mockFetch19 = async () => new Response(JSON.stringify({
    candidates: [{
      finishReason: 'SAFETY',
      content: { parts: [{ text: '' }] }
    }]
  }));
  const req19 = new Request('http://localhost/generate-contest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer admin-token-123' },
    body: JSON.stringify({ week_start: '2026-11-16' })
  });
  const res19 = await handleGenerateContestRequest(req19, {
    supabaseAdmin: db19,
    envGet: (k) => env[k],
    fetchImpl: mockFetch19
  });
  const body19 = await res19.json();
  assert(
    res19.status === 502 &&
    body19.error === 'AI_PROMPT_BLOCKED' &&
    body19.finishReason === 'SAFETY' &&
    st19.contests.length === 0,
    '19. Mocked regression test: Candidate blocked by safety filter returns HTTP 502 (AI_PROMPT_BLOCKED)'
  );

  // TEST 20: Mocked regression test — Truncated output (MAX_TOKENS) returns HTTP 502 (AI_MAX_TOKENS)
  const { state: st20, client: db20 } = createMockDatabase();
  const mockFetch20 = async () => new Response(JSON.stringify({
    candidates: [{
      finishReason: 'MAX_TOKENS',
      content: {
        parts: [{
          text: '{"questions": [{"text": "In a competitive exam...", "option_a": "10", "option_b": "20"'
        }]
      }
    }]
  }));
  const req20 = new Request('http://localhost/generate-contest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer admin-token-123' },
    body: JSON.stringify({ week_start: '2026-11-23' })
  });
  const res20 = await handleGenerateContestRequest(req20, {
    supabaseAdmin: db20,
    envGet: (k) => env[k],
    fetchImpl: mockFetch20
  });
  const body20 = await res20.json();
  assert(
    res20.status === 502 &&
    body20.error === 'AI_MAX_TOKENS' &&
    body20.appearsTruncated === true &&
    st20.contests.length === 0,
    '20. Mocked regression test: Truncated output (MAX_TOKENS) returns HTTP 502 (AI_MAX_TOKENS)'
  );

  // TEST 21: Mocked regression test — Truncated unclosed JSON string returns HTTP 502 (AI_MAX_TOKENS)
  const { state: st21, client: db21 } = createMockDatabase();
  const mockFetch21 = async () => new Response(JSON.stringify({
    candidates: [{
      finishReason: 'STOP',
      content: {
        parts: [{
          text: '{"questions": [{"text": "Question 1 without closing brackets"'
        }]
      }
    }]
  }));
  const req21 = new Request('http://localhost/generate-contest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer admin-token-123' },
    body: JSON.stringify({ week_start: '2026-11-30' })
  });
  const res21 = await handleGenerateContestRequest(req21, {
    supabaseAdmin: db21,
    envGet: (k) => env[k],
    fetchImpl: mockFetch21
  });
  const body21 = await res21.json();
  assert(
    res21.status === 502 &&
    body21.error === 'AI_MAX_TOKENS' &&
    body21.appearsTruncated === true &&
    st21.contests.length === 0,
    '21. Mocked regression test: Truncated unclosed JSON returns HTTP 502 (AI_MAX_TOKENS)'
  );

  // TEST 22: Mocked regression test — Malformed JSON returns HTTP 422 (AI_PARSE_ERROR)
  const { state: st22, client: db22 } = createMockDatabase();
  const mockFetch22 = async () => new Response(JSON.stringify({
    candidates: [{
      finishReason: 'STOP',
      content: {
        parts: [{
          text: '{ "invalid_json": true, non_quoted_key: 123 }'
        }]
      }
    }]
  }));
  const req22 = new Request('http://localhost/generate-contest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer admin-token-123' },
    body: JSON.stringify({ week_start: '2026-12-07' })
  });
  const res22 = await handleGenerateContestRequest(req22, {
    supabaseAdmin: db22,
    envGet: (k) => env[k],
    fetchImpl: mockFetch22
  });
  const body22 = await res22.json();
  assert(
    res22.status === 422 &&
    body22.error === 'AI_PARSE_ERROR' &&
    st22.contests.length === 0,
    '22. Mocked regression test: Malformed JSON returns HTTP 422 (AI_PARSE_ERROR)'
  );

  // TEST 23: Mocked regression test — Schema validation failure (bad correct_option) returns HTTP 422 (CONTEST_VALIDATION_FAILED)
  const { state: st23, client: db23 } = createMockDatabase();
  const rawBadOption = createValidGeminiApiResponse();
  const questionsBadOption = JSON.parse(rawBadOption.candidates[0].content.parts[0].text).questions;
  questionsBadOption[0].correct_option = 'Z';
  rawBadOption.candidates[0].content.parts[0].text = JSON.stringify({ questions: questionsBadOption });

  const mockFetch23 = async () => new Response(JSON.stringify(rawBadOption));
  const req23 = new Request('http://localhost/generate-contest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer admin-token-123' },
    body: JSON.stringify({ week_start: '2026-12-14' })
  });
  const res23 = await handleGenerateContestRequest(req23, {
    supabaseAdmin: db23,
    envGet: (k) => env[k],
    fetchImpl: mockFetch23
  });
  const body23 = await res23.json();
  assert(
    res23.status === 422 &&
    body23.error === 'CONTEST_VALIDATION_FAILED' &&
    body23.validationErrors.some(e => e.rule === 'INVALID_CORRECT_OPTION') &&
    st23.contests.length === 0,
    '23. Mocked regression test: Schema validation failure returns HTTP 422 (CONTEST_VALIDATION_FAILED)'
  );

  // ==========================================================================
  // ==========================================================================
  // MULTI-BATCH GENERATION TESTS (4 x 5 Questions Orchestration & Retries)
  // ==========================================================================

  const BATCH_1_ITEMS = [
    { cat: 'quantitative', diff: 'easy', topic: 'Percentages' },
    { cat: 'quantitative', diff: 'easy', topic: 'Ratios' },
    { cat: 'logical_reasoning', diff: 'medium', topic: 'Syllogisms' },
    { cat: 'verbal', diff: 'medium', topic: 'Reading Comprehension' },
    { cat: 'data_interpretation', diff: 'hard', topic: 'Multi-variable Pie Chart Analysis' }
  ];

  const BATCH_2_ITEMS = [
    { cat: 'quantitative', diff: 'easy', topic: 'Profit and Loss Basics' },
    { cat: 'quantitative', diff: 'medium', topic: 'Speed and Distance' },
    { cat: 'logical_reasoning', diff: 'medium', topic: 'Blood Relations' },
    { cat: 'verbal', diff: 'easy', topic: 'Synonyms and Antonyms' },
    { cat: 'general_aptitude', diff: 'hard', topic: 'Abstract Pattern Logic' }
  ];

  const BATCH_3_ITEMS = [
    { cat: 'quantitative', diff: 'medium', topic: 'Time and Work' },
    { cat: 'logical_reasoning', diff: 'medium', topic: 'Seating Arrangement' },
    { cat: 'logical_reasoning', diff: 'hard', topic: 'Complex Analytical Puzzles' },
    { cat: 'verbal', diff: 'easy', topic: 'Sentence Correction' },
    { cat: 'data_interpretation', diff: 'medium', topic: 'Bar Chart Interpretation' }
  ];

  const BATCH_4_ITEMS = [
    { cat: 'quantitative', diff: 'hard', topic: 'Permutations and Combinations' },
    { cat: 'logical_reasoning', diff: 'easy', topic: 'Coding Decoding' },
    { cat: 'verbal', diff: 'medium', topic: 'Paragraph Inference' },
    { cat: 'data_interpretation', diff: 'medium', topic: 'Table Interpretation' },
    { cat: 'general_aptitude', diff: 'medium', topic: 'Logical Sequence and Series' }
  ];

  function createBatchMockResponse(items, offset = 0) {
    const questions = items.map((item, idx) => ({
      text: `Question #${offset + idx + 1}: Solve aptitude problem on ${item.topic}.`,
      option_a: `Choice A for question ${offset + idx + 1}`,
      option_b: `Choice B for question ${offset + idx + 1}`,
      option_c: `Choice C for question ${offset + idx + 1}`,
      option_d: `Choice D for question ${offset + idx + 1}`,
      correct_option: ['A', 'B', 'C', 'D'][(offset + idx) % 4],
      explanation: `Step-by-step reasoning for ${item.topic}.`,
      topic: item.topic,
      difficulty: item.diff,
      category: item.cat
    }));

    return {
      candidates: [
        {
          finishReason: 'STOP',
          content: {
            parts: [{ text: JSON.stringify({ questions }) }]
          }
        }
      ]
    };
  }

  // TEST 24: Mocked 4-batch generation (4 x 5 Qs) succeeds -> 201 with 20 questions and draft contest
  const { state: st24, client: db24 } = createMockDatabase();
  let callCount24 = 0;
  const mockFetch24 = async () => {
    callCount24++;
    if (callCount24 === 1) return new Response(JSON.stringify(createBatchMockResponse(BATCH_1_ITEMS, 0)));
    if (callCount24 === 2) return new Response(JSON.stringify(createBatchMockResponse(BATCH_2_ITEMS, 5)));
    if (callCount24 === 3) return new Response(JSON.stringify(createBatchMockResponse(BATCH_3_ITEMS, 10)));
    return new Response(JSON.stringify(createBatchMockResponse(BATCH_4_ITEMS, 15)));
  };

  const req24 = new Request('http://localhost/generate-contest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer admin-token-123' },
    body: JSON.stringify({ week_start: '2026-12-21' })
  });
  const res24 = await handleGenerateContestRequest(req24, {
    supabaseAdmin: db24,
    envGet: (k) => env[k],
    fetchImpl: mockFetch24
  });
  const body24 = await res24.json();
  assert(
    res24.status === 201 &&
    callCount24 === 4 &&
    body24.success === true &&
    st24.contests.length === 1 &&
    st24.contests[0].status === 'draft' &&
    st24.questions.length === 20 &&
    st24.contest_questions.length === 20 &&
    st24.rpcCalls.length === 1,
    '24. Four-batch generation: 4 batches of 5 questions successfully combine into 20 questions and persist atomically via RPC'
  );

  // TEST 25: Targeted retry succeeds: Batch 2 truncated (MAX_TOKENS) on attempt 1, succeeds on retry
  const { state: st25, client: db25 } = createMockDatabase();
  let callCount25 = 0;
  let batch2Retried = false;
  const mockFetch25 = async (_url, init) => {
    callCount25++;
    const payload = JSON.parse(init.body);
    const isRetry = payload?.contents?.[0]?.parts?.[0]?.text?.includes('RETRY');

    if (callCount25 === 1) {
      return new Response(JSON.stringify(createBatchMockResponse(BATCH_1_ITEMS, 0)));
    }
    if (callCount25 === 2) {
      // First attempt of Batch 2 fails with MAX_TOKENS
      return new Response(JSON.stringify({
        candidates: [{
          finishReason: 'MAX_TOKENS',
          content: { parts: [{ text: '{"questions": [{"text": "Cut short due to token limit"' }] }
        }]
      }));
    }
    if (callCount25 === 3) {
      // Second attempt of Batch 2 (retry) succeeds!
      if (isRetry) batch2Retried = true;
      return new Response(JSON.stringify(createBatchMockResponse(BATCH_2_ITEMS, 5)));
    }
    if (callCount25 === 4) {
      return new Response(JSON.stringify(createBatchMockResponse(BATCH_3_ITEMS, 10)));
    }
    return new Response(JSON.stringify(createBatchMockResponse(BATCH_4_ITEMS, 15)));
  };

  const req25 = new Request('http://localhost/generate-contest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer admin-token-123' },
    body: JSON.stringify({ week_start: '2026-12-28' })
  });
  const res25 = await handleGenerateContestRequest(req25, {
    supabaseAdmin: db25,
    envGet: (k) => env[k],
    fetchImpl: mockFetch25
  });
  const body25 = await res25.json();
  assert(
    res25.status === 201 &&
    callCount25 === 5 &&
    batch2Retried === true &&
    body25.success === true &&
    st25.contests.length === 1 &&
    st25.questions.length === 20 &&
    st25.rpcCalls.length === 1,
    '25. Targeted retry: Batch 2 MAX_TOKENS failure is retried with reduced prompt and succeeds'
  );

  // TEST 26: Targeted retry succeeds: Batch 2 malformed JSON on attempt 1, succeeds on retry
  const { state: st26, client: db26 } = createMockDatabase();
  let callCount26 = 0;
  const mockFetch26 = async () => {
    callCount26++;
    if (callCount26 === 1) return new Response(JSON.stringify(createBatchMockResponse(BATCH_1_ITEMS, 0)));
    if (callCount26 === 2) {
      // Malformed JSON on attempt 1
      return new Response(JSON.stringify({
        candidates: [{
          finishReason: 'STOP',
          content: { parts: [{ text: '{ not valid json: 123 }' }] }
        }]
      }));
    }
    if (callCount26 === 3) return new Response(JSON.stringify(createBatchMockResponse(BATCH_2_ITEMS, 5)));
    if (callCount26 === 4) return new Response(JSON.stringify(createBatchMockResponse(BATCH_3_ITEMS, 10)));
    return new Response(JSON.stringify(createBatchMockResponse(BATCH_4_ITEMS, 15)));
  };

  const req26 = new Request('http://localhost/generate-contest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer admin-token-123' },
    body: JSON.stringify({ week_start: '2027-01-04' })
  });
  const res26 = await handleGenerateContestRequest(req26, {
    supabaseAdmin: db26,
    envGet: (k) => env[k],
    fetchImpl: mockFetch26
  });
  const body26 = await res26.json();
  assert(
    res26.status === 201 &&
    callCount26 === 5 &&
    body26.success === true &&
    st26.contests.length === 1 &&
    st26.questions.length === 20 &&
    st26.rpcCalls.length === 1,
    '26. Targeted retry: Batch 2 malformed JSON failure is retried and succeeds'
  );

  // TEST 27: Targeted retry succeeds: Batch 2 invalid structure on attempt 1, succeeds on retry
  const { state: st27, client: db27 } = createMockDatabase();
  let callCount27 = 0;
  const mockFetch27 = async () => {
    callCount27++;
    if (callCount27 === 1) return new Response(JSON.stringify(createBatchMockResponse(BATCH_1_ITEMS, 0)));
    if (callCount27 === 2) {
      // Returns 4 questions instead of 5
      return new Response(JSON.stringify(createBatchMockResponse(BATCH_2_ITEMS.slice(0, 4), 5)));
    }
    if (callCount27 === 3) return new Response(JSON.stringify(createBatchMockResponse(BATCH_2_ITEMS, 5)));
    if (callCount27 === 4) return new Response(JSON.stringify(createBatchMockResponse(BATCH_3_ITEMS, 10)));
    return new Response(JSON.stringify(createBatchMockResponse(BATCH_4_ITEMS, 15)));
  };

  const req27 = new Request('http://localhost/generate-contest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer admin-token-123' },
    body: JSON.stringify({ week_start: '2027-01-11' })
  });
  const res27 = await handleGenerateContestRequest(req27, {
    supabaseAdmin: db27,
    envGet: (k) => env[k],
    fetchImpl: mockFetch27
  });
  const body27 = await res27.json();
  assert(
    res27.status === 201 &&
    callCount27 === 5 &&
    body27.success === true &&
    st27.contests.length === 1 &&
    st27.questions.length === 20 &&
    st27.rpcCalls.length === 1,
    '27. Targeted retry: Batch 2 invalid batch structure is retried and succeeds'
  );

  // TEST 28: Retry exhaustion: Batch 2 fails attempt 0 AND retry with MAX_TOKENS -> 502, 0 DB records, RPC NOT called
  const { state: st28, client: db28 } = createMockDatabase();
  let callCount28 = 0;
  const mockFetch28 = async () => {
    callCount28++;
    if (callCount28 === 1) return new Response(JSON.stringify(createBatchMockResponse(BATCH_1_ITEMS, 0)));
    // Batch 2 fails on both attempt 0 and retry
    return new Response(JSON.stringify({
      candidates: [{
        finishReason: 'MAX_TOKENS',
        content: { parts: [{ text: '{"questions": [{"text": "Cut short due to token budget"' }] }
      }]
    }));
  };

  const req28 = new Request('http://localhost/generate-contest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer admin-token-123' },
    body: JSON.stringify({ week_start: '2027-01-18' })
  });
  const res28 = await handleGenerateContestRequest(req28, {
    supabaseAdmin: db28,
    envGet: (k) => env[k],
    fetchImpl: mockFetch28
  });
  const body28 = await res28.json();
  assert(
    res28.status === 502 &&
    callCount28 === 3 && // Batch 1 + Batch 2 (attempt 0) + Batch 2 (retry 1)
    body28.error === 'AI_MAX_TOKENS' &&
    st28.contests.length === 0 &&
    st28.questions.length === 0 &&
    st28.rpcCalls.length === 0,
    '28. Retry exhaustion: Batch 2 repeated MAX_TOKENS halts generation, creates zero DB records, RPC is not called'
  );

  // TEST 29: Retry exhaustion: Batch 2 provider HTTP 500 error on both attempts -> 502, 0 DB records, RPC NOT called
  const { state: st29, client: db29 } = createMockDatabase();
  let callCount29 = 0;
  const mockFetch29 = async () => {
    callCount29++;
    if (callCount29 === 1) return new Response(JSON.stringify(createBatchMockResponse(BATCH_1_ITEMS, 0)));
    return new Response('Internal error in Gemini upstream cluster', { status: 500 });
  };

  const req29 = new Request('http://localhost/generate-contest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer admin-token-123' },
    body: JSON.stringify({ week_start: '2027-01-25' })
  });
  const res29 = await handleGenerateContestRequest(req29, {
    supabaseAdmin: db29,
    envGet: (k) => env[k],
    fetchImpl: mockFetch29
  });
  const body29 = await res29.json();
  assert(
    res29.status === 502 &&
    callCount29 === 3 &&
    body29.error === 'AI_PROVIDER_ERROR' &&
    st29.contests.length === 0 &&
    st29.questions.length === 0 &&
    st29.rpcCalls.length === 0,
    '29. Retry exhaustion: Batch 2 provider HTTP 500 halts generation, creates zero DB records, RPC is not called'
  );

  // TEST 30: Combined full-set validation failure: duplicate question across batches -> 422, RPC NOT called
  const { state: st30, client: db30 } = createMockDatabase();
  let callCount30 = 0;
  const mockFetch30 = async () => {
    callCount30++;
    if (callCount30 === 1) return new Response(JSON.stringify(createBatchMockResponse(BATCH_1_ITEMS, 0)));
    if (callCount30 === 2) return new Response(JSON.stringify(createBatchMockResponse(BATCH_2_ITEMS, 5)));
    if (callCount30 === 3) return new Response(JSON.stringify(createBatchMockResponse(BATCH_3_ITEMS, 10)));
    // Batch 4 duplicates the text of question 1 from Batch 1!
    const batch4Dup = JSON.parse(JSON.stringify(BATCH_4_ITEMS));
    const resp = createBatchMockResponse(batch4Dup, 15);
    const parsed = JSON.parse(resp.candidates[0].content.parts[0].text);
    parsed.questions[0].text = `Question #1: Solve aptitude problem on Percentages.`;
    resp.candidates[0].content.parts[0].text = JSON.stringify(parsed);
    return new Response(JSON.stringify(resp));
  };

  const req30 = new Request('http://localhost/generate-contest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer admin-token-123' },
    body: JSON.stringify({ week_start: '2027-02-01' })
  });
  const res30 = await handleGenerateContestRequest(req30, {
    supabaseAdmin: db30,
    envGet: (k) => env[k],
    fetchImpl: mockFetch30
  });
  const body30 = await res30.json();
  assert(
    res30.status === 422 &&
    callCount30 === 4 &&
    body30.error === 'CONTEST_VALIDATION_FAILED' &&
    body30.validationErrors.some(e => e.rule === 'DUPLICATE_QUESTION') &&
    st30.contests.length === 0 &&
    st30.questions.length === 0 &&
    st30.rpcCalls.length === 0,
    '30. Full-set validation: Cross-batch duplicate question is rejected with HTTP 422 and RPC is not called'
  );

  console.log('\n========================================================');
  console.log(`   STAGE 5B TEST RESULTS: ${passedTests} / ${totalTests} PASSED`);
  console.log('========================================================');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('Test execution failed with error:', err);
  process.exit(1);
});
