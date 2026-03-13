'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import { useToast, ToastContainer } from '@/components/Toast';
import { Star, ChevronDown, ChevronUp, Users, BarChart2 } from 'lucide-react';
import { SubprocessAssessment } from '@/types';
import Link from 'next/link';
import {
  submitVote,
  deleteAllVotesForAssessment,
  subscribeToVoteSummaries,
  VoteSummary,
  ConsensusLevel,
} from '@/lib/votes';

// ── Constants ─────────────────────────────────────────────────────────────────

interface Props {
  assessmentId: string;
  assessments: SubprocessAssessment[];
  /** diagnosticId used for Phase 2 navigation (equals assessmentId in practice) */
  diagnosticId?: string;
}

const PRIORITY_LABELS: Record<number, string> = {
  1: 'Muito baixa',
  2: 'Baixa',
  3: 'Média',
  4: 'Alta',
  5: 'Crítica',
};

const CONSENSUS_CONFIG: Record<ConsensusLevel, { label: string; className: string }> = {
  'alto':             { label: 'Consenso: alto',              className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  'médio':            { label: 'Consenso: médio',             className: 'bg-amber-50 text-amber-700 border-amber-200' },
  'alta divergência': { label: '⚠ Alta divergência',          className: 'bg-red-50 text-red-700 border-red-200' },
};

// ── Identity form ─────────────────────────────────────────────────────────────

interface IdentityFormProps {
  onConfirm: (name: string, area: string) => void;
}

function IdentityForm({ onConfirm }: IdentityFormProps) {
  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const valid = name.trim().length > 0 && area.trim().length > 0;

  return (
    <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-6">
      <h4 className="text-sm font-semibold text-blue-800 mb-1">Identificação do votante</h4>
      <p className="text-xs text-blue-600 mb-4">
        Informe seu nome e área para registrar seus votos.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs font-medium text-blue-700 mb-1">Nome</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
            className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-800 placeholder-gray-400
                       focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-blue-700 mb-1">Área</label>
          <input
            type="text"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="Ex: Financeiro, TI, Operações"
            className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-800 placeholder-gray-400
                       focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </div>

      <button
        onClick={() => { if (valid) onConfirm(name.trim(), area.trim()); }}
        disabled={!valid}
        className="text-sm font-semibold px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white
                   disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Confirmar e começar a votar
      </button>
    </div>
  );
}

// ── Priority bar (visual scale 1–5) ──────────────────────────────────────────

function PriorityBar({ value }: { value: number }) {
  const pct = ((value - 1) / 4) * 100;
  const color =
    value >= 4.5 ? 'bg-red-500' :
    value >= 3.5 ? 'bg-orange-400' :
    value >= 2.5 ? 'bg-amber-400' :
    value >= 1.5 ? 'bg-blue-400' : 'bg-gray-300';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-gray-700 w-6 text-right">{value.toFixed(1)}</span>
    </div>
  );
}

// ── Area breakdown table ──────────────────────────────────────────────────────

