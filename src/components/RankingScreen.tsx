'use client';

import { useState } from 'react';
import {
  Trophy, FileDown, RotateCcw, Activity,
  Lightbulb, TrendingUp, DollarSign, Target, ChevronDown, X,
} from 'lucide-react';
import { SubprocessAssessment, AssessmentIdentification } from '@/types';
import { buildRanking, buildPrioritySummary, RankedAssessment } from '@/lib/ranking';
import { buildAutomationRoadmap, RoadmapCategory } from '@/lib/automationRoadmap';
import { FTE_HOURS_YEAR, HOURLY_COST } from '@/lib/impactCalculator';
import PDFDiagnosticReport from './PDFDiagnosticReport';

interface Props {
  assessments: SubprocessAssessment[];
  onRestart: () => void;
}

function fmt(n: number): string {
  return n.toLocaleString('pt-BR');
}

function getAutomationPotential(score: number): { label: string; color: string } {
  if (score >= 24) return { label: 'Muito Alto', color: 'text-red-600 bg-red-50 border-red-200' };
  if (score >= 20) return { label: 'Alto',       color: 'text-orange-600 bg-orange-50 border-orange-200' };
  if (score >= 16) return { label: 'Médio',      color: 'text-yellow-700 bg-yellow-50 border-yellow-200' };
  return               { label: 'Baixo',      color: 'text-gray-600 bg-gray-50 border-gray-200' };
}

