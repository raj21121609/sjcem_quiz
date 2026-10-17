/**
 * SJCEM Weekly Aptitude Contest Platform - Stage 5A
 * Gemini Question Generation Contract & Server-Side Validator
 * 
 * Location: supabase/functions/_shared/geminiContract.ts
 * 
 * Purpose:
 * Strictly defines the schema, types, distribution constants, anti-hallucination prompt,
 * and server-side validation engine for AI-generated weekly aptitude contest questions.
 * 
 * SECURITY:
 * Gemini must NEVER be called from the browser. The generation and validation
 * occur strictly server-side within a privileged Supabase Edge Function.
 */

// ==============================================================================
// 1. CONSTANTS & SPECIFICATIONS
// ==============================================================================

export const REQUIRED_QUESTION_COUNT = 20;

export const ALLOWED_CATEGORIES = [
  'quantitative',
  'logical_reasoning',
  'verbal',
  'data_interpretation',
  'general_aptitude'
] as const;

export type QuestionCategory = typeof ALLOWED_CATEGORIES[number];

export const ALLOWED_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

export type QuestionDifficulty = typeof ALLOWED_DIFFICULTIES[number];

export const ALLOWED_CORRECT_OPTIONS = ['A', 'B', 'C', 'D'] as const;

export type CorrectOption = typeof ALLOWED_CORRECT_OPTIONS[number];

/**
 * Category Distribution (Total = 20)
 * - Quantitative Aptitude: 6 questions
 * - Logical Reasoning: 5 questions
 * - Verbal Ability: 4 questions
 * - Data Interpretation: 3 questions
 * - General Aptitude / Mixed: 2 questions
 */
export const CATEGORY_DISTRIBUTION: Record<QuestionCategory, number> = {
  quantitative: 6,
  logical_reasoning: 5,
  verbal: 4,
  data_interpretation: 3,
  general_aptitude: 2
};

/**
 * Difficulty Distribution (Total = 20)
 * - Easy: 6 questions
 * - Medium: 10 questions
 * - Hard: 4 questions
 */
export const DIFFICULTY_DISTRIBUTION: Record<QuestionDifficulty, number> = {
  easy: 6,
  medium: 10,
  hard: 4
};

export const GEMINI_DEFAULT_MAX_OUTPUT_TOKENS = 4096;
export const BATCH_DEFAULT_MAX_OUTPUT_TOKENS = 4096;

export interface BatchSpec {
  batchNumber: number;
  questionCount: number;
  categoryDistribution: Partial<Record<QuestionCategory, number>>;
  difficultyDistribution: Partial<Record<QuestionDifficulty, number>>;
}

export const BATCH_1_SPEC: BatchSpec = {
  batchNumber: 1,
  questionCount: 5,
  categoryDistribution: {
    quantitative: 2,
    logical_reasoning: 1,
    verbal: 1,
    data_interpretation: 1,
    general_aptitude: 0
  },
  difficultyDistribution: {
    easy: 2,
    medium: 2,
    hard: 1
  }
};

export const BATCH_2_SPEC: BatchSpec = {
  batchNumber: 2,
  questionCount: 5,
  categoryDistribution: {
    quantitative: 2,
    logical_reasoning: 1,
    verbal: 1,
    data_interpretation: 0,
    general_aptitude: 1
  },
  difficultyDistribution: {
    easy: 2,
    medium: 2,
    hard: 1
  }
};

export const BATCH_3_SPEC: BatchSpec = {
  batchNumber: 3,
  questionCount: 5,
  categoryDistribution: {
    quantitative: 1,
    logical_reasoning: 2,
    verbal: 1,
    data_interpretation: 1,
    general_aptitude: 0
  },
  difficultyDistribution: {
    easy: 1,
    medium: 3,
    hard: 1
  }
};

export const BATCH_4_SPEC: BatchSpec = {
  batchNumber: 4,
  questionCount: 5,
  categoryDistribution: {
    quantitative: 1,
    logical_reasoning: 1,
    verbal: 1,
    data_interpretation: 1,
    general_aptitude: 1
  },
  difficultyDistribution: {
    easy: 1,
    medium: 3,
    hard: 1
  }
};

export const BATCH_SPECS: BatchSpec[] = [BATCH_1_SPEC, BATCH_2_SPEC, BATCH_3_SPEC, BATCH_4_SPEC];

