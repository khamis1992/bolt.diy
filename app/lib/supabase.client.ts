import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './supabase.server';

let supabaseClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function getSupabaseClient() {
  if (typeof window === 'undefined') {
    throw new Error('getSupabaseClient can only be called in the browser');
  }

  if (supabaseClient) {
    return supabaseClient;
  }

  supabaseClient = createBrowserClient<Database>(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
  );

  return supabaseClient;
}

// Helper to check if we're in the browser
export const isBrowser = typeof window !== 'undefined';

