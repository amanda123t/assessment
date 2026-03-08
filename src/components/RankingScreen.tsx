'use client';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { Trophy, BarChart2, Download, RotateCcw, X, Activity, Lightbulb, Clock, TrendingUp, DollarSign, Zap, Target, Map, FileText, CheckCircle2, ChevronDown } from 'lucide-react';
import { SubprocessAssessment, CRITERIA, DiagnosticMode } from '@/types';
import { buildRanking, buildChartData, buildPrioritySummary, RankedAssessment } from '@/lib/ranking';

interface Props {
  assessments: SubprocessAssessment[];
  diagnosticId?: string | null;
  diagnosticMode?: DiagnosticMode;
  onExport: () => void;
  onRestart: () => void;
}

function fmt(n: number): string {
  return n.toLocaleString('pt-BR');
}

function fmtCurrency(n: number): string {
  return `R$ ${n.toLocaleString('pt-BR')}`;
}

function CustomTooltip({ active, payload }: {
  active?: boolean;
  payload?: Array<{ payload: { name: string; score: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-800 mb-1 max-w-[220px] leading-snug">{d.name}</p>
      <p className="text-blue-600 font-bold">Score: {d.score}</p>
    </div>
  );
}

function DetailModal({ item, onClose }: { item: RankedAssessment; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-1">
              {item.macroprocessName} › {item.processName}
            </p>
            <h3 className="text-lg font-bold text-gray-900">{item.subprocessName}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors ml-4 flex-shrink-0"
            aria-label="Fechar"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className={`text-2xl font-extrabold ${item.priorityColor}`}>
            {item.totalScore}
          </span>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${item.badgeColor}`}>
            {item.priority} Prioridade
          </span>
          {item.isCustom && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-blue-50 text-blue-700 border-blue-200">
              Personalizado
            </span>
          )}
        </div>

        {/* Impact summary in modal */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-400 mb-0.5">Esforço anual</p>
            <p className="font-bold text-gray-800 text-sm">{fmt(item.annualHours)}h</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-400 mb-0.5">Economia pot.</p>
            <p className="font-bold text-blue-700 text-sm">{fmt(item.automationSavingsHours)}h</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-400 mb-0.5">Impacto fin.</p>
            <p className="font-bold text-green-700 text-sm">{fmtCurrency(item.financialImpact)}</p>
          </div>
        </div>

        {/* Criteria breakdown — neutral blue bars to match questionnaire */}
        <div className="space-y-3">
          {CRITERIA.map((c) => {
            const score = item.scores[c.key];
            const pct = (score / 4) * 100;
            return (
              <div key={c.key}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600 font-medium">{c.label}</span>
                  <span className="font-bold text-gray-800">{score}/4</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Lead Capture ──────────────────────────────────────────────────────────

const LEAD_KEY = 'oea_lead';

interface LeadData {
  name: string;
  company: string;
  email: string;
  role: string;
  createdAt: number;
}

interface DiagnosticMeta {
  diagnosis_subprocess_count: number;
  diagnosis_top_opportunity: string;
  diagnosis_top_score: number;
  diagnosis_average_score: number;
  diagnosis_timestamp: string;
  diagnosis_page_url: string;
  diagnosis_source: string;
}

function buildDiagnosticMeta(ranked: RankedAssessment[]): DiagnosticMeta {
  const topByAuto = ranked.reduce(
    (best, r) => (r.automationScore > best.automationScore ? r : best),
    ranked[0],
  );
  const avgScore =
    ranked.length > 0
      ? Math.round(ranked.reduce((s, r) => s + r.automationScore, 0) / ranked.length)
      : 0;
  return {
    diagnosis_subprocess_count: ranked.length,
    diagnosis_top_opportunity: topByAuto?.subprocessName ?? '',
    diagnosis_top_score: topByAuto?.automationScore ?? 0,
    diagnosis_average_score: avgScore,
    diagnosis_timestamp: new Date().toISOString(),
    diagnosis_page_url: typeof window !== 'undefined' ? window.location.href : '',
    diagnosis_source: 'Operational Efficiency Assessment',
  };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function loadStoredLead(): LeadData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LEAD_KEY);
    return raw ? (JSON.parse(raw) as LeadData) : null;
  } catch {
    return null;
  }
}

const GAS_ENDPOINT =
  'https://script.google.com/macros/s/AKfycbzn23DipnagQMTtSSs8F40Sdn_a-MAir-CCAxvUSq6OMmhwzVJCOQAwAtQulQO3prSl/exec';

/**
 * Fire-and-forget POST to the Google Apps Script endpoint.
 * Uses text/plain so the request stays a CORS "simple request" —
 * GAS doesn't send Access-Control-Allow-Origin headers, so no-cors mode
 * is required. The GAS handler reads the payload via e.postData.contents.
 */
function sendLeadToSheets(data: LeadData & DiagnosticMeta): void {
  try {
    fetch(GAS_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(data),
    }).catch(() => {
      // Network failure is non-critical — data is already in localStorage.
    });
  } catch {
    // Synchronous errors (e.g. fetch not available) must not block report generation.
  }
}

function LeadModal({
  meta,
  onSuccess,
  onClose,
}: {
  meta: DiagnosticMeta;
  onSuccess: (data: LeadData) => void;
  onClose: () => void;
}) {
  const stored = loadStoredLead();

  const [name, setName]       = useState(stored?.name ?? '');
  const [company, setCompany] = useState(stored?.company ?? '');
  const [email, setEmail]     = useState(stored?.email ?? '');
  const [role, setRole]       = useState(stored?.role ?? '');
  const [errors, setErrors]   = useState<Partial<Record<'name' | 'company' | 'email', string>>>({});

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!name.trim())          next.name    = 'Nome é obrigatório';
    if (!company.trim())       next.company = 'Empresa é obrigatória';
    if (!email.trim())         next.email   = 'E-mail é obrigatório';
    else if (!isValidEmail(email)) next.email = 'E-mail inválido';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const data: LeadData = {
      name: name.trim(),
      company: company.trim(),
      email: email.trim(),
      role: role.trim(),
      createdAt: Date.now(),
    };
    localStorage.setItem(LEAD_KEY, JSON.stringify(data));
    sendLeadToSheets({
      ...data,
      ...meta,
      diagnosis_timestamp: new Date().toISOString(),
      diagnosis_page_url: typeof window !== 'undefined' ? window.location.href : '',
    });
    onSuccess(data);
  };

  const field = (
    id: string,
    label: string,
    value: string,
    setter: (v: string) => void,
    placeholder: string,
    optional = false,
    error?: string,
  ) => (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-gray-600 mb-1.5">
        {label}
        {optional
          ? <span className="ml-1 text-gray-400 font-normal">(opcional)</span>
          : <span className="ml-0.5 text-red-400">*</span>
        }
      </label>
      <input
        id={id}
        type={id === 'lead-email' ? 'email' : 'text'}
        value={value}
        onChange={(e) => {
          setter(e.target.value);
          if (error) setErrors((prev) => ({ ...prev, [id.replace('lead-', '')]: undefined }));
        }}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        placeholder={placeholder}
        className={`w-full border rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-300
          focus:outline-none focus:ring-2 focus:border-transparent transition-colors
          ${error
            ? 'border-red-300 focus:ring-red-400 bg-red-50/30'
            : 'border-gray-200 focus:ring-blue-500 bg-white'
          }`}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="bg-gradient-to-br from-green-600 to-green-700 px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FileText size={16} className="text-green-200" strokeWidth={1.75} />
                <h3 className="font-semibold text-white">Receba o relatório completo</h3>
              </div>
              <p className="text-green-200 text-sm">
                Preencha seus dados para gerar e baixar o relatório em Excel.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-green-300 hover:text-white transition-colors ml-4 flex-shrink-0 mt-0.5"
              aria-label="Fechar"
            >
              <X size={18} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field('lead-name',    'Nome',    name,    setName,    'Seu nome completo',        false, errors.name)}
            {field('lead-company', 'Empresa', company, setCompany, 'Nome da empresa',          false, errors.company)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field('lead-email',   'E-mail',  email,   setEmail,   'seu@email.com.br',         false, errors.email)}
            {field('lead-role',    'Cargo',   role,    setRole,    'Ex: Gerente de Operações', true)}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
            >
              <Download size={14} strokeWidth={1.75} />
              Gerar relatório
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center">
            Seus dados são armazenados localmente e não serão compartilhados.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Insights ───────────────────────────────────────────────────────────────

interface Insight {
  text: string;
  /** Higher = shown first; top 4 selected. */
  weight: number;
}

function buildInsights(ranked: RankedAssessment[]): string[] {
  if (ranked.length === 0) return [];
  const pool: Insight[] = [];
  const n = ranked.length;

  // 1 — High automation potential (score > 80)
  const highAuto = ranked.filter((r) => r.automationScore > 80).length;
  if (highAuto >= 1) {
    pool.push({
      weight: 10,
      text: `${highAuto} subprocesso${highAuto > 1 ? 's apresentam' : ' apresenta'} score de automação acima de 80 — indicando forte oportunidade para automação de fluxos de trabalho ou RPA.`,
    });
  } else {
    const autoPct = Math.round((ranked.filter((r) => r.automationScore >= 60).length / n) * 100);
    if (autoPct >= 40) {
      pool.push({
        weight: 7,
        text: `${autoPct}% dos subprocessos avaliados apresentam bom potencial de automação, sinalizando oportunidades relevantes de ganho operacional.`,
      });
    }
  }

  // 2 — High rework / process instability
  const highRework = ranked.filter((r) => r.scores.reworkOrErrors >= 3).length;
  if (highRework >= 2) {
    pool.push({
      weight: 9,
      text: `O diagnóstico indica instabilidade de processo: ${highRework} subprocesso${highRework > 1 ? 's apresentam' : ' apresenta'} frequência elevada de retrabalho ou erros, reflexo de atividades manuais sem padronização adequada.`,
    });
  }

  // 3 — Finance dominance (> 30% of items)
  const financeCount = ranked.filter((r) =>
    /financ|contab|fiscal|tribut|tesour|pagamento|recebi/i.test(r.macroprocessName)
  ).length;
  const financePct = Math.round((financeCount / n) * 100);
  if (financePct > 30) {
    pool.push({
      weight: 8,
      text: `Operações financeiras representam ${financePct}% dos itens avaliados e concentram grande parte da carga operacional analisada — área que costuma apresentar alto retorno com automação.`,
    });
  }

  // 4 — Heavy manual / spreadsheet dependency
  const heavyManual = ranked.filter((r) => r.scores.systemsOrSpreadsheets >= 3).length;
  const manualPct = Math.round((heavyManual / n) * 100);
  if (manualPct >= 40) {
    pool.push({
      weight: 6,
      text: `${manualPct}% dos subprocessos avaliados dependem de planilhas ou controles manuais — esse perfil representa o principal vetor de automação identificado no diagnóstico.`,
    });
  }

  // 5 — People-intensive operations
  const highPeople = ranked.filter((r) => r.scores.peopleInvolved >= 3).length;
  if (highPeople >= Math.ceil(n / 2)) {
    pool.push({
      weight: 4,
      text: `A maioria dos subprocessos envolve múltiplas pessoas para execução — operações intensivas em mão de obra tendem a gerar maior impacto com automação e padronização de fluxos.`,
    });
  }

  // 6 — Dominant Alta Prioridade concentration
  const altaCount = ranked.filter((r) => r.priority === 'Alta').length;
  const altaPct = Math.round((altaCount / n) * 100);
  if (altaPct >= 50) {
    pool.push({
      weight: 5,
      text: `${altaPct}% dos subprocessos foram classificados como Alta Prioridade — o escopo avaliado está concentrado em áreas com relevância operacional crítica.`,
    });
  }

  return pool
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 4)
    .map((i) => i.text);
}

// ─── Automation Roadmap ────────────────────────────────────────────────────

type RoadmapTier = 'quickWins' | 'strategic' | 'lower';

interface RoadmapEntry {
  item: RankedAssessment;
  /** Continuous global position across all tiers (1-based). */
  seq: number;
}

interface RoadmapGroup {
  tier: RoadmapTier;
  label: string;
  description: string;
  entries: RoadmapEntry[];
}

/**
 * Classify subprocesses into three tiers using:
 *   priorityScore = automationScore × annualHours
 *
 * Quick Wins   → automationScore ≥ 65  AND  priorityScore ≥ median
 * Strategic    → automationScore ≥ 40  (automatable, regardless of volume)
 * Lower        → automationScore < 40  (low automation potential)
 */
function buildRoadmap(ranked: RankedAssessment[]): RoadmapGroup[] {
  if (ranked.length === 0) return [];

  const withPS = ranked.map((r) => ({
    item: r,
    priorityScore: r.automationScore * r.annualHours,
  }));
  withPS.sort((a, b) => b.priorityScore - a.priorityScore);

  const sorted = withPS.map((x) => x.priorityScore);
  const mid = Math.floor(sorted.length / 2);
  const medianPS = sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;

  const buckets: Record<RoadmapTier, RankedAssessment[]> = {
    quickWins: [],
    strategic: [],
    lower: [],
  };

  for (const { item, priorityScore } of withPS) {
    if (item.automationScore >= 65 && priorityScore >= medianPS) {
      buckets.quickWins.push(item);
    } else if (item.automationScore >= 40) {
      buckets.strategic.push(item);
    } else {
      buckets.lower.push(item);
    }
  }

  let seq = 1;
  const makeGroup = (
    tier: RoadmapTier,
    label: string,
    description: string,
  ): RoadmapGroup => ({
    tier,
    label,
    description,
    entries: buckets[tier].map((item) => ({ item, seq: seq++ })),
  });

  return [
    makeGroup(
      'quickWins',
      'Quick Wins',
      'Alto potencial de automação e impacto operacional relevante — pontos de partida ideais.',
    ),
    makeGroup(
      'strategic',
      'Automação Estratégica',
      'Bom potencial de automação, indicados para uma segunda fase de implementação.',
    ),
    makeGroup(
      'lower',
      'Menor Prioridade',
      'Baixo potencial de automação — podem ser revisitados após as fases anteriores.',
    ),
  ].filter((g) => g.entries.length > 0);
}

export default function RankingScreen({ assessments, diagnosticId, diagnosticMode = 'individual', onExport, onRestart }: Props) {
  const [selected, setSelected] = useState<RankedAssessment | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [leadCaptured, setLeadCaptured] = useState(() => !!loadStoredLead());

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const [showLeadModal, setShowLeadModal] = useState(false);

  const ranked = buildRanking(assessments);
  const chartData = buildChartData(ranked);
  const summary = buildPrioritySummary(ranked);
  const top3 = ranked.slice(0, 3);
  const insights = buildInsights(ranked);
  const roadmap = buildRoadmap(ranked);
  const diagMeta = buildDiagnosticMeta(ranked);

  // Executive summary aggregates
  const totalAnnualHours = assessments.reduce((s, a) => s + a.annualHours, 0);
  const totalSavingsHours = assessments.reduce((s, a) => s + a.automationSavingsHours, 0);
  const totalFinancialImpact = assessments.reduce((s, a) => s + a.financialImpact, 0);

  const handleExport = async () => {
    setExporting(true);
    await onExport();
    setExporting(false);
  };

  const handleTopExportClick = () => {
    if (!leadCaptured) {
      setShowLeadModal(true);
      return;
    }
    handleExport();
  };

  const handleLeadSuccess = (_data: LeadData) => {
    setShowLeadModal(false);
    setLeadCaptured(true);
    handleExport();
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">

      {/* ── Collaborative session banner ─────────────────────────────── */}
      {diagnosticMode === 'collaborative' && diagnosticId && (
        <div className="flex items-center gap-3 bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 mb-6">
          <span className="text-violet-600 flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-violet-800">Diagnóstico colaborativo</p>
            <p className="text-xs text-violet-600 mt-0.5">
              Subprocessos respondidos: {assessments.length} &nbsp;·&nbsp; ID: <span className="font-mono">{diagnosticId.slice(0, 8)}…</span>
            </p>
          </div>
        </div>
      )}

      {/* ── Page title ───────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Oportunidades de Eficiência Operacional
          </h2>
          <p className="text-gray-500 mt-2 max-w-2xl text-sm leading-relaxed">
            Subprocessos com maiores scores indicam maior potencial de melhoria operacional.
            Os resultados abaixo foram ordenados do maior para o menor score.
          </p>
        </div>
        <div className="flex gap-3 ml-6 flex-shrink-0">
          <button
            onClick={handleTopExportClick}
            disabled={exporting}
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={14} strokeWidth={1.75} />
            {exporting ? 'Exportando...' : 'Exportar Excel'}
          </button>
          <button
            onClick={onRestart}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-lg text-sm transition-colors"
          >
            <RotateCcw size={14} strokeWidth={1.75} />
            Nova Avaliação
          </button>
        </div>
      </div>

      {/* ── Executive Summary ────────────────────────────────────────── */}
      <section className="mt-8 mb-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-2 mb-5">
          <Activity size={18} strokeWidth={1.75} />
          <h3 className="font-semibold text-base">Diagnóstico de Eficiência Operacional</h3>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-blue-100 text-xs mb-1">Subprocessos avaliados</p>
            <p className="text-3xl font-extrabold">{assessments.length}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <div className="flex items-center gap-1 mb-1">
              <Clock size={12} className="text-blue-200" />
              <p className="text-blue-100 text-xs">Esforço operacional analisado</p>
            </div>
            <p className="text-3xl font-extrabold">{fmt(totalAnnualHours)}</p>
            <p className="text-blue-200 text-xs mt-0.5">horas/ano</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp size={12} className="text-blue-200" />
              <p className="text-blue-100 text-xs">Oportunidade de automação</p>
            </div>
            <p className="text-3xl font-extrabold">{fmt(totalSavingsHours)}</p>
            <p className="text-blue-200 text-xs mt-0.5">horas/ano</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <div className="flex items-center gap-1 mb-1">
              <DollarSign size={12} className="text-blue-200" />
              <p className="text-blue-100 text-xs">Economia operacional estimada</p>
            </div>
            <p className="text-2xl font-extrabold">{fmtCurrency(totalFinancialImpact)}</p>
            <p className="text-blue-200 text-xs mt-0.5">por ano</p>
          </div>
        </div>
      </section>

      {/* ── Summary cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Alta Prioridade',  count: summary.alta,  bg: 'bg-red-50    border-red-100',    text: 'text-red-600',    bar: 'bg-red-500' },
          { label: 'Média Prioridade', count: summary.media, bg: 'bg-orange-50 border-orange-100', text: 'text-orange-600', bar: 'bg-orange-400' },
          { label: 'Baixa Prioridade', count: summary.baixa, bg: 'bg-gray-50   border-gray-200',   text: 'text-gray-600',   bar: 'bg-gray-400' },
        ].map((card) => (
          <div key={card.label} className={`${card.bg} border rounded-xl p-4`}>
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full ${card.bar}`} />
              <span className="text-xs text-gray-500 font-medium">{card.label}</span>
            </div>
            <p className={`text-3xl font-extrabold ${card.text}`}>{card.count}</p>
          </div>
        ))}
      </div>

      {/* ── Top Opportunities ───────────────────────────────────────── */}
      {top3.length > 0 && (
        <section className="mb-8">
          <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Trophy size={16} className="text-blue-500" strokeWidth={1.75} />
            Principais Oportunidades
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {top3.map((item, i) => (
              <button
                key={item.subprocessId}
                onClick={() => setSelected(item)}
                className="text-left bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-blue-200 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    #{i + 1}
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {item.isCustom && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200">
                        Custom
                      </span>
                    )}
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${item.badgeColor}`}>
                      {item.priority}
                    </span>
                  </div>
                </div>
                <p className="font-semibold text-gray-900 text-sm leading-snug mb-1">
                  {item.subprocessName}
                </p>
                <p className="text-xs text-gray-400 mb-3">
                  {item.macroprocessName} › {item.processName}
                </p>
                <p className={`text-2xl font-extrabold ${item.priorityColor} mb-2`}>
                  {item.totalScore}
                </p>
                <div className="border-t border-gray-100 pt-2 space-y-1">
                  <p className="text-xs text-gray-400">
                    <span className="font-medium text-gray-600">{fmt(item.annualHours)}h/ano</span> esforço
                  </p>
                  <p className="text-xs text-gray-400">
                    <span className="font-medium text-green-600">{fmtCurrency(item.financialImpact)}</span> pot. economia
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Chart ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-8">
        <h3 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <BarChart2 size={16} className="text-blue-500" strokeWidth={1.75} />
          Score por Subprocesso{chartData.length < ranked.length ? ` (Top ${chartData.length})` : ''}
        </h3>
        <p className="text-xs text-gray-400 mb-5">Ordenado do maior para o menor score</p>
        <ResponsiveContainer width="100%" height={Math.max(260, chartData.length * 32)}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 24, left: 8, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={190}
              tick={{ fontSize: 11, fill: '#6B7280' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F9FAFB' }} />
            <Bar dataKey="score" radius={[0, 4, 4, 0]} maxBarSize={20}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Ranking table (accordion) ────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Ranking Detalhado</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Clique em qualquer linha para expandir os detalhes
          </p>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-10">#</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Subprocesso</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Score</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Automação</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">Economia Potencial</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Prioridade</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {ranked.map((item) => {
              const isExpanded = expandedRows.has(item.subprocessId);
              return (
                <>
                  {/* ── Level 1 — summary row ── */}
                  <tr
                    key={item.subprocessId}
                    onClick={() => toggleRow(item.subprocessId)}
                    className={`cursor-pointer transition-colors border-t border-gray-50 group ${
                      isExpanded ? 'bg-blue-50/60' : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex w-7 h-7 items-center justify-center rounded-full text-xs font-bold ${
                        item.rank <= 3 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {item.rank}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className={`font-medium transition-colors ${isExpanded ? 'text-blue-700' : 'text-gray-800 group-hover:text-blue-600'}`}>
                        {item.subprocessName}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`font-extrabold ${item.priorityColor}`}>{item.totalScore}</span>
                        <div className="w-14 bg-gray-100 rounded-full h-1">
                          <div className={`${item.barColor} h-1 rounded-full`} style={{ width: `${item.scorePercent}%` }} />
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <span className="font-semibold text-blue-600">
                        {item.automationScore}
                        <span className="text-xs font-normal text-gray-400">/100</span>
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <span className="text-blue-700 font-medium">
                        {fmt(item.automationSavingsHours)}
                        <span className="text-xs font-normal text-gray-400"> h/ano</span>
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full border ${item.badgeColor}`}>
                        {item.priority}
                      </span>
                    </td>

                    <td className="px-3 py-3.5 text-right">
                      <ChevronDown
                        size={15}
                        strokeWidth={2}
                        className={`text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </td>
                  </tr>

                  {/* ── Level 2 — expanded details ── */}
                  {isExpanded && (
                    <tr key={`${item.subprocessId}-details`}>
                      <td colSpan={7} className="px-6 pb-5 pt-1 bg-blue-50/40 border-b border-blue-100">
                        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm mb-4 pt-2 sm:grid-cols-3">
                          <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Macroprocesso</p>
                            <p className="text-gray-700 font-medium">{item.macroprocessName}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Processo</p>
                            <p className="text-gray-700 font-medium">{item.processName}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Tipo</p>
                            <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full border ${
                              item.isCustom
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-gray-50 text-gray-500 border-gray-200'
                            }`}>
                              {item.isCustom ? 'Personalizado' : 'Padrão'}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Esforço Anual</p>
                            <p className="text-gray-700 font-medium">
                              {fmt(item.annualHours)}<span className="text-gray-400 font-normal"> h/ano</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Impacto Financeiro</p>
                            <p className="text-green-700 font-semibold">{fmtCurrency(item.financialImpact)}</p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelected(item); }}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                        >
                          Ver detalhamento por critério →
                        </button>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Automation Roadmap ──────────────────────────────────────── */}
      {roadmap.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-5">
            <Map size={16} className="text-blue-500" strokeWidth={1.75} />
            <div>
              <h3 className="font-semibold text-gray-800">Roteiro de Automação</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Subprocessos priorizados por score de automação × esforço anual
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {roadmap.map((group) => {
              const tierConfig = {
                quickWins: {
                  Icon: Zap,
                  iconColor: 'text-emerald-500',
                  headerBg: 'bg-emerald-50 border-emerald-100',
                  rowHover: 'hover:bg-emerald-50',
                  seqBg: 'bg-emerald-600 text-white',
                  chip: 'bg-emerald-100 text-emerald-700 border-emerald-200',
                  chipLabel: 'Quick Win',
                },
                strategic: {
                  Icon: Target,
                  iconColor: 'text-blue-500',
                  headerBg: 'bg-blue-50 border-blue-100',
                  rowHover: 'hover:bg-blue-50',
                  seqBg: 'bg-blue-600 text-white',
                  chip: 'bg-blue-100 text-blue-700 border-blue-200',
                  chipLabel: 'Estratégico',
                },
                lower: {
                  Icon: Clock,
                  iconColor: 'text-gray-400',
                  headerBg: 'bg-gray-50 border-gray-100',
                  rowHover: 'hover:bg-gray-50',
                  seqBg: 'bg-gray-400 text-white',
                  chip: 'bg-gray-100 text-gray-500 border-gray-200',
                  chipLabel: 'Menor prioridade',
                },
              }[group.tier];
              const { Icon } = tierConfig;

              return (
                <div key={group.tier} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* Group header */}
                  <div className={`flex items-start gap-3 px-5 py-4 border-b ${tierConfig.headerBg}`}>
                    <Icon size={16} className={`mt-0.5 flex-shrink-0 ${tierConfig.iconColor}`} strokeWidth={1.75} />
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{group.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{group.description}</p>
                    </div>
                  </div>

                  {/* Items */}
                  <ul className="divide-y divide-gray-50">
                    {group.entries.map(({ item, seq }) => (
                      <li key={item.subprocessId}>
                        <button
                          onClick={() => setSelected(item)}
                          className={`w-full text-left flex items-center gap-4 px-5 py-3.5 transition-colors ${tierConfig.rowHover}`}
                        >
                          {/* Sequential number */}
                          <span className={`flex-shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${tierConfig.seqBg}`}>
                            {seq}
                          </span>

                          {/* Name + breadcrumb */}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 text-sm truncate">{item.subprocessName}</p>
                            <p className="text-xs text-gray-400 truncate">
                              {item.macroprocessName} › {item.processName}
                            </p>
                          </div>

                          {/* Tier chip (desktop) */}
                          <span className={`hidden sm:inline-block flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full border ${tierConfig.chip}`}>
                            {tierConfig.chipLabel}
                          </span>

                          {/* Automation score */}
                          <div className="flex-shrink-0 text-right hidden md:block w-24">
                            <p className="text-xs text-gray-400">Automação</p>
                            <p className="font-bold text-blue-600 text-sm">{item.automationScore}<span className="text-xs font-normal text-gray-400">/100</span></p>
                          </div>

                          {/* Annual hours */}
                          <div className="flex-shrink-0 text-right hidden md:block w-24">
                            <p className="text-xs text-gray-400">Esforço</p>
                            <p className="font-medium text-gray-700 text-sm">{fmt(item.annualHours)}<span className="text-xs font-normal text-gray-400"> h/ano</span></p>
                          </div>

                          {/* Financial impact */}
                          <div className="flex-shrink-0 text-right w-28">
                            <p className="text-xs text-gray-400">Economia pot.</p>
                            <p className="font-semibold text-green-600 text-sm">{fmtCurrency(item.financialImpact)}</p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Diagnostic Insights ─────────────────────────────────────── */}
      {insights.length > 0 && (
        <section className="mb-8 bg-amber-50 border border-amber-100 rounded-2xl p-6">
          <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Lightbulb size={16} className="text-amber-500" strokeWidth={1.75} />
            Insights do Diagnóstico
          </h3>
          <ul className="space-y-3">
            {insights.map((insight, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                <p className="text-sm text-gray-700 leading-relaxed">{insight}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {selected && <DetailModal item={selected} onClose={() => setSelected(null)} />}

      {showLeadModal && (
        <LeadModal
          meta={diagMeta}
          onSuccess={handleLeadSuccess}
          onClose={() => setShowLeadModal(false)}
        />
      )}
    </div>
  );
}
