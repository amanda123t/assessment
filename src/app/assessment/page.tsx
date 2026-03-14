'use client';

import { useCallback, useMemo, useEffect, useRef, useReducer } from 'react';
import { useToast, ToastContainer } from '@/components/Toast';
import {
  Macroprocess, Process, Subprocess, CriteriaScores, RealValues,
  SelectedSubprocessItem, CustomArea,
} from '@/types';
import { createAssessment } from '@/lib/assessmentEngine';
import {
  assessmentReducer, INITIAL_FULL_STATE, MAX_CUSTOM,
} from '@/lib/assessmentReducer';

import { db } from '@/lib/firebase';
import { collection, addDoc, query, getDocs, where, doc, getDoc, updateDoc } from 'firebase/firestore';

import { getAllMacroprocesses } from '@/data/industryLibrary';

import StepIndicator from '@/components/StepIndicator';
import StartScreen from '@/components/StartScreen';
import SubprocessExplorer from '@/components/SubprocessExplorer';
import SelectedSubprocessesPanel from '@/components/SelectedSubprocessesPanel';
import Questionnaire from '@/components/Questionnaire';
import RankingScreen from '@/components/RankingScreen';
import ErrorBoundary from '@/components/ErrorBoundary';

// ── Page component ───────────────────────────────────────────────────────────

