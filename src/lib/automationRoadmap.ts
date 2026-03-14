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
 * Classify a subprocess into a roadmap phase using absolute 0–100 thresholds.
 *
 * Phase 1 – Quick Wins:              priorityScore ≥ 70 AND automationScore ≥ 60
 * Phase 2 – Strategic Automations:   priorityScore ≥ 50 AND automationScore < 60
 * Phase 3 – Complex Transformations: impactScore ≥ 70 AND automationScore < 40
 * Phase 4 – Low Priority:            priorityScore < 50 (fallback)
 *
 * Vote promotion: when voteAverage ≥ 4.0 and voteCount ≥ 3, the item is
 * promoted one phase up (strategic → quick-wins, transformation → strategic).
 */
function classifyPhase(
  automationScore: number,
  impactScore: number,
  priorityScore: number,
  voteAverage?: number,
  voteCount?: number,
): Pick<RoadmapItem, 'roadmapCategory' | 'timeline'> {
  const voteBoost = (voteAverage ?? 0) >= 4.0 && (voteCount ?? 0) >= 3;

  let category: RoadmapCategory;
  if (automationScore >= 60 && priorityScore >= 70)       category = 'quick-wins';
  else if (automationScore >= 60 && priorityScore >= 50)  category = 'quick-wins';
  else if (automationScore >= 40 && priorityScore >= 50)  category = 'strategic';
  else if (impactScore >= 70 && automationScore < 40)     category = 'transformation';
  else                                                     category = 'low-priority';

  // Promote one phase when there is strong stakeholder consensus for urgency
  if (voteBoost) {
    if (category === 'strategic')           category = 'quick-wins';
    else if (category === 'transformation') category = 'strategic';
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
 * impactScore and priorityScore (0–100) come directly from SubprocessAssessment
 * (computed in assessmentEngine.ts via scoring.ts).
 *
 * @param voteSummaries  Optional map of subprocessId → { average, count } from stakeholder votes.
 *   When provided:
 *   - priorityScore gains a vote boost factor (1 + voteAverage/5) for sort ordering
 *   - Items with voteAverage ≥ 4.0 and count ≥ 3 are promoted one phase
 *   - voteAverage and voteCount are attached to each RoadmapItem for display
 *   Without votes the function behaves exactly as before.
 */
export function buildAutomationRoadmap(
  assessments: SubprocessAssessment[],
  voteSummaries?: Map<string, { average: number; count: number }>,
): RoadmapItem[] {
  if (assessments.length === 0) return [];

  const items: RoadmapItem[] = assessments.map((a) => {
    const vote            = voteSummaries?.get(a.subprocessId);
    const voteBoostFactor = vote && vote.count > 0 ? (1 + vote.average / 5) : 1;
    // Vote boost applied only to sort ordering, not to displayed score
    const sortPriority    = Math.round(a.priorityScore * voteBoostFactor);
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
      ...(vote && vote.count > 0 ? { voteAverage: vote.average, voteCount: vote.count } : {}),
      ...classifyPhase(a.automationScore, a.impactScore, a.priorityScore, vote?.average, vote?.count),
    };
  });

  return items.sort((a, b) => {
    const orderDiff = CATEGORY_ORDER[a.roadmapCategory] - CATEGORY_ORDER[b.roadmapCategory];
    return orderDiff !== 0 ? orderDiff : b.priorityScore - a.priorityScore;
  });
}
