'use client';

import { useState, useEffect, useCallback } from 'react';
import { Star } from 'lucide-react';
import { SubprocessAssessment } from '@/types';
import { getOrCreateVoterToken, submitVote, fetchVoteSummaries, VoteSummary } from '@/lib/votes';

interface Props {
  assessmentId: string;
  assessments: SubprocessAssessment[];
}

const PRIORITY_LABELS: Record<number, string> = {
  1: 'Muito baixa',
  2: 'Baixa',
  3: 'Média',
  4: 'Alta',
  5: 'Crítica',
};

export default function VotingPanel({ assessmentId, assessments }: Props) {
  const [voterToken, setVoterToken]     = useState('');
  const [selections, setSelections]     = useState<Map<string, number>>(new Map());
  const [summaries, setSummaries]       = useState<Map<string, VoteSummary>>(new Map());
  const [saving, setSaving]             = useState<Set<string>>(new Set());
  const [saved, setSaved]               = useState<Set<string>>(new Set());

  // Initialise voter token and load existing votes on mount
  useEffect(() => {
    const token = getOrCreateVoterToken();
    setVoterToken(token);

    fetchVoteSummaries(assessmentId, token)
      .then((data) => {
        setSummaries(data);
        // Pre-fill the user's previously saved votes
        const pre = new Map<string, number>();
        data.forEach((s, spId) => { if (s.userVote !== null) pre.set(spId, s.userVote); });
        setSelections(pre);
      })
      .catch((err) => console.error('[VotingPanel] Failed to load summaries:', err));
  }, [assessmentId]);

  const handleSelect = useCallback((spId: string, value: number) => {
    setSelections(prev => new Map(prev).set(spId, value));
  }, []);

  const handleSave = useCallback(async (spId: string) => {
    const vote = selections.get(spId);
    if (vote === undefined || !voterToken) return;

    setSaving(prev => new Set(prev).add(spId));
    try {
      await submitVote(assessmentId, spId, voterToken, vote);
      const updated = await fetchVoteSummaries(assessmentId, voterToken);
      setSummaries(updated);
      setSaved(prev => new Set(prev).add(spId));
      setTimeout(() => {
        setSaved(prev => { const n = new Set(prev); n.delete(spId); return n; });
      }, 2000);
    } catch (err) {
      console.error('[VotingPanel] Failed to submit vote:', err);
    } finally {
      setSaving(prev => { const n = new Set(prev); n.delete(spId); return n; });
    }
  }, [assessmentId, voterToken, selections]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
      <h3 className="text-base font-semibold text-gray-800 mb-1 flex items-center gap-2">
        <Star size={16} className="text-amber-500" strokeWidth={1.75} />
        Priorizar Subprocessos
      </h3>
      <p className="text-xs text-gray-400 mb-5">
        Vote na prioridade de automação de cada subprocesso. O voto pode ser atualizado a qualquer momento.
      </p>

      <div className="space-y-4">
        {assessments.map((a) => {
          const summary  = summaries.get(a.subprocessId);
          const selected = selections.get(a.subprocessId);
          const isSaving = saving.has(a.subprocessId);
          const isSaved  = saved.has(a.subprocessId);
          const hasVoted = summary?.userVote != null;

          return (
            <div key={a.subprocessId} className="rounded-xl border border-gray-100 bg-gray-50 p-4">

              {/* Subprocess header */}
              <div className="mb-3">
                <p className="text-sm font-medium text-gray-800">{a.subprocessName}</p>
                <p className="text-xs text-gray-400">
                  {a.processName}
                  {a.automationSavingsHours > 0 && (
                    <> · <span className="font-medium">{a.automationSavingsHours.toLocaleString('pt-BR')} h</span> economizadas/ano</>
                  )}
                </p>
              </div>

              {/* Priority scale */}
              <p className="text-xs font-semibold text-gray-500 mb-2">Qual a prioridade de automação?</p>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {([1, 2, 3, 4, 5] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => handleSelect(a.subprocessId, v)}
                    title={PRIORITY_LABELS[v]}
                    className={`w-9 h-9 rounded-full border-2 text-sm font-bold transition-all ${
                      selected === v
                        ? 'bg-blue-600 border-blue-600 text-white scale-110 shadow-sm'
                        : 'bg-white border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-600'
                    }`}
                  >
                    {v}
                  </button>
                ))}
                {selected !== undefined && (
                  <span className="text-xs text-gray-500 ml-1">{PRIORITY_LABELS[selected]}</span>
                )}
              </div>

              {/* Save button + aggregated results */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => handleSave(a.subprocessId)}
                  disabled={selected === undefined || isSaving}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white
                             disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {isSaving ? 'Salvando…' : isSaved ? '✓ Salvo!' : hasVoted ? 'Atualizar voto' : 'Salvar voto'}
                </button>

                {summary && summary.count > 0 && (
                  <p className="text-xs text-gray-500">
                    <span className="font-semibold text-gray-700">
                      Prioridade média: {summary.average.toFixed(1)}
                    </span>
                    {' · '}
                    {summary.count} voto{summary.count !== 1 ? 's' : ''} registrado{summary.count !== 1 ? 's' : ''}
                  </p>
                )}
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}
