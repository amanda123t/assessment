/**
 * Votes module
 *
 * Provides:
 * - getOrCreateVoterToken   — anonymous identity stored in localStorage
 * - getStoredVoterIdentity  — read persisted name + area from localStorage
 * - saveVoterIdentity       — persist name + area to localStorage
 * - submitVote              — upsert a priority vote (with name + area) to Firestore
 * - fetchVoteSummaries      — aggregate votes with divergence, consensus and area breakdown
 *
 * Firestore collection: `votes`
 * Document ID: `{voterToken}_{assessmentId}_{subprocessId}` (deterministic → no composite index needed)
 *
 * Fields stored per document:
 *   assessmentId  string    — diagnostic document ID
 *   subprocessId  string    — subprocess identifier
 *   voterToken    string    — anonymous local token
 *   voterName     string    — respondent display name
 *   voterArea     string    — respondent department / area
 *   priorityVote  number    — 1 (very low) to 5 (critical)
 *   updatedAt     Timestamp
 */

import {
  collection, doc, setDoc, query, where,
  getDocs, onSnapshot,
  serverTimestamp,
  QuerySnapshot, DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ConsensusLevel = 'alto' | 'médio' | 'alta divergência';

export interface AreaBreakdown {
  area: string;
  average: number;
  count: number;
}

export interface VoteSummary {
  subprocessId: string;
  /** Mean of all votes, rounded to one decimal place. */
  average: number;
  count: number;
  /** The current voter's vote, or null if they haven't voted yet. */
  userVote: number | null;
  /** max(priorityVote) - min(priorityVote) across all voters. */
  divergence: number;
  /** 0–1 → 'alto'  |  2 → 'médio'  |  ≥3 → 'alta divergência' */
  consensusLevel: ConsensusLevel;
  /** Vote averages grouped by voterArea, sorted by area name. */
  areaBreakdown: AreaBreakdown[];
}

export interface VoterIdentity {
  token: string;
  name: string;
  area: string;
}

// ── localStorage helpers ──────────────────────────────────────────────────────

const KEY_TOKEN = 'oea_voter_token';
const KEY_NAME  = 'oea_voter_name';
const KEY_AREA  = 'oea_voter_area';

/** Returns an existing voter token from localStorage, or creates and stores a new one. */
export function getOrCreateVoterToken(): string {
  if (typeof window === 'undefined') return '';
  let token = localStorage.getItem(KEY_TOKEN);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(KEY_TOKEN, token);
  }
  return token;
}

/** Returns the voter's stored name and area (both empty strings if not yet set). */
export function getStoredVoterIdentity(): { name: string; area: string } {
  if (typeof window === 'undefined') return { name: '', area: '' };
  return {
    name: localStorage.getItem(KEY_NAME) ?? '',
    area: localStorage.getItem(KEY_AREA) ?? '',
  };
}

/** Persists the voter's name and area to localStorage for reuse across votes. */
export function saveVoterIdentity(name: string, area: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY_NAME, name);
  localStorage.setItem(KEY_AREA, area);
}

// ── Firestore helpers ─────────────────────────────────────────────────────────

function voteDocId(assessmentId: string, subprocessId: string, voterToken: string): string {
  return `${voterToken}_${assessmentId}_${subprocessId}`;
}

function classifyConsensus(divergence: number): ConsensusLevel {
  if (divergence <= 1) return 'alto';
  if (divergence === 2) return 'médio';
  return 'alta divergência';
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Create or update a vote for a specific subprocess.
 * The deterministic document ID enforces one vote per user-subprocess pair.
 * Subsequent calls update the existing document (allowing vote editing).
 */
export async function submitVote(
  assessmentId: string,
  subprocessId: string,
  voterToken:  string,
  voterName:   string,
  voterArea:   string,
  priorityVote: number,
): Promise<void> {
  const docRef = doc(db, 'votes', voteDocId(assessmentId, subprocessId, voterToken));
  await setDoc(
    docRef,
    {
      assessmentId,
      subprocessId,
      voterToken,
      voterName,
      voterArea,
      priorityVote,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

// ── Aggregation (shared by both fetch and subscription) ───────────────────────

type Accumulator = {
  sum: number;
  count: number;
  min: number;
  max: number;
  userVote: number | null;
  areas: Map<string, { sum: number; count: number }>;
};

function aggregateSnapshot(
  snapshot: QuerySnapshot<DocumentData>,
  voterToken: string,
): Map<string, VoteSummary> {
  const grouped = new Map<string, Accumulator>();

  snapshot.forEach((docSnap) => {
    const d    = docSnap.data();
    const spId = d.subprocessId as string;
    const vote = d.priorityVote as number;
    const area = (d.voterArea as string | undefined) ?? 'Não informada';

    const acc = grouped.get(spId) ?? {
      sum: 0, count: 0,
      min: Infinity, max: -Infinity,
      userVote: null,
      areas: new Map(),
    };

    acc.sum   += vote;
    acc.count += 1;
    if (vote < acc.min) acc.min = vote;
    if (vote > acc.max) acc.max = vote;
    if (d.voterToken === voterToken) acc.userVote = vote;

    const areaAcc = acc.areas.get(area) ?? { sum: 0, count: 0 };
    areaAcc.sum   += vote;
    areaAcc.count += 1;
    acc.areas.set(area, areaAcc);

    grouped.set(spId, acc);
  });

  const result = new Map<string, VoteSummary>();

  grouped.forEach((acc, subprocessId) => {
    const divergence = acc.count >= 2 ? acc.max - acc.min : 0;

    const areaBreakdown: AreaBreakdown[] = [];
    acc.areas.forEach(({ sum, count }, area) => {
      areaBreakdown.push({
        area,
        average: Math.round((sum / count) * 10) / 10,
        count,
      });
    });
    areaBreakdown.sort((a, b) => a.area.localeCompare(b.area, 'pt-BR'));

    result.set(subprocessId, {
      subprocessId,
      average:        Math.round((acc.sum / acc.count) * 10) / 10,
      count:          acc.count,
      userVote:       acc.userVote,
      divergence,
      consensusLevel: classifyConsensus(divergence),
      areaBreakdown,
    });
  });

  return result;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * One-shot load — kept for compatibility.
 * Prefer subscribeToVoteSummaries for live-updating UIs.
 */
export async function fetchVoteSummaries(
  assessmentId: string,
  voterToken: string,
): Promise<Map<string, VoteSummary>> {
  const snapshot = await getDocs(
    query(collection(db, 'votes'), where('assessmentId', '==', assessmentId)),
  );
  return aggregateSnapshot(snapshot, voterToken);
}

/**
 * Real-time subscription — fires immediately with current data, then again
 * whenever any vote for the assessment is created or updated (including votes
 * from other users who opened the shared link on different devices).
 *
 * Returns the Firestore unsubscribe function — call it in the useEffect cleanup.
 */
export function subscribeToVoteSummaries(
  assessmentId: string,
  voterToken: string,
  onUpdate: (summaries: Map<string, VoteSummary>) => void,
): () => void {
  const q = query(collection(db, 'votes'), where('assessmentId', '==', assessmentId));

  return onSnapshot(
    q,
    (snapshot) => onUpdate(aggregateSnapshot(snapshot, voterToken)),
    (err) => console.error('[subscribeToVoteSummaries]', err),
  );
}
