import { SubprocessAssessment } from '@/types';

export type RoadmapCategory = 'quick-wins' | 'strategic' | 'transformation' | 'low-priority';

export interface RoadmapItem {
  subprocessId: string;
  subprocessName: string;
  macroprocessName: string;
  processName: string;
  automationScore: number;
  /** log(annualHours + 1) — normalized operational impact. */
  impactScore: number;
  /** Composite 0–100: proxy for implementation complexity derived from criteria scores. */
  effortScore: number;
  estimatedSavings: number;
  /** Automatable hours per year (mirrors SubprocessAssessment.automationSavingsHours). */
  savingsHours: number;
  /** automationScore × log(annualHours + 1) × voteBoost — composite priority metric. */
  priorityScore: number;
  roadmapCategory: RoadmapCategory;
  timeline: '0–3 meses' | '3–6 meses' | '6–12 meses';
  /** Technology recommendation derived from questionnaire scores. */
  suggestedTechnology: string;
  /** Matrix quadrant identifier — same logic as RankingScreen. */
  matrixQuadrant?: string;
  /** Mean stakeholder priority vote (1–5). Present only when votes exist. */
  voteAverage?: number;
  /** Number of stakeholder votes cast for this subprocess. */
  voteCount?: number;
}

/**
 * Suggest an automation technology based on questionnaire criteria scores.
 *
 * Rules (evaluated in priority order):
 *  - High manual data format + high volume → RPA (classic desktop automation)
 *  - High manual data format + long execution → RPA + OCR
 *  - Low standardization (decisions required) → IA Assistiva
 *  - High rework rate → Workflow + Regras de Negócio
 *  - Many systems (integration complexity) or partially digital + moderate time → API + Workflow
 *  - Fallback → Automação de Processos (BPA)
 */
export function suggestAutomationTechnology(a: SubprocessAssessment): string {
  const { dataDigitization, standardization, reworkRate, executionTime } = a.scores;

  if (dataDigitization >= 3 && a.scores.operationalVolume >= 3) return 'RPA';
  if (dataDigitization >= 3 && executionTime >= 3)              return 'RPA + OCR';
  if (standardization >= 3)                                     return 'IA Assistiva';
  if (reworkRate >= 3)                                          return 'Workflow + Regras de Negócio';
  if (a.scores.systemCount >= 3 || (dataDigitization === 2 && executionTime >= 2)) return 'API + Workflow';
  return 'Automação de Processos (BPA)';
}

/**
 * Effort proxy: combines rule variability, process instability, manual data
 * format and system fragmentation — all from existing criteria scores.
 * Less standardised + less stable + more manual + more systems → harder to automate.
 *
 * Raw range: min = (1*2 + 1*2 + 1*0.7 + 1*0.3) = 5, max = (4*2 + 4*2 + 4*0.7 + 4*0.3) = 20
 * Normalised to 0–100.
 */
export function calculateEffortScore(a: SubprocessAssessment): number {
  const raw =
    a.scores.standardization    * 2   +
    a.scores.processStability   * 2   +
    a.scores.dataDigitization   * 0.7 +  // manual data format → implementation effort
    a.scores.systemCount        * 0.3;   // system fragmentation → integration effort
  return Math.round(((raw - 5) / 15) * 100);
}

/**
 * Impact = automationScore (60%) + normalised financial savings (40%).
 * @param maxSavings  Maximum financialImpact across all assessments — used for normalisation.
 */
export function calculateImpactScore(a: SubprocessAssessment, maxSavings: number): number {
  const normalizedSavings =
    maxSavings > 0 ? Math.min((a.financialImpact / maxSavings) * 100, 100) : 0;
  return Math.round(a.automationScore * 0.6 + normalizedSavings * 0.4);
}

/**
 * Classify a subprocess into a roadmap phase derived directly from its matrix quadrant,
 * keeping the roadmap aligned with the matrix (single source of truth).
 *
 * Quadrant → Phase mapping:
 *   prioridade-imediata / vitorias-rapidas → quick-wins  (0–3 meses)
 *   avaliar-engenharia                     → strategic   (3–6 meses)
 *   baixa-prioridade                       → low-priority (6–12 meses)
 *
 * Vote promotion: voteAverage ≥ 4.0 and voteCount ≥ 3 promotes one phase up.
 */
