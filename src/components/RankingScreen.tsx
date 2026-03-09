'use client';

import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import {
  Trophy, BarChart2, FileDown, RotateCcw, X, Activity,
  Lightbulb, Clock, TrendingUp, DollarSign, Target, ChevronDown,
} from 'lucide-react';
import { SubprocessAssessment, CRITERIA, AssessmentIdentification } from '@/types';
import { buildRanking, buildChartData, buildPrioritySummary, RankedAssessment } from '@/lib/ranking';
import { buildAutomationRoadmap, RoadmapItem, RoadmapCategory } from '@/lib/automationRoadmap';
import PDFDiagnosticReport from './PDFDiagnosticReport';
import ProcessRanking from './ProcessRanking';

interface Props {
  assessments: SubprocessAssessment[];
  identification?: AssessmentIdentification;
  generatedAt?: string;
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

// ─── Insights ───────────────────────────────────────────────────────────────

interface Insight {
  text: string;
  weight: number;
}

function buildInsights(ranked: RankedAssessment[]): string[] {
  if (ranked.length === 0) return [];
  const pool: Insight[] = [];
  const n = ranked.length;

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

  const highRework = ranked.filter((r) => r.scores.reworkOrErrors >= 3).length;
  if (highRework >= 2) {
    pool.push({
      weight: 9,
      text: `O diagnóstico indica instabilidade de processo: ${highRework} subprocesso${highRework > 1 ? 's apresentam' : ' apresenta'} frequência elevada de retrabalho ou erros, reflexo de atividades manuais sem padronização adequada.`,
    });
  }

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

  const heavyManual = ranked.filter((r) => r.scores.systemsOrSpreadsheets >= 3).length;
  const manualPct = Math.round((heavyManual / n) * 100);
  if (manualPct >= 40) {
    pool.push({
      weight: 6,
      text: `${manualPct}% dos subprocessos avaliados dependem de planilhas ou controles manuais — esse perfil representa o principal vetor de automação identificado no diagnóstico.`,
    });
  }

  const highPeople = ranked.filter((r) => r.scores.peopleInvolved >= 3).length;
  if (highPeople >= Math.ceil(n / 2)) {
    pool.push({
      weight: 4,
      text: `A maioria dos subprocessos envolve múltiplas pessoas para execução — operações intensivas em mão de obra tendem a gerar maior impacto com automação e padronização de fluxos.`,
    });
  }

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

// ─── Main Component ──────────────────────────────────────────────────────────

export default function RankingScreen({
  assessments,
  identification,
  generatedAt,
  onRestart,
}: Props) {
  const [selected, setSelected] = useState<RankedAssessment | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [expandedRoadmapSections, setExpandedRoadmapSections] = useState<Set<RoadmapCategory>>(new Set());
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleRoadmapSection = (cat: RoadmapCategory) => {
    setExpandedRoadmapSections((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const handleDownloadPDF = async () => {
    setGeneratingPdf(true);
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const blob = await pdf(
        <PDFDiagnosticReport
          assessments={assessments}
          ranked={ranked}
          roadmap={autoRoadmap}
          identification={identification}
          generatedAt={generatedAt}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'diagnostico-automacao.pdf';
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setGeneratingPdf(false);
    }
  };

  const ranked = buildRanking(assessments);
  const chartData = buildChartData(ranked);
  const summary = buildPrioritySummary(ranked);
  const top3 = ranked.slice(0, 3);
  const insights = buildInsights(ranked);
  const autoRoadmap = buildAutomationRoadmap(assessments);

  const totalAnnualHours = assessments.reduce((s, a) => s + a.annualHours, 0);
  const totalSavingsHours = assessments.reduce((s, a) => s + a.automationSavingsHours, 0);
  const totalFinancialImpact = assessments.reduce((s, a) => s + a.financialImpact, 0);

  // Category config for the new roadmap section
  const categoryConfig: Record<RoadmapCategory, {
    label: string; timeline: string; color: string; badge: string; bar: string; dot: string;
  }> = {
    'quick-wins':     { label: 'Quick Wins',               timeline: '0–3 meses',  color: 'bg-emerald-50 border-emerald-200',  badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
    'strategic':      { label: 'Iniciativas Estratégicas', timeline: '3–6 meses',  color: 'bg-blue-50 border-blue-200',         badge: 'bg-blue-100 text-blue-800 border-blue-200',          bar: 'bg-blue-500',    dot: 'bg-blue-500'    },
    'transformation': { label: 'Transformação Operacional', timeline: '6–12 meses', color: 'bg-violet-50 border-violet-200',   badge: 'bg-violet-100 text-violet-800 border-violet-200',    bar: 'bg-violet-500',  dot: 'bg-violet-500'  },
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">

      {/* ── Action bar (excluded from PDF) ───────────────────────────── */}
      <div className="flex justify-end gap-3 mb-6">
        <button
          onClick={handleDownloadPDF}
          disabled={generatingPdf}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileDown size={14} strokeWidth={1.75} />
          {generatingPdf ? 'Gerando PDF...' : 'Baixar relatório em PDF'}
        </button>
        <button
          onClick={onRestart}
          className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors"
        >
          <RotateCcw size={14} strokeWidth={1.75} />
          Nova Avaliação
        </button>
      </div>

      {/* ── PDF content container ─────────────────────────────────────── */}
      <div
        id="diagnostic-results"
        style={{
          color: "#111827",
          backgroundColor: "#ffffff"
        }}
      >

        {/* ── Page title ───────────────────────────────────────────── */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Oportunidades de Eficiência Operacional
          </h2>
          <p className="text-gray-500 mt-2 max-w-2xl text-sm leading-relaxed">
            Subprocessos com maiores scores indicam maior potencial de melhoria operacional.
            Os resultados abaixo foram ordenados do maior para o menor score.
          </p>
          {(identification || generatedAt) && (
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
              {identification?.company && <span>Empresa: <span className="font-medium text-gray-600">{identification.company}</span></span>}
              {identification?.area && <span>Área: <span className="font-medium text-gray-600">{identification.area}</span></span>}
              {identification?.respondentName && <span>Respondente: <span className="font-medium text-gray-600">{identification.respondentName}</span></span>}
              {generatedAt && <span>Gerado em: <span className="font-medium text-gray-600">{generatedAt}</span></span>}
            </div>
          )}
        </div>

        {/* ── Process Ranking ──────────────────────────────────────── */}
        <ProcessRanking ranked={ranked} />

        {/* ── Executive Summary ────────────────────────────────────── */}
        <section className="mb-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
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

        {/* ── Summary cards ────────────────────────────────────────── */}
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

        {/* ── Top Opportunities ────────────────────────────────────── */}
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
                  className="text-left bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer"
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

        {/* ── Chart ────────────────────────────────────────────────── */}
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

        {/* ── Ranking table (accordion) ─────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Ranking Detalhado</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Clique em qualquer linha para expandir os critérios avaliados
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
                <th className="w-10" />
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
                        isExpanded ? 'bg-blue-50/60' : 'hover:bg-blue-50/30'
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
                          size={16}
                          strokeWidth={2.5}
                          className={`text-blue-500 group-hover:text-blue-700 transition-all duration-300 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
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
                          {/* Criteria breakdown */}
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 mb-3">
                            {CRITERIA.map((c) => {
                              const score = item.scores[c.key];
                              const pct = (score / 4) * 100;
                              return (
                                <div key={c.key} className="bg-white rounded-lg border border-blue-100 p-2.5">
                                  <div className="flex justify-between text-xs mb-1.5">
                                    <span className="text-gray-600 font-medium truncate pr-1">{c.label}</span>
                                    <span className="font-bold text-gray-800 flex-shrink-0">{score}/4</span>
                                  </div>
                                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                                    <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelected(item); }}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                          >
                            Ver detalhamento completo →
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

        {/* ── Roadmap de Automação Sugerido (Impact × Effort, accordion) ── */}
        {autoRoadmap.length > 0 && (() => {
          const quickWins = autoRoadmap.filter((r) => r.roadmapCategory === 'quick-wins');
          const strategic = autoRoadmap.filter((r) => r.roadmapCategory === 'strategic');
          const transform  = autoRoadmap.filter((r) => r.roadmapCategory === 'transformation');

          const SubprocessRow = ({ item }: { item: RoadmapItem }) => {
            const cfg = categoryConfig[item.roadmapCategory];
            return (
              <div className="flex items-center gap-3 py-3.5 border-b border-gray-100 last:border-b-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{item.subprocessName}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{item.macroprocessName} › {item.processName}</p>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  {/* Automation score */}
                  <div className="text-right w-20 hidden sm:block">
                    <p className="text-xs text-gray-400">Potencial de Automação</p>
                    <p className="text-sm font-semibold text-blue-600">{item.automationScore}<span className="text-xs font-normal text-gray-400">/100</span></p>
                  </div>
                  {/* Effort score */}
                  <div className="text-right w-20 hidden sm:block">
                    <p className="text-xs text-gray-400">Esforço Estimado</p>
                    <div className="flex items-center justify-end gap-1 mt-0.5">
                      <div className="w-12 bg-gray-100 rounded-full h-1.5">
                        <div className={`${cfg.bar} h-1.5 rounded-full opacity-60`} style={{ width: `${item.effortScore}%` }} />
                      </div>
                      <span className="text-xs font-medium text-gray-600">{item.effortScore}</span>
                    </div>
                  </div>
                  {/* Estimated savings */}
                  <div className="text-right w-28 hidden sm:block">
                    <p className="text-xs text-gray-400">Economia Anual Estimada</p>
                    <p className="text-xs font-semibold text-green-700">{fmtCurrency(item.estimatedSavings)}</p>
                  </div>
                  {/* Timeline badge — Prazo de Implementação */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-400 mb-0.5 hidden sm:block">Prazo de Implementação</p>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.badge}`}>
                      {item.timeline}
                    </span>
                  </div>
                </div>
              </div>
            );
          };

          const groups: { category: RoadmapCategory; items: RoadmapItem[] }[] = (
            [
              { category: 'quick-wins' as const, items: quickWins },
              { category: 'strategic' as const, items: strategic },
              { category: 'transformation' as const, items: transform },
            ] as const
          ).filter((g) => g.items.length > 0);

          const prioritisedSavings = [...quickWins, ...strategic]
            .reduce((s, r) => s + r.estimatedSavings, 0);

          return (
            <section className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Target size={16} className="text-blue-500" strokeWidth={1.75} />
                <div>
                  <h3 className="font-semibold text-gray-800">Roadmap de Automação Sugerido</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Clique em cada categoria para expandir as iniciativas
                  </p>
                </div>
              </div>

              {prioritisedSavings > 0 && (
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl px-5 py-4 mb-5 text-white">
                  <p className="text-xs font-semibold uppercase tracking-widest opacity-80 mb-1">
                    Impacto potencial estimado das iniciativas priorizadas
                  </p>
                  <p className="text-sm leading-relaxed">
                    O diagnóstico identificou{' '}
                    <strong>{quickWins.length + strategic.length}</strong> oportunidades de
                    automação que podem gerar até{' '}
                    <strong>{fmtCurrency(prioritisedSavings)}</strong> em ganhos operacionais anuais.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {groups.map(({ category, items }) => {
                  const cfg = categoryConfig[category];
                  const isOpen = expandedRoadmapSections.has(category);
                  return (
                    <div key={category} className={`rounded-xl border ${cfg.color} overflow-hidden`}>
                      {/* Accordion header */}
                      <button
                        onClick={() => toggleRoadmapSection(category)}
                        className="w-full flex items-center justify-between px-5 py-3.5 cursor-pointer hover:brightness-95 transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                          <span className="font-semibold text-gray-800 text-sm">{cfg.label}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.badge}`}>
                            {cfg.timeline}
                          </span>
                          <span className="text-xs text-gray-500 font-medium">
                            {items.length} iniciativa{items.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <ChevronDown
                          size={16}
                          strokeWidth={2.5}
                          className={`text-blue-600 transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                        />
                      </button>

                      {/* Collapsible items */}
                      {isOpen && (
                        <div className="px-5 border-t border-gray-200/50">
                          {items.map((item) => (
                            <SubprocessRow key={item.subprocessId} item={item} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })()}

        {/* ── Diagnostic Insights ──────────────────────────────────── */}
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

      {/* ── Próximos Passos (CTA) ─────────────────────────────────────── */}
      <section className="mb-8 bg-blue-50 border border-blue-100 rounded-2xl p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-2">Próximos Passos</h3>
        <p className="text-sm text-gray-700 mb-1">Este diagnóstico identificou processos com alto potencial de automação.</p>
        <p className="text-sm text-gray-700 mb-4">A Meta pode apoiar sua organização nas próximas etapas com:</p>
        <ul className="space-y-1 mb-6">
          {[
            'Análise e redesenho de processos',
            'Automação com RPA e Inteligência Artificial',
            'Implementação de programas de automação',
            'Gestão da mudança para transformação digital',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
        <a
          href="https://meta.com.br/contato"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          Falar com a Meta sobre automação
        </a>
      </section>

      </div>{/* end #diagnostic-results */}

      {/* Modals */}
      {selected && <DetailModal item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
