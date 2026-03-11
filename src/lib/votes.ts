/**
 * Votes module
 *
 * Provides:
 * - getOrCreateVoterToken  — anonymous identity stored in localStorage
 * - submitVote             — upsert a priority vote to Firestore
 * - fetchVoteSummaries     — aggregate votes per subprocess for an assessment
 *
 * Firestore collection: `votes`
 * Document ID is deterministic: `{voterToken}_{assessmentId}_{subprocessId}`
 * This guarantees one vote per user-subprocess pair without a composite index.
 *
 * Fields stored:
 *   assessmentId  string   — diagnostic document ID
 *   subprocessId  string   — subprocess identifier
 *   voterToken    string   — anonymous local token
 *   priorityVote  number   — 1 (very low) to 5 (critical)
 *   updatedAt     Timestamp
 */

import { collection, doc, setDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface VoteSummary {
  subprocessId: string;
  /** Rounded to one decimal place. */
  average: number;
  count: number;
  /** The current voter's vote, or null if they haven't voted yet. */
  userVote: number | null;
}

/** Returns an existing voter token from localStorage, or creates and stores a new one. */
export function getOrCreateVoterToken(): string {
  if (typeof window === 'undefined') return '';
  const KEY = 'oea_voter_token';
  let token = localStorage.getItem(KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(KEY, token);
  }
  return token;
}

function voteDocId(assessmentId: string, subprocessId: string, voterToken: string): string {
  return `${voterToken}_${assessmentId}_${subprocessId}`;
}

/**
 * Create or update a vote for a specific subprocess.
 * Using a deterministic document ID naturally enforces one-vote-per-user-subprocess.
 */
export async function submitVote(
  assessmentId: string,
  subprocessId: string,
  voterToken: string,
  priorityVote: number,
): Promise<void> {
  const docRef = doc(db, 'votes', voteDocId(assessmentId, subprocessId, voterToken));
  await setDoc(
    docRef,
    { assessmentId, subprocessId, voterToken, priorityVote, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

/**
 * Load and aggregate all votes for an assessment.
 * Returns a Map keyed by subprocessId with the average, total count, and the
 * current voter's own vote (or null if they haven't voted for that subprocess).
 */
export async function fetchVoteSummaries(
  assessmentId: string,
  voterToken: string,
): Promise<Map<string, VoteSummary>> {
  const snapshot = await getDocs(
    query(collection(db, 'votes'), where('assessmentId', '==', assessmentId)),
  );

  const grouped = new Map<string, { sum: number; count: number; userVote: number | null }>();

  snapshot.forEach((docSnap) => {
    const d = docSnap.data();
    const spId = d.subprocessId as string;
    const existing = grouped.get(spId) ?? { sum: 0, count: 0, userVote: null };
    existing.sum   += d.priorityVote as number;
    existing.count += 1;
    if (d.voterToken === voterToken) existing.userVote = d.priorityVote as number;
    grouped.set(spId, existing);
  });

  const result = new Map<string, VoteSummary>();
  grouped.forEach(({ sum, count, userVote }, subprocessId) => {
    result.set(subprocessId, {
      subprocessId,
      average: Math.round((sum / count) * 10) / 10,
      count,
      userVote,
    });
  });

  return result;
}
