'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, addDoc, query, getDocs, where, doc, getDoc, updateDoc } from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { processLibrary } from '@/data/processLibrary';
import {
  AssessmentState, Macroprocess, Process, Subprocess,
  CriteriaScores, SubprocessAssessment, SelectedSubprocessItem, CustomArea,
} from '@/types';
import { createAssessment, addAssessment } from '@/lib/assessmentEngine';

import StepIndicator from '@/components/StepIndicator';
import Questionnaire from '@/components/Questionnaire';
import RankingScreen from '@/components/RankingScreen';
import SubprocessExplorer from '@/components/SubprocessExplorer';
import SelectedSubprocessesPanel from '@/components/SelectedSubprocessesPanel';

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
  const storedScores = data.scores as CriteriaScores | undefined;

  // When individual criteria scores were persisted, recompute all derived
  // metrics (automationScore, annualHours, etc.) using the same formulas as
  // createAssessment so the final report is fully accurate.
  if (found && storedScores) {
    return createAssessment(found.macro, found.process, found.subprocess, storedScores);
  }

  // Legacy fallback for responses saved before scores were persisted.
  return {
    subprocessId,
    subprocessName:   found?.subprocess.name ?? subprocessId,
    processId:        found?.process.id      ?? '',
    processName:      found?.process.name    ?? (data.process as string ?? ''),
    macroprocessId:   found?.macro.id        ?? '',
    macroprocessName: found?.macro.name      ?? '',
    scores:           EMPTY_SCORES,
    totalScore:       (data.score as number) ?? 0,
    automationScore:        0,
    annualHours:            0,
    automationSavingsHours: 0,
    financialImpact:        0,
    fteCurrent:             0,
    fteAutomatable:         0,
    fteAfterAutomation:     0,
  };
}

function lookupCustomSubprocess(
  subprocessId: string,
  customAreas: CustomArea[],
): SelectedSubprocessItem | null {
  for (const area of customAreas) {
    for (const proc of area.processes) {
      for (const sp of proc.subprocesses) {
        if (sp.id !== subprocessId) continue;
        const macro: Macroprocess = { id: area.id, name: area.name, icon: 'custom', processes: [] };
        const process: Process = {
          id: proc.id, name: proc.name,
          subprocesses: proc.subprocesses.map(s => ({
            id: s.id, name: s.name, code: 'CUSTOM',
            process: proc.name, macroprocess: area.name, category: 'custom',
          })),
        };
        return {
          macroprocess: macro, process,
          subprocess: { id: sp.id, name: sp.name, code: 'CUSTOM', process: proc.name, macroprocess: area.name, category: 'custom' },
          isCustom: true,
        };
      }
    }
  }
  return null;
}

