'use client';

/**
 * Phase 2 — Detailed process mapping
 *
 * Loads:
 *   1. The diagnostic document (company name)
 *   2. Assessment responses (subprocesses)
 *   3. Vote summaries (to identify prioritized subprocesses)
 *   4. Any existing Phase 2 partial saves
 *
 * Renders Phase2Screen with the prioritized subprocess list pre-loaded.
 */

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { collection, query, getDocs, where, doc, getDoc } from 'firebase/firestore';
import { ArrowLeft } from 'lucide-react';

import { db } from '@/lib/firebase';
import { reconstructAssessment } from '@/lib/reconstructAssessment';
import { fetchVoteSummaries } from '@/lib/votes';
import { loadPhase2Responses, Phase2FormData } from '@/lib/phase2';

import Phase2Screen from '@/components/Phase2Screen';
import { SkeletonList } from '@/components/Skeleton';

// ── Page ─────────────────────────────────────────────────────────────────────

type PageStatus = 'loading' | 'not-found' | 'ready';

interface Phase2Entry {
  subprocessId:   string;
  subprocessName: string;
  processName:    string;
  isPrioritized:  boolean;
  voteAverage?:   number;
}

export default function Phase2Page() {
  const { id } = useParams<{ id: string }>();

  const [status,     setStatus]     = useState<PageStatus>('loading');
  const [company,    setCompany]    = useState('');
  const [prioritized, setPrioritized] = useState<Phase2Entry[]>([]);
  const [savedForms, setSavedForms] = useState<Map<string, Partial<Phase2FormData>>>(new Map());
  const [role,       setRole]       = useState<'respondent' | 'analyst'>('respondent');

  useEffect(() => {
    if (!id) { setStatus('not-found'); return; }

    async function load() {
      // Load diagnostic metadata
      const diagnosticSnap = await getDoc(doc(db, 'diagnostics', id));
      if (!diagnosticSnap.exists()) { setStatus('not-found'); return; }
      setCompany(diagnosticSnap.data().company ?? '');

      // Load subprocess assessments
      const snapshot = await getDocs(
        query(collection(db, 'responses'), where('diagnostic_id', '==', id)),
      );
      const assessments = snapshot.docs.map(d =>
        reconstructAssessment(d.data() as Record<string, unknown>),
      );

      // Load vote summaries to determine prioritized subprocesses
      // Use a dummy token since we only need aggregate data here
      const summaries = await fetchVoteSummaries(id, '');

      // Build the prioritized list (all that have votes, sorted by average desc)
      const entries: Phase2Entry[] = assessments
        .filter(a => (summaries.get(a.subprocessId)?.count ?? 0) > 0)
        .sort((a, b) => {
          const sa = summaries.get(a.subprocessId)?.average ?? 0;
          const sb = summaries.get(b.subprocessId)?.average ?? 0;
          return sb - sa;
        })
        .map(a => ({
          subprocessId:   a.subprocessId,
          subprocessName: a.subprocessName,
          processName:    a.processName,
          isPrioritized:  true,
          voteAverage:    summaries.get(a.subprocessId)?.average,
        }));

      // If no votes yet, fall back to showing all assessed subprocesses
      if (entries.length === 0) {
        assessments.forEach(a => entries.push({
          subprocessId:   a.subprocessId,
          subprocessName: a.subprocessName,
          processName:    a.processName,
          isPrioritized:  false,
        }));
      }

      // Load any existing Phase 2 partial saves
      const existing = await loadPhase2Responses(id);

      // Include subprocesses manually added via Phase 2 that aren't in the prioritized list
      const entryIds = new Set(entries.map(e => e.subprocessId));
      existing.forEach((data) => {
        if (!entryIds.has(data.subprocessId)) {
          entries.push({
            subprocessId:   data.subprocessId,
            subprocessName: data.subprocessName,
            processName:    data.processName,
            isPrioritized:  data.isPrioritized,
          });
        }
      });

      setPrioritized(entries);

      const formsMap = new Map<string, Partial<Phase2FormData>>();
      existing.forEach((v, k) => formsMap.set(k, v as Partial<Phase2FormData>));
      setSavedForms(formsMap);

      setStatus('ready');
    }

    load().catch((err) => {
      console.error('[Phase2Page] Failed to load:', err);
      setStatus('not-found');
    });
  }, [id]);

  // ── Loading ────────────────────────────────────────────────────────────────

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
          <SkeletonList count={5} />
        </div>
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

  // ── Phase 2 view ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">

      <header className="bg-white border-b border-gray-100 px-6 py-3 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-none">OEA</h1>
            <p className="text-xs text-gray-500">Fase 2 — Mapeamento Detalhado de Processos</p>
          </div>
          <div className="flex items-center gap-3">
            {company && (
              <span className="text-xs text-gray-500 font-medium">{company}</span>
            )}
            {/* Role toggle */}
            <div className="flex rounded-lg overflow-hidden border border-gray-200">
              <button
                type="button"
                onClick={() => setRole('respondent')}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                  role === 'respondent'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Respondente
              </button>
              <button
                type="button"
                onClick={() => setRole('analyst')}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors border-l border-gray-200 ${
                  role === 'analyst'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Analista
              </button>
            </div>
            <Link
              href={`/diagnostic/${id}/vote`}
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft size={13} strokeWidth={2} />
              Voltar à votação
            </Link>
          </div>
        </div>
      </header>

      <Phase2Screen
        diagnosticId={id}
        prioritized={prioritized}
        savedForms={savedForms}
        role={role}
      />

    </div>
  );
}
