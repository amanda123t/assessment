'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, addDoc, query, getDocs, where, doc, getDoc } from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { processLibrary } from '@/data/processLibrary';
import {
  AssessmentState, Macroprocess, Process, Subprocess,
  CriteriaScores, SubprocessAssessment, SelectedSubprocessItem,
} from '@/types';
import { createAssessment, addAssessment } from '@/lib/assessmentEngine';

import StepIndicator from '@/components/StepIndicator';
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
    // Priority labels are unaffected as they derive only from totalScore.
    automationScore:        0,
    annualHours:            0,
    automationSavingsHours: 0,
    financialImpact:        0,
  };
}

function buildRemainingItems(
  selectedIds: string[],
  answeredIds: Set<string>,
): SelectedSubprocessItem[] {
  const items: SelectedSubprocessItem[] = [];
  for (const id of selectedIds) {
    if (answeredIds.has(id)) continue;
    const found = lookupSubprocess(id);
    if (!found) continue;
    items.push({
      macroprocess: found.macro,
      process:      found.process,
      subprocess:   found.subprocess,
    });
  }
  return items;
}

// ── Page ─────────────────────────────────────────────────────────────────────

type PageStatus = 'loading' | 'not-found' | 'ready';

const LOADING_STATE: AssessmentState = {
  globalSelectedSubprocesses: [],
  assessments: [],
  currentSubprocessIndex: 0,
  step: 'questionnaire',
};

