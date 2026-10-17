// Supabase Edge Function: generate-contest
// Path: supabase/functions/generate-contest/index.ts
//
// Purpose: Authoritative administrative Edge Function to generate a complete
// weekly aptitude contest using Google Gemini 2.5 Flash, validate it against the
// strict Stage 5A contract (20 questions, exact categories, exact difficulties),
// and atomically persist it in Supabase as a 'draft' contest.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleGenerateContestRequest } from "./handler.js";

serve(async (req: Request) => {
  return handleGenerateContestRequest(req, {
    createClient,
    fetchImpl: fetch,
    envGet: (key: string) => Deno.env.get(key)
  });
});
