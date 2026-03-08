'use client';

import { useState, useCallback, useEffect } from 'react';
import { CheckCircle2, Clock, Circle } from 'lucide-react';
import {
  AssessmentSession,
  Participant,
  SelectedSubprocessItem,
  CriteriaScores,
  SubprocessStatus,
} from '@/types';
import { createAssessment } from '@/lib/assessmentEngine';
import {
  lockSubprocess,
  completeSubprocessInSession,
  addParticipantToSession,
  saveSession,
  getSessionProgress,
} from '@/lib/session';
import ParticipantFormModal from './ParticipantFormModal';
import Questionnaire from './Questionnaire';
import RankingScreen from './RankingScreen';

const GAS_ENDPOINT =
  'https://script.google.com/macros/s/AKfycbzn23DipnagQMTtSSs8F40Sdn_a-MAir-CCAxvUSq6OMmhwzVJCOQAwAtQulQO3prSl/exec';

function sendAnswerToGAS(sessionId: string, participant: Participant, assessment: ReturnType<typeof createAssessment>) {
  try {
    const payload = {
      event_type: 'collaborative_response',
      diagnostic_id: sessionId,
      subprocess_id: assessment.subprocessId,
      subprocess_name: assessment.subprocessName,
      macroprocess: assessment.macroprocessName,
      process: assessment.processName,
      score: assessment.totalScore,
      automationScore: assessment.automationScore,
      respondent_name: participant.name,
      respondent_email: participant.email,
      respondent_department: participant.department,
      timestamp: new Date().toISOString(),
    };
    fetch(GAS_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch {
    // Non-critical
  }
}

// ── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, assignedTo }: { status: SubprocessStatus; assignedTo?: string }) {
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
        <CheckCircle2 size={13} strokeWidth={2} className="text-green-500" />
        Respondido
      </span>
    );
  }
  if (status === 'in_progress') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-amber-700 font-medium">
        <Clock size={13} strokeWidth={2} className="text-amber-500" />
        Em andamento{assignedTo ? ` por ${assignedTo}` : ''}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-500 font-medium">
      <Circle size={12} strokeWidth={2} className="text-gray-400" />
      Não iniciado
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  initialSession: AssessmentSession;
  onSessionChange: (session: AssessmentSession) => void;
}

type View = 'identify' | 'list' | 'answering' | 'results';

