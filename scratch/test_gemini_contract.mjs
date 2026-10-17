import {
  REQUIRED_QUESTION_COUNT,
  CATEGORY_DISTRIBUTION,
  DIFFICULTY_DISTRIBUTION,
  ALLOWED_CATEGORIES,
  ALLOWED_DIFFICULTIES,
  ALLOWED_CORRECT_OPTIONS,
  validateGeminiContestResponse,
  transformToDatabaseQuestions,
  buildGeminiContestPrompt
} from '../src/lib/geminiContract.js';

console.log('========================================================');
console.log('   RUNNING STAGE 5A — GEMINI CONTRACT TEST SUITE');
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

// Helper: build a baseline valid 20-question response
function createValidContestBatch() {
  // Category counts: quantitative=6, logical_reasoning=5, verbal=4, data_interpretation=3, general_aptitude=2
  // Difficulty counts: easy=6, medium=10, hard=4
  const spec = [
    // 6 Quantitative (2 easy, 3 medium, 1 hard)
    { cat: 'quantitative', diff: 'easy', topic: 'Percentages' },
    { cat: 'quantitative', diff: 'easy', topic: 'Ratios' },
    { cat: 'quantitative', diff: 'medium', topic: 'Time and Work' },
    { cat: 'quantitative', diff: 'medium', topic: 'Speed and Distance' },
    { cat: 'quantitative', diff: 'medium', topic: 'Profit and Loss' },
    { cat: 'quantitative', diff: 'hard', topic: 'Permutations and Combinations' },

    // 5 Logical Reasoning (1 easy, 3 medium, 1 hard)
    { cat: 'logical_reasoning', diff: 'easy', topic: 'Coding Decoding' },
    { cat: 'logical_reasoning', diff: 'medium', topic: 'Syllogisms' },
    { cat: 'logical_reasoning', diff: 'medium', topic: 'Blood Relations' },
    { cat: 'logical_reasoning', diff: 'medium', topic: 'Seating Arrangement' },
    { cat: 'logical_reasoning', diff: 'hard', topic: 'Complex Analytical Puzzles' },

    // 4 Verbal (2 easy, 1 medium, 1 hard)
    { cat: 'verbal', diff: 'easy', topic: 'Synonyms and Antonyms' },
    { cat: 'verbal', diff: 'easy', topic: 'Sentence Correction' },
    { cat: 'verbal', diff: 'medium', topic: 'Reading Comprehension' },
    { cat: 'verbal', diff: 'hard', topic: 'Paragraph Inference and Critical Reasoning' },

    // 3 Data Interpretation (0 easy, 2 medium, 1 hard)
    { cat: 'data_interpretation', diff: 'medium', topic: 'Bar Chart Interpretation' },
    { cat: 'data_interpretation', diff: 'medium', topic: 'Table Interpretation' },
    { cat: 'data_interpretation', diff: 'hard', topic: 'Multi-variable Pie Chart Analysis' },

    // 2 General Aptitude (1 easy, 1 medium, 0 hard)
    { cat: 'general_aptitude', diff: 'easy', topic: 'Pattern Recognition' },
    { cat: 'general_aptitude', diff: 'medium', topic: 'Logical Sequence and Series' },
  ];

  const questions = spec.map((item, idx) => {
    const qNum = idx + 1;
    return {
      text: `Question #${qNum}: In a standard collegiate contest, calculate the value of parameter X given initial conditions for ${item.topic}.`,
      option_a: `Option A for Q${qNum} representing valid test choice 1`,
      option_b: `Option B for Q${qNum} representing valid test choice 2`,
      option_c: `Option C for Q${qNum} representing valid test choice 3`,
      option_d: `Option D for Q${qNum} representing valid test choice 4`,
      correct_option: ['A', 'B', 'C', 'D'][idx % 4],
      explanation: `Step-by-step solution for Question #${qNum}: Following the standard formula for ${item.topic}, we derive the correct solution matching the selected option.`,
      topic: item.topic,
      difficulty: item.diff,
      category: item.cat
    };
  });

  return { questions };
}

