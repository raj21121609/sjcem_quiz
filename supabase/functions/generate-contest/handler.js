/**
 * SJCEM Weekly Aptitude Contest Platform - Stage 5B
 * Edge Function Request Handler: generate-contest
 * 
 * Location: supabase/functions/generate-contest/handler.js
 * 
 * Purpose:
 * Core business logic for weekly contest generation:
 * - Admin authentication and role verification
 * - Idempotency / duplicate-week collision check
 * - Four independent batches of five questions via Google Gemini API
 * - Sensible token budgets, JSON mode, and targeted single-retry per batch for truncation/malformed output
 * - Validation through Stage 5A contract (20 questions, exact quotas)
 * - Atomic persistence in Supabase PostgreSQL as draft contest
 */

import {
  buildGeminiContestPrompt,
  validateGeminiContestResponse,
  validateBatchQuestions,
  transformToDatabaseQuestions,
  REQUIRED_QUESTION_COUNT,
  GEMINI_DEFAULT_MAX_OUTPUT_TOKENS,
  BATCH_DEFAULT_MAX_OUTPUT_TOKENS,
  BATCH_1_SPEC,
  BATCH_2_SPEC,
  BATCH_3_SPEC,
  BATCH_4_SPEC,
  BATCH_SPECS,
  checkTruncation
} from '../_shared/geminiContract.js';

export {
  checkTruncation,
  validateBatchQuestions,
  BATCH_1_SPEC,
  BATCH_2_SPEC,
  BATCH_3_SPEC,
  BATCH_4_SPEC,
  BATCH_SPECS
};

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Strips markdown code block formatting if Gemini wraps its JSON in ```json ... ```
 */
export function cleanJsonString(raw) {
  if (typeof raw !== 'string') return '';
  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
}

/**
 * Invokes Gemini API for a single question batch, logs safe diagnostics,
 * and performs strict candidate extraction and error mapping.
 * 
 * @param {object} params
 * @param {string} params.geminiUrl
 * @param {object} params.geminiPayload
 * @param {Function} params.fetchImpl
 * @param {number} [params.batchIndex]
 * @param {number} [params.totalBatches]
 * @param {number} [params.maxOutputTokens]
 * @param {string} [params.model]
 * @param {number} [params.retryCount]
 * @returns {Promise<{ success: true, questions: any[] } | { success: false, errorType: string, response: Response, finishReason?: string, textLength?: number, appearsTruncated?: boolean }>}
 */