/**
 * Heuristic and metadata checker to determine if model output appears truncated.
 * 
 * @param {string|null|undefined} text Raw text returned by candidate
 * @param {string|null|undefined} finishReason Gemini finishReason token
 * @returns {boolean}
 */
export function checkTruncation(text?: string | null, finishReason?: string | null): boolean {
  if (finishReason === 'MAX_TOKENS') {
    return true;
  }
  if (!text || typeof text !== 'string') {
    return false;
  }
  const trimmed = text.trim();
  let cleaned = trimmed;
  let wrappedInCodeFence = false;
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7).trim();
    wrappedInCodeFence = true;
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3).trim();
    wrappedInCodeFence = true;
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3).trim();
  }

  const startsLikeJson = cleaned.startsWith('{') || wrappedInCodeFence;
  const endsLikeJson = cleaned.endsWith('}');

  if (startsLikeJson && !endsLikeJson) {
    return true;
  }

  if (finishReason && finishReason !== 'STOP') {
    return true;
  }

  return false;
}

export interface ValidationError {
  rule: string;
  message: string;
  questionIndex?: number;
  field?: string;
}

export interface ValidatedQuestion {
  text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: CorrectOption;
  explanation: string;
  topic: string;
  difficulty: QuestionDifficulty;
  category: QuestionCategory;
}

/**
 * Validates a single batch of questions against its batch specification.
 */
