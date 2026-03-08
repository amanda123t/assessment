'use client';

import { useState, useCallback, useMemo } from 'react';
import { AssessmentState, Macroprocess, Process, Subprocess, CriteriaScores, SelectedSubprocessItem } from '@/types';
import { createAssessment, addAssessment, advanceIndex, isAssessmentComplete } from '@/lib/assessmentEngine';
import { exportToExcel } from '@/lib/exportExcel';

import StepIndicator from '@/components/StepIndicator';
import StartScreen from '@/components/StartScreen';
import MacroprocessSelector from '@/components/MacroprocessSelector';
import ProcessSelector from '@/components/ProcessSelector';
import SubprocessSelector from '@/components/SubprocessSelector';
import SelectedSubprocessesPanel from '@/components/SelectedSubprocessesPanel';
import Questionnaire from '@/components/Questionnaire';
import RankingScreen from '@/components/RankingScreen';

const INITIAL_STATE: AssessmentState = {
  selectedMacroprocess: null,
  selectedProcess: null,
  globalSelectedSubprocesses: [],
  assessments: [],
  currentSubprocessIndex: 0,
  step: 'start',
};

const SELECTION_STEPS = new Set(['macroprocess', 'process', 'subprocess']);

export default function AssessmentPage() {
  const [state, setState] = useState<AssessmentState>(INITIAL_STATE);

  // ── Navigation ──────────────────────────────────────────────────────────────

  const goToMacroprocess = useCallback(() => {
    setState((s) => ({ ...s, step: 'macroprocess' }));
  }, []);

  const selectMacroprocess = useCallback((macro: Macroprocess) => {
    setState((s) => ({
      ...s,
      selectedMacroprocess: macro,
      selectedProcess: null,
      // globalSelectedSubprocesses persists — no reset
      step: 'process',
    }));
  }, []);

  const selectProcess = useCallback((process: Process) => {
    setState((s) => ({
      ...s,
      selectedProcess: process,
      // globalSelectedSubprocesses persists — no reset
      step: 'subprocess',
    }));
  }, []);

  // ── Global subprocess toggle ─────────────────────────────────────────────────

  const toggleSubprocess = useCallback((subprocess: Subprocess) => {
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
          {
            macroprocess: s.selectedMacroprocess!,
            process: s.selectedProcess!,
            subprocess,
          },
        ],
      };
    });
  }, []);

  const toggleAllInProcess = useCallback((subprocesses: Subprocess[], selectAll: boolean) => {
    setState((s) => {
      if (selectAll) {
        const existingIds = new Set(s.globalSelectedSubprocesses.map((i) => i.subprocess.id));
        const toAdd: SelectedSubprocessItem[] = subprocesses
          .filter((sp) => !existingIds.has(sp.id))
          .map((sp) => ({
            macroprocess: s.selectedMacroprocess!,
            process: s.selectedProcess!,
            subprocess: sp,
          }));
        return { ...s, globalSelectedSubprocesses: [...s.globalSelectedSubprocesses, ...toAdd] };
      }
      // deselect all from current process
      const idsToRemove = new Set(subprocesses.map((sp) => sp.id));
      return {
        ...s,
        globalSelectedSubprocesses: s.globalSelectedSubprocesses.filter(
          (item) => !idsToRemove.has(item.subprocess.id)
        ),
      };
    });
  }, []);

  const clearSelection = useCallback(() => {
    setState((s) => ({ ...s, globalSelectedSubprocesses: [] }));
  }, []);

  // ── Start evaluation ────────────────────────────────────────────────────────

  const startEvaluation = useCallback(() => {
    setState((s) => ({ ...s, currentSubprocessIndex: 0, step: 'questionnaire' }));
  }, []);

  // ── Questionnaire ───────────────────────────────────────────────────────────

  const completeQuestionnaire = useCallback((scores: CriteriaScores) => {
    setState((s) => {
      const { macroprocess, process, subprocess } =
        s.globalSelectedSubprocesses[s.currentSubprocessIndex];
      const assessment = createAssessment(macroprocess, process, subprocess, scores);
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

  const restart = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const handleExport = useCallback(async () => {
    await exportToExcel(state.assessments);
  }, [state.assessments]);

  // ── Back navigation ──────────────────────────────────────────────────────────

  const goBack = useCallback(() => {
    setState((s) => {
      switch (s.step) {
        case 'macroprocess': return { ...s, step: 'start' };
        case 'process': return { ...s, step: 'macroprocess' };
        case 'subprocess': return { ...s, step: 'process' };
        case 'questionnaire':
          if (s.currentSubprocessIndex === 0) return { ...s, step: 'subprocess' };
          return { ...s, currentSubprocessIndex: s.currentSubprocessIndex - 1 };
        default: return s;
      }
    });
  }, []);

  // ── Derived values ───────────────────────────────────────────────────────────

  const selectedIds = useMemo(
    () => new Set(state.globalSelectedSubprocesses.map((i) => i.subprocess.id)),
    [state.globalSelectedSubprocesses]
  );

  const currentItem = state.globalSelectedSubprocesses[state.currentSubprocessIndex];
  const inSelectionPhase = SELECTION_STEPS.has(state.step);

  return (
    <div className="min-h-screen bg-gray-50">
      {state.step === 'start' ? (
        <StartScreen onStart={goToMacroprocess} />
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

          {/* Global selection panel — visible during macroprocess/process/subprocess steps */}
          {inSelectionPhase && (
            <SelectedSubprocessesPanel
              count={state.globalSelectedSubprocesses.length}
              onStart={startEvaluation}
              onClear={clearSelection}
            />
          )}

          <main>
            {state.step === 'macroprocess' && (
              <MacroprocessSelector onSelect={selectMacroprocess} onBack={goBack} />
            )}

            {state.step === 'process' && state.selectedMacroprocess && (
              <ProcessSelector
                macroprocess={state.selectedMacroprocess}
                onSelect={selectProcess}
                onBack={goBack}
              />
            )}

            {state.step === 'subprocess' && state.selectedMacroprocess && state.selectedProcess && (
              <SubprocessSelector
                macroprocess={state.selectedMacroprocess}
                process={state.selectedProcess}
                selectedIds={selectedIds}
                onToggle={toggleSubprocess}
                onToggleAll={toggleAllInProcess}
                onBack={goBack}
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
                onBack={goBack}
              />
            )}

            {state.step === 'ranking' && (
              <RankingScreen
                assessments={state.assessments}
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