// ----------------------------------------------------
// TEST 1: Baseline valid 20-question response
// ----------------------------------------------------
const validBatch = createValidContestBatch();
const res1 = validateGeminiContestResponse(validBatch);
assert(
  res1.isValid === true && res1.errors.length === 0 && res1.sanitizedData.questions.length === 20,
  '1. Valid 20-question response passes all validation checks'
);

// ----------------------------------------------------
// TEST 2: 19 questions (Rejected)
// ----------------------------------------------------
const batch19 = createValidContestBatch();
batch19.questions.pop();
const res2 = validateGeminiContestResponse(batch19);
assert(
  res2.isValid === false && res2.errors.some(e => e.rule === 'INVALID_QUESTION_COUNT'),
  '2. 19 questions response is rejected with INVALID_QUESTION_COUNT'
);

// ----------------------------------------------------
// TEST 3: 21 questions (Rejected)
// ----------------------------------------------------
const batch21 = createValidContestBatch();
batch21.questions.push({ ...batch21.questions[0], text: 'Question #21: Additional question exceeding contest limit.' });
const res3 = validateGeminiContestResponse(batch21);
assert(
  res3.isValid === false && res3.errors.some(e => e.rule === 'INVALID_QUESTION_COUNT'),
  '3. 21 questions response is rejected with INVALID_QUESTION_COUNT'
);

// ----------------------------------------------------
// TEST 4: Missing option (e.g. option_c is missing)
// ----------------------------------------------------
const batchMissingOption = createValidContestBatch();
delete batchMissingOption.questions[2].option_c;
const res4 = validateGeminiContestResponse(batchMissingOption);
assert(
  res4.isValid === false && res4.errors.some(e => e.rule === 'MISSING_OPTION'),
  '4. Missing option (option_c omitted) is rejected with MISSING_OPTION'
);

// ----------------------------------------------------
// TEST 5: Invalid correct_option (e.g. 'E')
// ----------------------------------------------------
const batchInvalidCorrect = createValidContestBatch();
batchInvalidCorrect.questions[3].correct_option = 'E';
const res5 = validateGeminiContestResponse(batchInvalidCorrect);
assert(
  res5.isValid === false && res5.errors.some(e => e.rule === 'INVALID_CORRECT_OPTION'),
  '5. Invalid correct_option "E" is rejected with INVALID_CORRECT_OPTION'
);

// ----------------------------------------------------
// TEST 6: Invalid category (e.g. 'coding')
// ----------------------------------------------------
const batchInvalidCat = createValidContestBatch();
batchInvalidCat.questions[4].category = 'coding';
const res6 = validateGeminiContestResponse(batchInvalidCat);
assert(
  res6.isValid === false && res6.errors.some(e => e.rule === 'INVALID_CATEGORY'),
  '6. Invalid category "coding" is rejected with INVALID_CATEGORY'
);

// ----------------------------------------------------
// TEST 7: Invalid difficulty (e.g. 'extreme')
// ----------------------------------------------------
const batchInvalidDiff = createValidContestBatch();
batchInvalidDiff.questions[5].difficulty = 'extreme';
const res7 = validateGeminiContestResponse(batchInvalidDiff);
assert(
  res7.isValid === false && res7.errors.some(e => e.rule === 'INVALID_DIFFICULTY'),
  '7. Invalid difficulty "extreme" is rejected with INVALID_DIFFICULTY'
);

// ----------------------------------------------------
// TEST 8: Incorrect category distribution
// (e.g. verbal=5 instead of 4, quantitative=5 instead of 6)
// ----------------------------------------------------
const batchBadCatDist = createValidContestBatch();
// change one quantitative question to verbal
batchBadCatDist.questions[0].category = 'verbal';
const res8 = validateGeminiContestResponse(batchBadCatDist);
assert(
  res8.isValid === false && res8.errors.some(e => e.rule === 'INCORRECT_CATEGORY_DISTRIBUTION'),
  '8. Incorrect category distribution is rejected with INCORRECT_CATEGORY_DISTRIBUTION'
);

