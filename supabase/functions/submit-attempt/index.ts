// Supabase Edge Function: submit-attempt
// Path: supabase/functions/submit-attempt/index.ts
//
// Purpose: Authoritative server-side scoring for SJCEM Weekly Aptitude Contest.
// Securely verifies contest questions, computes score, prevents race conditions,
// updates the attempt record with service_role credentials, and returns
// educational review (questions, selected answers, correct answers, explanations).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
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
    let payload;
    try {
      payload = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON request body." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { attemptId, contestId, participantId, answers, tabSwitchCount } = payload || {};

    // 2. Validate request shape
    if (!attemptId || typeof attemptId !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid required parameter: attemptId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!contestId || typeof contestId !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid required parameter: contestId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!participantId || typeof participantId !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid required parameter: participantId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Initialize server-side Supabase client with privileged service_role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("[submit-attempt] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
      return new Response(
        JSON.stringify({ error: "Server configuration error: backend credentials unavailable." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false }
    });

    // 4. Validate contest exists and is valid
    const { data: contest, error: contestError } = await supabaseAdmin
      .from("contests")
      .select("id, title, status, question_count")
      .eq("id", contestId)
      .maybeSingle();

    if (contestError || !contest) {
      return new Response(
        JSON.stringify({ error: "Contest not found or invalid contest ID." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Validate attempt exists
    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from("attempts")
      .select("id, contest_id, participant_id, student_name, status, started_at, submitted_at, score, correct_count, incorrect_count, unanswered_count")
      .eq("id", attemptId)
      .maybeSingle();

    if (attemptError || !attempt) {
      return new Response(
        JSON.stringify({ error: "Attempt record not found." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Validate attempt belongs to specified contest
    if (attempt.contest_id !== contestId) {
      return new Response(
        JSON.stringify({ error: "Attempt does not belong to the specified contest." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7. Validate participant_id matches the attempt
    if (attempt.participant_id !== participantId) {
      return new Response(
        JSON.stringify({ error: "Participant ID does not match this attempt record." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 8. Validate attempt is still in_progress (RACE CONDITION & DUPLICATE PREVENTION)
    if (attempt.status !== "in_progress") {
      return new Response(
        JSON.stringify({
          error: "This quiz attempt has already been submitted.",
          alreadySubmitted: true,
          score: attempt.score,
          correct: attempt.correct_count,
          incorrect: attempt.incorrect_count,
          unanswered: attempt.unanswered_count,
          submittedAt: attempt.submitted_at
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 9. Retrieve the contest's exactly 20 questions using trusted server-side access
    const { data: contestQuestions, error: cqError } = await supabaseAdmin
      .from("contest_questions")
      .select(`
        question_order,
        question_id,
        questions (
          id,
          question_text,
          option_a,
          option_b,
          option_c,
          option_d,
          correct_option,
          explanation,
          topic,
          difficulty
        )
      `)
      .eq("contest_id", contestId)
      .order("question_order", { ascending: true });

    if (cqError || !contestQuestions || contestQuestions.length === 0) {
      console.error("[submit-attempt] Failed to load contest questions:", cqError);
      return new Response(
        JSON.stringify({ error: "Unable to retrieve questions for this contest." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (contestQuestions.length !== 20) {
      return new Response(
        JSON.stringify({
          error: `Contest configuration error: expected exactly 20 questions, found ${contestQuestions.length}.`
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 10. Server-side comparison & score calculation
    const studentAnswers = (answers && typeof answers === "object") ? answers : {};
    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;

    const review = [];

    for (const item of contestQuestions) {
      // questions joined object
      const q = Array.isArray(item.questions) ? item.questions[0] : item.questions;
      if (!q) continue;

      const studentChoice = studentAnswers[q.id] || null;
      const isAttempted = Boolean(studentChoice);
      const isCorrect = isAttempted && (studentChoice === q.correct_option);

      if (!isAttempted) {
        unansweredCount++;
      } else if (isCorrect) {
        correctCount++;
      } else {
        incorrectCount++;
      }

      review.push({
        questionId: q.id,
        questionNumber: item.question_order,
        questionOrder: item.question_order,
        topic: q.topic || "General Aptitude",
        difficulty: q.difficulty || "Medium",
        question: q.question_text,
        questionText: q.question_text,
        options: [
          { id: "A", text: q.option_a },
          { id: "B", text: q.option_b },
          { id: "C", text: q.option_c },
          { id: "D", text: q.option_d }
        ],
        selectedAnswer: studentChoice,
        correctAnswer: q.correct_option,
        correctOption: q.correct_option,
        studentSelection: studentChoice,
        isCorrect: isCorrect,
        isAttempted: isAttempted,
        explanation: q.explanation || "Detailed solution not provided."
      });
    }

    // Authoritative calculation
    const score = correctCount; // 1 mark per correct answer out of 20
    const submittedAt = new Date().toISOString();
    const startedAtMs = new Date(attempt.started_at).getTime();
    const submittedAtMs = new Date(submittedAt).getTime();
    const timeTakenSeconds = Math.max(1, Math.round((submittedAtMs - startedAtMs) / 1000));

    // 11. Atomic update to finalize attempt — prevents race condition
    const { data: updatedAttempt, error: updateError } = await supabaseAdmin
      .from("attempts")
      .update({
        status: "submitted",
        score: score,
        correct_count: correctCount,
        incorrect_count: incorrectCount,
        unanswered_count: unansweredCount,
        submitted_at: submittedAt,
        time_taken_seconds: timeTakenSeconds,
        answers: studentAnswers,
        tab_switch_count: Number(tabSwitchCount) || 0
      })
      .eq("id", attemptId)
      .eq("status", "in_progress") // ATOMIC: Only update if still in_progress
      .select("id, status, score, correct_count, incorrect_count, unanswered_count, submitted_at, time_taken_seconds")
      .maybeSingle();

    if (updateError || !updatedAttempt) {
      // Race condition occurred: another request already finalized this attempt
      return new Response(
        JSON.stringify({
          error: "Duplicate submission: this attempt was already finalized by another request.",
          alreadySubmitted: true
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 12. Build and return sanitized educational response
    const minutes = Math.floor(timeTakenSeconds / 60);
    const seconds = timeTakenSeconds % 60;
    const timeFormatted = `${minutes}m ${seconds < 10 ? "0" : ""}${seconds}s`;
    const accuracy = (correctCount + incorrectCount > 0)
      ? Math.round((correctCount / (correctCount + incorrectCount)) * 100)
      : 0;

    const responseData = {
      success: true,
      contestId: contestId,
      contestTitle: contest.title,
      studentName: attempt.student_name,
      score: score,
      correct: correctCount,
      correctCount: correctCount,
      incorrect: incorrectCount,
      incorrectCount: incorrectCount,
      unanswered: unansweredCount,
      unattemptedCount: unansweredCount,
      total: 20,
      totalQuestions: 20,
      accuracy: accuracy,
      timeTakenSeconds: timeTakenSeconds,
      timeSpentSeconds: timeTakenSeconds,
      timeFormatted: timeFormatted,
      submittedAt: submittedAt,
      review: review,
      detailedReview: review
    };

    return new Response(
      JSON.stringify(responseData),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("[submit-attempt] Unhandled exception:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server scoring error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