export async function executeSingleGeminiRequest({
  geminiUrl,
  geminiPayload,
  fetchImpl,
  batchIndex = 1,
  totalBatches = 4,
  maxOutputTokens,
  model = "gemini-2.5-flash",
  retryCount = 0
}) {
  let geminiResponse;
  try {
    geminiResponse = await fetchImpl(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiPayload)
    });
  } catch (fetchErr) {
    console.error(
      `[generate-contest] Batch ${batchIndex}/${totalBatches} (retryCount=${retryCount}) network error contacting Gemini API: ${fetchErr?.message || fetchErr}`
    );
    return {
      success: false,
      errorType: "AI_PROVIDER_UNREACHABLE",
      response: new Response(
        JSON.stringify({ error: "AI_PROVIDER_UNREACHABLE", message: "Failed to connect to the AI provider." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    };
  }

  const geminiStatus = geminiResponse.status;
  let rawResponseText = "";
  try {
    rawResponseText = await geminiResponse.text();
  } catch (readErr) {
    console.error(
      `[generate-contest] Batch ${batchIndex}/${totalBatches} (retryCount=${retryCount}) failed reading Gemini response body: ${readErr?.message}`
    );
  }

  let geminiJson = null;
  let responseJsonParsed = false;
  try {
    if (rawResponseText) {
      geminiJson = JSON.parse(rawResponseText);
      responseJsonParsed = true;
    }
  } catch {
    responseJsonParsed = false;
  }

  // Provider HTTP error check
  if (!geminiResponse.ok) {
    const sanitizedSnippet = (rawResponseText || "")
      .slice(0, 300)
      .replace(/key=[^&\s]+/gi, "key=[REDACTED]");
    console.error(
      `[generate-contest] Batch ${batchIndex}/${totalBatches} (retryCount=${retryCount}) Gemini API provider error: ` +
      `model=${model}, ` +
      `configuredTokenLimit=${maxOutputTokens}, ` +
      `httpStatus=${geminiStatus}, ` +
      `responseJsonParsed=${responseJsonParsed}, ` +
      `detail=${sanitizedSnippet}`
    );
    return {
      success: false,
      errorType: "AI_PROVIDER_ERROR",
      response: new Response(
        JSON.stringify({
          error: "AI_PROVIDER_ERROR",
          message: `AI provider returned error status (${geminiStatus}).`,
          status: geminiStatus
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    };
  }

  // HTTP response body JSON parse check
  if (!responseJsonParsed || !geminiJson || typeof geminiJson !== "object") {
    console.error(
      `[generate-contest] Batch ${batchIndex}/${totalBatches} (retryCount=${retryCount}) Gemini HTTP response was not valid JSON: ` +
      `model=${model}, ` +
      `configuredTokenLimit=${maxOutputTokens}, ` +
      `httpStatus=${geminiStatus}, responseJsonParsed=false`
    );
    return {
      success: false,
      errorType: "AI_PROVIDER_ERROR",
      response: new Response(
        JSON.stringify({
          error: "AI_PROVIDER_ERROR",
          message: "AI provider returned a non-JSON HTTP response payload.",
          status: geminiStatus
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    };
  }

  // Extract candidate, finishReason, promptFeedback, text
  const blockReason = geminiJson.promptFeedback?.blockReason || null;
  const candidates = Array.isArray(geminiJson.candidates) ? geminiJson.candidates : [];
  const candidateCount = candidates.length;
  const firstCandidate = candidates[0] || null;
  const finishReason = firstCandidate?.finishReason || null;

  const candidatePart = firstCandidate?.content?.parts?.[0];
  const candidateText = typeof candidatePart?.text === "string" ? candidatePart.text : null;
  const textReturned = candidateText !== null && candidateText.trim().length > 0;
  const textLength = candidateText ? candidateText.length : 0;

  const appearsTruncated = checkTruncation(candidateText, finishReason);

  // Authoritative Safe Diagnostics:
  // Logs: batch number, model, configured token budget, finish reason, response length, and retry count.
  // ZERO API keys, tokens, or private questions logged.
  console.log(
    `[generate-contest] Batch ${batchIndex}/${totalBatches} (retryCount=${retryCount}) Gemini response diagnostics: ` +
    `model=${model}, ` +
    `configuredTokenLimit=${maxOutputTokens}, ` +
    `httpStatus=${geminiStatus}, ` +
    `responseJsonParsed=${responseJsonParsed}, ` +
    `candidateCount=${candidateCount}, ` +
    `blockReason=${blockReason || "none"}, ` +
    `finishReason=${finishReason || "none"}, ` +
    `textReturned=${textReturned}, ` +
    `textLength=${textLength}, ` +
    `appearsTruncated=${appearsTruncated}`
  );

  // Blocked prompts
  if (blockReason) {
    console.warn(
      `[generate-contest] Batch ${batchIndex}/${totalBatches} (retryCount=${retryCount}) prompt blocked: blockReason=${blockReason}`
    );
    return {
      success: false,
      errorType: "AI_PROMPT_BLOCKED",
      response: new Response(
        JSON.stringify({
          error: "AI_PROMPT_BLOCKED",
          message: `Generation request was blocked by provider safety filters (${blockReason}).`,
          blockReason
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    };
  }

  if (finishReason === "SAFETY" || finishReason === "RECITATION" || finishReason === "BLOCKLIST") {
    console.warn(
      `[generate-contest] Batch ${batchIndex}/${totalBatches} (retryCount=${retryCount}) candidate terminated by safety filter: finishReason=${finishReason}`
    );
    return {
      success: false,
      errorType: "AI_PROMPT_BLOCKED",
      response: new Response(
        JSON.stringify({
          error: "AI_PROMPT_BLOCKED",
          message: `Generation candidate was filtered by provider safety (${finishReason}).`,
          finishReason
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    };
  }

  // Empty candidates
  if (candidateCount === 0) {
    console.error(
      `[generate-contest] Batch ${batchIndex}/${totalBatches} (retryCount=${retryCount}) Gemini returned zero candidates.`
    );
    return {
      success: false,
      errorType: "AI_EMPTY_CANDIDATES",
      response: new Response(
        JSON.stringify({
          error: "AI_EMPTY_CANDIDATES",
          message: "AI model returned zero candidates in response."
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    };
  }

  // MAX_TOKENS / Truncated output
  if (finishReason === "MAX_TOKENS") {
    console.error(
      `[generate-contest] Batch ${batchIndex}/${totalBatches} (retryCount=${retryCount}) Gemini output truncated (MAX_TOKENS). textLength=${textLength}`
    );
    return {
      success: false,
      errorType: "AI_MAX_TOKENS",
      finishReason: "MAX_TOKENS",
      textLength,
      appearsTruncated: true,
      response: new Response(
        JSON.stringify({
          error: "AI_MAX_TOKENS",
          message: "Model output was cut short because the output token budget was reached (MAX_TOKENS).",
          finishReason: "MAX_TOKENS",
          textLength,
          appearsTruncated: true
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    };
  }

  if (appearsTruncated) {
    console.error(
      `[generate-contest] Batch ${batchIndex}/${totalBatches} (retryCount=${retryCount}) Gemini output appears truncated before completion. finishReason=${finishReason || "unknown"}, textLength=${textLength}`
    );
    return {
      success: false,
      errorType: "AI_MAX_TOKENS",
      finishReason: finishReason || "MAX_TOKENS",
      textLength,
      appearsTruncated: true,
      response: new Response(
        JSON.stringify({
          error: "AI_MAX_TOKENS",
          message: "Model output was truncated before completing valid JSON payload.",
          finishReason: finishReason || "MAX_TOKENS",
          textLength,
          appearsTruncated: true
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    };
  }

  // Empty candidate text
  if (!textReturned) {
    console.error(
      `[generate-contest] Batch ${batchIndex}/${totalBatches} (retryCount=${retryCount}) Gemini returned empty candidate content.`
    );
    return {
      success: false,
      errorType: "AI_RESPONSE_EMPTY",
      response: new Response(
        JSON.stringify({
          error: "AI_RESPONSE_EMPTY",
          message: "Model returned an empty question payload."
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    };
  }

  // Parse JSON response (Handle Malformed JSON)
  let parsedData;
  try {
    const cleaned = cleanJsonString(candidateText);
    parsedData = JSON.parse(cleaned);
  } catch {
    console.error(
      `[generate-contest] Batch ${batchIndex}/${totalBatches} (retryCount=${retryCount}) JSON parse failed on Gemini output. textLength=${textLength}, appearsTruncated=${appearsTruncated}`
    );
    return {
      success: false,
      errorType: "AI_PARSE_ERROR",
      textLength,
      appearsTruncated,
      response: new Response(
        JSON.stringify({
          error: "AI_PARSE_ERROR",
          message: "Model response was not valid JSON.",
          textLength,
          appearsTruncated
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    };
  }

  if (!parsedData || typeof parsedData !== "object" || !Array.isArray(parsedData.questions)) {
    console.error(
      `[generate-contest] Batch ${batchIndex}/${totalBatches} (retryCount=${retryCount}) response missing questions array.`
    );
    return {
      success: false,
      errorType: "AI_PARSE_ERROR",
      response: new Response(
        JSON.stringify({
          error: "AI_PARSE_ERROR",
          message: "Model response did not contain a valid questions array."
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    };
  }

  return {
    success: true,
    questions: parsedData.questions
  };
}

/**
 * Executes the complete generate-contest request flow.
 * 
 * @param {Request} req Incoming HTTP request
 * @param {object} deps Injectable dependencies for Deno or test runners
 * @param {Function} [deps.createClient] Supabase client factory
 * @param {object} [deps.supabaseAdmin] Pre-configured Supabase client instance
 * @param {Function} [deps.fetchImpl] Fetch implementation (defaults to global fetch)
 * @param {Function} [deps.envGet] Environment variable getter
 * @returns {Promise<Response>}
 */
export async function handleGenerateContestRequest(req, deps = {}) {
  // 1. Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Only POST is supported." }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const envGet = deps.envGet || ((k) => (typeof Deno !== "undefined" ? Deno.env.get(k) : process.env[k]));
    const fetchImpl = deps.fetchImpl || fetch;

    // 2. Authenticate the caller as an Administrator
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing or invalid authorization token." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "").trim();

    const supabaseUrl = envGet("SUPABASE_URL");
    const supabaseServiceRoleKey = envGet("SUPABASE_SERVICE_ROLE_KEY");

    let supabaseAdmin = deps.supabaseAdmin;
    if (!supabaseAdmin) {
      if (!supabaseUrl || !supabaseServiceRoleKey) {
        console.error("[generate-contest] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
        return new Response(
          JSON.stringify({ error: "Server configuration error: backend credentials unavailable." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (typeof deps.createClient === "function") {
        supabaseAdmin = deps.createClient(supabaseUrl, supabaseServiceRoleKey, {
          auth: { persistSession: false }
        });
      } else {
        throw new Error("Supabase client or createClient factory must be provided.");
      }
    }

    // 2a. Automation secret bypass (for scheduled GitHub Actions invocation).
    // When AUTOMATION_SECRET is set in Supabase Edge Function secrets and the
    // bearer token matches it via a constant-time comparison, the caller is
    // authenticated as a trusted automation agent and the user-JWT + profiles
    // verification is skipped entirely.
    // The existing admin-JWT path below is NOT affected when this does not match.
    const automationSecret = envGet("AUTOMATION_SECRET");
    let callerIsAutomation = false;
    if (automationSecret && automationSecret.length >= 32) {
      // Constant-time comparison to mitigate timing attacks.
      // We compare every byte regardless of where a mismatch occurs.
      const enc = new TextEncoder();
      const secretBytes = enc.encode(automationSecret);
      const tokenBytes  = enc.encode(token);
      if (secretBytes.length === tokenBytes.length) {
        let diff = 0;
        for (let i = 0; i < secretBytes.length; i++) {
          diff |= secretBytes[i] ^ tokenBytes[i];
        }
        callerIsAutomation = (diff === 0);
      }
      // Note: length inequality means they cannot match, so callerIsAutomation
      // remains false — we do NOT short-circuit to avoid leaking length info,
      // but since we already know the result, no further action is needed.
    }

    if (!callerIsAutomation) {
      // Standard path: verify caller via Supabase Auth JWT + admin role check.
      const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
      const user = userData?.user;
      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized: Invalid or expired session." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id, role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError || !profile || profile.role !== "admin") {
        return new Response(
          JSON.stringify({ error: "Forbidden: Administrator privileges required." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      console.log("[generate-contest] Automation secret verified. Skipping user-JWT auth (scheduled invocation).");
    }

    // 3. Parse and validate request payload
    let payload;
    try {
      payload = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON request body." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { week_start, theme } = payload || {};

    if (!week_start || typeof week_start !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid required parameter: week_start (expected 'YYYY-MM-DD')." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate date format YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(week_start)) {
      return new Response(
        JSON.stringify({ error: "Invalid date format for week_start. Expected 'YYYY-MM-DD'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const startDate = new Date(`${week_start}T00:00:00.000Z`);
    if (isNaN(startDate.getTime())) {
      return new Response(
        JSON.stringify({ error: "Invalid date provided for week_start." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate week_end: exactly 7 days later
    const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    // 4. Idempotency Check: Prevent duplicate weekly generation
    const { data: existingContests, error: checkError } = await supabaseAdmin
      .from("contests")
      .select("id, title, status, week_start, week_end")
      .or(`week_start.eq.${startDate.toISOString()},and(week_start.lte.${startDate.toISOString()},week_end.gt.${startDate.toISOString()})`);

    if (checkError) {
      console.error("[generate-contest] Error checking existing contests:", checkError.message);
      return new Response(
        JSON.stringify({ error: "Database error checking existing contest schedule." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingContests && existingContests.length > 0) {
      const existing = existingContests[0];
      console.warn(`[generate-contest] Duplicate contest generation blocked for week ${week_start}. Existing contest: ${existing.id}`);
      return new Response(
        JSON.stringify({
          error: "CONTEST_ALREADY_EXISTS",
          message: `A contest already exists for the week of ${week_start}.`,
          existingContest: {
            id: existing.id,
            title: existing.title,
            status: existing.status,
            week_start: existing.week_start,
            week_end: existing.week_end
          }
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Retrieve Gemini credentials from server-side environment secrets
    const geminiApiKey = envGet("GEMINI_API_KEY");
    if (!geminiApiKey) {
      console.error("[generate-contest] GEMINI_API_KEY environment variable is not configured.");
      return new Response(
        JSON.stringify({ error: "Server configuration error: AI provider credentials unavailable." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiModel = envGet("GEMINI_MODEL") || "gemini-2.5-flash";
    const configuredMaxTokens = Number(envGet("GEMINI_MAX_OUTPUT_TOKENS")) || BATCH_DEFAULT_MAX_OUTPUT_TOKENS;
    const thinkingBudgetEnv = envGet("GEMINI_THINKING_BUDGET");

    console.log(
      `[generate-contest] Initiating generation via ${geminiModel} for week ${week_start} ` +
      `(configuredTokenLimit=${configuredMaxTokens}, 4 batches of 5 questions)`
    );

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`;

    const buildPayloadForBatch = (batchNum, options = {}) => {
      const isRetry = options.isRetry || false;
      const batchMaxTokens = options.maxTokens || configuredMaxTokens;

      const { systemInstruction, userPrompt } = buildGeminiContestPrompt({
        theme: theme ? String(theme) : `Weekly Placement Aptitude Challenge for week of ${week_start}`,
        batchNumber: batchNum,
        isRetry
      });

      const genConfig = {
        responseMimeType: "application/json",
        temperature: 0.2,
        maxOutputTokens: batchMaxTokens
      };

      if (thinkingBudgetEnv !== undefined && thinkingBudgetEnv !== "") {
        genConfig.thinkingConfig = {
          thinkingBudget: Number(thinkingBudgetEnv)
        };
      } else if (isRetry) {
        genConfig.thinkingConfig = {
          thinkingBudget: 0
        };
      }

      return {
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: genConfig
      };
    };

    // 6. Execute 4 independent batches of 5 questions each
    const allQuestions = [];
    const totalBatches = BATCH_SPECS.length; // 4

    for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
      const batchSpec = BATCH_SPECS[batchIdx];
      const batchNum = batchSpec.batchNumber;

      let batchSuccess = false;
      let batchQuestions = null;
      let lastErrorResponse = null;

      // Allow at most one targeted retry for this batch (attempt 0 = initial, attempt 1 = retry)
      for (let attempt = 0; attempt <= 1; attempt++) {
        const isRetry = attempt > 0;
        const retryCount = attempt;

        const batchMaxTokens = isRetry
          ? Math.max(2048, Math.floor(configuredMaxTokens * 0.75))
          : configuredMaxTokens;

        const payload = buildPayloadForBatch(batchNum, {
          isRetry,
          maxTokens: batchMaxTokens
        });

        const result = await executeSingleGeminiRequest({
          geminiUrl,
          geminiPayload: payload,
          fetchImpl,
          batchIndex: batchNum,
          totalBatches,
          maxOutputTokens: batchMaxTokens,
          model: geminiModel,
          retryCount
        });

        if (!result.success) {
          lastErrorResponse = result.response;
          // Prompt blocked by safety policy should not be retried
          if (result.errorType === 'AI_PROMPT_BLOCKED') {
            return lastErrorResponse;
          }

          if (attempt === 0) {
            console.warn(
              `[generate-contest] Batch ${batchNum}/${totalBatches} attempt 1 failed (${result.errorType || 'ERROR'}). Initiating targeted retry 1/1 with reduced prompt/output size.`
            );
            continue;
          } else {
            console.error(
              `[generate-contest] Batch ${batchNum}/${totalBatches} retry failed (${result.errorType || 'ERROR'}). Halting contest generation.`
            );
            return lastErrorResponse;
          }
        }

        // Single-response mock compatibility: if call 1 already provided all 20 questions
        if (batchIdx === 0 && result.questions?.length === REQUIRED_QUESTION_COUNT) {
          allQuestions.push(...result.questions);
          batchSuccess = true;
          break;
        }

        // Validate batch JSON and structure before combining
        const batchValidation = validateBatchQuestions(result.questions, batchSpec);
        if (!batchValidation.isValid) {
          console.warn(
            `[generate-contest] Batch ${batchNum}/${totalBatches} structure validation failed (${batchValidation.errors.length} errors: ${batchValidation.errors.map(e => e.rule).join(', ')}).`
          );

          lastErrorResponse = new Response(
            JSON.stringify({
              error: "AI_PARSE_ERROR",
              message: `Batch ${batchNum} failed structure validation.`,
              batchNumber: batchNum,
              validationErrors: batchValidation.errors
            }),
            { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );

          if (attempt === 0) {
            console.warn(
              `[generate-contest] Retrying Batch ${batchNum}/${totalBatches} with reduced prompt/output size...`
            );
            continue;
          } else {
            console.error(
              `[generate-contest] Batch ${batchNum}/${totalBatches} retry failed structure validation. Halting contest generation.`
            );
            return lastErrorResponse;
          }
        }

        batchQuestions = batchValidation.sanitizedQuestions;
        batchSuccess = true;
        if (isRetry) {
          console.log(`[generate-contest] Batch ${batchNum}/${totalBatches} targeted retry succeeded!`);
        }
        break; // Batch succeeded
      }

      if (!batchSuccess) {
        return lastErrorResponse || new Response(
          JSON.stringify({ error: "AI_GENERATION_FAILED", message: `Batch ${batchNum} failed to generate valid questions.` }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (batchQuestions) {
        allQuestions.push(...batchQuestions);
      }

      // If already gathered 20 questions (e.g. single-response mock), exit
      if (allQuestions.length === REQUIRED_QUESTION_COUNT) {
        break;
      }
    }

    console.log(`[generate-contest] Total questions gathered for validation: ${allQuestions.length}`);

    // 7. Validate complete 20-question set against Stage 5A Contract
    const validation = validateGeminiContestResponse({ questions: allQuestions });
    if (!validation.isValid || !validation.sanitizedData) {
      console.warn(`[generate-contest] Validation failed with ${validation.errors.length} errors.`);
      return new Response(
        JSON.stringify({
          error: "CONTEST_VALIDATION_FAILED",
          message: "Generated questions failed SJCEM validation rules.",
          validationErrors: validation.errors
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 8. Map validated questions to database schema format
    const questionsToInsert = transformToDatabaseQuestions(validation.sanitizedData.questions);
    const contestTitle = `Weekly Placement Aptitude Challenge (${week_start})`;
    const contestDescription = `Official SJCEM Weekly Aptitude Contest for week of ${week_start}. AI-generated comprehensive 20-question aptitude challenge.`;

    // 9. Transactional Database Insertion
    // Try atomic RPC procedure 'create_generated_contest'
    let createdContestId;
    let rpcSuccess = false;

    try {
      const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc("create_generated_contest", {
        p_title: contestTitle,
        p_description: contestDescription,
        p_week_start: startDate.toISOString(),
        p_week_end: endDate.toISOString(),
        p_questions: questionsToInsert
      });

      if (!rpcError && rpcResult && rpcResult.contest_id) {
        createdContestId = rpcResult.contest_id;
        rpcSuccess = true;
      }
    } catch (rpcEx) {
      console.warn("[generate-contest] RPC invocation attempt failed, falling back to multi-step insert:", rpcEx.message);
    }

    if (!rpcSuccess) {
      // Step A: Insert draft contest
      const { data: newContest, error: contestInsertError } = await supabaseAdmin
        .from("contests")
        .insert({
          title: contestTitle,
          description: contestDescription,
          week_start: startDate.toISOString(),
          week_end: endDate.toISOString(),
          status: "draft",
          question_count: REQUIRED_QUESTION_COUNT,
          time_per_question_seconds: 30,
          generated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (contestInsertError || !newContest) {
        console.error("[generate-contest] Failed to insert contest row:", contestInsertError?.message);
        return new Response(
          JSON.stringify({ error: "DATABASE_ERROR", message: "Failed to create contest record." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      createdContestId = newContest.id;

      // Step B: Insert questions and contest_questions sequentially
      try {
        for (let i = 0; i < questionsToInsert.length; i++) {
          const qData = questionsToInsert[i];

          const { data: insertedQ, error: qInsertError } = await supabaseAdmin
            .from("questions")
            .insert(qData)
            .select("id")
            .single();

          if (qInsertError || !insertedQ) {
            throw new Error(`Failed to insert question #${i + 1}: ${qInsertError?.message}`);
          }

          const { error: mappingError } = await supabaseAdmin
            .from("contest_questions")
            .insert({
              contest_id: createdContestId,
              question_id: insertedQ.id,
              question_order: i + 1
            });

          if (mappingError) {
            throw new Error(`Failed to map question #${i + 1}: ${mappingError.message}`);
          }
        }
      } catch (insertError) {
        // Rollback: delete the contest (cascades to contest_questions) to avoid partial write
        console.error("[generate-contest] Multi-step transaction failed, rolling back contest:", insertError.message);
        await supabaseAdmin.from("contests").delete().eq("id", createdContestId);

        return new Response(
          JSON.stringify({
            error: "DATABASE_TRANSACTION_FAILED",
            message: "Failed to save questions atomically. The contest creation was rolled back."
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log(`[generate-contest] Successfully created contest ${createdContestId} with 20 questions in draft status.`);

    // 10. Return safe admin summary response (zero private answer keys leaked)
    return new Response(
      JSON.stringify({
        success: true,
        contest: {
          id: createdContestId,
          title: contestTitle,
          status: "draft",
          week_start: startDate.toISOString(),
          week_end: endDate.toISOString(),
          question_count: REQUIRED_QUESTION_COUNT,
          time_per_question_seconds: 30
        },
        summary: {
          total_questions: REQUIRED_QUESTION_COUNT,
          category_counts: validation.stats?.categoryCounts,
          difficulty_counts: validation.stats?.difficultyCounts
        }
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (unexpectedError) {
    console.error("[generate-contest] Unexpected exception:", unexpectedError);
    return new Response(
      JSON.stringify({
        error: "INTERNAL_SERVER_ERROR",
        message: "An unexpected server error occurred during contest generation."
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}