export default function AssessmentPage() {

  const [state, dispatch] = useReducer(assessmentReducer, INITIAL_FULL_STATE);
  const { toasts, showToast, dismissToast } = useToast();

  // Stable refs — not managed by the reducer (no render implications)
  const diagnosticId      = useRef(crypto.randomUUID());
  const alreadySaved      = useRef(false);
  const savedAssessmentIds = useRef(new Set<string>());

  // ── Persist responses in Firestore when ranking is reached ──────────────────

  useEffect(() => {
    if (state.step !== 'ranking' || state.assessments.length === 0) return;
    if (alreadySaved.current) return;
    alreadySaved.current = true;
    const createdAt = new Date().toISOString();
    console.log('[BulkSave] Saving responses for diagnostic:', diagnosticId.current, 'assessments:', state.assessments.length);
    state.assessments.forEach((a) => {
      // Sempre tentar salvar — o Firestore vai criar um documento duplicado,
      // mas é melhor duplicar do que perder. A query no vote/report não se importa com duplicatas.
      addDoc(collection(db, 'responses'), {
        diagnostic_id: diagnosticId.current,
        subprocess_id: a.subprocessId,
        process:       a.processName,
        score:         a.totalScore,
        scores:        a.scores,
        answered_by:   state.email,
        created_at:    createdAt,
      }).then(() => {
        console.log('[BulkSave] Saved:', a.subprocessId);
      }).catch((err) => {
        console.error('[BulkSave] Failed:', a.subprocessId, err);
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.step]);

  // ── Load answered subprocess IDs when entering explore step ─────────────────

  useEffect(() => {

    if (state.step !== 'explore') return;

    const q = query(
      collection(db, 'responses'),
      where('diagnostic_id', '==', diagnosticId.current)
    );

    getDocs(q).then((snapshot) => {
      const ids = snapshot.docs.map((d) => d.data().subprocess_id as string);
      dispatch({ type: 'SET_ANSWERED_IDS', payload: ids });
    }).catch((err) => {
      console.error('[Firestore] Failed to load responses:', err);
      showToast('Erro ao carregar respostas anteriores.');
    });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.step]);

  // ── Navigation ─────────────────────────────────────────────────────────────

  const goToExplore = useCallback(() => {
    if (!state.company.trim()) {
      alert('Informe o nome da empresa');
      return;
    }
    dispatch({ type: 'SET_STEP', payload: 'explore' });
  }, [state.company]);

  const goToExploreGroup = useCallback(async () => {
    if (!state.company.trim()) {
      alert('Informe o nome da empresa');
      return;
    }

    try {
      const docRef = await addDoc(collection(db, 'diagnostics'), {
        company:    state.company,
        created_at: new Date().toISOString(),
        mode:       'group',
        custom_areas: [],
      });
      diagnosticId.current = docRef.id;
      const link = `${window.location.origin}/diagnostic/${docRef.id}`;
      dispatch({ type: 'GROUP_DIAGNOSTIC_CREATED', payload: { link } });
    } catch (err) {
      console.error('[Firestore] Failed to create group diagnostic:', err);
      showToast('Erro ao criar diagnóstico em grupo. Tente novamente.');
    }
  }, [state.company]);

  const goBackToStart = useCallback(() => {
    dispatch({ type: 'SET_STEP', payload: 'start' });
  }, []);

  const handleContinueDiagnostic = useCallback(async (code: string) => {
    dispatch({ type: 'SET_CONTINUE_ERROR', payload: null });
    dispatch({ type: 'SET_IS_CONTINUING',  payload: true });

    try {
      const diagnosticSnap = await getDoc(doc(db, 'diagnostics', code));

      if (!diagnosticSnap.exists()) {
        dispatch({ type: 'SET_CONTINUE_ERROR', payload: 'Diagnostic not found. Check the code.' });
        return;
      }

      const data = diagnosticSnap.data();
      diagnosticId.current = code;
      dispatch({ type: 'LOAD_DIAGNOSTIC_SUCCESS', payload: { company: data.company || '' } });
    } catch (err) {
      console.error('[Firestore] Failed to load diagnostic:', err);
      dispatch({ type: 'SET_CONTINUE_ERROR', payload: 'Diagnostic not found. Check the code.' });
    } finally {
      dispatch({ type: 'SET_IS_CONTINUING', payload: false });
    }
  }, []);

  // ── Subprocess selection ───────────────────────────────────────────────────

  const toggleSubprocess = useCallback(
    (subprocess: Subprocess, macroprocess: Macroprocess, process: Process) => {
      console.log('[toggleSubprocess]', {
        subprocessId: subprocess.id,
        wasSelected: state.globalSelectedSubprocesses.some(i => i.subprocess.id === subprocess.id),
        currentSelectedCount: state.globalSelectedSubprocesses.length,
      });
      dispatch({ type: 'TOGGLE_SUBPROCESS', payload: { subprocess, macroprocess, process } });
    },
    [state.globalSelectedSubprocesses]
  );

  const toggleAllInProcess = useCallback(
    (
      subprocesses: Subprocess[],
      macroprocess: Macroprocess,
      process: Process,
      selectAll: boolean
    ) => {
      dispatch({ type: 'TOGGLE_ALL_IN_PROCESS', payload: { subprocesses, macroprocess, process, selectAll } });
    },
    []
  );

  const clearSelection = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTION' });
  }, []);

  const addCustomSubprocess = useCallback((item: SelectedSubprocessItem) => {
    const customCount = state.globalSelectedSubprocesses.filter(i => i.isCustom).length;
    if (customCount >= MAX_CUSTOM) {
      showToast(`Limite de ${MAX_CUSTOM} subprocessos personalizados atingido.`);
      return;
    }
    dispatch({ type: 'ADD_CUSTOM_SUBPROCESS', payload: item });
  }, [state.globalSelectedSubprocesses, showToast]);

  const removeCustomSubprocess = useCallback((subprocessId: string) => {
    dispatch({ type: 'REMOVE_CUSTOM_SUBPROCESS', payload: subprocessId });
  }, []);

  // ── Custom areas ───────────────────────────────────────────────────────────

  const handleCustomAreasChange = useCallback((areas: CustomArea[]) => {
    dispatch({ type: 'SET_CUSTOM_AREAS', payload: areas });
    // For group mode: the diagnostic already exists, update it immediately
    if (state.mode === 'group' && diagnosticId.current) {
      updateDoc(doc(db, 'diagnostics', diagnosticId.current), { custom_areas: areas })
        .catch(err => console.error('[Firestore] Failed to update custom_areas:', err));
    }
    // For individual mode: custom_areas are included when the diagnostic is created in startEvaluation
  }, [state.mode]);

  // ── Start evaluation ───────────────────────────────────────────────────────

  const startEvaluation = useCallback(async () => {

    if (state.mode === 'individual') {
      // Individual: create the diagnostic now (first moment all fields are known).
      // selected_subprocess_ids lets the resume page rebuild the exact queue.
      try {
        const docRef = await addDoc(collection(db, 'diagnostics'), {
          company:                  state.company,
          created_at:               new Date().toISOString(),
          selected_subprocess_ids:  state.globalSelectedSubprocesses.map((i) => i.subprocess.id),
          custom_areas:             state.customAreas,
        });
        diagnosticId.current = docRef.id;
      } catch (err) {
        console.error('[Firestore] Failed to create diagnostic:', err);
        showToast('Erro ao iniciar diagnóstico. Verifique sua conexão.');
        return; // do NOT advance if Firestore failed
      }
    }
    // Group: diagnostic already created in goToExploreGroup; diagnosticId.current is set.

    dispatch({ type: 'START_EVALUATION' });

  }, [state.mode, state.company, state.globalSelectedSubprocesses, state.customAreas]);

  // ── Questionnaire ──────────────────────────────────────────────────────────

  const completeQuestionnaire = useCallback((
    scores:       CriteriaScores,
    subprocess:   Subprocess,
    macroprocess: Macroprocess,
    process:      Process,
    realValues?:  RealValues,
  ) => {
    try {
      console.log('[completeQuestionnaire] CALLED', {
        subprocessId:   subprocess.id,
        subprocessName: subprocess.name,
        currentIndex:   state.currentSubprocessIndex,
        totalSelected:  state.globalSelectedSubprocesses.length,
      });

      // Compute once — isCustom comes from the current item in state.
      const { isCustom } = state.globalSelectedSubprocesses[state.currentSubprocessIndex];
      const assessment = createAssessment(macroprocess, process, subprocess, scores, isCustom, realValues);

      console.log('[completeQuestionnaire] assessment created', {
        assessmentId: assessment.subprocessId,
        totalScore:   assessment.totalScore,
      });

      // Incremental save — persists progress immediately so resuming works even
      // if the user closes the tab before reaching the ranking screen.
      if (!savedAssessmentIds.current.has(assessment.subprocessId)) {
        addDoc(collection(db, 'responses'), {
          diagnostic_id: diagnosticId.current,
          subprocess_id: assessment.subprocessId,
          process:       assessment.processName,
          score:         assessment.totalScore,
          scores:        assessment.scores,
          real_values:   realValues ?? null,
          answered_by:   state.email,
          created_at:    new Date().toISOString(),
        }).then(() => {
          savedAssessmentIds.current.add(assessment.subprocessId);
          console.log('[Firestore] Response saved OK:', assessment.subprocessId, 'diagnostic:', diagnosticId.current);
        }).catch((err) => {
          console.error('[Firestore] Failed to save response:', err);
          showToast('Erro ao salvar resposta. Verifique sua conexão.');
        });
      }

      console.log('[completeQuestionnaire] dispatching COMPLETE_QUESTIONNAIRE');
      dispatch({ type: 'COMPLETE_QUESTIONNAIRE', payload: assessment });
      console.log('[completeQuestionnaire] dispatch DONE');

    } catch (err) {
      console.error('[completeQuestionnaire] ERROR:', err);
    }
  }, [state.email, state.globalSelectedSubprocesses, state.currentSubprocessIndex]);

  const goBackInQuestionnaire = useCallback(() => {
    dispatch({ type: 'GO_BACK_IN_QUESTIONNAIRE' });
  }, []);

  const restart = useCallback(() => {
    dispatch({ type: 'RESTART' });
    diagnosticId.current      = crypto.randomUUID();
    alreadySaved.current      = false;
    savedAssessmentIds.current = new Set();
  }, []);

  const openResumeModal = useCallback(() => {
    dispatch({ type: 'SET_RESUME_LINK',     payload: `${window.location.origin}/diagnostic/${diagnosticId.current}` });
    dispatch({ type: 'TOGGLE_RESUME_MODAL', payload: true });
  }, []);

  // ── Derived values ─────────────────────────────────────────────────────────

  const selectedIds = useMemo(
    () => new Set(state.globalSelectedSubprocesses.map((i) => i.subprocess.id)),
    [state.globalSelectedSubprocesses]
  );

  const customSubprocesses = useMemo(
    () => state.globalSelectedSubprocesses.filter((i) => i.isCustom),
    [state.globalSelectedSubprocesses]
  );

  const lockedSubprocessIds = useMemo(
    () => new Set(state.answeredSubprocessIds),
    [state.answeredSubprocessIds]
  );

  const allStandardSubprocesses = useMemo(
    () => getAllMacroprocesses().flatMap((m) => m.processes.flatMap((p) => p.subprocesses)),
    []
  );

  const remainingSubprocesses = useMemo(
    () => allStandardSubprocesses.filter((sp) => !lockedSubprocessIds.has(sp.id)),
    [allStandardSubprocesses, lockedSubprocessIds]
  );

  const allAnswered =
    state.answeredSubprocessIds.length > 0 &&
    remainingSubprocesses.length === 0;

  const currentItem =
    state.globalSelectedSubprocesses[state.currentSubprocessIndex];

  if (state.step === 'questionnaire') {
    console.log('[Page render] questionnaire state', {
      currentIndex:  state.currentSubprocessIndex,
      currentItem:   currentItem ? currentItem.subprocess.name : 'NULL',
      totalSelected: state.globalSelectedSubprocesses.length,
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (

    <div className="min-h-screen bg-gray-50">

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {state.step === 'start' ? (

        <StartScreen
          onStart={goToExplore}
          onStartGroup={goToExploreGroup}
          company={state.company}
          onCompanyChange={(v) => dispatch({ type: 'SET_COMPANY',  payload: v })}
          email={state.email}
          onEmailChange={(v)   => dispatch({ type: 'SET_EMAIL',   payload: v })}
          industry={state.industry}
          onIndustryChange={(v) => dispatch({ type: 'SET_INDUSTRY', payload: v })}
        />

      ) : (

        <>

          <header className="bg-white border-b border-gray-100 px-6 py-3 shadow-sm">

            <div className="max-w-5xl mx-auto flex items-center justify-between">

              <div>
                <h1 className="text-sm font-bold text-gray-900 leading-none">
                  OEA
                </h1>
                <p className="text-xs text-gray-500">
                  Operational Efficiency Assessment
                </p>
              </div>

              <div className="flex items-center gap-4">
                {state.mode === 'group' && (state.step === 'explore' || state.step === 'questionnaire') && (
                  <button
                    onClick={() => dispatch({ type: 'TOGGLE_SHARE_MODAL', payload: true })}
                    className="text-sm text-white font-medium bg-blue-600 hover:bg-blue-700 rounded-lg px-3 py-1.5 transition-colors"
                  >
                    Link de compartilhamento
                  </button>
                )}

                {state.step === 'questionnaire' && (
                  <button
                    onClick={openResumeModal}
                    className="text-sm text-white font-medium bg-green-600 hover:bg-green-700 rounded-lg px-3 py-1.5 transition-colors"
                  >
                    Continuar depois
                  </button>
                )}
              </div>

            </div>

          </header>

          {/* Share link modal (group mode) */}
          {state.showShareModal && (
            <div
              className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center"
              onClick={(e) => { if (e.target === e.currentTarget) dispatch({ type: 'TOGGLE_SHARE_MODAL', payload: false }); }}
            >
              <div className="bg-white p-6 w-full sm:max-w-md sm:rounded-xl rounded-t-2xl shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
                <h2 className="text-lg font-semibold text-gray-900">
                  Link de compartilhamento
                </h2>
                <p className="text-sm text-gray-600">
                  Compartilhe este link com sua equipe. Cada colaborador pode selecionar e responder áreas diferentes — sem sobrepor as escolhas dos outros.
                </p>
                <div className="flex gap-2">
                  <input
                    value={state.shareLink}
                    readOnly
                    className="border border-gray-200 rounded px-2 py-2.5 w-full text-sm font-mono bg-gray-50 text-gray-700"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(state.shareLink);
                      dispatch({ type: 'SET_SHARE_LINK_COPIED', payload: true });
                      setTimeout(() => dispatch({ type: 'SET_SHARE_LINK_COPIED', payload: false }), 2000);
                    }}
                    className="bg-gray-900 hover:bg-gray-700 text-white px-3 py-2.5 rounded text-sm font-medium whitespace-nowrap transition-colors"
                  >
                    Copiar
                  </button>
                </div>
                {state.shareLinkCopied && (
                  <p className="text-green-600 text-xs -mt-2">Link copiado!</p>
                )}
                <button
                  onClick={() => dispatch({ type: 'TOGGLE_SHARE_MODAL', payload: false })}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  Continuar para seleção
                </button>
              </div>
            </div>
          )}

          {/* Resume modal */}
          {state.showResumeModal && (
            <div
              className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center"
              onClick={(e) => { if (e.target === e.currentTarget) dispatch({ type: 'TOGGLE_RESUME_MODAL', payload: false }); }}
            >
              <div className="bg-white p-6 w-full sm:max-w-md sm:rounded-xl rounded-t-2xl shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
                <h2 className="text-lg font-semibold text-gray-900">
                  Continuar diagnóstico depois
                </h2>
                <p className="text-sm text-gray-600">
                  Use o link abaixo para continuar depois ou compartilhar com sua equipe. As respostas já dadas serão mantidas.
                </p>
                <div className="flex gap-2">
                  <input
                    value={state.resumeLink}
                    readOnly
                    className="border border-gray-200 rounded px-2 py-2.5 w-full text-sm font-mono bg-gray-50 text-gray-700"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(state.resumeLink);
                      dispatch({ type: 'SET_LINK_COPIED', payload: true });
                      setTimeout(() => dispatch({ type: 'SET_LINK_COPIED', payload: false }), 2000);
                    }}
                    className="bg-gray-900 hover:bg-gray-700 text-white px-3 py-2.5 rounded text-sm font-medium whitespace-nowrap transition-colors"
                  >
                    Copiar
                  </button>
                </div>
                {state.linkCopied && (
                  <p className="text-green-600 text-xs -mt-2">Link copiado!</p>
                )}
                <button
                  onClick={() => dispatch({ type: 'TOGGLE_RESUME_MODAL', payload: false })}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors text-left"
                >
                  Voltar ao diagnóstico
                </button>
              </div>
            </div>
          )}

          <StepIndicator step={state.step} />

          {state.step === 'explore' && (

            <SelectedSubprocessesPanel
              count={state.globalSelectedSubprocesses.length}
              onStart={startEvaluation}
              onClear={clearSelection}
            />

          )}


          <main>

            <>

              {state.step === 'explore' && (

                allAnswered ? (
                  <div className="max-w-4xl mx-auto px-6 py-20 text-center">
                    <div className="bg-white rounded-xl border border-gray-200 p-10 inline-block">
                      <p className="text-gray-500 text-base">
                        All subprocesses in this diagnostic have already been answered.
                      </p>
                    </div>
                  </div>
                ) : (
                  <SubprocessExplorer
                    selectedIds={selectedIds}
                    customSubprocesses={customSubprocesses}
                    initialIndustry={state.industry ?? null}
                    onToggle={toggleSubprocess}
                    onToggleAll={toggleAllInProcess}
                    onAddCustom={addCustomSubprocess}
                    onRemoveCustom={removeCustomSubprocess}
                    onBack={goBackToStart}
                    lockedSubprocessIds={lockedSubprocessIds}
                    initialCustomAreas={state.customAreas}
                    onCustomAreasChange={handleCustomAreasChange}
                    globalSelectedSubprocesses={state.globalSelectedSubprocesses}
                    onClear={clearSelection}
                  />
                )

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

                <ErrorBoundary>
                  <RankingScreen
                    assessments={state.assessments}
                    onRestart={restart}
                    diagnosticId={diagnosticId.current}
                  />
                </ErrorBoundary>

              )}

            </>

          </main>

        </>

      )}

    </div>

  );

}
