'use client';

import { useState, useCallback } from 'react';
import { AssessmentState, Macroprocess, Process, Subprocess, CriteriaScores } from '@/types';
import { createAssessment, addAssessment, advanceIndex, isAssessmentComplete } from '@/lib/assessmentEngine';
import { exportToExcel } from '@/lib/exportExcel';

import StepIndicator from '@/components/StepIndicator';
import StartScreen from '@/components/StartScreen';
import MacroprocessSelector from '@/components/MacroprocessSelector';
import ProcessSelector from '@/components/ProcessSelector';
import SubprocessSelector from '@/components/SubprocessSelector';
import Questionnaire from '@/components/Questionnaire';
import RankingScreen from '@/components/RankingScreen';

const INITIAL_STATE: AssessmentState = {
  selectedMacroprocess: null,
  selectedProcess: null,
  selectedSubprocesses: [],
  assessments: [],
  currentSubprocessIndex: 0,
  step: 'start',
};

export default function AssessmentPage() {
  const [state, setState] = useState<AssessmentState>(INITIAL_STATE);

  // ── Navigation ─────────────────────────────────────────────────────────────

  const goToMacroprocess = useCallback(() => {
    setState((s) => ({ ...s, step: 'macroprocess' }));
  }, []);

  const selectMacroprocess = useCallback((macro: Macroprocess) => {
    setState((s) => ({
      ...s,
      selectedMacroprocess: macro,
      selectedProcess: null,
      selectedSubprocesses: [],
      step: 'process',
    }));
  }, []);

  const selectProcess = useCallback((process: Process) => {
    setState((s) => ({ ...s, selectedProcess: process, selectedSubprocesses: [], step: 'subprocess' }));
  }, []);

  const confirmSubprocesses = useCallback((subprocesses: Subprocess[]) => {
    setState((s) => ({
      ...s,
      selectedSubprocesses: subprocesses,
      currentSubprocessIndex: 0,
      step: 'questionnaire',
    }));
  }, []);

  const completeQuestionnaire = useCallback((scores: CriteriaScores) => {
    setState((s) => {
      const subprocess = s.selectedSubprocesses[s.currentSubprocessIndex];
      const assessment = createAssessment(
        s.selectedMacroprocess!,
        s.selectedProcess!,
        subprocess,
        scores
      );
      const updatedAssessments = addAssessment(s.assessments, assessment);
      const done = isAssessmentComplete(s.selectedSubprocesses, s.currentSubprocessIndex);

      return {
        ...s,
        assessments: updatedAssessments,
        currentSubprocessIndex: done ? s.currentSubprocessIndex : advanceIndex(s.currentSubprocessIndex),
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

  // ── Back navigation ─────────────────────────────────────────────────────────

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

  // ── Render ──────────────────────────────────────────────────────────────────

  const currentSubprocess = state.selectedSubprocesses[state.currentSubprocessIndex];

  return (
    <div className="min-h-screen bg-gray-50">
      {state.step === 'start' ? (
        <StartScreen onStart={goToMacroprocess} />
      ) : (
        <>
          {/* Persistent header for non-start screens */}
          <header className="bg-white border-b border-gray-100 px-6 py-3 shadow-sm">
            <div className="max-w-5xl mx-auto flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-sm font-bold text-gray-900 leading-none">OEA</h1>
                <p className="text-xs text-gray-400">Operational Efficiency Assessment</p>
              </div>
            </div>
          </header>

          <StepIndicator step={state.step} />

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
                onConfirm={confirmSubprocesses}
                onBack={goBack}
              />
            )}

            {state.step === 'questionnaire' && state.selectedMacroprocess && state.selectedProcess && currentSubprocess && (
              <Questionnaire
                macroprocess={state.selectedMacroprocess}
                process={state.selectedProcess}
                subprocess={currentSubprocess}
                currentIndex={state.currentSubprocessIndex}
                total={state.selectedSubprocesses.length}
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
