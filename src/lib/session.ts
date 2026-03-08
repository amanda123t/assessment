import type {
  AssessmentSession,
  Participant,
  SelectedSubprocessItem,
  DiagnosticMode,
} from '@/types';

export const SESSION_KEY_PREFIX = 'oea_session_';

export function sessionStorageKey(sessionId: string): string {
  return `${SESSION_KEY_PREFIX}${sessionId}`;
}

export function loadSession(sessionId: string): AssessmentSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(sessionStorageKey(sessionId));
    if (!raw) return null;
    return JSON.parse(raw) as AssessmentSession;
  } catch {
    return null;
  }
}

export function saveSession(session: AssessmentSession): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(sessionStorageKey(session.sessionId), JSON.stringify(session));
  } catch {
    // Non-critical — localStorage may be full or unavailable
  }
}

/** Create a fresh session. Subprocess list is empty until finalised at startEvaluation. */
export function createNewSession(
  sessionId: string,
  mode: DiagnosticMode,
): AssessmentSession {
  return {
    sessionId,
    mode,
    createdAt: Date.now(),
    subprocessIds: [],
    subprocessItems: [],
    answers: [],
    participants: [],
  };
}

/**
 * Called when the organiser clicks "Iniciar avaliação" — locks in the selected
 * subprocess list.
 */
export function finalizeSessionSubprocesses(
  session: AssessmentSession,
  items: SelectedSubprocessItem[],
): AssessmentSession {
  const ids = items.map((i) => i.subprocess.id);
  return { ...session, subprocessIds: ids, subprocessItems: items };
}

/** Add a participant (skip if already present by email). */
export function addParticipantToSession(
  session: AssessmentSession,
  participant: Participant,
): AssessmentSession {
  const exists = session.participants.some((p) => p.email === participant.email);
  if (exists) return session;
  return { ...session, participants: [...session.participants, participant] };
}