// ----------------------------------------------------
// TEST 9: Incorrect difficulty distribution
// (e.g. easy=7, medium=9)
// ----------------------------------------------------
const batchBadDiffDist = createValidContestBatch();
// change one medium question to easy
batchBadDiffDist.questions[2].difficulty = 'easy';
const res9 = validateGeminiContestResponse(batchBadDiffDist);
assert(
  res9.isValid === false && res9.errors.some(e => e.rule === 'INCORRECT_DIFFICULTY_DISTRIBUTION'),
  '9. Incorrect difficulty distribution is rejected with INCORRECT_DIFFICULTY_DISTRIBUTION'
);

// ----------------------------------------------------
// TEST 10: Duplicate question detected
// ----------------------------------------------------
const batchDuplicate = createValidContestBatch();
batchDuplicate.questions[1].text = batchDuplicate.questions[0].text;
const res10 = validateGeminiContestResponse(batchDuplicate);
assert(
  res10.isValid === false && res10.errors.some(e => e.rule === 'DUPLICATE_QUESTION'),
  '10. Duplicate question text in the same batch is rejected with DUPLICATE_QUESTION'
);

// ----------------------------------------------------
// TEST 11: Empty or meaningless text
// ----------------------------------------------------
const batchEmptyText = createValidContestBatch();
batchEmptyText.questions[0].text = '   ';
const res11 = validateGeminiContestResponse(batchEmptyText);
assert(
  res11.isValid === false && res11.errors.some(e => e.rule === 'MISSING_QUESTION_TEXT'),
  '11. Empty question text is rejected with MISSING_QUESTION_TEXT'
);

const batchShortText = createValidContestBatch();
batchShortText.questions[0].text = 'Too short';
const res11b = validateGeminiContestResponse(batchShortText);
assert(
  res11b.isValid === false && res11b.errors.some(e => e.rule === 'MEANINGLESS_QUESTION_TEXT'),
  '12. Meaningless short question text (<10 chars) is rejected with MEANINGLESS_QUESTION_TEXT'
);

// ----------------------------------------------------
// TEST 13: Missing explanation
// ----------------------------------------------------
const batchMissingExpl = createValidContestBatch();
batchMissingExpl.questions[3].explanation = '';
const res13 = validateGeminiContestResponse(batchMissingExpl);
assert(
  res13.isValid === false && res13.errors.some(e => e.rule === 'MISSING_EXPLANATION'),
  '13. Missing explanation is rejected with MISSING_EXPLANATION'
);

// ----------------------------------------------------
// TEST 14: Empty option text
// ----------------------------------------------------
const batchEmptyOption = createValidContestBatch();
batchEmptyOption.questions[4].option_b = '   ';
const res14 = validateGeminiContestResponse(batchEmptyOption);
assert(
  res14.isValid === false && res14.errors.some(e => e.rule === 'EMPTY_OPTION'),
  '14. Whitespace-only option is rejected with EMPTY_OPTION'
);

// ----------------------------------------------------
// TEST 15: Target option of correct_option is empty
// ----------------------------------------------------
const batchTargetOptionEmpty = createValidContestBatch();
batchTargetOptionEmpty.questions[0].correct_option = 'C';
batchTargetOptionEmpty.questions[0].option_c = '';
const res15 = validateGeminiContestResponse(batchTargetOptionEmpty);
assert(
  res15.isValid === false && res15.errors.some(e => e.rule === 'CORRECT_OPTION_TARGET_EMPTY'),
  '15. Declared correct_option pointing to empty option is rejected with CORRECT_OPTION_TARGET_EMPTY'
);

// ----------------------------------------------------
// TEST 16: Root missing or not an array
// ----------------------------------------------------
const res16a = validateGeminiContestResponse(null);
const res16b = validateGeminiContestResponse({ not_questions: [] });
const res16c = validateGeminiContestResponse({ questions: "not an array" });
assert(
  res16a.isValid === false && res16b.isValid === false && res16c.isValid === false,
  '16. Non-object, missing questions, and non-array payloads are cleanly rejected'
);

// ----------------------------------------------------
// TEST 17: Database Transformation Helper
// ----------------------------------------------------
const dbRows = transformToDatabaseQuestions(validBatch.questions);
assert(
  dbRows.length === 20 &&
  dbRows[0].source_type === 'AI_GENERATED' &&
  dbRows[0].verified === false &&
  dbRows[0].source_name.includes('Gemini') &&
  dbRows[0].question_text.length > 0 &&
  dbRows[0].option_a.length > 0,
  '17. Database transformation correctly maps to public.questions columns with source_type=AI_GENERATED'
);

