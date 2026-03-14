'use client';

import { useState, useEffect, useRef } from 'react';
import {
  FileDown, RotateCcw, Activity,
  TrendingUp, DollarSign, Target, ChevronDown, X, Pencil,
  Zap, Layers, Clock,
} from 'lucide-react';
import { SubprocessAssessment, AssessmentIdentification } from '@/types';
import { buildRanking, buildPrioritySummary, RankedAssessment } from '@/lib/ranking';
import { normalizeScore } from '@/lib/scoring';
import { buildAutomationRoadmap, RoadmapCategory } from '@/lib/automationRoadmap';
import { FTE_HOURS_YEAR, DEFAULT_HOURLY_COST, VOLUME_MAP, TIME_MAP, PEOPLE_MAP, getAutomationRate, calculateAutomationSavings, calculateFteCurrent, calculateFteEquivalent, calculateFteAfterAutomation } from '@/lib/impactCalculator';
import Link from 'next/link';
import PDFDiagnosticReport from './PDFDiagnosticReport';
import Tooltip from '@/components/Tooltip';
import { fetchVoteSummaries } from '@/lib/votes';

// suppress unused-import warnings (used by downstream PDF toolchain)
void normalizeScore;

interface Props {
  assessments: SubprocessAssessment[];
  onRestart: () => void;
  /** When provided, "Compartilhar relatório" and "Votar prioridades" buttons appear */
  diagnosticId?: string;
}

function fmt(n: number): string {
  return n.toLocaleString('pt-BR');
}

/** Formats a number with up to 1 decimal place (pt-BR locale). */
function fmtD(n: number): string {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}

function fmtFte(n: number): string {
  if (n > 0 && n < 0.1) return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}

function fmtCurrency(n: number): string {
  return `R$ ${n.toLocaleString('pt-BR')}`;
}
// suppress unused warning (used by downstream PDF toolchain)
void fmtCurrency;

/** Rounds to nearest thousand and formats as "R$ X mil" or "R$ X.XXX". */
function fmtFinancial(n: number): string {
  if (n >= 1000) {
    const mil = Math.round(n / 1000);
    return `R$ ${mil} mil`;
  }
  return `R$ ${Math.round(n).toLocaleString('pt-BR')}`;
}

function getPriorityBadge(priorityScore: number): { label: string; color: string } {
  if (priorityScore >= 70) return { label: 'Alta',  color: 'text-red-700 bg-red-50 border-red-200' };
  if (priorityScore >= 50) return { label: 'Média', color: 'text-amber-800 bg-amber-100 border-amber-300' };
  return                          { label: 'Baixa', color: 'text-gray-600 bg-gray-50 border-gray-200' };
}

// ─── Insights (kept for PDF toolchain) ──────────────────────────────────────

interface Insight {
  text: string;
  weight: number;
}

