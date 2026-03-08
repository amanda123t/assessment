import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// ── Collaborative responses ───────────────────────────────────────────────────

/**
 * Returns the subarea_ids that have already been answered in a session.
 * Used to disable those items in the selection UI.
 */
export async function fetchAnsweredSubareas(sessionId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('responses')
    .select('subarea_id')
    .eq('session_id', sessionId);

  if (error || !data) return [];
  return data.map((row: { subarea_id: string }) => row.subarea_id);
}

// Postgres unique-violation code returned by Supabase
const UNIQUE_VIOLATION = '23505';

export type InsertResponseResult =
  | { ok: true }
  | { ok: false; alreadyAnswered: boolean; message: string };

/**
 * Inserts a completed response row into Supabase.
 * Returns { ok: true } on success.
 * Returns { ok: false, alreadyAnswered: true } on unique constraint violation
 * (subarea already answered by another participant).
 */
export async function insertResponse(params: {
  session_id: string;
  area: string;
  process: string;
  subarea_id: string;
  score: number;
  participant_email: string;
}): Promise<InsertResponseResult> {
  const { error } = await supabase.from('responses').insert(params);
  if (!error) return { ok: true };

  if (error.code === UNIQUE_VIOLATION) {
    return {
      ok: false,
      alreadyAnswered: true,
      message: 'Este subprocesso já foi respondido por outro participante.',
    };
  }

  console.error('[supabase] insertResponse error:', error.message);
  return { ok: false, alreadyAnswered: false, message: error.message };
}
