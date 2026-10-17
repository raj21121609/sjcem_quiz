import { createClient } from '@supabase/supabase-js';

// Load environment variables. Vite exposes variables prefixed with VITE_ by default.
// We also support NEXT_PUBLIC_ prefix for compatibility with existing conventions.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or anon key is missing. Ensure .env files are configured.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