export function validateBatchQuestions(questions: any, batchSpec: BatchSpec): {
  isValid: boolean;
  errors: ValidationError[];
  sanitizedQuestions: ValidatedQuestion[];
} {
  const errors: ValidationError[] = [];
  if (!Array.isArray(questions)) {
    return {
      isValid: false,
      errors: [{ rule: 'QUESTIONS_ARRAY_REQUIRED', message: 'Batch questions must be an array.' }],
      sanitizedQuestions: []
    };
  }

  const expectedCount = batchSpec?.questionCount || 5;
  if (questions.length !== expectedCount) {
    errors.push({
      rule: 'INVALID_QUESTION_COUNT',
      message: `Batch expected exactly ${expectedCount} questions, but received ${questions.length}.`
    });
  }

  const sanitizedQuestions: ValidatedQuestion[] = [];
  const seenQuestionTexts = new Set<string>();
  const categoryCounts: Record<string, number> = {
    quantitative: 0,
    logical_reasoning: 0,
    verbal: 0,
    data_interpretation: 0,
    general_aptitude: 0
  };
  const difficultyCounts: Record<string, number> = {
    easy: 0,
    medium: 0,
    hard: 0
  };

  questions.forEach((qItem: any, idx: number) => {
    const qNum = idx + 1;
    if (!qItem || typeof qItem !== 'object') {
      errors.push({ rule: 'INVALID_QUESTION_OBJECT', message: `Question #${qNum} is not an object.`, questionIndex: idx });
      return;
    }

    const rawText = typeof qItem.text === 'string' ? qItem.text : (typeof qItem.question_text === 'string' ? qItem.question_text : '');
    const trimmedText = rawText.trim();
    if (!trimmedText) {
      errors.push({ rule: 'MISSING_QUESTION_TEXT', message: `Question #${qNum} is missing "text".`, questionIndex: idx, field: 'text' });
    } else if (trimmedText.length < 10) {
      errors.push({ rule: 'MEANINGLESS_QUESTION_TEXT', message: `Question #${qNum} text is too short (< 10 chars).`, questionIndex: idx, field: 'text' });
    }

    if (trimmedText) {
      const normalized = trimmedText.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (seenQuestionTexts.has(normalized)) {
        errors.push({ rule: 'DUPLICATE_QUESTION', message: `Question #${qNum} is a duplicate in this batch.`, questionIndex: idx, field: 'text' });
      } else {
        seenQuestionTexts.add(normalized);
      }
    }

    const optionKeys = ['option_a', 'option_b', 'option_c', 'option_d'];
    const optionValues: Record<string, string> = {};
    for (const key of optionKeys) {
      const val = qItem[key];
      if (typeof val !== 'string') {
        errors.push({ rule: 'MISSING_OPTION', message: `Question #${qNum} is missing option "${key}".`, questionIndex: idx, field: key });
        optionValues[key] = '';
      } else {
        const trimmedVal = val.trim();
        if (trimmedVal.length === 0) {
          errors.push({ rule: 'EMPTY_OPTION', message: `Question #${qNum} has an empty "${key}".`, questionIndex: idx, field: key });
        }
        optionValues[key] = trimmedVal;
      }
    }

    const extraOptions = Object.keys(qItem).filter(k => k.startsWith('option_') && !optionKeys.includes(k));
    if (extraOptions.length > 0) {
      errors.push({ rule: 'EXTRA_OPTIONS_DETECTED', message: `Question #${qNum} contains unexpected options: ${extraOptions.join(', ')}.`, questionIndex: idx });
    }

    const rawCorrect = typeof qItem.correct_option === 'string' ? qItem.correct_option.trim().toUpperCase() : '';
    if (!ALLOWED_CORRECT_OPTIONS.includes(rawCorrect as any)) {
      errors.push({ rule: 'INVALID_CORRECT_OPTION', message: `Question #${qNum} has invalid correct_option "${qItem.correct_option}".`, questionIndex: idx, field: 'correct_option' });
    } else {
      const mappedKey = `option_${rawCorrect.toLowerCase()}`;
      if (!optionValues[mappedKey] || optionValues[mappedKey].length === 0) {
        errors.push({ rule: 'CORRECT_OPTION_TARGET_EMPTY', message: `Question #${qNum} declared correct_option "${rawCorrect}" which points to an empty option.`, questionIndex: idx, field: 'correct_option' });
      }
    }

    const rawExplanation = typeof qItem.explanation === 'string' ? qItem.explanation.trim() : '';
    if (!rawExplanation || rawExplanation.length < 5) {
      errors.push({ rule: 'MISSING_EXPLANATION', message: `Question #${qNum} is missing explanation.`, questionIndex: idx, field: 'explanation' });
    }

    const rawCategory = typeof qItem.category === 'string' ? qItem.category.trim().toLowerCase() : '';
    if (!ALLOWED_CATEGORIES.includes(rawCategory as any)) {
      errors.push({ rule: 'INVALID_CATEGORY', message: `Question #${qNum} has invalid category "${qItem.category}".`, questionIndex: idx, field: 'category' });
    } else {
      categoryCounts[rawCategory]++;
    }

    const rawDifficulty = typeof qItem.difficulty === 'string' ? qItem.difficulty.trim().toLowerCase() : '';
    if (!ALLOWED_DIFFICULTIES.includes(rawDifficulty as any)) {
      errors.push({ rule: 'INVALID_DIFFICULTY', message: `Question #${qNum} has invalid difficulty "${qItem.difficulty}".`, questionIndex: idx, field: 'difficulty' });
    } else {
      difficultyCounts[rawDifficulty]++;
    }

    const rawTopic = typeof qItem.topic === 'string' ? qItem.topic.trim() : '';
    const safeTopic = rawTopic || (rawCategory ? rawCategory.toUpperCase() : 'General Aptitude');

    sanitizedQuestions.push({
      text: trimmedText,
      option_a: optionValues.option_a || '',
      option_b: optionValues.option_b || '',
      option_c: optionValues.option_c || '',
      option_d: optionValues.option_d || '',
      correct_option: (ALLOWED_CORRECT_OPTIONS.includes(rawCorrect as any) ? rawCorrect : 'A') as CorrectOption,
      explanation: rawExplanation,
      topic: safeTopic,
      difficulty: (ALLOWED_DIFFICULTIES.includes(rawDifficulty as any) ? rawDifficulty : 'medium') as QuestionDifficulty,
      category: (ALLOWED_CATEGORIES.includes(rawCategory as any) ? rawCategory : 'general_aptitude') as QuestionCategory
    });
  });

  if (batchSpec?.categoryDistribution && questions.length === expectedCount) {
    for (const [cat, expected] of Object.entries(batchSpec.categoryDistribution)) {
      const actual = categoryCounts[cat] || 0;
      if (actual !== expected) {
        errors.push({
          rule: 'INCORRECT_CATEGORY_DISTRIBUTION',
          message: `Batch category distribution mismatch for "${cat}": expected ${expected}, got ${actual}.`
        });
      }
    }
  }

  if (batchSpec?.difficultyDistribution && questions.length === expectedCount) {
    for (const [diff, expected] of Object.entries(batchSpec.difficultyDistribution)) {
      const actual = difficultyCounts[diff] || 0;
      if (actual !== expected) {
        errors.push({
          rule: 'INCORRECT_DIFFICULTY_DISTRIBUTION',
          message: `Batch difficulty distribution mismatch for "${diff}": expected ${expected}, got ${actual}.`
        });
      }
    }
  }

  const isValid = errors.length === 0;
  return {
    isValid,
    errors,
    sanitizedQuestions: isValid ? sanitizedQuestions : []
  };
}