function AreaTable({ summary }: { summary: VoteSummary }) {
  if (summary.areaBreakdown.length === 0) return null;

  return (
    <div className="mt-2 rounded-lg border border-gray-100 overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="text-left px-3 py-2 font-semibold text-gray-500">Área</th>
            <th className="text-center px-3 py-2 font-semibold text-gray-500">Média</th>
            <th className="text-center px-3 py-2 font-semibold text-gray-500">Votos</th>
          </tr>
        </thead>
        <tbody>
          {summary.areaBreakdown.map((row, i) => (
            <tr key={row.area} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
              <td className="px-3 py-2 text-gray-700 font-medium">{row.area}</td>
              <td className="px-3 py-2 text-center">
                <span className="font-bold text-gray-800">{row.average.toFixed(1)}</span>
                <span className="text-gray-400 ml-1">/ 5</span>
              </td>
              <td className="px-3 py-2 text-center text-gray-500">{row.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Consolidated results card ─────────────────────────────────────────────────

const CONSENSUS_CONFIG_BADGE: Record<ConsensusLevel, { label: string; className: string }> = {
  'alto':             { label: 'Consenso alto',      className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  'médio':            { label: 'Consenso médio',     className: 'bg-amber-50 text-amber-700 border-amber-200' },
  'alta divergência': { label: '⚠ Alta divergência', className: 'bg-red-50 text-red-700 border-red-200' },
};

interface ConsolidatedResultsProps {
  assessments: SubprocessAssessment[];
  summaries: Map<string, VoteSummary>;
  assessmentId: string;
  diagnosticId: string;
}

function ConsolidatedResults({ assessments, summaries, assessmentId, diagnosticId }: ConsolidatedResultsProps) {
  const [expandedArea, setExpandedArea] = useState<Set<string>>(new Set());
  const [finalized, setFinalized]       = useState(false);
  const [resetting, setResetting]       = useState(false);

  const voted = assessments.filter(a => (summaries.get(a.subprocessId)?.count ?? 0) > 0);
  const totalVoters = (() => {
    let max = 0;
    summaries.forEach(s => { if (s.count > max) max = s.count; });
    return max;
  })();

  if (voted.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mt-6">
        <h3 className="text-base font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <BarChart2 size={16} className="text-violet-500" strokeWidth={1.75} />
          Votação Consolidada
        </h3>
        <p className="text-xs text-gray-400 mt-2">Nenhum voto registrado ainda.</p>
      </div>
    );
  }

  const sorted = [...voted].sort((a, b) => {
    const sa = summaries.get(a.subprocessId)?.average ?? 0;
    const sb = summaries.get(b.subprocessId)?.average ?? 0;
    return sb - sa;
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mt-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <BarChart2 size={16} className="text-violet-500" strokeWidth={1.75} />
          Votação Consolidada
        </h3>
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <Users size={12} strokeWidth={1.75} />
          {totalVoters} votante{totalVoters !== 1 ? 's' : ''}
        </span>
      </div>
      <p className="text-xs text-gray-400 mb-5">
        Resultado agregado de todos os votos registrados, ordenado por prioridade média.
      </p>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">Subprocesso</th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 w-32">Prioridade média</th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 w-20">Votos</th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 w-36">Consenso</th>
              <th className="px-3 py-3 w-10" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((a, i) => {
              const s = summaries.get(a.subprocessId)!;
              const badge = CONSENSUS_CONFIG_BADGE[s.consensusLevel];
              const isOpen = expandedArea.has(a.subprocessId);
              const showConsensus = s.count >= 2;
              return (
                <Fragment key={a.subprocessId}>
                  <tr className={i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="px-3 py-3 text-xs">
                      <div className="font-medium text-gray-800">{a.subprocessName}</div>
                      <div className="text-gray-400">{a.processName}</div>
                    </td>
                    <td className="px-3 py-3">
                      <PriorityBar value={s.average} />
                    </td>
                    <td className="px-3 py-3 text-center text-xs font-semibold text-gray-700">{s.count}</td>
                    <td className="px-3 py-3 text-center">
                      {showConsensus && (
                        <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge.className}`}>
                          {badge.label}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {s.areaBreakdown.length > 0 && (
                        <button
                          onClick={() => setExpandedArea(prev => {
                            const n = new Set(prev);
                            n.has(a.subprocessId) ? n.delete(a.subprocessId) : n.add(a.subprocessId);
                            return n;
                          })}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                          title="Ver por área"
                        >
                          {isOpen ? <ChevronUp size={14} strokeWidth={2} /> : <ChevronDown size={14} strokeWidth={2} />}
                        </button>
                      )}
                    </td>
                  </tr>
                  {isOpen && s.areaBreakdown.length > 0 && (
                    <tr className={i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}>
                      <td colSpan={5} className="px-3 pb-3">
                        <AreaTable summary={s} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Voting control actions ── */}
      <div className="mt-5 pt-5 border-t border-gray-100 flex flex-wrap items-center gap-3">
        {!finalized ? (
          <>
            <button
              onClick={async () => {
                if (!confirm('Tem certeza? Isso apagará todos os votos registrados e todos deverão votar novamente.')) return;
                setResetting(true);
                try {
                  await deleteAllVotesForAssessment(assessmentId);
                  window.location.reload();
                } finally {
                  setResetting(false);
                }
              }}
              disabled={resetting}
              className="text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 text-gray-600
                         hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              {resetting ? 'Zerando votos…' : 'Votar novamente'}
            </button>
            <button
              onClick={() => setFinalized(true)}
              className="text-xs font-semibold px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors"
            >
              Encerrar votação
            </button>
          </>
        ) : (
          <div className="w-full">
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-5 mb-4">
              <h4 className="text-sm font-bold text-violet-900 mb-1">Subprocessos candidatos ao mapeamento detalhado</h4>
              <p className="text-xs text-violet-600 mb-4">
                Os subprocessos abaixo foram priorizados pela votação. Deseja prosseguir com a Fase 2 — mapeamento detalhado de processos?
              </p>
              <ul className="space-y-1.5 mb-5">
                {[...assessments]
                  .filter(a => (summaries.get(a.subprocessId)?.count ?? 0) > 0)
                  .sort((a, b) => (summaries.get(b.subprocessId)?.average ?? 0) - (summaries.get(a.subprocessId)?.average ?? 0))
                  .map(a => {
                    const s = summaries.get(a.subprocessId)!;
                    return (
                      <li key={a.subprocessId} className="flex items-center justify-between gap-3 bg-white rounded-lg px-3 py-2 border border-violet-100 text-xs">
                        <div>
                          <span className="font-medium text-gray-800">{a.subprocessName}</span>
                          <span className="text-gray-400 ml-2">{a.processName}</span>
                        </div>
                        <span className="font-bold text-violet-700 shrink-0">média {s.average.toFixed(1)}</span>
                      </li>
                    );
                  })}
              </ul>
              <div className="flex items-center gap-3">
                <Link
                  href={`/diagnostic/${diagnosticId}/phase2`}
                  className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors"
                >
                  Sim, prosseguir com o mapeamento
                </Link>
                <button
                  onClick={() => setFinalized(false)}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function VotingPanel({ assessmentId, assessments, diagnosticId }: Props) {
  const [voterToken]                      = useState(() => crypto.randomUUID());
  const [voterName, setVoterName]         = useState('');
  const [voterArea, setVoterArea]         = useState('');
  const [identityReady, setIdentityReady] = useState(false);

  const [selections, setSelections] = useState<Map<string, number>>(new Map());
  const [summaries, setSummaries]   = useState<Map<string, VoteSummary>>(new Map());
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [expanded, setExpanded]     = useState<Set<string>>(new Set());

  const { toasts, showToast, dismissToast } = useToast();

  useEffect(() => {
    const unsubscribe = subscribeToVoteSummaries(assessmentId, voterToken, (data) => {
      setSummaries(data);
    });
    return unsubscribe;
  }, [assessmentId, voterToken]);

  const handleIdentityConfirm = useCallback((name: string, area: string) => {
    setVoterName(name);
    setVoterArea(area);
    setIdentityReady(true);
  }, []);

  const handleSelect = useCallback((spId: string, value: number) => {
    setSelections(prev => new Map(prev).set(spId, value));
  }, []);

  const handleSaveAll = useCallback(async () => {
    if (selections.size === 0 || submitting) return;
    setSubmitting(true);
    try {
      await Promise.all(
        Array.from(selections.entries()).map(([spId, vote]) =>
          submitVote(assessmentId, spId, voterToken, voterName, voterArea, vote)
        )
      );
      setSubmitted(true);
    } catch (err) {
      console.error('[VotingPanel] Failed to submit votes:', err);
      showToast('Erro ao salvar votos. Verifique sua conexão e tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }, [assessmentId, voterToken, voterName, voterArea, selections, submitting]);

  const toggleExpanded = useCallback((spId: string) => {
    setExpanded(prev => {
      const n = new Set(prev);
      n.has(spId) ? n.delete(spId) : n.add(spId);
      return n;
    });
  }, []);

  const totalCount    = assessments.length;
  const selectedCount = selections.size;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
    <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">

      {/* Section header */}
      <h3 className="text-base font-semibold text-gray-800 mb-1 flex items-center gap-2">
        <Star size={16} className="text-amber-500" strokeWidth={1.75} />
        Votar Prioridades
      </h3>
      <p className="text-xs text-gray-400 mb-5">
        Cada participante vota de forma independente. Os resultados são agregados em tempo real.
        {identityReady && voterName && (
          <span className="ml-2 font-medium text-gray-500">
            Votando como <span className="text-gray-700">{voterName}</span>
            {voterArea && <> · {voterArea}</>}
          </span>
        )}
      </p>

      {/* Identity capture */}
      {!identityReady && (
        <IdentityForm onConfirm={handleIdentityConfirm} />
      )}

      {/* Subprocess list */}
      <div className="space-y-4">
        {assessments.map((a) => {
          const summary     = summaries.get(a.subprocessId);
          const selected    = selections.get(a.subprocessId);
          const isExpanded  = expanded.has(a.subprocessId);
          const hasBreakdown = (summary?.areaBreakdown?.length ?? 0) > 0;
          const consensus   = summary && summary.count >= 2 ? CONSENSUS_CONFIG[summary.consensusLevel] : null;

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

              {/* Priority scale — hidden until identity is confirmed */}
              {identityReady && (
                <>
                  <p className="text-xs font-semibold text-gray-500 mb-2">Qual a prioridade de automação?</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {([1, 2, 3, 4, 5] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => handleSelect(a.subprocessId, v)}
                        title={PRIORITY_LABELS[v]}
                        disabled={submitted}
                        className={`w-9 h-9 rounded-full border-2 text-sm font-bold transition-all ${
                          selected === v
                            ? 'bg-blue-600 border-blue-600 text-white scale-110 shadow-sm'
                            : 'bg-white border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-600'
                        } disabled:opacity-60 disabled:cursor-not-allowed`}
                      >
                        {v}
                      </button>
                    ))}
                    {selected !== undefined && (
                      <span className="text-xs text-gray-500 ml-1">{PRIORITY_LABELS[selected]}</span>
                    )}
                  </div>
                </>
              )}

              {/* Aggregated results — visible even before identity is set */}
              {summary && summary.count > 0 && (
                <div className="space-y-2 mt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs text-gray-500">
                      <span className="font-semibold text-gray-700">
                        Prioridade média: {summary.average.toFixed(1)}
                      </span>
                      {' · '}
                      {summary.count} voto{summary.count !== 1 ? 's' : ''} registrado{summary.count !== 1 ? 's' : ''}
                    </p>
                    {consensus && (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${consensus.className}`}>
                        {consensus.label}
                      </span>
                    )}
                  </div>

                  {hasBreakdown && (
                    <button
                      onClick={() => toggleExpanded(a.subprocessId)}
                      className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <Users size={11} strokeWidth={1.75} />
                      {isExpanded ? 'Ocultar análise por área' : 'Ver análise por área'}
                      {isExpanded
                        ? <ChevronUp size={11} strokeWidth={2} />
                        : <ChevronDown size={11} strokeWidth={2} />}
                    </button>
                  )}

                  {isExpanded && <AreaTable summary={summary} />}
                </div>
              )}

            </div>
          );
        })}
      </div>

      {/* ── Single save button at the bottom ── */}
      {identityReady && (
        <div className="mt-6 flex items-center gap-4">
          {submitted ? (
            <p className="text-sm font-semibold text-emerald-600">
              ✓ Votos registrados com sucesso!
            </p>
          ) : (
            <>
              <button
                onClick={handleSaveAll}
                disabled={selectedCount === 0 || submitting}
                className="text-sm font-semibold px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white
                           disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Salvando…' : `Salvar votos`}
              </button>
              <span className="text-xs text-gray-400">
                {selectedCount} de {totalCount} subprocesso{totalCount !== 1 ? 's' : ''} respondido{selectedCount !== 1 ? 's' : ''}
              </span>
            </>
          )}
        </div>
      )}

    </div>

    {/* Consolidated results — below the voting form */}
    <ConsolidatedResults
      assessments={assessments}
      summaries={summaries}
      assessmentId={assessmentId}
      diagnosticId={diagnosticId ?? assessmentId}
    />
    </div>
  );
}
