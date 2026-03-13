import { CriteriaScores, SubprocessAssessment } from '@/types';

/**
 * Display weights for the weighted composite score shown in the UI.
 * Weights sum to 6.0, scores range 1–4 → max = 4 × 6.0 = 24.
 *
 *   standardization   1.20 — highest weight; rule clarity is the #1 market criterion
 *   processStability  1.10 — stability risk; unstable processes shouldn't be automated
 *   operationalVolume 0.70 — amplifies ROI of any improvement
 *   executionTime     0.70 — time factor per execution
 *   dataDigitization  0.70 — data format (paper vs digital); direct automation target
 *   reworkRate        0.70 — process fragility / quality gap
 *   peopleInvolved    0.45 — headcount signal (lower standalone weight)
 *   systemCount       0.45 — system fragmentation / integration complexity
 */
export const DISPLAY_WEIGHTS: Record<keyof CriteriaScores, number> = {
  operationalVolume: 0.70,
  executionTime:     0.70,
  peopleInvolved:    0.45,
  standardization:   1.20,
  dataDigitization:  0.70,
  systemCount:       0.45,
  reworkRate:        0.70,
  processStability:  1.10,
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
 *   dataDigitization     25 — manual/paper data is the prime automation target
 *   systemCount          10 — more systems = more integration opportunity
 *   reworkRate           10 — repetitive errors indicate automatable patterns
 *   operationalVolume    10 — high volume amplifies ROI of automation
 *
 * Criteria decreasing automatability (INVERTED — score 1 = most automatable):
 *   standardization      30 — most important: score 1="always follows rules", score 4="each exec differs"
 *   processStability     15 — unstable processes should not be automated
 *
 * Max raw = 4 × (30 + 15 + 25 + 10 + 10 + 10) = 4 × 100 = 400
 * Normalised to 0–100 by dividing by 4.
 */
export function calculateAutomationScore(scores: CriteriaScores): number {
  const standardizationInv = 5 - scores.standardization;
  const stabilityInv       = 5 - scores.processStability;
  const raw =
    standardizationInv          * 30 +  // regras claras
    stabilityInv                * 15 +  // estabilidade
    scores.dataDigitization     * 25 +  // formato dos dados (papel = mais oportunidade)
    scores.systemCount          * 10 +  // fragmentação de sistemas
    scores.reworkRate           * 10 +  // retrabalho
    scores.operationalVolume    * 10;   // volume
  // Max raw = 4 × (30+15+25+10+10+10) = 4 × 100 = 400
  return Math.round(raw / 4);
}

export const MAX_SCORE = 24;

/**
 * Converts a raw weighted score (0–24) to a 0–100 display scale.
 */
export function normalizeScore(weightedScore: number): number {
  return Math.round((weightedScore / MAX_SCORE) * 100);
}

export function getScoreColorFromPercent(pct: number): string {
  if (pct >= 75) return 'text-red-600';
  if (pct >= 50) return 'text-orange-500';
  return 'text-green-600';
}

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
    dataDigitization: 0,
    systemCount: 0,
    reworkRate: 0,
    processStability: 0,
  };
}
