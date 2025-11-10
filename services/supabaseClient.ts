import { createClient } from '@supabase/supabase-js';

// The Database generic type is set to 'any' for simplicity.
// For a more robust application, you could generate types from your Supabase schema.
// FIX: Use process.env as indicated by the execution environment.
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key must be provided in environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)");
}

export const supabase = createClient<any>(supabaseUrl, supabaseAnonKey);