// ----------------------------------------------------
// TEST 18: Authoritative Prompt Builder Check
// ----------------------------------------------------
const { systemInstruction, userPrompt } = buildGeminiContestPrompt({ weekNumber: 4 });
assert(
  systemInstruction.includes('Lead Psychometrician') &&
  systemInstruction.includes('ANTI-HALLUCINATION') &&
  userPrompt.includes('Week #4') &&
  userPrompt.includes('quantitative": EXACTLY 6') &&
  userPrompt.includes('logical_reasoning": EXACTLY 5') &&
  userPrompt.includes('verbal": EXACTLY 4') &&
  userPrompt.includes('data_interpretation": EXACTLY 3') &&
  userPrompt.includes('general_aptitude": EXACTLY 2') &&
  userPrompt.includes('easy": EXACTLY 6') &&
  userPrompt.includes('medium": EXACTLY 10') &&
  userPrompt.includes('hard": EXACTLY 4'),
  '18. Gemini generation prompt specifies exact 20-question count, full distribution matrix, and self-check rules'
);

// ----------------------------------------------------
// TEST 19: Four-Batch Specifications and Constants
// ----------------------------------------------------
import {
  BATCH_1_SPEC,
  BATCH_2_SPEC,
  BATCH_3_SPEC,
  BATCH_4_SPEC,
  BATCH_SPECS,
  validateBatchQuestions,
  checkTruncation
} from '../src/lib/geminiContract.js';

assert(
  Array.isArray(BATCH_SPECS) &&
  BATCH_SPECS.length === 4 &&
  BATCH_SPECS[0] === BATCH_1_SPEC &&
  BATCH_SPECS[1] === BATCH_2_SPEC &&
  BATCH_SPECS[2] === BATCH_3_SPEC &&
  BATCH_SPECS[3] === BATCH_4_SPEC,
  '19. Four batch specifications (BATCH_1_SPEC to BATCH_4_SPEC) are defined and exported in BATCH_SPECS'
);

// ----------------------------------------------------
// TEST 20: Batch Distribution Totals match 20-question full-set contract
// ----------------------------------------------------
const totalBatchQuestions = BATCH_SPECS.reduce((sum, b) => sum + b.questionCount, 0);
const batchCategoryTotals = {
  quantitative: 0,
  logical_reasoning: 0,
  verbal: 0,
  data_interpretation: 0,
  general_aptitude: 0
};
const batchDifficultyTotals = {
  easy: 0,
  medium: 0,
  hard: 0
};

BATCH_SPECS.forEach(b => {
  assert(b.questionCount === 5, `Batch ${b.batchNumber} has questionCount === 5`);
  for (const [cat, count] of Object.entries(b.categoryDistribution)) {
    batchCategoryTotals[cat] = (batchCategoryTotals[cat] || 0) + count;
  }
  for (const [diff, count] of Object.entries(b.difficultyDistribution)) {
    batchDifficultyTotals[diff] = (batchDifficultyTotals[diff] || 0) + count;
  }
});

const categoriesMatch =
  batchCategoryTotals.quantitative === 6 &&
  batchCategoryTotals.logical_reasoning === 5 &&
  batchCategoryTotals.verbal === 4 &&
  batchCategoryTotals.data_interpretation === 3 &&
  batchCategoryTotals.general_aptitude === 2;

const difficultiesMatch =
  batchDifficultyTotals.easy === 6 &&
  batchDifficultyTotals.medium === 10 &&
  batchDifficultyTotals.hard === 4;

assert(
  totalBatchQuestions === 20 && categoriesMatch && difficultiesMatch,
  '20. Four batches collectively sum to exactly 20 questions, 6/5/4/3/2 categories, and 6/10/4 difficulties'
);

