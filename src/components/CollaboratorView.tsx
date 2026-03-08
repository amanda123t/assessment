'use client';

import { useState } from 'react';
import { CheckCircle2, Clock, ChevronRight, ArrowLeft } from 'lucide-react';
import {
  AssessmentSession,
  Participant,
  SelectedSubprocessItem,
  CriteriaScores,
  Macroprocess,
  Process,
} from '@/types';
import { createAssessment } from '@/lib/assessmentEngine';
import {
  lockSubprocess,
  completeSubprocessInSession,
  addParticipantToSession,
  saveSession,
  loadSession,
  getSessionProgress,
} from '@/lib/session';
import ParticipantFormModal from './ParticipantFormModal';
import Questionnaire from './Questionnaire';

const GAS_ENDPOINT =
  'https://script.google.com/macros/s/AKfycbzn23DipnagQMTtSSs8F40Sdn_a-MAir-CCAxvUSq6OMmhwzVJCOQAwAtQulQO3prSl/exec';

function sendAnswerToGAS(
  sessionId: string,
  participant: Participant,
  assessment: ReturnType<typeof createAssessment>,
) {
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

// ── Step type ─────────────────────────────────────────────────────────────────

type Step = 'select-area' | 'select-process' | 'select-subarea' | 'questionnaire';

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  initialSession: AssessmentSession;
  onSessionChange: (session: AssessmentSession) => void;
}

