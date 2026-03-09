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
  /** automationScore × log(annualHours + 1) — composite priority metric. */
  priorityScore: number;
  roadmapCategory: RoadmapCategory;
  timeline: '0–3 meses' | '3–6 meses' | '6–12 meses';
}

/**
 * Effort proxy: combines system integration density, rework frequency, and
 * manual system usage — all available from existing criteria scores.
 *
 * Raw range: min = (1*2 + 1 + 1) = 4, max = (4*2 + 4 + 4) = 16
 * Normalised to 0–100.
 */
export function calculateEffortScore(a: SubprocessAssessment): number {
  const raw =
    a.scores.systemIntegrations * 2 +
    a.scores.reworkOrErrors * 1 +
    a.scores.systemsOrSpreadsheets * 1;
  return Math.round(((raw - 4) / 12) * 100);
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

function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Classify a subprocess into a roadmap phase.
 *
 * Phase 1 – Quick Wins:              high automation (≥60) + high impact (≥ median)
 * Phase 2 – Strategic Automations:   high impact + medium automation (40–59)
 * Phase 3 – Complex Transformations: high impact + low automation (<40)
 * Phase 4 – Low Priority:            low impact (< median), regardless of automation
 */
function classifyPhase(
  automationScore: number,
  impactScore: number,
  medianImpactScore: number,
): Pick<RoadmapItem, 'roadmapCategory' | 'timeline'> {
  const highImpact = impactScore >= medianImpactScore;
  const highAuto   = automationScore >= 60;
  const medAuto    = automationScore >= 40;

  if (highAuto && highImpact)  return { roadmapCategory: 'quick-wins',    timeline: '0–3 meses' };
  if (highImpact && medAuto)   return { roadmapCategory: 'strategic',      timeline: '3–6 meses' };
  if (highImpact)              return { roadmapCategory: 'transformation', timeline: '6–12 meses' };
  return                              { roadmapCategory: 'low-priority',   timeline: '6–12 meses' };
}

const CATEGORY_ORDER: Record<RoadmapCategory, number> = {
  'quick-wins':    0,
  'strategic':     1,
  'transformation': 2,
  'low-priority':  3,
};

/** Build the full automation roadmap sorted by phase then by priorityScore descending. */
export function buildAutomationRoadmap(assessments: SubprocessAssessment[]): RoadmapItem[] {
  if (assessments.length === 0) return [];

  // Compute log-based impact and priority scores for each assessment
  const withScores = assessments.map((a) => {
    const impactScore    = Math.log(a.annualHours + 1);
    const priorityScore  = a.automationScore * impactScore;
    return { assessment: a, impactScore, priorityScore };
  });

  const medianImpactScore = computeMedian(withScores.map((x) => x.impactScore));

  const items: RoadmapItem[] = withScores.map(({ assessment: a, impactScore, priorityScore }) => ({
    subprocessId:    a.subprocessId,
    subprocessName:  a.subprocessName,
    macroprocessName: a.macroprocessName,
    processName:     a.processName,
    automationScore: a.automationScore,
    impactScore,
    effortScore:     calculateEffortScore(a),
    estimatedSavings: a.financialImpact,
    priorityScore,
    ...classifyPhase(a.automationScore, impactScore, medianImpactScore),
  }));

  return items.sort((a, b) => {
    const orderDiff = CATEGORY_ORDER[a.roadmapCategory] - CATEGORY_ORDER[b.roadmapCategory];
    return orderDiff !== 0 ? orderDiff : b.priorityScore - a.priorityScore;
  });
}