function fmtCurrency(n: number): string {
  return `R$ ${n.toLocaleString('pt-BR')}`;
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

// ─── Roadmap label maps ──────────────────────────────────────────────────────

const ROADMAP_LABELS: Record<RoadmapCategory, string> = {
  'quick-wins':     'Quick Win',
  'strategic':      'Iniciativa Estratégica',
  'transformation': 'Transformação Operacional',
};

const ROADMAP_BADGE: Record<RoadmapCategory, string> = {
  'quick-wins':     'bg-emerald-50 text-emerald-800 border-emerald-200',
  'strategic':      'bg-blue-50 text-blue-800 border-blue-200',
  'transformation': 'bg-violet-50 text-violet-800 border-violet-200',
};

// ─── Card style constant ─────────────────────────────────────────────────────

const CARD = 'bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6';

// ─── Identification modal ────────────────────────────────────────────────────

const INPUT_CLASS =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';
const LABEL_CLASS = 'block text-xs font-semibold text-gray-600 mb-1.5';

interface IdForm {
  company: string;
  area: string;
  respondentName: string;
  email: string;
}

const EMPTY_FORM: IdForm = { company: '', area: '', respondentName: '', email: '' };

// ─── Main Component ──────────────────────────────────────────────────────────

export default function RankingScreen({ assessments, onRestart }: Props) {
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [showIdModal, setShowIdModal] = useState(false);
  const [idForm, setIdForm] = useState<IdForm>(EMPTY_FORM);
  const [savedIdentification, setSavedIdentification] = useState<AssessmentIdentification | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const ranked = buildRanking(assessments);
  const summary = buildPrioritySummary(ranked);
  const insights = buildInsights(ranked);
  const autoRoadmap = buildAutomationRoadmap(assessments);

  const totalAnnualHours     = assessments.reduce((s, a) => s + a.annualHours, 0);
  const totalSavingsHours    = assessments.reduce((s, a) => s + a.automationSavingsHours, 0);
  const totalFinancialImpact = assessments.reduce((s, a) => s + a.financialImpact, 0);

  const totalFteEquivalent = Math.round((totalSavingsHours / FTE_HOURS_YEAR) * 10) / 10;
  const totalCapacityGain  = totalAnnualHours > 0
    ? Math.round((totalSavingsHours / totalAnnualHours) * 100)
    : 0;

  const idFormValid =
    idForm.company.trim() &&
    idForm.area.trim() &&
    idForm.respondentName.trim() &&
    idForm.email.trim();

  const generatePDF = async (identification: AssessmentIdentification, generatedAt: string) => {
    setGeneratingPdf(true);
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const blob = await pdf(
        <PDFDiagnosticReport
          assessments={assessments}
          ranked={ranked}
          roadmap={autoRoadmap}
          insights={insights}
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

  const handleIdSubmit = async () => {
    if (!idFormValid) return;
    const identification: AssessmentIdentification = {
      company:       idForm.company.trim(),
      area:          idForm.area.trim(),
      respondentName: idForm.respondentName.trim(),
      email:         idForm.email.trim(),
    };
    const generatedAt = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
    setSavedIdentification(identification);
    setShowIdModal(false);
    await generatePDF(identification, generatedAt);
  };

  const field = (
    key: keyof IdForm,
    label: string,
    placeholder: string,
    type = 'text',
  ) => (
    <div>
      <label className={LABEL_CLASS}>
        {label} <span className="text-red-400">*</span>
      </label>
      <input
        type={type}
        value={idForm[key]}
        onChange={(e) => setIdForm((f) => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className={INPUT_CLASS}
      />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">

      {/* ── Identification modal ───────────────────────────────────────── */}
      {showIdModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-bold text-gray-900">Identificação do relatório</h3>
              <button
                onClick={() => setShowIdModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              Preencha os dados abaixo para personalizar o relatório PDF.
            </p>

            <div className="space-y-4">
              {field('company',       'Empresa',              'Nome da empresa')}
              {field('area',          'Área',                 'Ex: Financeiro, RH, Logística')}
              {field('respondentName','Nome do respondente',  'Seu nome completo')}
              {field('email',         'E-mail',               'seu@email.com', 'email')}
            </div>

            <button
              onClick={handleIdSubmit}
              disabled={!idFormValid || generatingPdf}
              className="w-full mt-6 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-400 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
            >
              <FileDown size={15} strokeWidth={1.75} />
              {generatingPdf ? 'Gerando PDF...' : 'Gerar relatório PDF'}
            </button>
          </div>
        </div>
      )}

      {/* ── Action bar ────────────────────────────────────────────────── */}
      <div className="flex justify-end gap-3 mb-8">
        <button
          onClick={() => setShowIdModal(true)}
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

      {/* ── Results content ───────────────────────────────────────────── */}
      <div id="diagnostic-results" style={{ color: '#111827', backgroundColor: '#ffffff' }}>

        {/* Page title */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Oportunidades de Eficiência Operacional
          </h2>
          <p className="text-gray-500 mt-2 max-w-2xl text-sm leading-relaxed">
            Subprocessos com maiores scores indicam maior potencial de melhoria operacional.
            Os resultados abaixo foram ordenados do maior para o menor score.
          </p>
          {savedIdentification && (
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
              {savedIdentification.company       && <span>Empresa: <span className="font-medium text-gray-600">{savedIdentification.company}</span></span>}
              {savedIdentification.area          && <span>Área: <span className="font-medium text-gray-600">{savedIdentification.area}</span></span>}
              {savedIdentification.respondentName && <span>Respondente: <span className="font-medium text-gray-600">{savedIdentification.respondentName}</span></span>}
              {savedIdentification.email         && <span>E-mail: <span className="font-medium text-gray-600">{savedIdentification.email}</span></span>}
            </div>
          )}
        </div>

        {/* ── 1. Diagnóstico — header ───────────────────────────────────── */}
        <section className="mb-6">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Activity size={18} strokeWidth={1.75} />
              <h3 className="font-semibold text-base">Diagnóstico de Eficiência Operacional</h3>
            </div>
            <p className="text-blue-100 text-sm">
              {assessments.length} subprocesso{assessments.length !== 1 ? 's' : ''} avaliado{assessments.length !== 1 ? 's' : ''} ·{' '}
              {fmt(totalAnnualHours)} horas operacionais/ano mapeadas
            </p>
          </div>
        </section>

        {/* ── 1b. Executive impact metrics ──────────────────────────────── */}
        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">

          {/* Card 1 — Operational Impact */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <TrendingUp size={15} className="text-blue-600" strokeWidth={1.75} />
              </div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Impacto Operacional</p>
            </div>
            <p className="text-3xl font-extrabold text-gray-900">{fmt(totalSavingsHours)}</p>
            <p className="text-xs text-gray-500 mt-0.5 mb-3">horas operacionais potencialmente automatizáveis/ano</p>
            <div className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2">
              <span className="text-sm font-bold text-blue-700">≈ {totalFteEquivalent.toLocaleString('pt-BR')} FTE</span>
              <span className="text-xs text-blue-500">de capacidade operacional</span>
            </div>
          </div>

          {/* Card 2 — Operational Capacity Gain */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <Activity size={15} className="text-emerald-600" strokeWidth={1.75} />
              </div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ganho de Capacidade</p>
            </div>
            <p className="text-3xl font-extrabold text-emerald-600">+{totalCapacityGain}%</p>
            <p className="text-xs text-gray-500 mt-0.5 mb-3">aumento na capacidade operacional</p>
            <p className="text-xs text-gray-400 leading-relaxed">
              A equipe atual poderia processar ~{totalCapacityGain}% mais volume sem aumento de headcount.
            </p>
          </div>

          {/* Card 3 — Financial Impact (scenario) */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                <DollarSign size={15} className="text-amber-600" strokeWidth={1.75} />
              </div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Impacto Financeiro (cenário)</p>
            </div>
            <p className="text-2xl font-extrabold text-gray-900">{fmtCurrency(totalFinancialImpact)}</p>
            <p className="text-xs text-gray-500 mt-0.5 mb-3">estimativa anual</p>
            <p className="text-xs text-gray-400 leading-relaxed">
              Estimativa baseada em custo administrativo de R${HOURLY_COST}/h. Resultados reais variam conforme a estrutura de custos da organização.
            </p>
          </div>

        </section>

        {/* ── 2. Distribuição de Prioridades ───────────────────────────── */}
        <section className={CARD}>
          <h3 className="text-base font-semibold text-gray-800 mb-4">Distribuição de Prioridades</h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Alta Prioridade',  count: summary.alta,  bg: 'bg-red-50    border-red-100',    text: 'text-red-600',    dot: 'bg-red-500' },
              { label: 'Média Prioridade', count: summary.media, bg: 'bg-orange-50 border-orange-100', text: 'text-orange-600', dot: 'bg-orange-400' },
              { label: 'Baixa Prioridade', count: summary.baixa, bg: 'bg-gray-50   border-gray-200',   text: 'text-gray-600',   dot: 'bg-gray-400' },
            ].map((card) => (
              <div key={card.label} className={`${card.bg} border rounded-xl p-4`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${card.dot}`} />
                  <span className="text-xs text-gray-500 font-medium">{card.label}</span>
                </div>
                <p className={`text-3xl font-extrabold ${card.text}`}>{card.count}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 3. Ranking de Potencial de Automação ─────────────────────── */}
        <section className={CARD}>
          <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Trophy size={16} className="text-blue-600" strokeWidth={1.75} />
            Ranking de Potencial de Automação
          </h3>
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 w-12">Rank</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Processo</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 w-24">Pontuação</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 w-28">Potencial</th>
                </tr>
              </thead>
              <tbody>
                {ranked.slice(0, 10).map((item, i) => {
                  const potential = getAutomationPotential(item.totalScore);
                  return (
                    <tr key={item.subprocessId} className={i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="px-4 py-3 text-center font-bold text-gray-400 text-xs">{item.rank}</td>
                      <td className="px-4 py-3 text-gray-900">{item.subprocessName}</td>
                      <td className="px-4 py-3 text-center font-semibold text-gray-800">{item.totalScore}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full border ${potential.color}`}>
                          {potential.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── 4. Matriz de Priorização de Automação ────────────────────── */}
        <section className={CARD}>
          <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Target size={16} className="text-blue-600" strokeWidth={1.75} />
            Matriz de Priorização de Automação
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Prioridade Imediata',       min: 24, max: Infinity, bg: 'bg-red-50',    border: 'border-red-200',    title: 'text-red-700',    badge: 'bg-red-100 text-red-700 border-red-200' },
              { label: 'Alta Prioridade',           min: 20, max: 24,       bg: 'bg-orange-50', border: 'border-orange-200', title: 'text-orange-700', badge: 'bg-orange-100 text-orange-700 border-orange-200' },
              { label: 'Oportunidade de Automação', min: 16, max: 20,       bg: 'bg-blue-50',   border: 'border-blue-200',   title: 'text-blue-700',   badge: 'bg-blue-100 text-blue-700 border-blue-200' },
              { label: 'Baixa Prioridade',          min: 0,  max: 16,       bg: 'bg-gray-50',   border: 'border-gray-200',   title: 'text-gray-600',   badge: 'bg-gray-100 text-gray-600 border-gray-200' },
            ].map(({ label, min, max, bg, border, title, badge }) => {
              const items = ranked.filter(r => r.totalScore >= min && r.totalScore < max);
              return (
                <div key={label} className={`rounded-xl border p-4 ${bg} ${border}`}>
                  <div className={`text-xs font-bold uppercase tracking-wide mb-3 ${title}`}>{label}</div>
                  {items.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">Nenhum processo nesta categoria</p>
                  ) : (
                    <ul className="space-y-2">
                      {items.map(r => (
                        <li key={r.subprocessId} className="flex items-center justify-between gap-2">
                          <span className="text-xs text-gray-800 leading-snug flex-1">{r.subprocessName}</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${badge}`}>{r.totalScore}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── 5. Roadmap de Automação Sugerido ─────────────────────────── */}
        {autoRoadmap.length > 0 && (
          <section className={CARD}>
            <h3 className="text-base font-semibold text-gray-800 mb-1 flex items-center gap-2">
              <Target size={16} className="text-blue-500" strokeWidth={1.75} />
              Roadmap de Automação Sugerido
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Iniciativas ordenadas por horizonte de implementação e potencial de impacto
            </p>
            <div className="space-y-3">
              {autoRoadmap.map((item, i) => (
                <div
                  key={item.subprocessId}
                  className="flex gap-4 items-start p-4 rounded-xl bg-gray-50 border border-gray-100"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">{item.subprocessName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {ROADMAP_LABELS[item.roadmapCategory]} · Economia est.: {fmtCurrency(item.estimatedSavings)}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border flex-shrink-0 ${ROADMAP_BADGE[item.roadmapCategory]}`}>
                    {item.timeline}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── 6. Insights do Diagnóstico (collapsed by default) ─────────── */}
        {insights.length > 0 && (
          <section className="bg-white rounded-2xl border border-amber-100 shadow-sm mb-6 overflow-hidden">
            <button
              onClick={() => setInsightsOpen((v) => !v)}
              className="w-full flex items-center justify-between px-6 py-5 hover:bg-amber-50 transition-colors"
            >
              <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <Lightbulb size={16} className="text-amber-500" strokeWidth={1.75} />
                Insights do Diagnóstico
              </h3>
              <ChevronDown
                size={16}
                strokeWidth={2.5}
                className={`text-amber-500 transition-transform duration-300 flex-shrink-0 ${insightsOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {insightsOpen && (
              <div className="px-6 pb-6">
                <ul className="space-y-3">
                  {insights.map((insight, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                      <p className="text-sm text-gray-700 leading-relaxed">{insight}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

      </div>{/* end #diagnostic-results */}

    </div>
  );
}
