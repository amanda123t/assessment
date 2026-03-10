'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, addDoc, query, getDocs, where, doc, getDoc } from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { processLibrary } from '@/data/processLibrary';
import {
  AssessmentState, Macroprocess, Process, Subprocess,
  CriteriaScores, SubprocessAssessment, SelectedSubprocessItem,
} from '@/types';
import {
  createAssessment, addAssessment, advanceIndex, isAssessmentComplete,
} from '@/lib/assessmentEngine';

import StepIndicator from '@/components/StepIndicator';
import SubprocessExplorer from '@/components/SubprocessExplorer';
import SelectedSubprocessesPanel from '@/components/SelectedSubprocessesPanel';
import Questionnaire from '@/components/Questionnaire';
import RankingScreen from '@/components/RankingScreen';

// ── Helpers ───────────────────────────────────────────────────────────────────

const EMPTY_SCORES: CriteriaScores = {
  operationalVolume: 0, peopleInvolved: 0, executionTime: 0,
  reworkOrErrors: 0, systemsOrSpreadsheets: 0, systemIntegrations: 0,
};

function lookupSubprocess(subprocessId: string) {
  for (const macro of processLibrary) {
    for (const process of macro.processes) {
      for (const subprocess of process.subprocesses) {
        if (subprocess.id === subprocessId) return { macro, process, subprocess };
      }
    }
  }
  return null;
}

function reconstructAssessment(data: Record<string, unknown>): SubprocessAssessment {
  const subprocessId = data.subprocess_id as string;
  const found = lookupSubprocess(subprocessId);
  return {
    subprocessId,
    subprocessName:   found?.subprocess.name ?? subprocessId,
    processId:        found?.process.id      ?? '',
    processName:      found?.process.name    ?? (data.process as string ?? ''),
    macroprocessId:   found?.macro.id        ?? '',
    macroprocessName: found?.macro.name      ?? '',
    scores:           EMPTY_SCORES,
    totalScore:       (data.score as number) ?? 0,
    // Criteria scores were not persisted — derived metrics default to 0.
    // Priority labels still work correctly because they derive from totalScore.
    automationScore:        0,
    annualHours:            0,
    automationSavingsHours: 0,
    financialImpact:        0,
  };
}

// ── Initial state (skips 'start' — enters 'explore' directly) ─────────────────

const EXPLORE_STATE: AssessmentState = {
  globalSelectedSubprocesses: [],
  assessments: [],
  currentSubprocessIndex: 0,
  step: 'explore',
};

// ── Page ─────────────────────────────────────────────────────────────────────

type PageStatus = 'loading' | 'not-found' | 'ready';

