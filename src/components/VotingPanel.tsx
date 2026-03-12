'use client';

import { useState, useEffect, useCallback } from 'react';
import { Star, ChevronDown, ChevronUp, Users, BarChart2 } from 'lucide-react';
import { SubprocessAssessment } from '@/types';
import {
  getOrCreateVoterToken,
  getStoredVoterIdentity,
  saveVoterIdentity,
  submitVote,
  subscribeToVoteSummaries,
  VoteSummary,
  ConsensusLevel,
} from '@/lib/votes';

// ── Constants ─────────────────────────────────────────────────────────────────

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
        Informe seu nome e área para registrar seus votos. Esses dados são salvos localmente e
        reutilizados em todos os subprocessos.
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
}

function ConsolidatedResults({ assessments, summaries }: ConsolidatedResultsProps) {
  const [expandedArea, setExpandedArea] = useState<Set<string>>(new Set());

  const voted = assessments.filter(a => (summaries.get(a.subprocessId)?.count ?? 0) > 0);
  const totalVoters = (() => {
    const tokens = new Set<string>();
    // we can't access individual tokens here, but we can approximate by max count
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

  // Sort by average descending
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
                <>
                  <tr key={a.subprocessId} className={i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}>
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
                    <tr key={`${a.subprocessId}-area`} className={i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}>
                      <td colSpan={5} className="px-3 pb-3">
                        <AreaTable summary={s} />
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function VotingPanel({ assessmentId, assessments }: Props) {
  // A fresh session token is generated on every mount so that each visitor's
  // votes are stored as a new independent document — never overwriting a
  // previous voter's choices, even when the same browser is reused.
  const [voterToken]                      = useState(() => crypto.randomUUID());
  const [voterName, setVoterName]         = useState('');
  const [voterArea, setVoterArea]         = useState('');
  const [identityReady, setIdentityReady] = useState(false);

  const [selections, setSelections] = useState<Map<string, number>>(new Map());
  const [summaries, setSummaries]   = useState<Map<string, VoteSummary>>(new Map());
  const [saving, setSaving]         = useState<Set<string>>(new Set());
  const [saved, setSaved]           = useState<Set<string>>(new Set());
  const [expanded, setExpanded]     = useState<Set<string>>(new Set());

  // ── Initialise identity + subscribe to live vote updates ─────────────────

  useEffect(() => {
    // Pre-fill name/area from localStorage for convenience (identity only,
    // not previous votes — the session token is always fresh).
    const identity = getStoredVoterIdentity();
    setVoterName(identity.name);
    setVoterArea(identity.area);
    if (identity.name && identity.area) {
      setIdentityReady(true);
    }

    // Real-time listener for aggregated results (all voters).
    // We pass the fresh session token so userVote starts as null for this session.
    const unsubscribe = subscribeToVoteSummaries(assessmentId, voterToken, (data) => {
      setSummaries(data);
      // No pre-fill: each visit is a new vote session.
    });

    return unsubscribe;
  }, [assessmentId, voterToken]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleIdentityConfirm = useCallback((name: string, area: string) => {
    saveVoterIdentity(name, area);
    setVoterName(name);
    setVoterArea(area);
    setIdentityReady(true);
  }, []);

  const handleSelect = useCallback((spId: string, value: number) => {
    setSelections(prev => new Map(prev).set(spId, value));
  }, []);

  const handleSave = useCallback(async (spId: string) => {
    const vote = selections.get(spId);
    if (vote === undefined || !voterToken) return;

    setSaving(prev => new Set(prev).add(spId));
    try {
      await submitVote(assessmentId, spId, voterToken, voterName, voterArea, vote);
      // No manual re-fetch needed: the onSnapshot subscription fires
      // automatically when the write is committed and updates summaries.
      setSaved(prev => new Set(prev).add(spId));
      setTimeout(() => {
        setSaved(prev => { const n = new Set(prev); n.delete(spId); return n; });
      }, 2000);
    } catch (err) {
      console.error('[VotingPanel] Failed to submit vote:', err);
    } finally {
      setSaving(prev => { const n = new Set(prev); n.delete(spId); return n; });
    }
  }, [assessmentId, voterToken, voterName, voterArea, selections]);

  const toggleExpanded = useCallback((spId: string) => {
    setExpanded(prev => {
      const n = new Set(prev);
      n.has(spId) ? n.delete(spId) : n.add(spId);
      return n;
    });
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
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

      {/* Identity capture — shown once when name/area are not yet set */}
      {!identityReady && (
        <IdentityForm onConfirm={handleIdentityConfirm} />
      )}

      {/* Subprocess list */}
      <div className="space-y-4">
        {assessments.map((a) => {
          const summary     = summaries.get(a.subprocessId);
          const selected    = selections.get(a.subprocessId);
          const isSaving    = saving.has(a.subprocessId);
          const isSaved     = saved.has(a.subprocessId);
          const hasVoted    = summary?.userVote != null;
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

                  {/* Save button */}
                  <div className="mb-3">
                    <button
                      onClick={() => handleSave(a.subprocessId)}
                      disabled={selected === undefined || isSaving}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white
                                 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSaving ? 'Salvando…' : isSaved ? '✓ Salvo!' : hasVoted ? 'Atualizar voto' : 'Salvar voto'}
                    </button>
                  </div>
                </>
              )}

              {/* Aggregated results — visible even before identity is set */}
              {summary && summary.count > 0 && (
                <div className="space-y-2">

                  {/* Average + vote count + consensus badge */}
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

                  {/* Area breakdown toggle */}
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

                  {/* Area breakdown table */}
                  {isExpanded && <AreaTable summary={summary} />}
                </div>
              )}

            </div>
          );
        })}
      </div>
    </div>

    {/* Consolidated results — below the voting form */}
    <ConsolidatedResults assessments={assessments} summaries={summaries} />
    </div>
  );
}
