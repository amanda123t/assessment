'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { processLibrary } from '@/data/processLibrary';
import { SubprocessAssessment, CriteriaScores } from '@/types';
import RankingScreen from '@/components/RankingScreen';

// ── Helpers ───────────────────────────────────────────────────────────────────

const EMPTY_SCORES: CriteriaScores = {
  operationalVolume: 0,
  peopleInvolved: 0,
  executionTime: 0,
  reworkOrErrors: 0,
  systemsOrSpreadsheets: 0,
  systemIntegrations: 0,
};

/** Find the full subprocess/process/macroprocess context by subprocess id. */
function lookupSubprocess(subprocessId: string) {
  for (const macro of processLibrary) {
    for (const process of macro.processes) {
      for (const subprocess of process.subprocesses) {
        if (subprocess.id === subprocessId) {
          return { macro, process, subprocess };
        }
      }
    }
  }
  return null;
}

/** Reconstruct a SubprocessAssessment from a stored Firestore response document. */
function buildAssessment(data: Record<string, unknown>): SubprocessAssessment {
  const subprocessId = data.subprocess_id as string;
  const totalScore   = (data.score as number) ?? 0;
  const processName  = (data.process as string) ?? '';

  const found = lookupSubprocess(subprocessId);

  return {
    subprocessId,
    subprocessName:   found?.subprocess.name ?? subprocessId,
    processId:        found?.process.id      ?? '',
    processName:      found?.process.name    ?? processName,
    macroprocessId:   found?.macro.id        ?? '',
    macroprocessName: found?.macro.name      ?? '',
    scores:           EMPTY_SCORES,
    totalScore,
    // Individual criteria scores were not persisted — derived metrics
    // default to 0. Priority labels still work because they derive from totalScore.
    automationScore:        0,
    annualHours:            0,
    automationSavingsHours: 0,
    financialImpact:        0,
  };
}

// ── Page ─────────────────────────────────────────────────────────────────────

type Status = 'loading' | 'not-found' | 'no-responses' | 'ready';

export default function DiagnosticResumePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [status, setStatus] = useState<Status>('loading');
  const [assessments, setAssessments] = useState<SubprocessAssessment[]>([]);

  useEffect(() => {
    if (!id) {
      setStatus('not-found');
      return;
    }

    async function load() {
      // Step 1 — verify the diagnostic document exists
      const diagnosticRef = doc(db, 'diagnostics', id);
      const diagnosticSnap = await getDoc(diagnosticRef);

      if (!diagnosticSnap.exists()) {
        setStatus('not-found');
        return;
      }

      // Step 2 — load responses
      const q = query(
        collection(db, 'responses'),
        where('diagnostic_id', '==', id),
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setStatus('no-responses');
        return;
      }

      const reconstructed = snapshot.docs.map((d) =>
        buildAssessment(d.data() as Record<string, unknown>)
      );
      reconstructed.sort((a, b) => b.totalScore - a.totalScore);

      setAssessments(reconstructed);
      setStatus('ready');
    }

    load().catch((err) => {
      console.error('[Firestore] Failed to load diagnostic:', err);
      setStatus('not-found');
    });
  }, [id]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-500">Carregando diagnóstico...</p>
      </div>
    );
  }

  // ── Not found ──────────────────────────────────────────────────────────────
  if (status === 'not-found') {
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

  // ── Diagnostic exists but no responses yet ─────────────────────────────────
  if (status === 'no-responses') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 max-w-md w-full text-center">
          <p className="text-gray-700 font-medium mb-1">
            Diagnóstico encontrado.
          </p>
          <p className="text-sm text-gray-400 mb-6">
            Nenhuma resposta registrada ainda. Continue o diagnóstico para ver os resultados aqui.
          </p>
          <button
            onClick={() => router.push('/assessment')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors"
          >
            Continuar diagnóstico
          </button>
        </div>
      </div>
    );
  }

  // ── Ranking ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-3 shadow-sm">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-sm font-bold text-gray-900 leading-none">OEA</h1>
          <p className="text-xs text-gray-400">Operational Efficiency Assessment</p>
        </div>
      </header>
      <RankingScreen
        assessments={assessments}
        onRestart={() => router.push('/assessment')}
      />
    </div>
  );
}