function buildRemainingItems(
  selectedIds: string[],
  answeredIds: Set<string>,
  customAreas: CustomArea[] = [],
): SelectedSubprocessItem[] {
  const items: SelectedSubprocessItem[] = [];
  for (const id of selectedIds) {
    if (answeredIds.has(id)) continue;
    const found = lookupSubprocess(id);
    if (found) {
      items.push({ macroprocess: found.macro, process: found.process, subprocess: found.subprocess });
    } else {
      const customItem = lookupCustomSubprocess(id, customAreas);
      if (customItem) items.push(customItem);
    }
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

  // Group mode
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [groupShareLink, setGroupShareLink] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  // Subprocesses already answered by other collaborators — shown locked in explorer
  const [lockedSubprocessIds, setLockedSubprocessIds] = useState<Set<string>>(new Set());
  // This collaborator's own selection (group join explore step)
  const [groupSelectedItems, setGroupSelectedItems] = useState<SelectedSubprocessItem[]>([]);

  // "Continuar depois" — available during questionnaire on both individual and group flows
  const [showContinueModal, setShowContinueModal] = useState(false);
  const [continueLinkCopied, setContinueLinkCopied] = useState(false);

  // Custom areas created in SubprocessExplorer, persisted to Firestore
  const [customAreas, setCustomAreas] = useState<CustomArea[]>([]);
  const handleCustomAreasChange = useCallback((areas: CustomArea[]) => {
    setCustomAreas(areas);
    if (id) {
      updateDoc(doc(db, 'diagnostics', id), { custom_areas: areas })
        .catch(err => console.error('[Firestore] Failed to update custom_areas:', err));
    }
  }, [id]);

  // IDs that were already in Firestore before this session — used to filter saves.
  const initialAnsweredIds = useRef<Set<string>>(new Set());
  const alreadySaved = useRef(false);

  // ── Load diagnostic + responses, then restore state ──────────────────────────

  useEffect(() => {
    if (!id) { setPageStatus('not-found'); return; }

    async function load() {
      const diagnosticSnap = await getDoc(doc(db, 'diagnostics', id));
      if (!diagnosticSnap.exists()) { setPageStatus('not-found'); return; }

      const diagData = diagnosticSnap.data();
      setCompany(diagData.company ?? '');

      // Restore custom areas so SubprocessExplorer can show them
      const storedCustomAreas: CustomArea[] = diagData.custom_areas ?? [];
      setCustomAreas(storedCustomAreas);

      const q = query(collection(db, 'responses'), where('diagnostic_id', '==', id));
      const snapshot = await getDocs(q);
      const responses = snapshot.docs.map(d => d.data() as Record<string, unknown>);

      const answeredIds = new Set(responses.map(r => r.subprocess_id as string));
      initialAnsweredIds.current = answeredIds;

      const rebuiltAssessments: SubprocessAssessment[] = responses.map(reconstructAssessment);

      if (diagData.mode === 'group') {
        // Group join: go to explore so collaborator picks their areas.
        // All already-answered subprocesses are locked in the explorer.
        setIsGroupMode(true);
        setLockedSubprocessIds(answeredIds);
        setGroupShareLink(`${window.location.origin}/diagnostic/${id}`);
        setState({
          assessments: rebuiltAssessments,
          globalSelectedSubprocesses: [],
          currentSubprocessIndex: 0,
          step: 'explore',
        });
      } else {
        // Individual resume: rebuild remaining queue and jump straight to questionnaire.
        const selectedSubprocessIds: string[] = diagData.selected_subprocess_ids ?? [];
        const remainingItems = buildRemainingItems(selectedSubprocessIds, answeredIds, storedCustomAreas);
        setState({
          assessments: rebuiltAssessments,
          globalSelectedSubprocesses: remainingItems,
          currentSubprocessIndex: 0,
          step: remainingItems.length === 0 ? 'ranking' : 'questionnaire',
        });
      }

      setPageStatus('ready');
    }

    load().catch(err => {
      console.error('[Firestore] Failed to load diagnostic:', err);
      setPageStatus('not-found');
    });
  }, [id]);

  // ── Persist only NEW responses when ranking is reached ───────────────────────

  useEffect(() => {
    if (state.step !== 'ranking') return;
    if (alreadySaved.current) return;
    alreadySaved.current = true;

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
        scores:        a.scores,
        answered_by:   '',
        created_at:    createdAt,
      }).catch(err => console.error('[Firestore] Failed to save response:', err));
    });
  }, [state.step, state.assessments, id]);

  // ── Group explore handlers ────────────────────────────────────────────────

  const toggleGroupSubprocess = useCallback((
    subprocess: Subprocess,
    macroprocess: Macroprocess,
    process: Process,
  ) => {
    setGroupSelectedItems(prev => {
      const exists = prev.some(i => i.subprocess.id === subprocess.id);
      if (exists) return prev.filter(i => i.subprocess.id !== subprocess.id);
      return [...prev, { macroprocess, process, subprocess }];
    });
  }, []);

  const toggleGroupAll = useCallback((
    subprocesses: Subprocess[],
    macroprocess: Macroprocess,
    process: Process,
    selectAll: boolean,
  ) => {
    setGroupSelectedItems(prev => {
      if (selectAll) {
        const existingIds = new Set(prev.map(i => i.subprocess.id));
        const toAdd = subprocesses
          .filter(sp => !existingIds.has(sp.id) && !lockedSubprocessIds.has(sp.id))
          .map(sp => ({ macroprocess, process, subprocess: sp }));
        return [...prev, ...toAdd];
      }
      const idsToRemove = new Set(subprocesses.map(sp => sp.id));
      return prev.filter(i => !idsToRemove.has(i.subprocess.id));
    });
  }, [lockedSubprocessIds]);

  const addGroupCustomSubprocess = useCallback((item: SelectedSubprocessItem) => {
    setGroupSelectedItems(prev => {
      const customCount = prev.filter(i => i.isCustom).length;
      if (customCount >= 3) return prev;
      return [...prev, item];
    });
  }, []);

  const removeGroupCustomSubprocess = useCallback((subprocessId: string) => {
    setGroupSelectedItems(prev => prev.filter(i => i.subprocess.id !== subprocessId));
  }, []);

  const startGroupEvaluation = useCallback(() => {
    setState(s => ({
      ...s,
      globalSelectedSubprocesses: groupSelectedItems,
      currentSubprocessIndex: 0,
      step: 'questionnaire',
    }));
  }, [groupSelectedItems]);

  // ── Questionnaire handlers ────────────────────────────────────────────────

  const completeQuestionnaire = useCallback((
    scores: CriteriaScores,
    subprocess: Subprocess,
    macroprocess: Macroprocess,
    process: Process,
  ) => {
    const assessment = createAssessment(macroprocess, process, subprocess, scores);

    // Incremental save so progress survives tab closure.
    if (!initialAnsweredIds.current.has(assessment.subprocessId)) {
      initialAnsweredIds.current.add(assessment.subprocessId);
      addDoc(collection(db, 'responses'), {
        diagnostic_id: id,
        subprocess_id: assessment.subprocessId,
        process:       assessment.processName,
        score:         assessment.totalScore,
        scores:        assessment.scores,
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
  }, [id]);

  const goBackInQuestionnaire = useCallback(() => {
    setState(s => {
      if (s.currentSubprocessIndex === 0) return s;
      return { ...s, currentSubprocessIndex: s.currentSubprocessIndex - 1 };
    });
  }, []);

  const currentItem = state.globalSelectedSubprocesses[0];

  const groupSelectedIds = new Set(groupSelectedItems.map(i => i.subprocess.id));
  const groupCustomSubprocesses = groupSelectedItems.filter(i => i.isCustom);

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
          <div className="flex items-center gap-4">
            {company && (
              <span className="text-xs text-gray-500 font-medium">{company}</span>
            )}
            {isGroupMode && (
              <button
                onClick={() => setShowShareModal(true)}
                className="text-sm text-white font-medium bg-blue-600 hover:bg-blue-700 rounded-lg px-3 py-1.5 transition-colors"
              >
                Link de compartilhamento
              </button>
            )}
            {(state.step === 'questionnaire' || state.step === 'explore') && (
              <button
                onClick={() => setShowContinueModal(true)}
                className="text-sm text-white font-medium bg-green-600 hover:bg-green-700 rounded-lg px-3 py-1.5 transition-colors"
              >
                Continuar depois
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Share link modal */}
      {showShareModal && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowShareModal(false); }}
        >
          <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Link de compartilhamento
            </h2>
            <p className="text-sm text-gray-600">
              Compartilhe este link com sua equipe. Cada colaborador pode selecionar áreas diferentes — sem sobrepor as escolhas dos outros.
            </p>
            <div className="flex gap-2">
              <input
                value={groupShareLink}
                readOnly
                className="border border-gray-200 rounded px-2 py-1.5 w-full text-sm font-mono bg-gray-50 text-gray-700"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(groupShareLink);
                  setShareLinkCopied(true);
                  setTimeout(() => setShareLinkCopied(false), 2000);
                }}
                className="bg-gray-900 hover:bg-gray-700 text-white px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap transition-colors"
              >
                Copiar
              </button>
            </div>
            {shareLinkCopied && (
              <p className="text-green-600 text-xs -mt-2">Link copiado!</p>
            )}
            <button
              onClick={() => setShowShareModal(false)}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors text-left"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Continuar depois modal */}
      {showContinueModal && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowContinueModal(false); }}
        >
          <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Continuar diagnóstico depois
            </h2>
            <p className="text-sm text-gray-600">
              Use o link abaixo para continuar de onde parou. As respostas já dadas serão mantidas.
            </p>
            <div className="flex gap-2">
              <input
                value={typeof window !== 'undefined' ? window.location.href : ''}
                readOnly
                className="border border-gray-200 rounded px-2 py-1.5 w-full text-sm font-mono bg-gray-50 text-gray-700"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  setContinueLinkCopied(true);
                  setTimeout(() => setContinueLinkCopied(false), 2000);
                }}
                className="bg-gray-900 hover:bg-gray-700 text-white px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap transition-colors"
              >
                Copiar
              </button>
            </div>
            {continueLinkCopied && (
              <p className="text-green-600 text-xs -mt-2">Link copiado!</p>
            )}
            <button
              onClick={() => setShowContinueModal(false)}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors text-left"
            >
              Voltar ao diagnóstico
            </button>
          </div>
        </div>
      )}

      <StepIndicator step={state.step} />

      {/* Group explore: collaborator picks their areas */}
      {state.step === 'explore' && isGroupMode && (
        <>
          <SelectedSubprocessesPanel
            count={groupSelectedItems.length}
            onStart={startGroupEvaluation}
            onClear={() => setGroupSelectedItems([])}
          />
          <SubprocessExplorer
            selectedIds={groupSelectedIds}
            customSubprocesses={groupCustomSubprocesses}
            onToggle={toggleGroupSubprocess}
            onToggleAll={toggleGroupAll}
            onAddCustom={addGroupCustomSubprocess}
            onRemoveCustom={removeGroupCustomSubprocess}
            onBack={() => router.push('/assessment')}
            lockedSubprocessIds={lockedSubprocessIds}
            initialCustomAreas={customAreas}
            onCustomAreasChange={handleCustomAreasChange}
          />
        </>
      )}

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
