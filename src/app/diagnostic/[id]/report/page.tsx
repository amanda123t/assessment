'use client';

/**
 * Public shared report page — /diagnostic/[id]/report
 *
 * Loads the assessment data from Firestore using the diagnostic ID embedded
 * in the URL, reconstructs SubprocessAssessment objects with the same
 * formulas as the main assessment flow, and renders:
 *   1. The full RankingScreen (read-only — onRestart is a no-op)
 *   2. The VotingPanel so collaborators can vote on subprocess priorities
 *
 * No authentication required — the link is the access control.
 */

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { collection, query, getDocs, where, doc, getDoc } from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { SubprocessAssessment } from '@/types';
import { reconstructAssessment } from '@/lib/reconstructAssessment';

import RankingScreen from '@/components/RankingScreen';

// ── Page ─────────────────────────────────────────────────────────────────────

type PageStatus = 'loading' | 'not-found' | 'ready';

export default function SharedReportPage() {
  const { id } = useParams<{ id: string }>();

  const [status, setStatus]           = useState<PageStatus>('loading');
  const [company, setCompany]         = useState('');
  const [assessments, setAssessments] = useState<SubprocessAssessment[]>([]);

  useEffect(() => {
    if (!id) { setStatus('not-found'); return; }

    async function load() {
      const diagnosticSnap = await getDoc(doc(db, 'diagnostics', id));
      if (!diagnosticSnap.exists()) { setStatus('not-found'); return; }

      setCompany(diagnosticSnap.data().company ?? '');

      const snapshot = await getDocs(
        query(collection(db, 'responses'), where('diagnostic_id', '==', id)),
      );
      const rebuilt = snapshot.docs.map(d =>
        reconstructAssessment(d.data() as Record<string, unknown>),
      );

      setAssessments(rebuilt);
      setStatus('ready');
    }

    load().catch((err) => {
      console.error('[ReportPage] Failed to load diagnostic:', err);
      setStatus('not-found');
    });
  }, [id]);

  // ── Loading / not-found ────────────────────────────────────────────────────

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-500">Carregando relatório...</p>
      </div>
    );
  }

  if (status === 'not-found') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 max-w-md w-full text-center">
          <p className="text-gray-700 font-medium mb-1">Relatório não encontrado.</p>
          <p className="text-sm text-gray-400">Verifique o link compartilhado.</p>
        </div>
      </div>
    );
  }

  // ── Shared report view ─────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Minimal header — identifies this as a shared report */}
      <header className="bg-white border-b border-gray-100 px-6 py-3 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-none">OEA</h1>
            <p className="text-xs text-gray-400">Relatório Compartilhado</p>
          </div>
          {company && (
            <span className="text-xs text-gray-500 font-medium">{company}</span>
          )}
        </div>
      </header>

      {assessments.length === 0 ? (
        <div className="max-w-5xl mx-auto px-6 py-16 text-center">
          <p className="text-sm text-gray-400">
            Este diagnóstico ainda não possui respostas registradas.
          </p>
        </div>
      ) : (
          <RankingScreen
            assessments={assessments}
            onRestart={() => {}}
            diagnosticId={id}
          />
      )}

    </div>
  );
}
