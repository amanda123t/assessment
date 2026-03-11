'use client';

import { useState, useEffect, useCallback } from 'react';
import { Star, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { SubprocessAssessment } from '@/types';
import {
  getOrCreateVoterToken,
  getStoredVoterIdentity,
  saveVoterIdentity,
  submitVote,
  fetchVoteSummaries,
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
  'alta divergência': { label: '⚠ Divergência alta entre áreas', className: 'bg-red-50 text-red-700 border-red-200' },
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

// ── Area breakdown table ──────────────────────────────────────────────────────

function AreaTable({ summary }: { summary: VoteSummary }) {
  if (summary.areaBreakdown.length === 0) return null;

  return (
    <div className="mt-3 rounded-lg border border-gray-100 overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="text-left px-3 py-2 font-semibold text-gray-500">Área</th>
            <th className="text-center px-3 py-2 font-semibold text-gray-500">Voto médio</th>
            <th className="text-center px-3 py-2 font-semibold text-gray-500">Votos</th>
          </tr>
        </thead>
        <tbody>
          {summary.areaBreakdown.map((row, i) => (
            <tr
              key={row.area}
              className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}
            >
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

// ── Main component ────────────────────────────────────────────────────────────

export default function VotingPanel({ assessmentId, assessments }: Props) {
  const [voterToken, setVoterToken]       = useState('');
  const [voterName, setVoterName]         = useState('');
  const [voterArea, setVoterArea]         = useState('');
  const [identityReady, setIdentityReady] = useState(false);

  const [selections, setSelections] = useState<Map<string, number>>(new Map());
  const [summaries, setSummaries]   = useState<Map<string, VoteSummary>>(new Map());
  const [saving, setSaving]         = useState<Set<string>>(new Set());
  const [saved, setSaved]           = useState<Set<string>>(new Set());
  const [expanded, setExpanded]     = useState<Set<string>>(new Set());

  // ── Initialise identity + load existing votes ─────────────────────────────

  useEffect(() => {
    const token    = getOrCreateVoterToken();
    const identity = getStoredVoterIdentity();

    setVoterToken(token);
    setVoterName(identity.name);
    setVoterArea(identity.area);

    if (identity.name && identity.area) {
      setIdentityReady(true);
    }

    fetchVoteSummaries(assessmentId, token)
      .then((data) => {
        setSummaries(data);
        const pre = new Map<string, number>();
        data.forEach((s, spId) => { if (s.userVote !== null) pre.set(spId, s.userVote); });
        setSelections(pre);
      })
      .catch((err) => console.error('[VotingPanel] Failed to load summaries:', err));
  }, [assessmentId]);

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
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">

      {/* Section header */}
      <h3 className="text-base font-semibold text-gray-800 mb-1 flex items-center gap-2">
        <Star size={16} className="text-amber-500" strokeWidth={1.75} />
        Priorizar Subprocessos
      </h3>
      <p className="text-xs text-gray-400 mb-5">
        Vote na prioridade de automação de cada subprocesso. O voto pode ser atualizado a qualquer momento.
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
  );
}
