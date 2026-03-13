import { CriteriaScores, SubprocessAssessment } from '@/types';

/**
 * Display weights for the weighted composite score shown in the UI.
 * Weights sum to 6.0, scores range 1–4 → max = 4 × 6.0 = 24.
 *
 *   standardization   1.25 — highest weight; rule clarity is the #1 market criterion
 *   processStability  1.00 — stability risk; unstable processes shouldn't be automated
 *   digitization      1.00 — manual-tool dependency; direct automation target
 *   operationalVolume 0.75 — amplifies ROI of any improvement
 *   executionTime     0.75 — time factor per execution
 *   reworkRate        0.75 — process fragility / quality gap
 *   peopleInvolved    0.50 — headcount signal (lower standalone weight)
 */
export const DISPLAY_WEIGHTS: Record<keyof CriteriaScores, number> = {
  operationalVolume: 0.75,
  executionTime:     0.75,
  peopleInvolved:    0.50,
  standardization:   1.25,
  digitization:      1.00,
  reworkRate:        0.75,
  processStability:  1.00,
};
// Σ weights = 6.0  →  max weighted score = 4 × 6.0 = 24

/**
 * Weighted composite score for display purposes. Maximum possible value: 24.
 * Rounded to the nearest integer so the "/24" display stays consistent.
 */
export function calculateWeightedScore(scores: CriteriaScores): number {
  return Math.round(
    (Object.keys(scores) as (keyof CriteriaScores)[]).reduce(
      (sum, key) => sum + scores[key] * DISPLAY_WEIGHTS[key],
      0
    )
  );
}

/**
 * Automation potential score (0–100).
 * Answers: "given the technical nature of this process, how much of it can be automated?"
 *
 * Criteria increasing automatability (higher raw score = better candidate):
 *   digitization      30 — manual/spreadsheet work is the prime automation target
 *   reworkRate        15 — repetitive errors indicate automatable patterns
 *
 * Criteria decreasing automatability (INVERTED — score 1 = most automatable):
 *   standardization   35 — most important: score 1="always follows rules", score 4="each exec differs"
 *   processStability  20 — unstable processes should not be automated
 *
 * Max raw = 4 × (35 + 20 + 30 + 15) = 4 × 100 = 400
 * Normalised to 0–100 by dividing by 4.
 */
export function calculateAutomationScore(scores: CriteriaScores): number {
  // Invert the criteria where score 1 = best for automation
  const standardizationInv = 5 - scores.standardization; // 1→4, 2→3, 3→2, 4→1
  const stabilityInv        = 5 - scores.processStability; // 1→4, 2→3, 3→2, 4→1

  const raw =
    standardizationInv       * 35 +  // clear rules = more automatable
    stabilityInv             * 20 +  // stable = more automatable
    scores.digitization      * 30 +  // more manual = more opportunity
    scores.reworkRate        * 15;   // more errors = more opportunity

  return Math.round(raw / 4);
}

const MAX_SCORE = 24;

export function getScoreColor(score: number): string {
  const pct = score / MAX_SCORE;
  if (pct >= 0.75) return 'text-red-600';
  if (pct >= 0.5) return 'text-orange-500';
  return 'text-green-600';
}

export function getScoreBadgeColor(score: number): string {
  const pct = score / MAX_SCORE;
  if (pct >= 0.75) return 'bg-red-100 text-red-700 border-red-200';
  if (pct >= 0.5) return 'bg-orange-100 text-orange-700 border-orange-200';
  return 'bg-green-100 text-green-700 border-green-200';
}

export function getScoreBarColor(score: number): string {
  const pct = score / MAX_SCORE;
  if (pct >= 0.75) return 'bg-red-500';
  if (pct >= 0.5) return 'bg-orange-400';
  return 'bg-green-500';
}

export function getPriorityLabel(score: number): string {
  const pct = score / MAX_SCORE;
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