// ----------------------------------------------------
// TEST 21: Batch Validation Engine (validateBatchQuestions)
// ----------------------------------------------------
const validBatch1Questions = [
  { text: 'In a class of 60 students, 40% are girls. How many boys are there?', option_a: '24', option_b: '36', option_c: '30', option_d: '40', correct_option: 'B', explanation: '40% of 60 is 24 girls, so boys = 60 - 24 = 36.', topic: 'Percentages', difficulty: 'easy', category: 'quantitative' },
  { text: 'If 3x + 5 = 20, what is the value of 6x - 2 in algebra?', option_a: '28', option_b: '30', option_c: '32', option_d: '34', correct_option: 'A', explanation: '3x = 15 so x = 5. Then 6(5) - 2 = 28.', topic: 'Algebra', difficulty: 'easy', category: 'quantitative' },
  { text: 'Complete the letter series: AZ, BY, CX, DW, ?', option_a: 'EV', option_b: 'FU', option_c: 'GT', option_d: 'HS', correct_option: 'A', explanation: 'Forward alphabet paired with reverse alphabet: E pairs with V.', topic: 'Series', difficulty: 'medium', category: 'logical_reasoning' },
  { text: 'Choose the antonym for the word "BENEVOLENT" in English.', option_a: 'Generous', option_b: 'Malevolent', option_c: 'Kind', option_d: 'Altruistic', correct_option: 'B', explanation: 'Malevolent is the direct opposite of benevolent.', topic: 'Antonyms', difficulty: 'medium', category: 'verbal' },
  { text: 'Study the table: Product A sales = 100, B = 150. What is the ratio A:B?', option_a: '2:3', option_b: '3:2', option_c: '1:2', option_d: '3:4', correct_option: 'A', explanation: '100/150 simplifies to 2/3.', topic: 'Table Interpretation', difficulty: 'hard', category: 'data_interpretation' }
];

const batch1ValResult = validateBatchQuestions(validBatch1Questions, BATCH_1_SPEC);
assert(
  batch1ValResult.isValid === true && batch1ValResult.sanitizedQuestions.length === 5,
  '21. validateBatchQuestions passes for a valid 5-question batch matching BATCH_1_SPEC'
);

// ----------------------------------------------------
// TEST 22: validateBatchQuestions rejects invalid batches
// ----------------------------------------------------
const badBatchCount = validateBatchQuestions(validBatch1Questions.slice(0, 4), BATCH_1_SPEC);
const badBatchMissingOption = validateBatchQuestions(
  validBatch1Questions.map((q, i) => i === 0 ? { ...q, option_a: '' } : q),
  BATCH_1_SPEC
);
const badBatchDist = validateBatchQuestions(
  validBatch1Questions.map((q, i) => i === 0 ? { ...q, category: 'verbal' } : q),
  BATCH_1_SPEC
);

assert(
  badBatchCount.isValid === false &&
  badBatchMissingOption.isValid === false &&
  badBatchDist.isValid === false,
  '22. validateBatchQuestions rejects wrong question counts, missing options, and distribution mismatches'
);

// ----------------------------------------------------
// TEST 23: Truncation detection checks
// ----------------------------------------------------
assert(
  checkTruncation('{"questions": [{"text": "incomplete', 'MAX_TOKENS') === true &&
  checkTruncation('{"questions": [{"text": "incomplete', 'STOP') === true &&
  checkTruncation('{"questions": []}', 'STOP') === false,
  '23. checkTruncation accurately identifies MAX_TOKENS and unclosed JSON fragments'
);

// ----------------------------------------------------
// TEST 24: Four-Batch Prompt Builder and Retry Flag
// ----------------------------------------------------
const p1 = buildGeminiContestPrompt({ batchNumber: 1, weekNumber: 2 });
const pRetry = buildGeminiContestPrompt({ batchNumber: 1, weekNumber: 2, isRetry: true });
assert(
  p1.userPrompt.includes('Batch #1 of 4') &&
  p1.userPrompt.includes('EXACTLY 5 questions') &&
  p1.userPrompt.includes('Limit explanation to approximately 1-2 sentences') &&
  pRetry.userPrompt.includes('CRITICAL RETRY INSTRUCTION') &&
  pRetry.userPrompt.includes('Limit explanation strictly to 1 sentence'),
  '24. Prompt builder generates batch-specific prompts and targeted brevity prompts on retry'
);

console.log('\n========================================================');
console.log(`   TEST RESULTS: ${passedTests} / ${totalTests} PASSED`);
console.log('========================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}