export default function DiagnosticResumePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [pageStatus, setPageStatus] = useState<PageStatus>('loading');
  const [company, setCompany] = useState('');
  const [state, setState] = useState<AssessmentState>(LOADING_STATE);

  // IDs that were already in Firestore before this session — used to filter saves.
  const initialAnsweredIds = useRef<Set<string>>(new Set());
  const alreadySaved = useRef(false);

  // ── Load diagnostic + responses, then restore state ──────────────────────────

  useEffect(() => {
    if (!id) { setPageStatus('not-found'); return; }

    async function load() {
      // 1. Verify diagnostic exists
      const diagnosticSnap = await getDoc(doc(db, 'diagnostics', id));
      if (!diagnosticSnap.exists()) { setPageStatus('not-found'); return; }

      const diagData = diagnosticSnap.data();
      setCompany(diagData.company ?? '');

      // 2. Load all responses for this diagnostic
      const q = query(collection(db, 'responses'), where('diagnostic_id', '==', id));
      const snapshot = await getDocs(q);
      const responses = snapshot.docs.map(d => d.data() as Record<string, unknown>);

      // 3. Determine which subprocesses were already answered
      const answeredIds = new Set(responses.map(r => r.subprocess_id as string));
      initialAnsweredIds.current = answeredIds;

      // 4. Rebuild SubprocessAssessment[] from stored responses
      const rebuiltAssessments: SubprocessAssessment[] = responses.map(reconstructAssessment);

      // 5. Build the queue of remaining (unanswered) subprocesses.
      //    selectedSubprocessIds is written by assessment/page.tsx when the
      //    questionnaire starts; it limits the queue to the originally chosen
      //    subprocesses instead of all 182 library entries.
      const selectedSubprocessIds: string[] = diagData.selected_subprocess_ids ?? [];
      const remainingItems = buildRemainingItems(selectedSubprocessIds, answeredIds);

      // 6. Restore full state — jump straight to questionnaire or ranking
      setState({
        assessments: rebuiltAssessments,
        globalSelectedSubprocesses: remainingItems,
        currentSubprocessIndex: 0,
        step: remainingItems.length === 0 ? 'ranking' : 'questionnaire',
      });

      setPageStatus('ready');
    }

    load().catch(err => {
      console.error('[Firestore] Failed to load diagnostic:', err);
      setPageStatus('not-found');
    });
  }, [id]);

  // ── Persist only NEW responses when ranking is reached ───────────────────────
  //
  // Both state.step and state.assessments are listed as dependencies so the
  // effect always closes over the fully-populated assessments array (rebuilt
  // from Firestore + new answers from this session).  The alreadySaved guard
  // ensures the write happens exactly once even though the dependency on
  // state.assessments means the effect may be scheduled more than once.

  useEffect(() => {
    if (state.step !== 'ranking') return;
    if (alreadySaved.current) return;
    alreadySaved.current = true;

    // Only persist assessments that were not already in Firestore before
    // this session started (rebuiltAssessments are excluded here).
    const newAssessments = state.assessments.filter(
      a => !initialAnsweredIds.current.has(a.subprocessId)
    );

    if (newAssessments.length === 0) return;

    const createdAt = new Date().toISOString();
    newAssessments.forEach(a => {
      addDoc(collection(db, 'responses'), {
        diagnostic_id: id,
        subprocess_id: a.subprocessId,
        process:       a.processName,
        score:         a.totalScore,
        answered_by:   '',
        created_at:    createdAt,
      }).catch(err => console.error('[Firestore] Failed to save response:', err));
    });
  }, [state.step, state.assessments, id]);

  // ── Questionnaire handlers ────────────────────────────────────────────────

  const completeQuestionnaire = useCallback((scores: CriteriaScores) => {
    // Always read from the front of the remaining queue.
    const { macroprocess, process, subprocess, isCustom } = state.globalSelectedSubprocesses[0];
    const assessment = createAssessment(macroprocess, process, subprocess, scores, isCustom);

    // Persist immediately so progress is never lost if the user closes the
    // tab before reaching the ranking screen.  initialAnsweredIds guards
    // against duplicate writes on re-renders or strict-mode double-calls.
    if (!initialAnsweredIds.current.has(assessment.subprocessId)) {
      initialAnsweredIds.current.add(assessment.subprocessId);
      addDoc(collection(db, 'responses'), {
        diagnostic_id: id,
        subprocess_id: assessment.subprocessId,
        process:       assessment.processName,
        score:         assessment.totalScore,
        answered_by:   '',
        created_at:    new Date().toISOString(),
      }).catch(err => console.error('[Firestore] Failed to save response:', err));
    }

    setState(s => {
      const updatedAssessments = addAssessment(s.assessments, assessment);
      const remainingQueue = s.globalSelectedSubprocesses.slice(1);
      return {
        ...s,
        assessments: updatedAssessments,
        globalSelectedSubprocesses: remainingQueue,
        currentSubprocessIndex: 0,
        step: remainingQueue.length === 0 ? 'ranking' : 'questionnaire',
      };
    });
  }, [state.globalSelectedSubprocesses, id]);

  const goBackInQuestionnaire = useCallback(() => {
    setState(s => {
      if (s.currentSubprocessIndex === 0) return s;
      return { ...s, currentSubprocessIndex: s.currentSubprocessIndex - 1 };
    });
  }, []);

  // currentItem is always the first item in the remaining queue.
  const currentItem = state.globalSelectedSubprocesses[0];

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

  // ── Resume flow ────────────────────────────────────────────────────────────

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

      <main>

        {state.step === 'questionnaire' && currentItem && (
          <Questionnaire
            key={currentItem.subprocess.id}
            macroprocess={currentItem.macroprocess}
            process={currentItem.process}
            subprocess={currentItem.subprocess}
            currentIndex={state.currentSubprocessIndex}
            total={state.globalSelectedSubprocesses.length}
            onComplete={completeQuestionnaire}
            onBack={
              state.currentSubprocessIndex === 0
                ? () => router.push('/assessment')
                : goBackInQuestionnaire
            }
          />
        )}

        {/*
          RankingScreen receives state.assessments which is:
            rebuiltAssessments (from Firestore) + newAssessments (this session).
          This guarantees the ranking always reflects all responses.
        */}
        {state.step === 'ranking' && (
          <RankingScreen
            assessments={state.assessments}
            onRestart={() => router.push('/assessment')}
          />
        )}

      </main>

    </div>
  );
}