function buildInsights(ranked: RankedAssessment[]): string[] {
  if (ranked.length < 3) return [];
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

  const highRework = ranked.filter((r) => r.scores.reworkRate >= 3).length;
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

  const heavyManual = ranked.filter((r) => r.scores.dataDigitization >= 3).length;
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

// ─── Roadmap label maps (kept for PDF toolchain) ─────────────────────────────

const ROADMAP_LABELS: Record<RoadmapCategory, string> = {
  'quick-wins':     'Vitória Rápida',
  'strategic':      'Iniciativa Estratégica',
  'transformation': 'Transformação Operacional',
  'low-priority':   'Baixa Prioridade',
};

const ROADMAP_BADGE: Record<RoadmapCategory, string> = {
  'quick-wins':     'bg-emerald-50 text-emerald-800 border-emerald-200',
  'strategic':      'bg-blue-50 text-blue-800 border-blue-200',
  'transformation': 'bg-violet-50 text-violet-800 border-violet-200',
  'low-priority':   'bg-gray-50 text-gray-600 border-gray-200',
};

// suppress unused-variable warnings (used by downstream PDF toolchain)
void ROADMAP_LABELS; void ROADMAP_BADGE;

// ─── Card style constant ─────────────────────────────────────────────────────

const CARD = 'bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6';

// ─── Identification modal helpers ────────────────────────────────────────────

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

export default function RankingScreen({ assessments, onRestart, diagnosticId }: Props) {
  const [showIdModal, setShowIdModal]       = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [idForm, setIdForm]                 = useState<IdForm>(EMPTY_FORM);
  const [savedIdentification, setSavedIdentification] = useState<AssessmentIdentification | null>(null);
  const [generatingPdf, setGeneratingPdf]   = useState(false);
  const [refinedImpact, setRefinedImpact]   = useState<{
    annualHours: number; savingsHours: number; fteEquivalent: number;
    capacityGain: number; financialImpact: number; hourlyCost: number;
    fteCurrent: number; fteAfterAutomation: number;
  } | null>(null);
  const [subprocessOverrides, setSubprocessOverrides] = useState<
    Record<string, { people: string; hourlyCost: string }>
  >({});
  const recalcDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [perSubprocessRefined, setPerSubprocessRefined] = useState<
    Record<string, { annualHours: number; savingsHours: number; fteEquivalent: number; financialImpact: number; hourlyCost: number; fteCurrent: number; fteAfterAutomation: number }>
  >({});

  const [voteSummaries, setVoteSummaries] = useState<Map<string, { average: number; count: number }>>(new Map());

  // ── Fetch vote summaries ──────────────────────────────────────────────────
  useEffect(() => {
    if (!diagnosticId) return;
    fetchVoteSummaries(diagnosticId, '').then((data) => {
      const slim = new Map<string, { average: number; count: number }>();
      data.forEach((s, spId) => slim.set(spId, { average: s.average, count: s.count }));
      setVoteSummaries(slim);
    }).catch((err) => console.error('[RankingScreen] Failed to fetch vote summaries:', err));
  }, [diagnosticId]);

  // ── Debounced recalculate on override changes ─────────────────────────────
  useEffect(() => {
    const hasAnyOverride = Object.values(subprocessOverrides).some(
      (o) => (o.people && o.people.trim() !== '') || (o.hourlyCost && o.hourlyCost.trim() !== ''),
    );
    if (!hasAnyOverride) {
      setRefinedImpact(null);
      setPerSubprocessRefined({});
      return;
    }
    if (recalcDebounce.current) clearTimeout(recalcDebounce.current);
    recalcDebounce.current = setTimeout(() => {
      handleRecalculate();
    }, 400);
    return () => {
      if (recalcDebounce.current) clearTimeout(recalcDebounce.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subprocessOverrides]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const ranked      = buildRanking(assessments);
  const summary     = buildPrioritySummary(ranked);
  const insights    = buildInsights(ranked);
  const autoRoadmap = buildAutomationRoadmap(assessments, voteSummaries.size > 0 ? voteSummaries : undefined);

  const totalAnnualHours     = assessments.reduce((s, a) => s + a.annualHours, 0);
  const totalSavingsHours    = assessments.reduce((s, a) => s + a.automationSavingsHours, 0);
  const totalFinancialImpact = assessments.reduce((s, a) => s + a.financialImpact, 0);
  const totalFteEquivalent   = Math.round((totalSavingsHours / FTE_HOURS_YEAR) * 10) / 10;

  const dispSavingsHours    = refinedImpact?.savingsHours    ?? totalSavingsHours;
  const dispFteEquivalent   = refinedImpact?.fteEquivalent   ?? totalFteEquivalent;
  const dispFinancialImpact = refinedImpact?.financialImpact ?? totalFinancialImpact;
  const dispHourlyCost      = refinedImpact?.hourlyCost      ?? DEFAULT_HOURLY_COST;
  const dispSavingsHorasMes = dispSavingsHours / 12;

  // suppress unused vars used by PDF toolchain
  void totalAnnualHours; void insights; void getAutomationRate; void TrendingUp; void Target; void Pencil; void ChevronDown; void Tooltip;

  // ── Matrix quadrant definitions ───────────────────────────────────────────
  const impactValues = ranked.map((r) => r.impactScore);
  const sortedImpact = [...impactValues].sort((a, b) => a - b);
  const midIdx       = Math.floor(sortedImpact.length / 2);
  const medianImpact = sortedImpact.length === 0 ? 0
    : sortedImpact.length % 2 !== 0
      ? sortedImpact[midIdx]
      : (sortedImpact[midIdx - 1] + sortedImpact[midIdx]) / 2;

  const quadrants = [
    {
      label: 'Prioridade Imediata',
      desc:  'Alto potencial de automação + alto impacto operacional',
      filter: (r: RankedAssessment) => r.automationScore >= 60 && r.impactScore >= medianImpact,
      bg: 'bg-red-50', border: 'border-red-200', title: 'text-red-700',
      badge: 'bg-red-100 text-red-700 border-red-200',
    },
    {
      label: 'Vitórias Rápidas',
      desc:  'Alto potencial de automação + menor volume de horas',
      filter: (r: RankedAssessment) => r.automationScore >= 60 && r.impactScore < medianImpact,
      bg: 'bg-orange-50', border: 'border-orange-200', title: 'text-orange-700',
      badge: 'bg-orange-100 text-orange-700 border-orange-200',
    },
    {
      label: 'Avaliar Engenharia / Integração',
      desc:  'Alto impacto operacional, mas automação mais complexa',
      filter: (r: RankedAssessment) => r.automationScore < 60 && r.impactScore >= medianImpact,
      bg: 'bg-blue-50', border: 'border-blue-200', title: 'text-blue-700',
      badge: 'bg-blue-100 text-blue-700 border-blue-200',
    },
    {
      label: 'Baixa Prioridade',
      desc:  'Baixo potencial de automação e baixo impacto operacional',
      filter: (r: RankedAssessment) => r.automationScore < 60 && r.impactScore < medianImpact,
      bg: 'bg-gray-50', border: 'border-gray-200', title: 'text-gray-600',
      badge: 'bg-gray-100 text-gray-600 border-gray-200',
    },
  ];

  // ── Roadmap phases ────────────────────────────────────────────────────────
  const fase1 = autoRoadmap.filter((r) => r.roadmapCategory === 'quick-wins');
  const fase2 = autoRoadmap.filter((r) => r.roadmapCategory === 'strategic' || r.roadmapCategory === 'transformation');
  const fase3 = autoRoadmap.filter((r) => r.roadmapCategory === 'low-priority');

  const phases = [
    {
      num: 1, label: 'Automação Rápida',
      icon: <Zap size={15} className="text-emerald-600" strokeWidth={1.75} />,
      bg: 'bg-emerald-50', border: 'border-emerald-200', title: 'text-emerald-700',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500',
      items: fase1,
    },
    {
      num: 2, label: 'Projetos Estruturantes',
      icon: <Layers size={15} className="text-blue-600" strokeWidth={1.75} />,
      bg: 'bg-blue-50', border: 'border-blue-200', title: 'text-blue-700',
      badge: 'bg-blue-100 text-blue-800 border-blue-200', dot: 'bg-blue-500',
      items: fase2,
    },
    {
      num: 3, label: 'Baixa Prioridade',
      icon: <Clock size={15} className="text-gray-500" strokeWidth={1.75} />,
      bg: 'bg-gray-50', border: 'border-gray-200', title: 'text-gray-600',
      badge: 'bg-gray-100 text-gray-700 border-gray-200', dot: 'bg-gray-400',
      items: fase3,
    },
  ];

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleRecalculate = () => {
    const newPerSubprocess: typeof perSubprocessRefined = {};
    let newAnnualTotal    = 0;
    let newSavingsTotal   = 0;
    let newFinancialTotal = 0;

    assessments.forEach((a) => {
      const override      = subprocessOverrides[a.subprocessId];
      const newAnnual     = a.annualHours;
      const rawSpCost     = parseFloat(override?.hourlyCost ?? '');
      const effectiveCost = (!isNaN(rawSpCost) && rawSpCost > 0) ? rawSpCost : DEFAULT_HOURLY_COST;

      const newSavings         = calculateAutomationSavings(newAnnual, a.automationScore, a.scores.processStability);
      const fteSp              = calculateFteEquivalent(newSavings);
      const fteCurrentSp       = calculateFteCurrent(newAnnual);
      const fteAfterAutoSp     = calculateFteAfterAutomation(fteCurrentSp, fteSp);
      const financialSp        = Math.round(newSavings * effectiveCost);

      newPerSubprocess[a.subprocessId] = {
        annualHours:        newAnnual,
        savingsHours:       newSavings,
        fteEquivalent:      fteSp,
        financialImpact:    financialSp,
        hourlyCost:         effectiveCost,
        fteCurrent:         fteCurrentSp,
        fteAfterAutomation: fteAfterAutoSp,
      };

      newAnnualTotal    += newAnnual;
      newSavingsTotal   += newSavings;
      newFinancialTotal += financialSp;
    });

    const fteEquivalent      = calculateFteEquivalent(newSavingsTotal);
    const fteCurrent         = calculateFteCurrent(newAnnualTotal);
    const fteAfterAutomation = calculateFteAfterAutomation(fteCurrent, fteEquivalent);
    const capacityGain       = newAnnualTotal > 0
      ? Math.round((newSavingsTotal / newAnnualTotal) * 100)
      : 0;

    setPerSubprocessRefined(newPerSubprocess);
    setRefinedImpact({
      annualHours:       newAnnualTotal,
      savingsHours:      newSavingsTotal,
      fteEquivalent,
      capacityGain,
      financialImpact:   newFinancialTotal,
      hourlyCost:        DEFAULT_HOURLY_COST,
      fteCurrent,
      fteAfterAutomation,
    });
  };

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
          refinedImpact={refinedImpact ?? undefined}
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
      company:        idForm.company.trim(),
      area:           idForm.area.trim(),
      respondentName: idForm.respondentName.trim(),
      email:          idForm.email.trim(),
    };
    const generatedAt = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
    setSavedIdentification(identification);
    setShowIdModal(false);
    await generatePDF(identification, generatedAt);
  };

  const field = (key: keyof IdForm, label: string, placeholder: string, type = 'text') => (
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

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto px-6 py-10">

      {/* ── Identification modal ───────────────────────────────────────── */}
      {showIdModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-bold text-gray-900">Identificação do relatório</h3>
              <button onClick={() => setShowIdModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              Preencha os dados abaixo para personalizar o relatório PDF.
            </p>
            <div className="space-y-4">
              {field('company',        'Empresa',             'Nome da empresa')}
              {field('area',           'Área',                'Ex: Financeiro, RH, Logística')}
              {field('respondentName', 'Nome do respondente', 'Seu nome completo')}
              {field('email',          'E-mail',              'seu@email.com', 'email')}
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

      {/* ── Share report modal ────────────────────────────────────────── */}
      {showShareModal && diagnosticId && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setShowShareModal(false); }}
        >
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-bold text-gray-900">Compartilhar relatório</h3>
              <button onClick={() => setShowShareModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-5">
              Qualquer pessoa com este link pode visualizar o relatório e votar na prioridade dos subprocessos.
              Nenhum login é necessário.
            </p>
            <div className="flex gap-2">
              <input
                readOnly
                value={typeof window !== 'undefined'
                  ? `${window.location.origin}/diagnostic/${diagnosticId}/report`
                  : ''}
                className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm font-mono bg-gray-50 text-gray-700"
              />
              <button
                onClick={() => {
                  const link = `${window.location.origin}/diagnostic/${diagnosticId}/report`;
                  navigator.clipboard.writeText(link);
                  setShareLinkCopied(true);
                  setTimeout(() => setShareLinkCopied(false), 2000);
                }}
                className="bg-gray-900 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
              >
                Copiar link
              </button>
            </div>
            {shareLinkCopied && (
              <p className="text-emerald-600 text-xs mt-2">Link copiado!</p>
            )}
          </div>
        </div>
      )}

      {/* ── Header com ações ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-xl font-bold text-blue-600">
            Oportunidades de Eficiência Operacional
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            {assessments.length} subprocesso{assessments.length !== 1 ? 's' : ''} avaliado{assessments.length !== 1 ? 's' : ''}
            {savedIdentification?.company && (
              <span> · <span className="text-gray-600">{savedIdentification.company}</span></span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowIdModal(true)}
            disabled={generatingPdf}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            <FileDown size={14} strokeWidth={1.75} />
            {generatingPdf ? 'Gerando...' : 'Exportar PDF'}
          </button>
          {diagnosticId && (
            <button
              onClick={() => setShowShareModal(true)}
              className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-medium px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Compartilhar
            </button>
          )}
          {diagnosticId && (
            <Link
              href={`/diagnostic/${diagnosticId}/vote`}
              className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-medium px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Votar
            </Link>
          )}
          <button
            onClick={onRestart}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-600 font-medium px-3 py-2 text-sm transition-colors"
          >
            <RotateCcw size={14} strokeWidth={1.75} />
            Novo diagnóstico
          </button>
        </div>
      </div>

      {/* ── 3 cards de métricas ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">

        {/* Card 1 — Horas */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Clock size={15} className="text-blue-600" strokeWidth={1.75} />
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Impacto Operacional
            </p>
          </div>
          <p className="text-3xl font-extrabold text-gray-900">
            {fmt(dispSavingsHours)} <span className="text-sm font-medium text-gray-500">h/ano</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">
            ≈ {fmtD(dispSavingsHorasMes)} horas / mês
          </p>
        </div>

        {/* Card 2 — Financeiro */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
              <DollarSign size={15} className="text-amber-600" strokeWidth={1.75} />
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Impacto Financeiro
            </p>
          </div>
          <p className="text-3xl font-extrabold text-gray-900">
            {fmtFinancial(dispFinancialImpact)} <span className="text-sm font-medium text-gray-500">/ano</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">
            custo base R${dispHourlyCost}/h
          </p>
        </div>

        {/* Card 3 — FTE */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <Activity size={15} className="text-emerald-600" strokeWidth={1.75} />
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Redução de FTE
            </p>
          </div>
          <p className="text-3xl font-extrabold text-emerald-600">
            ≈ {fmtFte(dispFteEquivalent)} <span className="text-sm font-medium text-gray-500">FTE/ano</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">
            1 FTE = {fmt(FTE_HOURS_YEAR)} h/ano
          </p>
        </div>
      </div>

      {/* ── Ranking ─────────────────────────────────────────────────────── */}
      <div className={CARD}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-800">
            Ranking de Potencial de Automação
          </h3>
          <p className="text-xs text-gray-400 hidden sm:block">
            Edite pessoas ou custo/h — valores recalculam automaticamente
          </p>
        </div>

        {/* Mobile: cards */}
        <div className="block md:hidden space-y-3">
          {ranked.map((item) => {
            const badge      = getPriorityBadge(item.priorityScore);
            const refined    = perSubprocessRefined[item.subprocessId];
            const dispSavings = refined?.savingsHours ?? item.automationSavingsHours;
            const spOverride = subprocessOverrides[item.subprocessId] ?? { people: '', hourlyCost: '' };
            return (
              <div key={item.subprocessId} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400">#{item.rank}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-gray-900 mt-1">{item.subprocessName}</h4>
                    <p className="text-xs text-gray-400">{item.macroprocessName} · {fmt(dispSavings)} h economizadas/ano</p>
                  </div>
                  <p className="text-sm font-bold text-gray-900 shrink-0">
                    {fmtFinancial(refined?.financialImpact ?? item.financialImpact)}
                  </p>
                </div>
                <div className="flex gap-3 mt-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-400">Pessoas</span>
                    <input
                      type="number" min="1"
                      value={spOverride.people}
                      onChange={(e) => setSubprocessOverrides((prev) => ({
                        ...prev,
                        [item.subprocessId]: {
                          ...(prev[item.subprocessId] ?? { people: '', hourlyCost: '' }),
                          people: e.target.value,
                        },
                      }))}
                      placeholder={String(PEOPLE_MAP[item.scores.peopleInvolved] ?? '')}
                      className="w-14 border border-gray-300 rounded-lg px-2 py-1 text-xs text-center text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder:text-gray-400 bg-gray-50"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-400">R$/h</span>
                    <input
                      type="number" min="1"
                      value={spOverride.hourlyCost}
                      onChange={(e) => setSubprocessOverrides((prev) => ({
                        ...prev,
                        [item.subprocessId]: {
                          ...(prev[item.subprocessId] ?? { people: '', hourlyCost: '' }),
                          hourlyCost: e.target.value,
                        },
                      }))}
                      placeholder={String(DEFAULT_HOURLY_COST)}
                      className="w-14 border border-gray-300 rounded-lg px-2 py-1 text-xs text-center text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder:text-gray-400 bg-gray-50"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop: table */}
        <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm" style={{ minWidth: 600 }}>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 w-10">#</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">Subprocesso</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 w-24">Economia</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 w-20">Pessoas</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 w-20">Custo/h</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((item, i) => {
                const badge      = getPriorityBadge(item.priorityScore);
                const spOverride = subprocessOverrides[item.subprocessId] ?? { people: '', hourlyCost: '' };
                const refined    = perSubprocessRefined[item.subprocessId];
                const dispSavings = refined?.savingsHours ?? item.automationSavingsHours;
                const spVolume   = VOLUME_MAP[item.scores.operationalVolume] ?? 0;
                const spTime     = TIME_MAP[item.scores.executionTime] ?? 0;

                return (
                  <tr key={item.subprocessId} className={i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}>

                    {/* Rank */}
                    <td className="px-3 py-3 text-center font-bold text-gray-400 text-xs">
                      {item.rank}
                    </td>

                    {/* Subprocesso + badge + detalhes */}
                    <td className="px-3 py-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{item.subprocessName}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge.color}`}>
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-gray-400 mt-0.5">
                        {item.macroprocessName} · {fmt(dispSavings)} h economizadas/ano
                      </p>
                      <details className="mt-1">
                        <summary className="text-[10px] text-blue-500 cursor-pointer hover:text-blue-700 list-none">
                          Ver detalhes do subprocesso
                        </summary>
                        <div className="mt-1 text-[10px] text-gray-400 bg-gray-50 rounded-md px-3 py-2">
                          Volume: {fmt(spVolume)}/mês · Tempo médio: {spTime} min
                        </div>
                      </details>
                    </td>

                    {/* Economia */}
                    <td className="px-3 py-3 text-right font-semibold text-gray-800 text-xs">
                      {fmtFinancial(refined?.financialImpact ?? item.financialImpact)}
                    </td>

                    {/* Pessoas */}
                    <td className="px-3 py-3 text-center">
                      <input
                        type="number" min="1"
                        value={spOverride.people}
                        onChange={(e) => setSubprocessOverrides((prev) => ({
                          ...prev,
                          [item.subprocessId]: {
                            ...(prev[item.subprocessId] ?? { people: '', hourlyCost: '' }),
                            people: e.target.value,
                          },
                        }))}
                        placeholder={String(PEOPLE_MAP[item.scores.peopleInvolved] ?? '')}
                        className="w-16 border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-center text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder:text-gray-400 bg-gray-50"
                      />
                    </td>

                    {/* Custo/h */}
                    <td className="px-3 py-3 text-center">
                      <input
                        type="number" min="1"
                        value={spOverride.hourlyCost}
                        onChange={(e) => setSubprocessOverrides((prev) => ({
                          ...prev,
                          [item.subprocessId]: {
                            ...(prev[item.subprocessId] ?? { people: '', hourlyCost: '' }),
                            hourlyCost: e.target.value,
                          },
                        }))}
                        placeholder={String(DEFAULT_HOURLY_COST)}
                        className="w-16 border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-center text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder:text-gray-400 bg-gray-50"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {Object.keys(perSubprocessRefined).length > 0 && (
          <p className="text-xs text-blue-500 mt-3">
            * Valores recalculados com premissas ajustadas
          </p>
        )}
      </div>

      {/* ── Matriz de Priorização ───────────────────────────────────────── */}
      <div className={CARD}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-gray-800">
              Matriz de Priorização de Automação
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Eixo X: potencial de automação · Eixo Y: impacto operacional
            </p>
          </div>
          {/* Distribuição consolidada */}
          <div className="flex gap-3 shrink-0">
            <div className="text-center">
              <p className="text-lg font-bold text-red-600">{summary.alta}</p>
              <p className="text-[10px] text-gray-400">alta</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-orange-500">{summary.media}</p>
              <p className="text-[10px] text-gray-400">média</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-400">{summary.baixa}</p>
              <p className="text-[10px] text-gray-400">baixa</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {quadrants.map(({ label, desc, filter, bg, border, title, badge }) => {
            const items = ranked.filter(filter);
            return (
              <div key={label} className={`rounded-xl border p-4 ${bg} ${border}`}>
                <div className={`text-xs font-bold uppercase tracking-wide mb-1 ${title}`}>{label}</div>
                <p className="text-xs text-gray-400 mb-3 leading-snug">{desc}</p>
                {items.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Nenhum processo</p>
                ) : (
                  <div className="space-y-1.5">
                    {items.map((r) => (
                      <div key={r.subprocessId} className="flex items-center justify-between gap-2 bg-white/80 rounded-lg px-3 py-1.5">
                        <span className="text-xs text-gray-800 font-medium truncate">{r.subprocessName}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0 ${badge}`}>
                          {r.priorityScore}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Plano de Automação por Fases ────────────────────────────────── */}
      {autoRoadmap.length > 0 && (
        <div className={CARD}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-800">
              Plano de Automação por Fases
            </h3>
            <p className="text-xs text-gray-400">
              Gerado com base na matriz de impacto e facilidade
            </p>
          </div>

          <div className="space-y-4">
            {phases.every((p) => p.items.length === 0) && (
              <p className="text-sm text-gray-400 italic">
                Nenhum subprocesso classificado no roadmap.
              </p>
            )}
            {phases.filter((phase) => phase.items.length > 0).map((phase) => (
              <div key={phase.num} className={`rounded-xl border p-4 ${phase.bg} ${phase.border}`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${phase.dot}`}>
                    {phase.num}
                  </div>
                  {phase.icon}
                  <span className={`text-sm font-bold ${phase.title}`}>
                    Fase {phase.num} — {phase.label}
                  </span>
                  <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full border ${phase.badge}`}>
                    {phase.items.length} subprocesso{phase.items.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="grid grid-cols-12 gap-2 px-3 pb-1 border-b border-black/5">
                    <span className="col-span-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Subprocesso</span>
                    <span className="col-span-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wide text-center">Horas econ.</span>
                    <span className="col-span-4 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Tecnologia</span>
                  </div>
                  {phase.items.map((item) => (
                    <div key={item.subprocessId} className="grid grid-cols-12 gap-2 items-center bg-white/70 rounded-lg px-3 py-2">
                      <div className="col-span-5">
                        <p className="text-xs font-medium text-gray-800">{item.subprocessName}</p>
                        <p className="text-[10px] text-gray-400">{item.processName}</p>
                      </div>
                      <div className="col-span-3 text-center">
                        <span className="text-sm font-bold text-gray-700">
                          {item.savingsHours.toLocaleString('pt-BR')}
                        </span>
                        <span className="text-[10px] text-gray-400 ml-0.5">h</span>
                      </div>
                      <div className="col-span-4">
                        <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${phase.badge}`}>
                          {item.suggestedTechnology}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Rodapé com premissas ────────────────────────────────────────── */}
      <p className="text-center text-xs text-gray-400 mt-2">
        Premissas: custo base R${dispHourlyCost}/h · 1 FTE = {fmt(FTE_HOURS_YEAR)} h/ano · Gerado em {new Date().toLocaleDateString('pt-BR')}
      </p>

    </div>
  );
}