/**
 * Validates raw Gemini output against the SJCEM Contest Generation Contract.
 */
export function validateGeminiContestResponse(data: unknown): {
  isValid: boolean;
  errors: ValidationError[];
  sanitizedData?: { questions: ValidatedQuestion[] };
  stats?: {
    totalQuestions: number;
    categoryCounts: Record<string, number>;
    difficultyCounts: Record<string, number>;
  };
} {
  const errors: ValidationError[] = [];

  if (!data || typeof data !== 'object') {
    return {
      isValid: false,
      errors: [{
        rule: 'ROOT_OBJECT_MISSING',
        message: 'The model response must be a JSON object containing a "questions" property.'
      }]
    };
  }

  const dataObj = data as Record<string, any>;

  if (!('questions' in dataObj) || !Array.isArray(dataObj.questions)) {
    return {
      isValid: false,
      errors: [{
        rule: 'QUESTIONS_ARRAY_REQUIRED',
        message: 'Property "questions" is missing or is not a valid JSON array.'
      }]
    };
  }

  const rawQuestions: any[] = dataObj.questions;

  if (rawQuestions.length !== REQUIRED_QUESTION_COUNT) {
    errors.push({
      rule: 'INVALID_QUESTION_COUNT',
      message: `Contest must contain exactly ${REQUIRED_QUESTION_COUNT} questions. Received ${rawQuestions.length}.`
    });
  }

  const sanitizedQuestions: ValidatedQuestion[] = [];
  const seenQuestionTexts = new Set<string>();

  const categoryCounts: Record<string, number> = {
    quantitative: 0,
    logical_reasoning: 0,
    verbal: 0,
    data_interpretation: 0,
    general_aptitude: 0
  };

  const difficultyCounts: Record<string, number> = {
    easy: 0,
    medium: 0,
    hard: 0
  };

  rawQuestions.forEach((qItem: any, idx: number) => {
    const qNum = idx + 1;

    if (!qItem || typeof qItem !== 'object') {
      errors.push({
        rule: 'INVALID_QUESTION_OBJECT',
        message: `Question #${qNum} is not a valid object.`,
        questionIndex: idx
      });
      return;
    }

    const q = qItem;
    const rawText = typeof q.text === 'string' ? q.text : (typeof q.question_text === 'string' ? q.question_text : '');
    const trimmedText = rawText.trim();

    if (!trimmedText) {
      errors.push({
        rule: 'MISSING_QUESTION_TEXT',
        message: `Question #${qNum} is missing "text".`,
        questionIndex: idx,
        field: 'text'
      });
    } else if (trimmedText.length < 10) {
      errors.push({
        rule: 'MEANINGLESS_QUESTION_TEXT',
        message: `Question #${qNum} has meaningless or insufficient text (< 10 chars).`,
        questionIndex: idx,
        field: 'text'
      });
    }

    if (trimmedText) {
      const normalized = trimmedText.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (seenQuestionTexts.has(normalized)) {
        errors.push({
          rule: 'DUPLICATE_QUESTION',
          message: `Question #${qNum} is a duplicate of a previous question in this batch.`,
          questionIndex: idx,
          field: 'text'
        });
      } else {
        seenQuestionTexts.add(normalized);
      }
    }

    const optionKeys = ['option_a', 'option_b', 'option_c', 'option_d'];
    const optionValues: Record<string, string> = {};

    for (const key of optionKeys) {
      const val = q[key];
      if (typeof val !== 'string') {
        errors.push({
          rule: 'MISSING_OPTION',
          message: `Question #${qNum} is missing option "${key}".`,
          questionIndex: idx,
          field: key
        });
        optionValues[key] = '';
      } else {
        const trimmedVal = val.trim();
        if (trimmedVal.length === 0) {
          errors.push({
            rule: 'EMPTY_OPTION',
            message: `Question #${qNum} has an empty or blank "${key}".`,
            questionIndex: idx,
            field: key
          });
        }
        optionValues[key] = trimmedVal;
      }
    }

    const extraOptions = Object.keys(q).filter(k => k.startsWith('option_') && !optionKeys.includes(k));
    if (extraOptions.length > 0) {
      errors.push({
        rule: 'EXTRA_OPTIONS_DETECTED',
        message: `Question #${qNum} contains unexpected options: ${extraOptions.join(', ')}. Exactly four options (A, B, C, D) are required.`,
        questionIndex: idx
      });
    }

    const rawCorrect = typeof q.correct_option === 'string' ? q.correct_option.trim().toUpperCase() : '';
    if (!ALLOWED_CORRECT_OPTIONS.includes(rawCorrect as any)) {
      errors.push({
        rule: 'INVALID_CORRECT_OPTION',
        message: `Question #${qNum} has invalid correct_option "${q.correct_option}". Allowed: A, B, C, D.`,
        questionIndex: idx,
        field: 'correct_option'
      });
    } else {
      const mappedOptionKey = `option_${rawCorrect.toLowerCase()}`;
      if (!optionValues[mappedOptionKey] || optionValues[mappedOptionKey].length === 0) {
        errors.push({
          rule: 'CORRECT_OPTION_TARGET_EMPTY',
          message: `Question #${qNum} declared correct_option "${rawCorrect}", but "${mappedOptionKey}" is empty or missing.`,
          questionIndex: idx,
          field: 'correct_option'
        });
      }
    }

    const rawExplanation = typeof q.explanation === 'string' ? q.explanation.trim() : '';
    if (!rawExplanation || rawExplanation.length < 5) {
      errors.push({
        rule: 'MISSING_EXPLANATION',
        message: `Question #${qNum} is missing a comprehensive step-by-step "explanation".`,
        questionIndex: idx,
        field: 'explanation'
      });
    }

    const rawCategory = typeof q.category === 'string' ? q.category.trim().toLowerCase() : '';
    if (!ALLOWED_CATEGORIES.includes(rawCategory as any)) {
      errors.push({
        rule: 'INVALID_CATEGORY',
        message: `Question #${qNum} has invalid category "${q.category}". Allowed: ${ALLOWED_CATEGORIES.join(', ')}.`,
        questionIndex: idx,
        field: 'category'
      });
    } else {
      categoryCounts[rawCategory]++;
    }

    const rawDifficulty = typeof q.difficulty === 'string' ? q.difficulty.trim().toLowerCase() : '';
    if (!ALLOWED_DIFFICULTIES.includes(rawDifficulty as any)) {
      errors.push({
        rule: 'INVALID_DIFFICULTY',
        message: `Question #${qNum} has invalid difficulty "${q.difficulty}". Allowed: ${ALLOWED_DIFFICULTIES.join(', ')}.`,
        questionIndex: idx,
        field: 'difficulty'
      });
    } else {
      difficultyCounts[rawDifficulty]++;
    }

    const rawTopic = typeof q.topic === 'string' ? q.topic.trim() : '';
    const safeTopic = rawTopic || (rawCategory ? rawCategory.toUpperCase() : 'General Aptitude');

    sanitizedQuestions.push({
      text: trimmedText,
      option_a: optionValues.option_a || '',
      option_b: optionValues.option_b || '',
      option_c: optionValues.option_c || '',
      option_d: optionValues.option_d || '',
      correct_option: (ALLOWED_CORRECT_OPTIONS.includes(rawCorrect as any) ? rawCorrect : 'A') as CorrectOption,
      explanation: rawExplanation,
      topic: safeTopic,
      difficulty: (ALLOWED_DIFFICULTIES.includes(rawDifficulty as any) ? rawDifficulty : 'medium') as QuestionDifficulty,
      category: (ALLOWED_CATEGORIES.includes(rawCategory as any) ? rawCategory : 'general_aptitude') as QuestionCategory
    });
  });

  if (rawQuestions.length === REQUIRED_QUESTION_COUNT) {
    for (const cat of ALLOWED_CATEGORIES) {
      const expected = CATEGORY_DISTRIBUTION[cat];
      const actual = categoryCounts[cat] || 0;
      if (actual !== expected) {
        errors.push({
          rule: 'INCORRECT_CATEGORY_DISTRIBUTION',
          message: `Category distribution mismatch for "${cat}": expected ${expected}, got ${actual}.`
        });
      }
    }

    for (const diff of ALLOWED_DIFFICULTIES) {
      const expected = DIFFICULTY_DISTRIBUTION[diff];
      const actual = difficultyCounts[diff] || 0;
      if (actual !== expected) {
        errors.push({
          rule: 'INCORRECT_DIFFICULTY_DISTRIBUTION',
          message: `Difficulty distribution mismatch for "${diff}": expected ${expected}, got ${actual}.`
        });
      }
    }
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    errors,
    sanitizedData: isValid ? { questions: sanitizedQuestions } : undefined,
    stats: {
      totalQuestions: rawQuestions.length,
      categoryCounts,
      difficultyCounts
    }
  };
}

