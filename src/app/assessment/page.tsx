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

  const [diagnosticId, setDiagnosticId] = useState<string | null>(null);
  const [answeredSubprocessIds, setAnsweredSubprocessIds] = useState<string[]>([]);
  const [continueError, setContinueError] = useState<string | null>(null);
  const [isContinuing, setIsContinuing] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Stable session identifier — generated once per page mount
  const sessionId = useRef<string>(
    typeof crypto !== 'undefined'
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  );
  const alreadySaved = useRef(false);

  // ── Persist responses in Firestore when ranking is reached ──────────────────

  useEffect(() => {

    if (state.step !== 'ranking' || state.assessments.length === 0) return;
    if (alreadySaved.current) return;
    if (!diagnosticId) return;
    alreadySaved.current = true;

    const createdAt = new Date().toISOString();

    state.assessments.forEach((a) => {
      addDoc(collection(db, 'responses'), {
        diagnostic_id: diagnosticId,
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

    if (state.step !== 'explore' || !diagnosticId) return;

    const q = query(
      collection(db, 'responses'),
      where('diagnostic_id', '==', diagnosticId)
    );

    getDocs(q).then((snapshot) => {
      const ids = snapshot.docs.map((doc) => doc.data().subprocess_id as string);
      setAnsweredSubprocessIds(ids);
    }).catch((err) =>
      console.error('[Firestore] Failed to load responses:', err)
    );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.step, diagnosticId]);

  // ── Navigation ─────────────────────────────────────────────────────────────

  const goToExplore = useCallback(async () => {
    if (!company.trim()) {
      alert('Informe o nome da empresa');
      return;
    }

    try {
      const docRef = await addDoc(collection(db, 'diagnostics'), {
        company: company,
        created_at: new Date().toISOString(),
      });
      setDiagnosticId(docRef.id);
    } catch (err) {
      console.error('[Firestore] Failed to create diagnostic:', err);
    }

    setState((s) => ({ ...s, step: 'explore' }));
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
      setDiagnosticId(code);
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

    setState((s) => ({
      ...s,
      currentSubprocessIndex: 0,
      step: 'questionnaire',
    }));

  }, []);

  // ── Questionnaire ──────────────────────────────────────────────────────────

  const completeQuestionnaire = useCallback((scores: CriteriaScores) => {

    setState((s) => {

      const { macroprocess, process, subprocess, isCustom } =
        s.globalSelectedSubprocesses[s.currentSubprocessIndex];

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

  }, []);

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
    setDiagnosticId(null);
    setAnsweredSubprocessIds([]);
    setContinueError(null);
    setShowResumeModal(false);
    setLinkCopied(false);
    alreadySaved.current = false;
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

            <div className="max-w-5xl mx-auto">

              <h1 className="text-sm font-bold text-gray-900 leading-none">
                OEA
              </h1>

              <p className="text-xs text-gray-400">
                Operational Efficiency Assessment
              </p>

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

          {/* Continuar depois — floating button during explore & questionnaire */}
          {diagnosticId && (state.step === 'explore' || state.step === 'questionnaire') && (
            <button
              onClick={() => setShowResumeModal(true)}
              className="fixed bottom-6 right-6 z-40 bg-white border border-gray-200 shadow-lg hover:shadow-xl text-gray-700 hover:text-blue-600 font-medium text-sm px-4 py-2.5 rounded-full transition-all duration-200 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v14a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
              Continuar depois
            </button>
          )}

          {/* Resume modal */}
          {showResumeModal && diagnosticId && (() => {
            const resumeLink = window.location.origin + '/diagnostic/' + diagnosticId;
            return (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
                onClick={(e) => { if (e.target === e.currentTarget) setShowResumeModal(false); }}
              >
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-4">
                  <h2 className="text-lg font-bold text-gray-900">
                    Continuar diagnóstico depois
                  </h2>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Seu diagnóstico foi salvo. Use o link abaixo para continuar depois ou compartilhar com sua equipe.
                  </p>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs font-mono text-gray-700 break-all select-all">
                    {resumeLink}
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(resumeLink);
                        setLinkCopied(true);
                        setTimeout(() => setLinkCopied(false), 2000);
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors"
                    >
                      {linkCopied ? 'Link copiado!' : 'Copiar link'}
                    </button>
                    <button
                      onClick={() => setShowResumeModal(false)}
                      className="w-full border border-gray-200 hover:bg-gray-50 text-gray-600 font-medium text-sm py-2.5 rounded-lg transition-colors"
                    >
                      Voltar ao diagnóstico
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

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