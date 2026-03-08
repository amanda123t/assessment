'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  AssessmentState, DiagnosticMode,
  Macroprocess, Process, Subprocess, CriteriaScores,
  SelectedSubprocessItem, SubprocessAssessment,
} from '@/types';
import { createAssessment, addAssessment, advanceIndex, isAssessmentComplete } from '@/lib/assessmentEngine';
import { exportToExcel } from '@/lib/exportExcel';

import StepIndicator from '@/components/StepIndicator';
import StartScreen from '@/components/StartScreen';
import SubprocessExplorer from '@/components/SubprocessExplorer';
import SelectedSubprocessesPanel from '@/components/SelectedSubprocessesPanel';
import ModeSelectionScreen from '@/components/ModeSelectionScreen';
import Questionnaire from '@/components/Questionnaire';
import RankingScreen from '@/components/RankingScreen';

// ── Collaborative response storage ──────────────────────────────────────────

const GAS_ENDPOINT =
  'https://script.google.com/macros/s/AKfycbzn23DipnagQMTtSSs8F40Sdn_a-MAir-CCAxvUSq6OMmhwzVJCOQAwAtQulQO3prSl/exec';

const COLLAB_STORE_KEY = 'oea_collab_responses';
const DIAGNOSTIC_ID_KEY = 'oea_diagnostic_id';

function loadCollabResponses(diagnosticId: string): SubprocessAssessment[] {
  try {
    const raw = localStorage.getItem(COLLAB_STORE_KEY);
    if (!raw) return [];
    const store = JSON.parse(raw) as Record<string, SubprocessAssessment[]>;
    return store[diagnosticId] ?? [];
  } catch {
    return [];
  }
}

function saveCollabResponse(diagnosticId: string, assessment: SubprocessAssessment): void {
  try {
    const raw = localStorage.getItem(COLLAB_STORE_KEY);
    const store = raw ? (JSON.parse(raw) as Record<string, SubprocessAssessment[]>) : {};
    const existing = store[diagnosticId] ?? [];
    // Overwrite any previous entry for the same subprocess
    const filtered = existing.filter((a) => a.subprocessId !== assessment.subprocessId);
    store[diagnosticId] = [...filtered, assessment];
    localStorage.setItem(COLLAB_STORE_KEY, JSON.stringify(store));
  } catch {
    // Non-critical
  }
}

