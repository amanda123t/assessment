'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Trophy, FileDown, RotateCcw, Activity,
  Lightbulb, TrendingUp, DollarSign, Target, ChevronDown, X, Pencil,
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

// suppress unused-import warning for normalizeScore (used by downstream PDF toolchain)
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

function getAutomationPotential(score: number): { label: string; color: string } {
  if (score >= 18) return { label: 'Muito Alto', color: 'text-red-600 bg-red-50 border-red-200' };
  if (score >= 15) return { label: 'Alto',       color: 'text-orange-600 bg-orange-50 border-orange-200' };
  if (score >= 12) return { label: 'Médio',      color: 'text-amber-800 bg-amber-100 border-amber-300' };
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

// ─── Navigation sections ─────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'resumo',  label: 'Resumo' },
  { id: 'ranking', label: 'Ranking' },
  { id: 'roadmap', label: 'Roadmap' },
  { id: 'acoes',   label: 'Ações' },
] as const;

// ─── Roadmap label maps ──────────────────────────────────────────────────────

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
  const [activeSection, setActiveSection] = useState('resumo');
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [showIdModal, setShowIdModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [idForm, setIdForm] = useState<IdForm>(EMPTY_FORM);
  const [savedIdentification, setSavedIdentification] = useState<AssessmentIdentification | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [refinedImpact, setRefinedImpact] = useState<{
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

  // ── IntersectionObserver for active section highlight ────────────────────
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: '-20% 0px -70% 0px' },
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

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
  const ranked    = buildRanking(assessments);
  const summary   = buildPrioritySummary(ranked);
  const insights  = buildInsights(ranked);
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

  // ── Matrix quadrant definitions ───────────────────────────────────────────
  const impactValues  = ranked.map((r) => r.impactScore);
  const sortedImpact  = [...impactValues].sort((a, b) => a - b);
  const midIdx        = Math.floor(sortedImpact.length / 2);
  const medianImpact  = sortedImpact.length === 0 ? 0
    : sortedImpact.length % 2 !== 0
      ? sortedImpact[midIdx]
      : (sortedImpact[midIdx - 1] + sortedImpact[midIdx]) / 2;

  const quadrants = [
    {
      label: 'Prioridade Imediata',
      desc: 'Alto potencial de automação + alto impacto operacional',
      filter: (r: RankedAssessment) => r.automationScore >= 60 && r.impactScore >= medianImpact,
      bg: 'bg-red-50', border: 'border-red-200', title: 'text-red-700',
      badge: 'bg-red-100 text-red-700 border-red-200',
    },
    {
      label: 'Vitórias Rápidas',
      desc: 'Alto potencial de automação + menor volume de horas',
      filter: (r: RankedAssessment) => r.automationScore >= 60 && r.impactScore < medianImpact,
      bg: 'bg-orange-50', border: 'border-orange-200', title: 'text-orange-700',
      badge: 'bg-orange-100 text-orange-700 border-orange-200',
    },
    {
      label: 'Avaliar Engenharia / Integração',
      desc: 'Alto impacto operacional, mas automação mais complexa',
      filter: (r: RankedAssessment) => r.automationScore < 60 && r.impactScore >= medianImpact,
      bg: 'bg-blue-50', border: 'border-blue-200', title: 'text-blue-700',
      badge: 'bg-blue-100 text-blue-700 border-blue-200',
    },
    {
      label: 'Baixa Prioridade',
      desc: 'Baixo potencial de automação e baixo impacto operacional',
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
      desc: 'Automatizações que podem ser implementadas rapidamente com tecnologias simples.',
      icon: <Zap size={15} className="text-emerald-600" strokeWidth={1.75} />,
      bg: 'bg-emerald-50', border: 'border-emerald-200', title: 'text-emerald-700',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500',
      items: fase1,
    },
    {
      num: 2, label: 'Projetos Estruturantes',
      desc: 'Automação que exige integração sistêmica ou workflow.',
      icon: <Layers size={15} className="text-blue-600" strokeWidth={1.75} />,
      bg: 'bg-blue-50', border: 'border-blue-200', title: 'text-blue-700',
      badge: 'bg-blue-100 text-blue-800 border-blue-200', dot: 'bg-blue-500',
      items: fase2,
    },
    {
      num: 3, label: 'Baixa Prioridade',
      desc: 'Automação não prioritária no curto e médio prazo.',
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
      const override = subprocessOverrides[a.subprocessId];

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

      {/* ── Compact header ────────────────────────────────────────────── */}
      <div className="mb-2">
        <h2 className="text-xl font-bold text-gray-900">Diagnóstico de Automação</h2>
        <p className="text-sm text-gray-400 mt-1">
          {assessments.length} subprocesso{assessments.length !== 1 ? 's' : ''} avaliado{assessments.length !== 1 ? 's' : ''}
          {savedIdentification?.company && (
            <span> · <span className="text-gray-600">{savedIdentification.company}</span></span>
          )}
          {savedIdentification?.area && (
            <span> · {savedIdentification.area}</span>
          )}
        </p>
      </div>

      {/* ── Sticky section nav ────────────────────────────────────────── */}
      <nav className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100 -mx-6 px-6 mb-8">
        <div className="flex gap-1">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' });
                setActiveSection(s.id);
              }}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeSection === s.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {s.label}
            </a>
          ))}
        </div>
      </nav>

      {/* ── Results content ───────────────────────────────────────────── */}
      <div id="diagnostic-results" style={{ color: '#111827', backgroundColor: '#ffffff' }}>

        {/* ════════════════════════════════════════ RESUMO ══════════════ */}
        <section id="resumo" className="scroll-mt-16 mb-10">

          {/* 3 metric cards */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">

            {/* Card 1 — Operational Impact */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <TrendingUp size={15} className="text-blue-600" strokeWidth={1.75} />
                </div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Impacto Operacional</p>
              </div>
              <p className="text-3xl font-extrabold text-gray-900">{fmt(dispSavingsHours)}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                horas automatizáveis / ano
                {(refinedImpact?.annualHours ?? totalAnnualHours) > 0 && (
                  <span className="text-blue-600 font-semibold ml-1">
                    ({Math.round((dispSavingsHours / (refinedImpact?.annualHours ?? totalAnnualHours)) * 100)}% do total)
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                ≈ <span className="font-semibold text-gray-600">{fmtD(dispSavingsHorasMes)}</span> horas / mês
              </p>
            </div>

            {/* Card 2 — Financial Impact */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <DollarSign size={15} className="text-amber-600" strokeWidth={1.75} />
                </div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Impacto Financeiro (cenário)</p>
              </div>
              <p className="text-2xl font-extrabold text-gray-900">{fmtCurrency(dispFinancialImpact)}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                estimativa anual · custo base R${dispHourlyCost}/h
              </p>
            </div>

            {/* Card 3 — FTE */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <Activity size={15} className="text-emerald-600" strokeWidth={1.75} />
                </div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Redução Potencial de{' '}
                  <Tooltip content="Full-Time Equivalent — unidade que representa o trabalho de uma pessoa em tempo integral (1.760 horas/ano)">FTE</Tooltip>
                </p>
              </div>
              <p className="text-3xl font-extrabold text-emerald-600">≈ {fmtD(dispFteEquivalent)} FTE</p>
              <p className="text-xs text-gray-500 mt-0.5">liberáveis com automação</p>
              <p className="text-[10px] text-gray-400 mt-1">1 FTE = {fmt(FTE_HOURS_YEAR)} h/ano</p>
            </div>

          </div>

          {/* Matriz 2x2 — only when >= 3 subprocessos */}
          {assessments.length >= 3 && (
            <div className="mt-6">
              <section className={CARD}>
                <h3 className="text-base font-semibold text-gray-800 mb-1 flex items-center gap-2">
                  <Target size={16} className="text-blue-600" strokeWidth={1.75} />
                  Matriz de Priorização de Automação
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  Eixo X: potencial de automação (0–100) · Eixo Y: impacto operacional (0–100) · limiar Y = mediana do dataset
                </p>
                {(() => {
                  const quadrantData = quadrants.map((q) => ({
                    ...q,
                    items: ranked.filter(q.filter),
                  }));
                  const nonEmpty  = quadrantData.filter((q) => q.items.length > 0);
                  const showAll   = nonEmpty.length <= 1;
                  const toRender  = showAll ? quadrantData : nonEmpty;
                  return (
                    <div className={`grid gap-4 ${toRender.length <= 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2'}`}>
                      {toRender.map(({ label, desc, items, bg, border, title: titleColor, badge }) => (
                        <div key={label} className={`rounded-xl border p-4 ${bg} ${border}`}>
                          <div className={`text-xs font-bold uppercase tracking-wide mb-1 ${titleColor}`}>{label}</div>
                          <p className="text-xs text-gray-400 mb-3 leading-snug">{desc}</p>
                          {items.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">Nenhum processo nesta categoria</p>
                          ) : (
                            <ul className="space-y-2">
                              {items.map((r) => (
                                <li key={r.subprocessId} className="flex items-center justify-between gap-2">
                                  <span className="text-xs text-gray-800 leading-snug flex-1">{r.subprocessName}</span>
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${badge}`}>{r.automationScore}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </section>
            </div>
          )}

        </section>

        {/* ════════════════════════════════════════ RANKING ═════════════ */}
        <section id="ranking" className="scroll-mt-16 mb-10">
          <section className={CARD}>
            <h3 className="text-base font-semibold text-gray-800 mb-1 flex items-center gap-2">
              <Trophy size={16} className="text-blue-600" strokeWidth={1.75} />
              Ranking de Potencial de Automação
            </h3>
            <div className="flex items-start gap-2 mb-4 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
              <Pencil size={13} className="text-blue-500 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
              <p className="text-xs text-blue-700 leading-relaxed">
                Edite <span className="font-semibold">pessoas</span> ou <span className="font-semibold">custo/h</span> diretamente na tabela — os cards acima atualizam automaticamente.
              </p>
            </div>

            {/* Mobile: cards */}
            <div className="block md:hidden space-y-3 mb-4">
              {ranked.map((item) => {
                const potential   = getAutomationPotential(item.totalScore);
                const refined     = perSubprocessRefined[item.subprocessId];
                const dispSavings = refined?.savingsHours ?? item.automationSavingsHours;
                return (
                  <div key={item.subprocessId} className="bg-white rounded-xl border border-gray-100 p-4">
                    <div className="flex items-start justify-between mb-2 gap-2">
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-gray-500">#{item.rank}</span>
                        <h4 className="text-sm font-semibold text-gray-900 mt-0.5 leading-snug">{item.subprocessName}</h4>
                        <p className="text-xs text-gray-500 truncate">{item.processName}</p>
                      </div>
                      <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full border ${potential.color}`}>
                        {potential.label}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">{fmt(dispSavings)} h/ano economizáveis</div>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <div className="text-center">
                        <p className={`text-lg font-bold ${item.priorityScore >= 70 ? 'text-red-600' : item.priorityScore >= 50 ? 'text-orange-500' : 'text-gray-500'}`}>
                          {item.priorityScore}<span className="text-xs font-normal text-gray-400">/100</span>
                        </p>
                        <p className="text-[11px] text-gray-500">prioridade</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-blue-600">
                          {item.automationScore}<span className="text-xs font-normal text-gray-400">/100</span>
                        </p>
                        <p className="text-[11px] text-gray-500">automação</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-violet-600">
                          {item.impactScore}<span className="text-xs font-normal text-gray-400">/100</span>
                        </p>
                        <p className="text-[11px] text-gray-500">impacto</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop: table */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm" style={{ minWidth: 720 }}>
                <thead className="sticky top-12 z-10">
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 w-10">Rank</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">Subprocesso</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 w-36">Horas / Automação</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 w-32">Prioridade / Automação / Impacto</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 w-24">Potencial</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 w-24">Pessoas</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 w-24">Custo/h</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((item, i) => {
                    const potential   = getAutomationPotential(item.totalScore);
                    const spOverride  = subprocessOverrides[item.subprocessId] ?? { people: '', hourlyCost: '' };
                    const refined     = perSubprocessRefined[item.subprocessId];
                    const dispSavings = refined?.savingsHours ?? item.automationSavingsHours;

                    const isSpPeople  = !!spOverride.people;
                    const spPeople    = spOverride.people
                      ? parseFloat(spOverride.people)
                      : (PEOPLE_MAP[item.scores.peopleInvolved] ?? 0);
                    const spVolume    = VOLUME_MAP[item.scores.operationalVolume] ?? 0;
                    const spTime      = TIME_MAP[item.scores.executionTime]       ?? 0;
                    const spAnnual    = refined?.annualHours ?? item.annualHours;
                    const spHorasMes  = spAnnual / 12;
                    const spFte       = refined?.fteCurrent  ?? calculateFteCurrent(item.annualHours);
                    const automationPct = Math.round(getAutomationRate(item.automationScore) * 100);

                    return (
                      <tr
                        key={item.subprocessId}
                        className={`${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'} ${
                          i === 0 ? 'border-l-4 border-l-blue-500' : ''
                        }`}
                      >
                        {/* Rank */}
                        <td className="px-3 py-2.5 text-center font-bold text-gray-500 text-xs">{item.rank}</td>

                        {/* Name + collapsible calculation details */}
                        <td className="px-3 py-2.5 text-gray-900 text-xs">
                          <div className="font-medium">{item.subprocessName}</div>
                          <details className="mt-1 group">
                            <summary className="text-[10px] text-blue-500 cursor-pointer hover:text-blue-700 list-none flex items-center gap-1">
                              <ChevronDown size={10} className="group-open:rotate-180 transition-transform" />
                              ver detalhes do cálculo
                            </summary>
                            <div className="mt-1 text-[10px] text-gray-400 space-y-0.5">
                              <div className="flex flex-wrap gap-x-2">
                                <span>Vol: <span className="text-gray-500">{fmt(spVolume)}/mês</span></span>
                                <span>· Tempo: <span className="text-gray-500">{spTime} min</span></span>
                                <span>· Pessoas: <span className={isSpPeople ? 'text-blue-500' : 'text-gray-500'}>{fmtD(spPeople)}</span></span>
                              </div>
                              <div className="flex flex-wrap gap-x-2 text-gray-400">
                                <span>≈ {fmtD(spHorasMes)} h/mês</span>
                                <span>· ≈ {fmt(spAnnual)} h/ano</span>
                                <span>· ≈ {fmtD(spFte)} <Tooltip content="Full-Time Equivalent — unidade que representa o trabalho de uma pessoa em tempo integral (1.760 horas/ano)">FTE</Tooltip></span>
                              </div>
                              <div className="text-indigo-500 font-medium">
                                Automação estimada: {automationPct}%
                              </div>
                            </div>
                          </details>
                        </td>

                        {/* Horas totais / % automatizável / Horas automatizáveis */}
                        <td className="px-3 py-2.5 text-center text-xs text-gray-700">
                          <div className="space-y-0.5">
                            <div className="text-gray-500">{fmt(spAnnual)} h/ano</div>
                            <div className="text-indigo-500 font-medium">{automationPct}% autom.</div>
                            <div className="font-semibold text-gray-800">
                              {fmt(dispSavings)} h autom.
                              {refined && <span className="ml-1 text-blue-400 font-bold">*</span>}
                            </div>
                          </div>
                        </td>

                        {/* Prioridade / Automação / Impacto */}
                        <td className="px-3 py-2.5 text-center text-xs">
                          <div className="space-y-0.5">
                            <div className={`font-bold ${item.priorityScore >= 70 ? 'text-red-600' : item.priorityScore >= 50 ? 'text-orange-500' : 'text-gray-500'}`}>
                              {item.priorityScore}<span className="font-normal text-gray-400">/100</span>
                              <span className="text-gray-400 font-normal"> prioridade</span>
                            </div>
                            <div className="text-blue-600 font-medium">{item.automationScore}/100 automação</div>
                            <div className="text-violet-600 font-medium">{item.impactScore}/100 impacto</div>
                          </div>
                        </td>

                        {/* Potencial */}
                        <td className="px-3 py-2.5 text-center">
                          <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full border ${potential.color}`}>
                            {potential.label}
                          </span>
                        </td>

                        {/* Pessoas */}
                        <td className="px-3 py-2 text-center">
                          <input
                            type="number"
                            min="1"
                            value={spOverride.people}
                            onChange={(e) =>
                              setSubprocessOverrides((prev) => ({
                                ...prev,
                                [item.subprocessId]: { ...spOverride, people: e.target.value },
                              }))
                            }
                            placeholder={String(PEOPLE_MAP[item.scores.peopleInvolved] ?? '')}
                            className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder:text-gray-300 bg-white"
                          />
                        </td>

                        {/* Custo/h */}
                        <td className="px-3 py-2 text-center">
                          <input
                            type="number"
                            min="1"
                            value={spOverride.hourlyCost}
                            onChange={(e) =>
                              setSubprocessOverrides((prev) => ({
                                ...prev,
                                [item.subprocessId]: { ...spOverride, hourlyCost: e.target.value },
                              }))
                            }
                            placeholder={String(DEFAULT_HOURLY_COST)}
                            className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder:text-gray-300 bg-white"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </section>
        </section>

        {/* ════════════════════════════════════════ ROADMAP ═════════════ */}
        <section id="roadmap" className="scroll-mt-16 mb-10">

          {/* Plano de Automação por Fases */}
          {autoRoadmap.length > 0 && (
            <section className={CARD}>
              <h3 className="text-base font-semibold text-gray-800 mb-1 flex items-center gap-2">
                <Zap size={16} className="text-blue-600" strokeWidth={1.75} />
                Plano de Automação por Fases
              </h3>
              <p className="text-xs text-gray-500 mb-5">
                Gerado automaticamente com base na matriz de impacto e facilidade de automação.
              </p>

              <div className="space-y-4">
                {phases.every((p) => p.items.length === 0) && (
                  <p className="text-sm text-gray-400 italic">
                    Nenhum subprocesso classificado no roadmap de automação.
                  </p>
                )}
                {phases.filter((phase) => phase.items.length > 0).map((phase) => (
                  <div key={phase.num} className={`rounded-xl border p-4 ${phase.bg} ${phase.border}`}>
                    <div className="flex items-center gap-2 mb-1">
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
                    <p className="text-xs text-gray-500 mb-3 pl-7">{phase.desc}</p>
                    <div className="space-y-2">
                      <div className="grid grid-cols-12 gap-2 px-3 pb-1 border-b border-black/5">
                        <span className="col-span-5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Subprocesso</span>
                        <span className="col-span-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide text-center">Horas econ./ano</span>
                        <span className="col-span-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Tecnologia sugerida</span>
                      </div>
                      {phase.items.map((item) => (
                        <div key={item.subprocessId} className="grid grid-cols-12 gap-2 items-center bg-white/70 rounded-lg px-3 py-2.5">
                          <div className="col-span-5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs font-medium text-gray-800 leading-snug">{item.subprocessName}</p>
                              {item.voteCount != null && item.voteCount > 0 && (
                                <span className="text-[10px] font-semibold text-amber-600 whitespace-nowrap">
                                  ⭐ {item.voteAverage!.toFixed(1)} ({item.voteCount} voto{item.voteCount !== 1 ? 's' : ''})
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-500 truncate">{item.processName}</p>
                          </div>
                          <div className="col-span-3 text-center">
                            <span className="text-sm font-bold text-gray-700">
                              {item.savingsHours.toLocaleString('pt-BR')}
                            </span>
                            <span className="text-[11px] text-gray-500 ml-0.5">h</span>
                          </div>
                          <div className="col-span-4">
                            <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border leading-snug ${phase.badge}`}>
                              {item.suggestedTechnology}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Distribuição de Prioridades — only when >= 3 subprocessos */}
          {assessments.length >= 3 && (
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
          )}

          {/* Insights — only when >= 3 subprocessos (guarded inside buildInsights) */}
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
                    {insights.map((insight, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                        <p className="text-sm text-gray-700 leading-relaxed">{insight}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

        </section>

        {/* ════════════════════════════════════════ AÇÕES ═══════════════ */}
        <section id="acoes" className="scroll-mt-16">
          <div className={CARD}>
            <h3 className="text-base font-semibold text-gray-800 mb-1">Próximos passos</h3>
            <p className="text-xs text-gray-400 mb-5">
              Exporte o relatório, compartilhe com sua equipe ou inicie um novo diagnóstico.
            </p>

            <div className="flex flex-wrap gap-3">
              {/* Primary — Export PDF */}
              <button
                onClick={() => setShowIdModal(true)}
                disabled={generatingPdf}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileDown size={14} strokeWidth={1.75} />
                {generatingPdf ? 'Gerando PDF...' : 'Exportar diagnóstico em PDF'}
              </button>

              {/* Secondary — Share */}
              {diagnosticId && (
                <button
                  onClick={() => setShowShareModal(true)}
                  className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors"
                >
                  <Zap size={14} strokeWidth={1.75} />
                  Compartilhar relatório
                </button>
              )}

              {/* Secondary — Vote */}
              {diagnosticId && (
                <Link
                  href={`/diagnostic/${diagnosticId}/vote`}
                  className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors"
                >
                  <Target size={14} strokeWidth={1.75} />
                  Votar prioridades
                </Link>
              )}

              {/* Tertiary — Restart */}
              <button
                onClick={onRestart}
                className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-600 font-medium px-4 py-2.5 text-sm transition-colors"
              >
                <RotateCcw size={14} strokeWidth={1.75} />
                Iniciar novo diagnóstico
              </button>
            </div>
          </div>
        </section>

      </div>{/* end #diagnostic-results */}

    </div>
  );
}