/**
 * Transforms validated questions to database schema rows.
 */
export function transformToDatabaseQuestions(questions: ValidatedQuestion[]) {
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

/**
 * Authoritative prompt builder for Gemini with 4 batches of 5 questions each.
 */
export function buildGeminiContestPrompt(options: {
  weekNumber?: number;
  theme?: string;
  batchNumber?: number | null;
  isRetry?: boolean;
} = {}): { systemInstruction: string; userPrompt: string } {
  const weekNumber = options.weekNumber || 1;
  const theme = options.theme ? `Theme/Focus: ${options.theme}` : 'Standard comprehensive collegiate aptitude mix.';

  const systemInstruction = `You are the Lead Psychometrician and Aptitude Test Architect for St. John College of Engineering and Management (SJCEM).
Your mission is to generate high-caliber, original aptitude test questions for the SJCEM Weekly Aptitude Contest.

CRITICAL QUALITY CONTRACT & BREVITY CONSTRAINTS:
1. QUESTION QUALITY & FAIRNESS:
   - Every question must have EXACTLY ONE unambiguously correct answer.
   - Every question must be 100% solvable using ONLY the provided text and basic high school mathematics/logic.
   - NEVER depend on external websites, current news beyond general knowledge, or unprovided data.
   - NEVER create questions with contradictory options or multiple correct options.
   - Keep option lengths reasonably balanced. DO NOT make the correct option noticeably longer or more detailed than the distractors.
   - Distractors (incorrect options) must be plausible mistakes based on common algebraic, logical, or reading errors.

2. CONCISENESS & TOKEN OPTIMIZATION:
   - Keep question stems concise, clear, and direct.
   - Limit explanations to approximately ONE OR TWO sentences explaining the core logic/formula. Avoid verbose derivations or excessive tokens.

3. DATA INTERPRETATION QUESTIONS:
   - No image or diagram questions are permitted.
   - All data required for Data Interpretation must be provided directly inside the question text as a clean, compact markdown table or clear numerical scenario.

4. COPYRIGHT & ORIGINALITY:
   - Generate ORIGINAL questions. Do NOT scrape or copy proprietary question banks verbatim.
   - Use standard public domain aptitude paradigms (e.g., trains & speed, syllogisms, reading comprehension, blood relations, work & time).

5. ANTI-HALLUCINATION & INTERNAL VERIFICATION:
   - You must mentally solve every calculation step-by-step before finalizing the correct_option.
   - Verify that your "explanation" explicitly derives and confirms the chosen "correct_option".
   - Double-check arithmetic, percentages, ratios, and logic deductions.`;

  let userPrompt: string;
  const batchNumber = options.batchNumber || null;

  if (batchNumber && batchNumber >= 1 && batchNumber <= 4) {
    const spec = BATCH_SPECS[batchNumber - 1];
    const isRetry = Boolean(options.isRetry);

    const catLines = Object.entries(spec.categoryDistribution)
      .map(([cat, count]) => `- "${cat}": EXACTLY ${count} question${count === 1 ? '' : 's'}`)
      .join('\n');

    const diffLines = Object.entries(spec.difficultyDistribution)
      .map(([diff, count]) => `- "${diff}": EXACTLY ${count} question${count === 1 ? '' : 's'}`)
      .join('\n');

    const retryNotice = isRetry
      ? `\nCRITICAL RETRY INSTRUCTION:
This is a targeted retry attempt because the previous response was truncated or malformed.
You MUST be extra concise. Limit explanation strictly to 1 sentence (max 25 words).
Keep question text direct and compact. Avoid any markdown code fences.\n`
      : '';

    userPrompt = `Generate Batch #${batchNumber} of 4 for SJCEM Weekly Aptitude Contest (Week #${weekNumber}).
${theme}
${retryNotice}
BATCH ${batchNumber} SPECIFICATIONS:
You must output EXACTLY ${spec.questionCount} questions with the EXACT distribution outlined below.
NOTE: Questions must be completely distinct from other batches.

CATEGORY DISTRIBUTION (Strictly ${spec.questionCount} total):
${catLines}

DIFFICULTY DISTRIBUTION (Strictly ${spec.questionCount} total):
${diffLines}

CONCISENESS REQUIREMENT:
- Limit explanation to approximately 1-2 sentences. Avoid unnecessary output tokens.
- Keep question text compact, direct, and unambiguous.

OUTPUT FORMAT REQUIREMENTS:
Output ONLY valid, parseable JSON conforming to this exact schema. Do not add markdown fences (\`\`\`json), markdown commentary, or introductory text.

Schema:
{
  "questions": [
    {
      "text": "Detailed question text including any required table data",
      "option_a": "First option text",
      "option_b": "Second option text",
      "option_c": "Third option text",
      "option_d": "Fourth option text",
      "correct_option": "A",
      "explanation": "Clear 1-2 sentence solution explaining why the correct option is right.",
      "topic": "Specific Topic Name",
      "difficulty": "easy",
      "category": "quantitative"
    }
  ]
}

ALLOWED VALUES:
- correct_option: "A" | "B" | "C" | "D"
- difficulty: "easy" | "medium" | "hard"
- category: "quantitative" | "logical_reasoning" | "verbal" | "data_interpretation" | "general_aptitude"

BEGIN GENERATION NOW.`;
  } else {
    userPrompt = `Generate the official question set for SJCEM Weekly Aptitude Contest (Week #${weekNumber}).
${theme}

CONTEST SPECIFICATIONS:
You must output EXACTLY 20 questions with the EXACT distribution outlined below.

CATEGORY DISTRIBUTION (Strictly 20 total):
1. "quantitative": EXACTLY 6 questions (e.g., Speed/Distance, Work/Time, Percentages, Ratios, Number Systems, Mensuration)
2. "logical_reasoning": EXACTLY 5 questions (e.g., Syllogisms, Coding-Decoding, Blood Relations, Seating Arrangements, Series)
3. "verbal": EXACTLY 4 questions (e.g., Sentence Correction, Vocabulary in Context, Analogies, Paragraph Inference)
4. "data_interpretation": EXACTLY 3 questions (Self-contained data tables/series with clear questions)
5. "general_aptitude": EXACTLY 2 questions (e.g., Pattern logic, abstract reasoning, quick estimation)

DIFFICULTY DISTRIBUTION (Strictly 20 total):
- "easy": EXACTLY 6 questions (Direct 1-2 step calculations, fundamental rules)
- "medium": EXACTLY 10 questions (Standard campus placement contest caliber, 2-3 step reasoning)
- "hard": EXACTLY 4 questions (Challenging multi-tier problem solving, tricky constraints)

DISTRIBUTION MATRIX SUGGESTION:
- quantitative (6): 2 easy, 3 medium, 1 hard
- logical_reasoning (5): 1 easy, 3 medium, 1 hard
- verbal (4): 2 easy, 1 medium, 1 hard
- data_interpretation (3): 0 easy, 2 medium, 1 hard
- general_aptitude (2): 1 easy, 1 medium, 0 hard
Total = 6 easy, 10 medium, 4 hard = 20 questions.

CONCISENESS REQUIREMENT:
- Limit explanation to approximately 1-2 sentences. Avoid unnecessary output tokens.
- Keep question text compact and direct.

OUTPUT FORMAT REQUIREMENTS:
Output ONLY valid, parseable JSON conforming to this exact schema. Do not add markdown fences (\`\`\`json), markdown commentary, or introductory text.

Schema:
{
  "questions": [
    {
      "text": "Detailed question text including any required table data",
      "option_a": "First option text",
      "option_b": "Second option text",
      "option_c": "Third option text",
      "option_d": "Fourth option text",
      "correct_option": "A",
      "explanation": "Clear 1-2 sentence solution explaining why the correct option is right.",
      "topic": "Specific Topic Name (e.g., Time and Work)",
      "difficulty": "easy",
      "category": "quantitative"
    }
  ]
}

ALLOWED VALUES:
- correct_option: "A" | "B" | "C" | "D"
- difficulty: "easy" | "medium" | "hard"
- category: "quantitative" | "logical_reasoning" | "verbal" | "data_interpretation" | "general_aptitude"

BEGIN GENERATION NOW.`;
  }

  return { systemInstruction, userPrompt };
}
