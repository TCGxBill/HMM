import { createClient } from '@supabase/supabase-js';

// The Database generic type is set to 'any' for simplicity.
// For a more robust application, you could generate types from your Supabase schema.
// FIX: Use import.meta.env for Vite environment variables, not process.env.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key must be provided in .env file");
}

export const supabase = createClient<any>(supabaseUrl, supabaseAnonKey);