export default function CollaboratorView({ initialSession, onSessionChange }: Props) {
  const [session, setSession] = useState<AssessmentSession>(initialSession);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [view, setView] = useState<View>('identify');
  const [activeItem, setActiveItem] = useState<SelectedSubprocessItem | null>(null);

  const participantKey = `oea_participant_${initialSession.sessionId}`;

  // Restore participant from sessionStorage on mount so refreshes don't lose identity
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(participantKey);
      if (saved) {
        const p = JSON.parse(saved) as Participant;
        setParticipant(p);
        setView('list');
      }
    } catch {
      // sessionStorage unavailable — fall through to identify view
    }
  }, [participantKey]);

  const persistSession = useCallback((updated: AssessmentSession) => {
    setSession(updated);
    saveSession(updated);
    onSessionChange(updated);
  }, [onSessionChange]);

  // ── Identify ────────────────────────────────────────────────────────────────

  const handleIdentify = (p: Participant) => {
    setParticipant(p);
    try {
      sessionStorage.setItem(participantKey, JSON.stringify(p));
    } catch {
      // Non-critical
    }
    const updated = addParticipantToSession(session, p);
    persistSession(updated);
    setView('list');
  };

  // ── Start answering a subprocess ────────────────────────────────────────────

  const handleSelectSubprocess = (item: SelectedSubprocessItem) => {
    if (!participant) return;
    const state = session.subprocessStates[item.subprocess.id];
    if (state?.status === 'completed') return; // already answered — hard guard

    const updated = lockSubprocess(session, item.subprocess.id, participant);
    persistSession(updated);
    setActiveItem(item);
    setView('answering');
  };

  // ── Complete questionnaire ──────────────────────────────────────────────────

  const handleComplete = (scores: CriteriaScores) => {
    if (!activeItem || !participant) return;
    const { macroprocess, process, subprocess, isCustom } = activeItem;
    const assessment = createAssessment(macroprocess, process, subprocess, scores, isCustom);

    const updated = completeSubprocessInSession(session, subprocess.id, assessment);
    persistSession(updated);
    sendAnswerToGAS(session.sessionId, participant, assessment);

    setActiveItem(null);

    // Navigate to results when every subprocess has been answered
    const progress = getSessionProgress(updated);
    if (progress.total > 0 && progress.answered === progress.total) {
      setView('results');
    } else {
      setView('list');
    }
  };

  const handleBackFromQuestionnaire = () => {
    // Keep the subprocess locked to this participant so they can resume later
    setView('list');
    setActiveItem(null);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  if (view === 'identify') {
    return <ParticipantFormModal onIdentify={handleIdentify} />;
  }

  if (view === 'answering' && activeItem) {
    return (
      <Questionnaire
        key={activeItem.subprocess.id}
        macroprocess={activeItem.macroprocess}
        process={activeItem.process}
        subprocess={activeItem.subprocess}
        currentIndex={0}
        total={1}
        diagnosticMode="collaborative"
        onComplete={handleComplete}
        onBack={handleBackFromQuestionnaire}
      />
    );
  }

  if (view === 'results') {
    return (
      <RankingScreen
        assessments={session.answers}
        diagnosticId={session.sessionId}
        diagnosticMode="collaborative"
        onRestart={() => setView('list')}
      />
    );
  }

  // ── List view ────────────────────────────────────────────────────────────────

  const progress = getSessionProgress(session);
  const items = session.subprocessItems;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold text-violet-600 uppercase tracking-widest mb-1">
          Diagnóstico colaborativo
        </p>
        <h2 className="text-2xl font-bold text-gray-900">Subprocessos do diagnóstico</h2>
        <p className="text-sm text-gray-500 mt-1">
          Selecione um subprocesso para respondê-lo. Olá, <strong>{participant?.name}</strong>.
        </p>
      </div>

      {/* Progress indicator */}
      <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-800">
            Subprocessos respondidos:&nbsp;
            <span className={progress.answered === progress.total ? 'text-green-600' : 'text-blue-600'}>
              {progress.answered} / {progress.total} concluídos
            </span>
          </p>
          {progress.answered === progress.total && progress.total > 0 && (
            <p className="text-xs text-green-600 mt-0.5 font-medium">
              ✅ Todos os subprocessos foram respondidos!
            </p>
          )}
        </div>
        {/* Progress bar */}
        <div className="w-24 bg-gray-100 rounded-full h-1.5 ml-6">
          <div
            className="bg-blue-600 h-1.5 rounded-full transition-all"
            style={{ width: progress.total > 0 ? `${(progress.answered / progress.total) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {/* Subprocess list */}
      {items.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          <p>Nenhum subprocesso encontrado nesta sessão.</p>
          <p className="mt-1 text-xs">O organizador ainda não finalizou a seleção.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const state = session.subprocessStates[item.subprocess.id];
            const status: SubprocessStatus = state?.status ?? 'open';
            const isCompleted = status === 'completed';

            return (
              <button
                key={item.subprocess.id}
                onClick={() => !isCompleted && handleSelectSubprocess(item)}
                disabled={isCompleted}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl border text-left transition-all ${
                  isCompleted
                    ? 'bg-green-50 border-green-200 opacity-80 cursor-default'
                    : status === 'in_progress'
                    ? 'bg-amber-50 border-amber-200 hover:border-violet-400 hover:shadow-sm cursor-pointer'
                    : 'bg-white border-gray-200 hover:border-violet-400 hover:shadow-sm cursor-pointer'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${isCompleted ? 'text-gray-500' : 'text-gray-800'}`}>
                    {item.subprocess.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {item.macroprocess.name} › {item.process.name}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <StatusBadge status={status} assignedTo={state?.assignedTo} />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
