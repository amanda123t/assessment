'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  AssessmentState,
  Macroprocess, Process, Subprocess, CriteriaScores,
  SelectedSubprocessItem,
} from '@/types';
import { createAssessment, addAssessment, advanceIndex, isAssessmentComplete } from '@/lib/assessmentEngine';

import { db } from '@/lib/firebase';
import { collection, addDoc, query, getDocs, where, doc, getDoc } from 'firebase/firestore';

import { processLibrary } from '@/data/processLibrary';

import StepIndicator from '@/components/StepIndicator';
import StartScreen from '@/components/StartScreen';
import SubprocessExplorer from '@/components/SubprocessExplorer';
import SelectedSubprocessesPanel from '@/components/SelectedSubprocessesPanel';
import Questionnaire from '@/components/Questionnaire';
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
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');

  const [answeredSubprocessIds, setAnsweredSubprocessIds] = useState<string[]>([]);
  const [continueError, setContinueError] = useState<string | null>(null);
  const [isContinuing, setIsContinuing] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [resumeLink, setResumeLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  // Group mode
  const [mode, setMode] = useState<'individual' | 'group'>('individual');
  const [shareLink, setShareLink] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);

  // Stable diagnostic identifier — generated once per page mount
  const diagnosticId = useRef(crypto.randomUUID());
  const alreadySaved = useRef(false);
  // Tracks subprocess IDs saved incrementally so the ranking useEffect skips them
  const savedAssessmentIds = useRef(new Set<string>());

  // ── Persist responses in Firestore when ranking is reached ──────────────────

  useEffect(() => {

    if (state.step !== 'ranking' || state.assessments.length === 0) return;
    if (alreadySaved.current) return;
    alreadySaved.current = true;

    const createdAt = new Date().toISOString();

    state.assessments.forEach((a) => {
      // Skip any response already saved by the incremental path in completeQuestionnaire
      if (savedAssessmentIds.current.has(a.subprocessId)) return;
      addDoc(collection(db, 'responses'), {
        diagnostic_id: diagnosticId.current,
        subprocess_id: a.subprocessId,
        process: a.processName,
        score: a.totalScore,
        answered_by: email,
        created_at: createdAt,
      }).catch((err) =>
        console.error('[Firestore] Failed to save response:', err)
      );
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
      const ids = snapshot.docs.map((doc) => doc.data().subprocess_id as string);
      setAnsweredSubprocessIds(ids);
    }).catch((err) =>
      console.error('[Firestore] Failed to load responses:', err)
    );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.step]);

  // ── Navigation ─────────────────────────────────────────────────────────────

  const goToExplore = useCallback(() => {
    if (!company.trim()) {
      alert('Informe o nome da empresa');
      return;
    }

    setState((s) => ({ ...s, step: 'explore' }));
  }, [company]);

  const goToExploreGroup = useCallback(async () => {
    if (!company.trim()) {
      alert('Informe o nome da empresa');
      return;
    }

    try {
      const docRef = await addDoc(collection(db, 'diagnostics'), {
        company,
        created_at: new Date().toISOString(),
        mode: 'group',
      });
      diagnosticId.current = docRef.id;
      const link = `${window.location.origin}/diagnostic/${docRef.id}`;
      setMode('group');
      setShareLink(link);
      setShowShareModal(true);
      setState((s) => ({ ...s, step: 'explore' }));
    } catch (err) {
      console.error('[Firestore] Failed to create group diagnostic:', err);
      alert('Erro ao criar diagnóstico em grupo. Tente novamente.');
    }
  }, [company]);

  const goBackToStart = useCallback(() => {
    setState((s) => ({ ...s, step: 'start' }));
  }, []);

  const handleContinueDiagnostic = useCallback(async (code: string) => {
    setContinueError(null);
    setIsContinuing(true);

    try {
      const diagnosticSnap = await getDoc(doc(db, 'diagnostics', code));

      if (!diagnosticSnap.exists()) {
        setContinueError('Diagnostic not found. Check the code.');
        return;
      }

      const data = diagnosticSnap.data();
      setCompany(data.company || '');
      diagnosticId.current = code;
      setState((s) => ({ ...s, step: 'explore' }));
    } catch (err) {
      console.error('[Firestore] Failed to load diagnostic:', err);
      setContinueError('Diagnostic not found. Check the code.');
    } finally {
      setIsContinuing(false);
    }
  }, []);

  // ── Subprocess selection ───────────────────────────────────────────────────

  const toggleSubprocess = useCallback(
    (subprocess: Subprocess, macroprocess: Macroprocess, process: Process) => {

      setState((s) => {

        const exists = s.globalSelectedSubprocesses.some(
          (item) => item.subprocess.id === subprocess.id
        );

        if (exists) {
          return {
            ...s,
            globalSelectedSubprocesses:
              s.globalSelectedSubprocesses.filter(
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
    (
      subprocesses: Subprocess[],
      macroprocess: Macroprocess,
      process: Process,
      selectAll: boolean
    ) => {

      setState((s) => {

        if (selectAll) {

          const existingIds = new Set(
            s.globalSelectedSubprocesses.map((i) => i.subprocess.id)
          );

          const toAdd: SelectedSubprocessItem[] = subprocesses
            .filter((sp) => !existingIds.has(sp.id))
            .map((sp) => ({ macroprocess, process, subprocess: sp }));

          return {
            ...s,
            globalSelectedSubprocesses: [
              ...s.globalSelectedSubprocesses,
              ...toAdd,
            ],
          };
        }

        const idsToRemove = new Set(subprocesses.map((sp) => sp.id));

        return {
          ...s,
          globalSelectedSubprocesses:
            s.globalSelectedSubprocesses.filter(
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

      const customCount =
        s.globalSelectedSubprocesses.filter((i) => i.isCustom).length;

      if (customCount >= 3) return s;

      return {
        ...s,
        globalSelectedSubprocesses: [
          ...s.globalSelectedSubprocesses,
          item,
        ],
      };

    });

  }, []);

  const removeCustomSubprocess = useCallback((subprocessId: string) => {

    setState((s) => ({
      ...s,
      globalSelectedSubprocesses:
        s.globalSelectedSubprocesses.filter(
          (i) => i.subprocess.id !== subprocessId
        ),
    }));

  }, []);

  // ── Start evaluation ───────────────────────────────────────────────────────

  const startEvaluation = useCallback(() => {

    if (mode === 'individual') {
      // Individual: create the diagnostic now (first moment all fields are known).
      // selected_subprocess_ids lets the resume page rebuild the exact queue.
      addDoc(collection(db, 'diagnostics'), {
        company,
        created_at: new Date().toISOString(),
        selected_subprocess_ids: state.globalSelectedSubprocesses.map((i) => i.subprocess.id),
      }).then((docRef) => {
        diagnosticId.current = docRef.id;
      }).catch((err) => console.error('[Firestore] Failed to create diagnostic:', err));
    }
    // Group: diagnostic already created in goToExploreGroup; diagnosticId.current is set.

    setState((s) => ({ ...s, currentSubprocessIndex: 0, step: 'questionnaire' }));

  }, [mode, company, state.globalSelectedSubprocesses]);

  // ── Questionnaire ──────────────────────────────────────────────────────────

  const completeQuestionnaire = useCallback((
    scores: CriteriaScores,
    subprocess: Subprocess,
    macroprocess: Macroprocess,
    process: Process,
  ) => {

    // Compute assessment outside setState to get totalScore for Firestore save.
    // isCustom is not needed for the persisted fields so we omit it here.
    const assessmentForSave = createAssessment(macroprocess, process, subprocess, scores);

    // Incremental save — persists progress immediately so resuming works even
    // if the user closes the tab before reaching the ranking screen.
    if (!savedAssessmentIds.current.has(assessmentForSave.subprocessId)) {
      savedAssessmentIds.current.add(assessmentForSave.subprocessId);
      addDoc(collection(db, 'responses'), {
        diagnostic_id: diagnosticId.current,
        subprocess_id: assessmentForSave.subprocessId,
        process:       assessmentForSave.processName,
        score:         assessmentForSave.totalScore,
        answered_by:   email,
        created_at:    new Date().toISOString(),
      }).catch((err) => console.error('[Firestore] Failed to save response:', err));
    }

    setState((s) => {

      // subprocess / macroprocess / process come from Questionnaire props —
      // no state re-read needed.  isCustom is not a Questionnaire concern so
      // it is still read from state (custom subprocesses added at runtime).
      const { isCustom } = s.globalSelectedSubprocesses[s.currentSubprocessIndex];

      const assessment = createAssessment(
        macroprocess,
        process,
        subprocess,
        scores,
        isCustom
      );

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

  }, [email]);

  const goBackInQuestionnaire = useCallback(() => {

    setState((s) => {

      if (s.currentSubprocessIndex === 0) {
        return { ...s, step: 'explore' };
      }

      return {
        ...s,
        currentSubprocessIndex: s.currentSubprocessIndex - 1,
      };

    });

  }, []);

  const restart = useCallback(() => {
    setState(INITIAL_STATE);
    diagnosticId.current = crypto.randomUUID();
    setAnsweredSubprocessIds([]);
    setContinueError(null);
    setShowResumeModal(false);
    setLinkCopied(false);
    setMode('individual');
    setShareLink('');
    setShowShareModal(false);
    setShareLinkCopied(false);
    alreadySaved.current = false;
    savedAssessmentIds.current = new Set();
  }, []);

  const openResumeModal = useCallback(() => {
    setResumeLink(`${window.location.origin}/diagnostic/${diagnosticId.current}`);
    setShowResumeModal(true);
  }, []);

  // ── Derived values ─────────────────────────────────────────────────────────

  const selectedIds = useMemo(
    () =>
      new Set(
        state.globalSelectedSubprocesses.map(
          (i) => i.subprocess.id
        )
      ),
    [state.globalSelectedSubprocesses]
  );

  const customSubprocesses = useMemo(
    () =>
      state.globalSelectedSubprocesses.filter((i) => i.isCustom),
    [state.globalSelectedSubprocesses]
  );

  const lockedSubprocessIds = useMemo(
    () => new Set(answeredSubprocessIds),
    [answeredSubprocessIds]
  );

  const allStandardSubprocesses = useMemo(
    () => processLibrary.flatMap((m) => m.processes.flatMap((p) => p.subprocesses)),
    []
  );

  const remainingSubprocesses = useMemo(
    () => allStandardSubprocesses.filter((sp) => !lockedSubprocessIds.has(sp.id)),
    [allStandardSubprocesses, lockedSubprocessIds]
  );

  const allAnswered =
    answeredSubprocessIds.length > 0 &&
    remainingSubprocesses.length === 0;

  const currentItem =
    state.globalSelectedSubprocesses[state.currentSubprocessIndex];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (

    <div className="min-h-screen bg-gray-50">

      {state.step === 'start' ? (

        <StartScreen
          onStart={goToExplore}
          onStartGroup={goToExploreGroup}
          company={company}
          onCompanyChange={setCompany}
          email={email}
          onEmailChange={setEmail}
          onContinue={handleContinueDiagnostic}
          continueError={continueError}
          isContinuing={isContinuing}
        />

      ) : (

        <>

          <header className="bg-white border-b border-gray-100 px-6 py-3 shadow-sm">

            <div className="max-w-5xl mx-auto flex items-center justify-between">

              <div>
                <h1 className="text-sm font-bold text-gray-900 leading-none">
                  OEA
                </h1>
                <p className="text-xs text-gray-400">
                  Operational Efficiency Assessment
                </p>
              </div>

              <div className="flex items-center gap-4">
                {mode === 'group' && (state.step === 'explore' || state.step === 'questionnaire') && (
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="text-sm text-gray-700 hover:text-gray-900 font-medium border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                  >
                    🔗 Link de compartilhamento
                  </button>
                )}

                {state.step === 'questionnaire' && state.globalSelectedSubprocesses.length > 1 && (
                  <button
                    onClick={openResumeModal}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                  >
                    Continuar depois
                  </button>
                )}
              </div>

            </div>

          </header>

          {/* Share link modal (group mode) */}
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
                  Compartilhe este link com sua equipe. Cada colaborador pode selecionar e responder áreas diferentes — sem sobrepor as escolhas dos outros.
                </p>
                <div className="flex gap-2">
                  <input
                    value={shareLink}
                    readOnly
                    className="border border-gray-200 rounded px-2 py-1.5 w-full text-sm font-mono bg-gray-50 text-gray-700"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(shareLink);
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
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  Continuar para seleção
                </button>
              </div>
            </div>
          )}

          {/* Resume modal */}
          {showResumeModal && (
            <div
              className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4"
              onClick={(e) => { if (e.target === e.currentTarget) setShowResumeModal(false); }}
            >
              <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md flex flex-col gap-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Continuar diagnóstico depois
                </h2>
                <p className="text-sm text-gray-600">
                  Use o link abaixo para continuar depois ou compartilhar com sua equipe. As respostas já dadas serão mantidas.
                </p>
                <div className="flex gap-2">
                  <input
                    value={resumeLink}
                    readOnly
                    className="border border-gray-200 rounded px-2 py-1.5 w-full text-sm font-mono bg-gray-50 text-gray-700"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(resumeLink);
                      setLinkCopied(true);
                      setTimeout(() => setLinkCopied(false), 2000);
                    }}
                    className="bg-gray-900 hover:bg-gray-700 text-white px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap transition-colors"
                  >
                    Copiar
                  </button>
                </div>
                {linkCopied && (
                  <p className="text-green-600 text-xs -mt-2">Link copiado!</p>
                )}
                <button
                  onClick={() => setShowResumeModal(false)}
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
                  onToggle={toggleSubprocess}
                  onToggleAll={toggleAllInProcess}
                  onAddCustom={addCustomSubprocess}
                  onRemoveCustom={removeCustomSubprocess}
                  onBack={goBackToStart}
                  lockedSubprocessIds={lockedSubprocessIds}
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

              <RankingScreen
                assessments={state.assessments}
                onRestart={restart}
              />

            )}

          </main>

        </>

      )}

    </div>

  );

}