function sendCollabResponseToGAS(diagnosticId: string, assessment: SubprocessAssessment): void {
  try {
    const payload = {
      event_type: 'collaborative_response',
      diagnostic_id: diagnosticId,
      subprocess_id: assessment.subprocessId,
      subprocess_name: assessment.subprocessName,
      macroprocess: assessment.macroprocessName,
      process: assessment.processName,
      score: assessment.totalScore,
      automationScore: assessment.automationScore,
      annualHours: assessment.annualHours,
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

// ── Initial state ────────────────────────────────────────────────────────────

const INITIAL_STATE: AssessmentState = {
  globalSelectedSubprocesses: [],
  assessments: [],
  currentSubprocessIndex: 0,
  step: 'start',
  diagnosticId: null,
  diagnosticMode: 'solo',
};

// ── Page component ───────────────────────────────────────────────────────────

export default function AssessmentPage() {
  const [state, setState] = useState<AssessmentState>(INITIAL_STATE);

  // On mount: check for ?diagnostic=ID → join a collaborative session
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('diagnostic');
    if (!id) return;
    const existing = loadCollabResponses(id);
    setState((s) => ({
      ...s,
      diagnosticId: id,
      diagnosticMode: 'collaborative',
      assessments: existing,
      step: 'explore',
    }));
  }, []);

  // ── Navigation ──────────────────────────────────────────────────────────────

  const goToExplorer = useCallback(() => {
    // Generate a fresh diagnostic ID for a brand-new session
    const id = crypto.randomUUID();
    localStorage.setItem(DIAGNOSTIC_ID_KEY, id);
    // Append to URL so the link is shareable
    const url = new URL(window.location.href);
    url.searchParams.set('diagnostic', id);
    window.history.replaceState(null, '', url.toString());
    setState((s) => ({ ...s, step: 'explore', diagnosticId: id }));
  }, []);

  const goBackToStart = useCallback(() => {
    setState((s) => ({ ...s, step: 'start' }));
  }, []);

  // ── Subprocess selection ─────────────────────────────────────────────────────

  const toggleSubprocess = useCallback(
    (subprocess: Subprocess, macroprocess: Macroprocess, process: Process) => {
      setState((s) => {
        const exists = s.globalSelectedSubprocesses.some(
          (item) => item.subprocess.id === subprocess.id
        );
        if (exists) {
          return {
            ...s,
            globalSelectedSubprocesses: s.globalSelectedSubprocesses.filter(
              (item) => item.subprocess.id !== subprocess.id
            ),
          };
        }
        return {
          ...s,
          globalSelectedSubprocesses: [
            ...s.globalSelectedSubprocesses,
            { macroprocess, process, subprocess },
          ],
        };
      });
    },
    []
  );

  const toggleAllInProcess = useCallback(
    (subprocesses: Subprocess[], macroprocess: Macroprocess, process: Process, selectAll: boolean) => {
      setState((s) => {
        if (selectAll) {
          const existingIds = new Set(s.globalSelectedSubprocesses.map((i) => i.subprocess.id));
          const toAdd: SelectedSubprocessItem[] = subprocesses
            .filter((sp) => !existingIds.has(sp.id))
            .map((sp) => ({ macroprocess, process, subprocess: sp }));
          return { ...s, globalSelectedSubprocesses: [...s.globalSelectedSubprocesses, ...toAdd] };
        }
        const idsToRemove = new Set(subprocesses.map((sp) => sp.id));
        return {
          ...s,
          globalSelectedSubprocesses: s.globalSelectedSubprocesses.filter(
            (item) => !idsToRemove.has(item.subprocess.id)
          ),
        };
      });
    },
    []
  );

  const clearSelection = useCallback(() => {
    setState((s) => ({ ...s, globalSelectedSubprocesses: [] }));
  }, []);

  const addCustomSubprocess = useCallback((item: SelectedSubprocessItem) => {
    setState((s) => {
      const customCount = s.globalSelectedSubprocesses.filter((i) => i.isCustom).length;
      if (customCount >= 3) return s;
      return { ...s, globalSelectedSubprocesses: [...s.globalSelectedSubprocesses, item] };
    });
  }, []);

  const removeCustomSubprocess = useCallback((subprocessId: string) => {
    setState((s) => ({
      ...s,
      globalSelectedSubprocesses: s.globalSelectedSubprocesses.filter(
        (i) => i.subprocess.id !== subprocessId
      ),
    }));
  }, []);

  // ── Start evaluation ─────────────────────────────────────────────────────────

  const startEvaluation = useCallback(() => {
    setState((s) => {
      // Collaborators who joined via a shared link skip mode selection
      if (s.diagnosticMode === 'collaborative') {
        return { ...s, currentSubprocessIndex: 0, step: 'questionnaire' };
      }
      return { ...s, currentSubprocessIndex: 0, step: 'mode-selection' };
    });
  }, []);

  /** Called from ModeSelectionScreen once the user picks a mode. */
  const confirmMode = useCallback((mode: DiagnosticMode) => {
    setState((s) => ({
      ...s,
      diagnosticMode: mode,
      step: 'questionnaire',
    }));
  }, []);

  // ── Questionnaire ────────────────────────────────────────────────────────────

  const completeQuestionnaire = useCallback((scores: CriteriaScores) => {
    setState((s) => {
      const { macroprocess, process, subprocess, isCustom } =
        s.globalSelectedSubprocesses[s.currentSubprocessIndex];
      const assessment = createAssessment(macroprocess, process, subprocess, scores, isCustom);

      // In collaborative mode: persist locally and send to GAS
      if (s.diagnosticMode === 'collaborative' && s.diagnosticId) {
        saveCollabResponse(s.diagnosticId, assessment);
        sendCollabResponseToGAS(s.diagnosticId, assessment);
      }

      const updatedAssessments = addAssessment(s.assessments, assessment);
      const done = isAssessmentComplete(
        s.globalSelectedSubprocesses.map((i) => i.subprocess),
        s.currentSubprocessIndex
      );
      return {
        ...s,
        assessments: updatedAssessments,
        currentSubprocessIndex: done
          ? s.currentSubprocessIndex
          : advanceIndex(s.currentSubprocessIndex),
        step: done ? 'ranking' : 'questionnaire',
      };
    });
  }, []);

  const goBackInQuestionnaire = useCallback(() => {
    setState((s) => {
      if (s.currentSubprocessIndex === 0) {
        // Collaborators go back to explore; the original user goes back to mode-selection
        return {
          ...s,
          step: s.diagnosticMode === 'collaborative' ? 'explore' : 'mode-selection',
        };
      }
      return { ...s, currentSubprocessIndex: s.currentSubprocessIndex - 1 };
    });
  }, []);

  const restart = useCallback(() => {
    // Remove diagnostic param from URL
    const url = new URL(window.location.href);
    url.searchParams.delete('diagnostic');
    window.history.replaceState(null, '', url.toString());
    setState(INITIAL_STATE);
  }, []);

  const handleExport = useCallback(async () => {
    await exportToExcel(state.assessments);
  }, [state.assessments]);

  // ── Derived values ───────────────────────────────────────────────────────────

  const selectedIds = useMemo(
    () => new Set(state.globalSelectedSubprocesses.map((i) => i.subprocess.id)),
    [state.globalSelectedSubprocesses]
  );

  const customSubprocesses = useMemo(
    () => state.globalSelectedSubprocesses.filter((i) => i.isCustom),
    [state.globalSelectedSubprocesses]
  );

  /** Subprocesses that already have answers (from a prior collaborative session). */
  const answeredSubprocessIds = useMemo(
    () => new Set(state.assessments.map((a) => a.subprocessId)),
    [state.assessments]
  );

  const currentItem = state.globalSelectedSubprocesses[state.currentSubprocessIndex];

  return (
    <div className="min-h-screen bg-gray-50">
      {state.step === 'start' ? (
        <StartScreen onStart={goToExplorer} />
      ) : (
        <>
          {/* Persistent header */}
          <header className="bg-white border-b border-gray-100 px-6 py-3 shadow-sm">
            <div className="max-w-5xl mx-auto flex items-center justify-between">
              <div>
                <h1 className="text-sm font-bold text-gray-900 leading-none">OEA</h1>
                <p className="text-xs text-gray-400">Operational Efficiency Assessment</p>
              </div>
              {state.diagnosticMode === 'collaborative' && state.diagnosticId && (
                <span className="text-xs bg-violet-50 text-violet-700 font-medium px-2.5 py-1 rounded-full border border-violet-200">
                  Diagnóstico colaborativo
                </span>
              )}
            </div>
          </header>

          <StepIndicator step={state.step} />

          {/* Selection panel — shown during explore step */}
          {state.step === 'explore' && (
            <SelectedSubprocessesPanel
              count={state.globalSelectedSubprocesses.length}
              onStart={startEvaluation}
              onClear={clearSelection}
            />
          )}

          <main>
            {state.step === 'explore' && (
              <SubprocessExplorer
                selectedIds={selectedIds}
                customSubprocesses={customSubprocesses}
                answeredSubprocessIds={answeredSubprocessIds}
                onToggle={toggleSubprocess}
                onToggleAll={toggleAllInProcess}
                onAddCustom={addCustomSubprocess}
                onRemoveCustom={removeCustomSubprocess}
                onBack={goBackToStart}
              />
            )}

            {state.step === 'mode-selection' && state.diagnosticId && (
              <ModeSelectionScreen
                diagnosticId={state.diagnosticId}
                selectedCount={state.globalSelectedSubprocesses.length}
                onConfirm={confirmMode}
              />
            )}

            {state.step === 'questionnaire' && currentItem && (
              <Questionnaire
                key={currentItem.subprocess.id}
                macroprocess={currentItem.macroprocess}
                process={currentItem.process}
                subprocess={currentItem.subprocess}
                currentIndex={state.currentSubprocessIndex}
                total={state.globalSelectedSubprocesses.length}
                answeredCount={answeredSubprocessIds.size}
                diagnosticMode={state.diagnosticMode}
                onComplete={completeQuestionnaire}
                onBack={goBackInQuestionnaire}
              />
            )}

            {state.step === 'ranking' && (
              <RankingScreen
                assessments={state.assessments}
                diagnosticId={state.diagnosticId}
                diagnosticMode={state.diagnosticMode}
                onExport={handleExport}
                onRestart={restart}
              />
            )}
          </main>
        </>
      )}
    </div>
  );
}
