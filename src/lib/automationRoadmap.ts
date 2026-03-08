import { SubprocessAssessment } from '@/types';

export type RoadmapCategory = 'quick-wins' | 'strategic' | 'transformation';

export interface RoadmapItem {
  subprocessId: string;
  subprocessName: string;
  macroprocessName: string;
  processName: string;
  automationScore: number;
  /** Composite 0–100: automation potential weighted 60%, normalised savings 40%. */
  impactScore: number;
  /** Composite 0–100: proxy for implementation complexity derived from criteria scores. */
  effortScore: number;
  estimatedSavings: number;
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

function classifyHorizon(
  impactScore: number,
  effortScore: number,
): Pick<RoadmapItem, 'roadmapCategory' | 'timeline'> {
  if (impactScore >= 70 && effortScore <= 40)
    return { roadmapCategory: 'quick-wins', timeline: '0–3 meses' };
  if (impactScore >= 70 && effortScore > 40)
    return { roadmapCategory: 'strategic', timeline: '3–6 meses' };
  return { roadmapCategory: 'transformation', timeline: '6–12 meses' };
}

const CATEGORY_ORDER: Record<RoadmapCategory, number> = {
  'quick-wins': 0,
  'strategic': 1,
  'transformation': 2,
};

/** Build the full automation roadmap sorted by horizon then by impact descending. */
export function buildAutomationRoadmap(assessments: SubprocessAssessment[]): RoadmapItem[] {
  if (assessments.length === 0) return [];

  const maxSavings = Math.max(...assessments.map((a) => a.financialImpact));

  const items: RoadmapItem[] = assessments.map((a) => {
    const impactScore = calculateImpactScore(a, maxSavings);
    const effortScore = calculateEffortScore(a);
    return {
      subprocessId: a.subprocessId,
      subprocessName: a.subprocessName,
      macroprocessName: a.macroprocessName,
      processName: a.processName,
      automationScore: a.automationScore,
      impactScore,
      effortScore,
      estimatedSavings: a.financialImpact,
      ...classifyHorizon(impactScore, effortScore),
    };
  });

  return items.sort((a, b) => {
    const orderDiff = CATEGORY_ORDER[a.roadmapCategory] - CATEGORY_ORDER[b.roadmapCategory];
    return orderDiff !== 0 ? orderDiff : b.impactScore - a.impactScore;
  });
}
