import { CriteriaScores, SubprocessAssessment } from '@/types';

/**
 * Criterion weights for the weighted efficiency score.
 * Weights sum to 6.0 so the maximum weighted score remains 30 (= 5 × 6.0).
 *
 * Higher weight = stronger signal of inefficiency / automation opportunity:
 *   digitization      1.75 — direct automation target (manual-tool dependency)
 *   reworkRate        1.25 — process fragility and quality gap
 *   standardization   1.00 — rule clarity / predictability for automation
 *   operationalVolume 0.75 — amplifies the ROI of any improvement
 *   peopleInvolved    0.75 — headcount affected by automation
 *   executionTime     0.50 — time factor (volume-dependent; lower standalone signal)
 *   processStability  0.00 — placeholder weight; recalibrated in Prompt B
 */
export const SCORE_WEIGHTS: Record<keyof CriteriaScores, number> = {
  operationalVolume: 0.75,
  executionTime:     0.50,
  peopleInvolved:    0.75,
  standardization:   1.00,
  digitization:      1.75,
  reworkRate:        1.25,
  processStability:  0.00,
};
// Σ weights = 6.0  →  max weighted score = 5 × 6 = 30

/**
 * Weighted sum of criteria scores. Maximum possible value: 30.
 * Rounded to the nearest integer so the "/30" display stays consistent.
 */
export function calculateTotalScore(scores: CriteriaScores): number {
  return Math.round(
    (Object.keys(scores) as (keyof CriteriaScores)[]).reduce(
      (sum, key) => sum + scores[key] * SCORE_WEIGHTS[key],
      0
    )
  );
}

/**
 * Automation potential score (0–100).
 * Derived from the four criteria most directly related to automation ROI:
 *
 *   digitization      40% — manual tool dependency (spreadsheets / legacy apps)
 *   standardization   30% — rule clarity / predictability for automation
 *   reworkRate        20% — errors that automation can eliminate
 *   operationalVolume 10% — transaction volume that justifies the investment
 *
 * Max raw = 5 × (40 + 30 + 20 + 10) = 500  →  divide by 5  →  0–100.
 */
export function calculateAutomationScore(scores: CriteriaScores): number {
  const { digitization, standardization, reworkRate, operationalVolume } = scores;
  const raw =
    digitization      * 40 +
    standardization   * 30 +
    reworkRate        * 20 +
    operationalVolume * 10;
  return Math.round(raw / 5);
}

export function getScoreColor(score: number): string {
  const pct = score / 30;
  if (pct >= 0.75) return 'text-red-600';
  if (pct >= 0.5) return 'text-orange-500';
  return 'text-green-600';
}

export function getScoreBadgeColor(score: number): string {
  const pct = score / 30;
  if (pct >= 0.75) return 'bg-red-100 text-red-700 border-red-200';
  if (pct >= 0.5) return 'bg-orange-100 text-orange-700 border-orange-200';
  return 'bg-green-100 text-green-700 border-green-200';
}

export function getScoreBarColor(score: number): string {
  const pct = score / 30;
  if (pct >= 0.75) return 'bg-red-500';
  if (pct >= 0.5) return 'bg-orange-400';
  return 'bg-green-500';
}

export function getPriorityLabel(score: number): string {
  const pct = score / 30;
  if (pct >= 0.75) return 'Alta Prioridade';
  if (pct >= 0.5) return 'Média Prioridade';
  return 'Baixa Prioridade';
}

export function rankAssessments(assessments: SubprocessAssessment[]): SubprocessAssessment[] {
  return [...assessments].sort((a, b) => b.totalScore - a.totalScore);
}

export function getEmptyScores(): CriteriaScores {
  return {
    operationalVolume: 0,
    executionTime: 0,
    peopleInvolved: 0,
    standardization: 0,
    digitization: 0,
    reworkRate: 0,
    processStability: 0,
  };
}
