// FIX: The triple-slash directive was causing a "Cannot find type definition file" error.
// It is removed, and type errors on import.meta.env are resolved by casting.
import { createClient } from '@supabase/supabase-js';

// The Database generic type is set to 'any' for simplicity.
// For a more robust application, you could generate types from your Supabase schema.
// FIX: Use import.meta.env for client-side environment variables in Vite.
// FIX: Cast import.meta to `any` to resolve TypeScript errors due to missing Vite client types.
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key must be provided in environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)");
}

export const supabase = createClient<any>(supabaseUrl, supabaseAnonKey);