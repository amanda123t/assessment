'use client';

/**
 * Voting page — /diagnostic/[id]/vote
 *
 * Dedicated page where collaborators vote on subprocess priorities.
 * Loads the assessment data from Firestore and renders VotingPanel.
 * No authentication required — the link is the access control.
 */

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { collection, query, getDocs, where, doc, getDoc } from 'firebase/firestore';
import { ArrowLeft } from 'lucide-react';

import { db } from '@/lib/firebase';
import { SubprocessAssessment } from '@/types';
import { reconstructAssessment } from '@/lib/reconstructAssessment';

import VotingPanel from '@/components/VotingPanel';

// ── Page ─────────────────────────────────────────────────────────────────────

type PageStatus = 'loading' | 'not-found' | 'ready';

export default function VotePage() {
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
      console.error('[VotePage] Failed to load diagnostic:', err);
      setStatus('not-found');
    });
  }, [id]);

  // ── Loading ────────────────────────────────────────────────────────────────

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-500">Carregando...</p>
      </div>
    );
  }

  if (status === 'not-found') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 max-w-md w-full text-center">
          <p className="text-gray-700 font-medium mb-1">Diagnóstico não encontrado.</p>
          <p className="text-sm text-gray-500">Verifique o link compartilhado.</p>
        </div>
      </div>
    );
  }

  // ── Vote view ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">

      <header className="bg-white border-b border-gray-100 px-6 py-3 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-none">OEA</h1>
            <p className="text-xs text-gray-500">Votação de Prioridades</p>
          </div>
          <div className="flex items-center gap-4">
            {company && (
              <span className="text-xs text-gray-500 font-medium">{company}</span>
            )}
            <Link
              href={`/diagnostic/${id}/report`}
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft size={13} strokeWidth={2} />
              Ver relatório
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8">
        {assessments.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-16">
            Este diagnóstico ainda não possui subprocessos avaliados.
          </p>
        ) : (
          <VotingPanel assessmentId={id} assessments={assessments} />
        )}
      </div>

    </div>
  );
}
