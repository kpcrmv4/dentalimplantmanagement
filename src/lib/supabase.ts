import { createBrowserClient } from '@supabase/ssr';

// Environment variables for Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create Supabase client for browser
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

// Export a singleton instance for client-side use
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
