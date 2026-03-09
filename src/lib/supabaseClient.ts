import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

/** Returns the Supabase client, initializing it lazily on first access. */
export function getSupabase(): SupabaseClient | null {
  if (_client) return _client;

  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn('[Supabase] Missing environment variables — persistence disabled.');
    return null;
  }

  _client = createClient(url, key);
  return _client;
}