export default function DiagnosticResumePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [pageStatus, setPageStatus] = useState<PageStatus>('loading');
  const [company, setCompany] = useState('');
  const [previousAssessments, setPreviousAssessments] = useState<SubprocessAssessment[]>([]);
  const [answeredSubprocessIds, setAnsweredSubprocessIds] = useState<string[]>([]);
  const [state, setState] = useState<AssessmentState>(EXPLORE_STATE);
  const alreadySaved = useRef(false);

  // ── Load diagnostic + responses on mount ────────────────────────────────────

  useEffect(() => {
    if (!id) { setPageStatus('not-found'); return; }

    async function load() {
      // Step 1: verify the diagnostic exists
      const diagnosticSnap = await getDoc(doc(db, 'diagnostics', id));
      if (!diagnosticSnap.exists()) { setPageStatus('not-found'); return; }

      setCompany(diagnosticSnap.data().company ?? '');

      // Step 2: load all existing responses
      const q = query(
        collection(db, 'responses'),
        where('diagnostic_id', '==', id),
      );
      const snapshot = await getDocs(q);
      const responses = snapshot.docs.map(d =>
        reconstructAssessment(d.data() as Record<string, unknown>)
      );
      responses.sort((a, b) => b.totalScore - a.totalScore);

      setPreviousAssessments(responses);
      setAnsweredSubprocessIds(responses.map(r => r.subprocessId));
      setPageStatus('ready');
    }

    load().catch(err => {
      console.error('[Firestore] Failed to load diagnostic:', err);
      setPageStatus('not-found');
    });
  }, [id]);

  // ── Persist new responses when ranking is reached ────────────────────────────

  useEffect(() => {
    if (state.step !== 'ranking' || state.assessments.length === 0) return;
    if (alreadySaved.current) return;
    alreadySaved.current = true;

    const createdAt = new Date().toISOString();
    state.assessments.forEach(a => {
      addDoc(collection(db, 'responses'), {
        diagnostic_id: id,
        subprocess_id: a.subprocessId,
        process: a.processName,
        score: a.totalScore,
        answered_by: '',
        created_at: createdAt,
      }).catch(err => console.error('[Firestore] Failed to save response:', err));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.step]);

  // ── Subprocess selection ───────────────────────────────────────────────────

  const toggleSubprocess = useCallback(
    (subprocess: Subprocess, macroprocess: Macroprocess, process: Process) => {
      setState(s => {
        const exists = s.globalSelectedSubprocesses.some(i => i.subprocess.id === subprocess.id);
        if (exists) {
          return { ...s, globalSelectedSubprocesses: s.globalSelectedSubprocesses.filter(i => i.subprocess.id !== subprocess.id) };
        }
        return { ...s, globalSelectedSubprocesses: [...s.globalSelectedSubprocesses, { macroprocess, process, subprocess }] };
      });
    }, []);

  const toggleAllInProcess = useCallback(
    (subprocesses: Subprocess[], macroprocess: Macroprocess, process: Process, selectAll: boolean) => {
      setState(s => {
        if (selectAll) {
          const existingIds = new Set(s.globalSelectedSubprocesses.map(i => i.subprocess.id));
          const toAdd: SelectedSubprocessItem[] = subprocesses
            .filter(sp => !existingIds.has(sp.id))
            .map(sp => ({ macroprocess, process, subprocess: sp }));
          return { ...s, globalSelectedSubprocesses: [...s.globalSelectedSubprocesses, ...toAdd] };
        }
        const idsToRemove = new Set(subprocesses.map(sp => sp.id));
        return { ...s, globalSelectedSubprocesses: s.globalSelectedSubprocesses.filter(i => !idsToRemove.has(i.subprocess.id)) };
      });
    }, []);

  const clearSelection = useCallback(() => setState(s => ({ ...s, globalSelectedSubprocesses: [] })), []);

  const addCustomSubprocess = useCallback((item: SelectedSubprocessItem) => {
    setState(s => {
      if (s.globalSelectedSubprocesses.filter(i => i.isCustom).length >= 3) return s;
      return { ...s, globalSelectedSubprocesses: [...s.globalSelectedSubprocesses, item] };
    });
  }, []);

  const removeCustomSubprocess = useCallback((subprocessId: string) => {
    setState(s => ({
      ...s,
      globalSelectedSubprocesses: s.globalSelectedSubprocesses.filter(i => i.subprocess.id !== subprocessId),
    }));
  }, []);

  // ── Evaluation flow ────────────────────────────────────────────────────────

  const startEvaluation = useCallback(() => {
    setState(s => ({ ...s, currentSubprocessIndex: 0, step: 'questionnaire' }));
  }, []);

  const completeQuestionnaire = useCallback((scores: CriteriaScores) => {
    setState(s => {
      const { macroprocess, process, subprocess, isCustom } =
        s.globalSelectedSubprocesses[s.currentSubprocessIndex];
      const assessment = createAssessment(macroprocess, process, subprocess, scores, isCustom);
      const updatedAssessments = addAssessment(s.assessments, assessment);
      const done = isAssessmentComplete(
        s.globalSelectedSubprocesses.map(i => i.subprocess),
        s.currentSubprocessIndex,
      );
      return {
        ...s,
        assessments: updatedAssessments,
        currentSubprocessIndex: done ? s.currentSubprocessIndex : advanceIndex(s.currentSubprocessIndex),
        step: done ? 'ranking' : 'questionnaire',
      };
    });
  }, []);

  const goBackInQuestionnaire = useCallback(() => {
    setState(s => {
      if (s.currentSubprocessIndex === 0) return { ...s, step: 'explore' };
      return { ...s, currentSubprocessIndex: s.currentSubprocessIndex - 1 };
    });
  }, []);

  // ── Derived values ─────────────────────────────────────────────────────────

  const selectedIds = useMemo(
    () => new Set(state.globalSelectedSubprocesses.map(i => i.subprocess.id)),
    [state.globalSelectedSubprocesses],
  );
  const customSubprocesses = useMemo(
    () => state.globalSelectedSubprocesses.filter(i => i.isCustom),
    [state.globalSelectedSubprocesses],
  );
  const lockedSubprocessIds = useMemo(() => new Set(answeredSubprocessIds), [answeredSubprocessIds]);

  const currentItem = state.globalSelectedSubprocesses[state.currentSubprocessIndex];

  // Ranking shows previously answered assessments combined with new ones from this session
  const allAssessments = useMemo(
    () => [...previousAssessments, ...state.assessments],
    [previousAssessments, state.assessments],
  );

  // ── Loading / not-found ────────────────────────────────────────────────────

  if (pageStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-500">Carregando diagnóstico...</p>
      </div>
    );
  }

  if (pageStatus === 'not-found') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 max-w-md w-full text-center">
          <p className="text-gray-700 font-medium mb-1">Diagnóstico não encontrado.</p>
          <p className="text-sm text-gray-400 mb-6">
            Verifique o link ou inicie um novo diagnóstico.
          </p>
          <button
            onClick={() => router.push('/assessment')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors"
          >
            Iniciar novo diagnóstico
          </button>
        </div>
      </div>
    );
  }

  // ── Assessment flow ────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">

      <header className="bg-white border-b border-gray-100 px-6 py-3 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-none">OEA</h1>
            <p className="text-xs text-gray-400">Operational Efficiency Assessment</p>
          </div>
          {company && (
            <span className="text-xs text-gray-500 font-medium">{company}</span>
          )}
        </div>
      </header>

      <StepIndicator step={state.step} />

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
            onBack={() => router.push('/assessment')}
            lockedSubprocessIds={lockedSubprocessIds}
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
            assessments={allAssessments}
            onRestart={() => router.push('/assessment')}
          />
        )}

      </main>

    </div>
  );
}