function classifyPhase(
  matrixQuadrant: string,
  voteAverage?: number,
  voteCount?: number,
): Pick<RoadmapItem, 'roadmapCategory' | 'timeline'> {
  const voteBoost = (voteAverage ?? 0) >= 4.0 && (voteCount ?? 0) >= 3;

  let category: RoadmapCategory;
  switch (matrixQuadrant) {
    case 'prioridade-imediata':
    case 'vitorias-rapidas':
      category = 'quick-wins';
      break;
    case 'avaliar-engenharia':
      category = 'strategic';
      break;
    default:
      category = 'low-priority';
  }

  if (voteBoost) {
    if (category === 'strategic')       category = 'quick-wins';
    else if (category === 'low-priority') category = 'strategic';
  }

  const timeline: RoadmapItem['timeline'] =
    category === 'quick-wins' ? '0–3 meses' :
    category === 'strategic'  ? '3–6 meses' : '6–12 meses';

  return { roadmapCategory: category, timeline };
}

const CATEGORY_ORDER: Record<RoadmapCategory, number> = {
  'quick-wins':    0,
  'strategic':     1,
  'transformation': 2,
  'low-priority':  3,
};

/**
 * Build the full automation roadmap sorted by phase then by priorityScore descending.
 *
 * Matrix quadrant is computed here using the same thresholds as RankingScreen so that
 * roadmap phases are always derived from the matrix — the single source of truth.
 *
 * @param voteSummaries  Optional map of subprocessId → { average, count } from stakeholder votes.
 */
export function buildAutomationRoadmap(
  assessments: SubprocessAssessment[],
  voteSummaries?: Map<string, { average: number; count: number }>,
): RoadmapItem[] {
  if (assessments.length === 0) return [];

  // Compute median impactScore — same logic as RankingScreen matrix
  const sorted = [...assessments].sort((a, b) => a.impactScore - b.impactScore);
  const midIdx = Math.floor(sorted.length / 2);
  const medianImpact = sorted.length % 2 !== 0
    ? sorted[midIdx].impactScore
    : (sorted[midIdx - 1].impactScore + sorted[midIdx].impactScore) / 2;

  const items: RoadmapItem[] = assessments.map((a) => {
    const vote            = voteSummaries?.get(a.subprocessId);
    const voteBoostFactor = vote && vote.count > 0 ? (1 + vote.average / 5) : 1;
    const sortPriority    = Math.round(a.priorityScore * voteBoostFactor);

    let matrixQuadrant: string;
    if      (a.automationScore >= 60 && a.impactScore >= medianImpact) matrixQuadrant = 'prioridade-imediata';
    else if (a.automationScore >= 60 && a.impactScore <  medianImpact) matrixQuadrant = 'vitorias-rapidas';
    else if (a.automationScore <  60 && a.impactScore >= medianImpact) matrixQuadrant = 'avaliar-engenharia';
    else                                                                matrixQuadrant = 'baixa-prioridade';

    return {
      subprocessId:        a.subprocessId,
      subprocessName:      a.subprocessName,
      macroprocessName:    a.macroprocessName,
      processName:         a.processName,
      automationScore:     a.automationScore,
      impactScore:         a.impactScore,
      effortScore:         calculateEffortScore(a),
      estimatedSavings:    a.financialImpact,
      savingsHours:        a.automationSavingsHours,
      priorityScore:       sortPriority,
      suggestedTechnology: suggestAutomationTechnology(a),
      matrixQuadrant,
      ...(vote && vote.count > 0 ? { voteAverage: vote.average, voteCount: vote.count } : {}),
      ...classifyPhase(matrixQuadrant, vote?.average, vote?.count),
    };
  });

  return items.sort((a, b) => {
    const orderDiff = CATEGORY_ORDER[a.roadmapCategory] - CATEGORY_ORDER[b.roadmapCategory];
    return orderDiff !== 0 ? orderDiff : b.priorityScore - a.priorityScore;
  });
}
