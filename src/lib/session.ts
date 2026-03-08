import type {
  AssessmentSession,
  SubprocessState,
  Participant,
  SubprocessAssessment,
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
    subprocessStates: {},
    answers: [],
    participants: [],
  };
}

/**
 * Called when the organiser clicks "Iniciar avaliação" — locks in the selected
 * subprocess list and initialises every subprocess as 'open'.
 */
export function finalizeSessionSubprocesses(
  session: AssessmentSession,
  items: SelectedSubprocessItem[],
): AssessmentSession {
  const ids = items.map((i) => i.subprocess.id);
  const states: Record<string, SubprocessState> = {};
  for (const id of ids) {
    states[id] = session.subprocessStates[id] ?? { subprocessId: id, status: 'open' };
  }
  return { ...session, subprocessIds: ids, subprocessItems: items, subprocessStates: states };
}

/**
 * Mark a subprocess as 'in_progress' by the given participant.
 * No-ops if already in_progress or completed.
 */
export function lockSubprocess(
  session: AssessmentSession,
  subprocessId: string,
  participant: Participant,
): AssessmentSession {
  const current = session.subprocessStates[subprocessId];
  // Never override a completed answer; in_progress subprocesses can be taken over
  if (current?.status === 'completed') return session;
  return {
    ...session,
    subprocessStates: {
      ...session.subprocessStates,
      [subprocessId]: {
        subprocessId,
        status: 'in_progress',
        assignedTo: participant.name,
        assignedEmail: participant.email,
        startedAt: new Date().toISOString(),
      },
    },
  };
}

/** Mark a subprocess as completed and store its answer. */
export function completeSubprocessInSession(
  session: AssessmentSession,
  subprocessId: string,
  answer: SubprocessAssessment,
): AssessmentSession {
  const existing = session.answers.filter((a) => a.subprocessId !== subprocessId);
  return {
    ...session,
    subprocessStates: {
      ...session.subprocessStates,
      [subprocessId]: {
        ...session.subprocessStates[subprocessId],
        status: 'completed',
        completedAt: new Date().toISOString(),
      },
    },
    answers: [...existing, answer],
  };
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

export function getSessionProgress(session: AssessmentSession): { answered: number; total: number } {
  const total = session.subprocessIds.length;
  const answered = Object.values(session.subprocessStates).filter(
    (s) => s.status === 'completed',
  ).length;
  return { answered, total };
}