export default function CollaboratorView({ initialSession, onSessionChange }: Props) {
  const [session, setSession]                     = useState<AssessmentSession>(initialSession);
  const [participant, setParticipant]             = useState<Participant | null>(null);
  const [step, setStep]                           = useState<Step>('select-area');
  const [selectedMacroprocess, setSelectedMacroprocess] = useState<Macroprocess | null>(null);
  const [selectedProcess, setSelectedProcess]     = useState<Process | null>(null);
  const [currentSubprocess, setCurrentSubprocess] = useState<SelectedSubprocessItem | null>(null);

  const participantKey = `oea_participant_${initialSession.sessionId}`;

  // ── Participant identification ─────────────────────────────────────────────

  const handleIdentify = (p: Participant) => {
    setParticipant(p);
    try { sessionStorage.setItem(participantKey, JSON.stringify(p)); } catch { /* non-critical */ }
    const updated = addParticipantToSession(session, p);
    setSession(updated);
    saveSession(updated);
    onSessionChange(updated);
    // Always lands on select-area — nothing opens automatically.
  };

  // ── Derived lists from session items ──────────────────────────────────────

  /** Unique macroprocesses that have at least one subprocess in this session. */
  const macroprocesses: Macroprocess[] = (() => {
    const seen = new Map<string, Macroprocess>();
    for (const item of session.subprocessItems) {
      if (!seen.has(item.macroprocess.id)) seen.set(item.macroprocess.id, item.macroprocess);
    }
    return [...seen.values()];
  })();

  /** Processes within the selected macroprocess. */
  const processes: Process[] = (() => {
    if (!selectedMacroprocess) return [];
    const seen = new Map<string, Process>();
    for (const item of session.subprocessItems) {
      if (item.macroprocess.id === selectedMacroprocess.id && !seen.has(item.process.id)) {
        seen.set(item.process.id, item.process);
      }
    }
    return [...seen.values()];
  })();

  /** Subareas (subprocesses) within the selected macroprocess + process. */
  const subareas = (() => {
    if (!selectedMacroprocess || !selectedProcess) return [];
    return session.subprocessItems
      .filter(
        (item) =>
          item.macroprocess.id === selectedMacroprocess.id &&
          item.process.id === selectedProcess.id,
      )
      .map((item) => ({
        item,
        state: session.subprocessStates[item.subprocess.id],
      }));
  })();

  // ── Navigation handlers ───────────────────────────────────────────────────

  const handleSelectArea = (mp: Macroprocess) => {
    setSelectedMacroprocess(mp);
    setStep('select-process');
  };

  const handleSelectProcess = (proc: Process) => {
    setSelectedProcess(proc);
    setStep('select-subarea');
  };

  const handleSelectSubarea = (item: SelectedSubprocessItem) => {
    // Only completed subareas are locked — in_progress ones are still selectable.
    const state = session.subprocessStates[item.subprocess.id];
    if (state?.status === 'completed') return;

    const fresh = loadSession(initialSession.sessionId) ?? session;
    const updated = lockSubprocess(fresh, item.subprocess.id, participant!);
    setSession(updated);
    saveSession(updated);
    onSessionChange(updated);
    setCurrentSubprocess(item);
    setStep('questionnaire');
  };

  const handleComplete = (scores: CriteriaScores) => {
    if (!currentSubprocess || !participant) return;
    const { macroprocess, process, subprocess, isCustom } = currentSubprocess;
    const assessment = createAssessment(macroprocess, process, subprocess, scores, isCustom);

    const fresh = loadSession(initialSession.sessionId) ?? session;
    const updated = completeSubprocessInSession(fresh, subprocess.id, assessment);
    setSession(updated);
    saveSession(updated);
    onSessionChange(updated);
    sendAnswerToGAS(initialSession.sessionId, participant, assessment);

    // Always return to area selection so user starts fresh.
    setCurrentSubprocess(null);
    setSelectedMacroprocess(null);
    setSelectedProcess(null);
    setStep('select-area');
  };

  const handleBack = () => {
    if (step === 'questionnaire') {
      setCurrentSubprocess(null);
      setStep('select-subarea');
    } else if (step === 'select-subarea') {
      setSelectedProcess(null);
      setStep('select-process');
    } else if (step === 'select-process') {
      setSelectedMacroprocess(null);
      setStep('select-area');
    }
  };

  // ── Identification gate ───────────────────────────────────────────────────

  if (!participant) {
    return <ParticipantFormModal onIdentify={handleIdentify} />;
  }

  // ── Questionnaire view ────────────────────────────────────────────────────

  if (step === 'questionnaire' && currentSubprocess) {
    return (
      <Questionnaire
        key={currentSubprocess.subprocess.id}
        macroprocess={currentSubprocess.macroprocess}
        process={currentSubprocess.process}
        subprocess={currentSubprocess.subprocess}
        currentIndex={0}
        total={1}
        diagnosticMode="collaborative"
        onComplete={handleComplete}
        onBack={handleBack}
      />
    );
  }

  // ── Selection views ───────────────────────────────────────────────────────

  const progress = getSessionProgress(session);

  const stepTitle =
    step === 'select-area'    ? 'Selecione uma Área'     :
    step === 'select-process' ? 'Selecione um Processo'  :
                                'Selecione uma Subárea';

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">

      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold text-violet-600 uppercase tracking-widest mb-1">
          Diagnóstico colaborativo
        </p>
        <h2 className="text-2xl font-bold text-gray-900">{stepTitle}</h2>
        <p className="text-sm text-gray-500 mt-1">
          Olá, <strong>{participant.name}</strong>.
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
        <div className="w-24 bg-gray-100 rounded-full h-1.5 ml-6">
          <div
            className="bg-blue-600 h-1.5 rounded-full transition-all"
            style={{ width: progress.total > 0 ? `${(progress.answered / progress.total) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {/* Back button (not shown on first step) */}
      {step !== 'select-area' && (
        <button
          onClick={handleBack}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
        >
          <ArrowLeft size={14} />
          Voltar
        </button>
      )}

      {/* Breadcrumb */}
      {(step === 'select-process' || step === 'select-subarea') && (
        <div className="flex items-center gap-1 text-xs text-gray-400 mb-4">
          <span className="font-medium text-gray-600">{selectedMacroprocess?.name}</span>
          {step === 'select-subarea' && (
            <>
              <ChevronRight size={12} />
              <span className="font-medium text-gray-600">{selectedProcess?.name}</span>
            </>
          )}
        </div>
      )}

      {/* ── Step: Select Area ── */}
      {step === 'select-area' && (
        <div className="space-y-2">
          {macroprocesses.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">
              <p>Nenhuma área disponível nesta sessão.</p>
              <p className="mt-1 text-xs">O organizador ainda não finalizou a seleção.</p>
            </div>
          ) : (
            macroprocesses.map((mp) => (
              <button
                key={mp.id}
                onClick={() => handleSelectArea(mp)}
                className="w-full flex items-center justify-between gap-4 px-5 py-4 rounded-xl border border-gray-200 bg-white hover:border-violet-400 hover:shadow-sm cursor-pointer text-left transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{mp.icon}</span>
                  <span className="text-sm font-semibold text-gray-800">{mp.name}</span>
                </div>
                <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
              </button>
            ))
          )}
        </div>
      )}

      {/* ── Step: Select Process ── */}
      {step === 'select-process' && (
        <div className="space-y-2">
          {processes.map((proc) => (
            <button
              key={proc.id}
              onClick={() => handleSelectProcess(proc)}
              className="w-full flex items-center justify-between gap-4 px-5 py-4 rounded-xl border border-gray-200 bg-white hover:border-violet-400 hover:shadow-sm cursor-pointer text-left transition-all"
            >
              <span className="text-sm font-semibold text-gray-800">{proc.name}</span>
              <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* ── Step: Select Subarea ── */}
      {step === 'select-subarea' && (
        <div className="space-y-2">
          {subareas.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">
              <p>Nenhuma subárea encontrada para este processo.</p>
            </div>
          ) : (
            subareas.map(({ item, state }) => {
              const isCompleted   = state?.status === 'completed';
              const isInProgress  = state?.status === 'in_progress';

              return (
                <button
                  key={item.subprocess.id}
                  onClick={() => handleSelectSubarea(item)}
                  disabled={isCompleted}
                  className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl border text-left transition-all ${
                    isCompleted
                      ? 'bg-green-50 border-green-200 opacity-80 cursor-default'
                      : isInProgress
                      ? 'bg-amber-50 border-amber-200 hover:border-violet-400 hover:shadow-sm cursor-pointer'
                      : 'bg-white border-gray-200 hover:border-violet-400 hover:shadow-sm cursor-pointer'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${isCompleted ? 'text-gray-500' : 'text-gray-800'}`}>
                      {item.subprocess.name}
                    </p>
                    {isCompleted && (
                      <p className="text-xs text-green-600 mt-0.5 flex items-center gap-1">
                        <CheckCircle2 size={11} />
                        Respondido{state?.assignedTo ? ` por ${state.assignedTo}` : ''}
                      </p>
                    )}
                    {isInProgress && state?.assignedTo && (
                      <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                        <Clock size={11} />
                        Em andamento por {state.assignedTo}
                      </p>
                    )}
                  </div>
                  {!isCompleted && (
                    <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
