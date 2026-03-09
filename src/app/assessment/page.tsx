'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  AssessmentState, AssessmentIdentification,
  Macroprocess, Process, Subprocess, CriteriaScores,
  SelectedSubprocessItem,
} from '@/types';
import { createAssessment, addAssessment, advanceIndex, isAssessmentComplete } from '@/lib/assessmentEngine';

import StepIndicator from '@/components/StepIndicator';
import StartScreen from '@/components/StartScreen';
import SubprocessExplorer from '@/components/SubprocessExplorer';
import SelectedSubprocessesPanel from '@/components/SelectedSubprocessesPanel';
import Questionnaire from '@/components/Questionnaire';
import AssessmentIdentificationScreen from '@/components/AssessmentIdentification';
import RankingScreen from '@/components/RankingScreen';

// ── Initial state ────────────────────────────────────────────────────────────

const INITIAL_STATE: AssessmentState = {
  globalSelectedSubprocesses: [],
  assessments: [],
  currentSubprocessIndex: 0,
  step: 'start',
};

// ── Page component ───────────────────────────────────────────────────────────

export default function AssessmentPage() {
  const [state, setState] = useState<AssessmentState>(INITIAL_STATE);

  // ── Navigation ──────────────────────────────────────────────────────────────

  const goToExplore = useCallback(() => {
    setState((s) => ({ ...s, step: 'explore' }));
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
    setState((s) => ({ ...s, currentSubprocessIndex: 0, step: 'identification' }));
  }, []);

  const handleIdentificationComplete = useCallback((data: AssessmentIdentification) => {
    setState((s) => ({ ...s, identification: data, step: 'questionnaire' }));
  }, []);

  // ── Questionnaire ────────────────────────────────────────────────────────────

  const completeQuestionnaire = useCallback((scores: CriteriaScores) => {
    setState((s) => {
      const { macroprocess, process, subprocess, isCustom } =
        s.globalSelectedSubprocesses[s.currentSubprocessIndex];
      const assessment = createAssessment(macroprocess, process, subprocess, scores, isCustom);

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
        return { ...s, step: 'explore' };
      }
      return { ...s, currentSubprocessIndex: s.currentSubprocessIndex - 1 };
    });
  }, []);

  const restart = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  // ── Derived values ───────────────────────────────────────────────────────────

  const selectedIds = useMemo(
    () => new Set(state.globalSelectedSubprocesses.map((i) => i.subprocess.id)),
    [state.globalSelectedSubprocesses]
  );

  const customSubprocesses = useMemo(
    () => state.globalSelectedSubprocesses.filter((i) => i.isCustom),
    [state.globalSelectedSubprocesses]
  );

  const currentItem = state.globalSelectedSubprocesses[state.currentSubprocessIndex];

  return (
    <div className="min-h-screen bg-gray-50">
      {state.step === 'start' ? (
        <StartScreen onStart={goToExplore} />
      ) : (
        <>
          {/* Persistent header */}
          <header className="bg-white border-b border-gray-100 px-6 py-3 shadow-sm">
            <div className="max-w-5xl mx-auto">
              <h1 className="text-sm font-bold text-gray-900 leading-none">OEA</h1>
              <p className="text-xs text-gray-400">Operational Efficiency Assessment</p>
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
                onToggle={toggleSubprocess}
                onToggleAll={toggleAllInProcess}
                onAddCustom={addCustomSubprocess}
                onRemoveCustom={removeCustomSubprocess}
                onBack={goBackToStart}
              />
            )}

            {state.step === 'identification' && (
              <AssessmentIdentificationScreen
                onComplete={handleIdentificationComplete}
                onBack={() => setState((s) => ({ ...s, step: 'explore' }))}
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
                onComplete={completeQuestionnaire}
                onBack={goBackInQuestionnaire}
              />
            )}

            {state.step === 'ranking' && (
              <RankingScreen
                assessments={state.assessments}
                identification={state.identification}
                onRestart={restart}
              />
            )}
          </main>
        </>
      )}
    </div>
  );
}
