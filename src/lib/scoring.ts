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
 * Measures ONLY technical feasibility — volume/people/time belong to impactScore.
 *
 * Criteria increasing automatability (higher raw score = better candidate):
 *   dataDigitization     30 — manual/paper data is the prime automation target
 *   reworkRate           15 — repetitive errors indicate automatable patterns
 *
 * Criteria decreasing automatability (INVERTED — score 1 = most automatable):
 *   standardization      35 — most important: score 1="always follows rules", score 4="each exec differs"
 *   processStability     20 — unstable processes should not be automated
 *
 * Σ weights = 100  →  max raw = 4 × 100 = 400  →  /4 = 0–100
 */
export function calculateAutomationScore(scores: CriteriaScores): number {
  const standardizationInv = 5 - scores.standardization;
  const stabilityInv       = 5 - scores.processStability;
  const raw =
    standardizationInv           * 35 +  // regras claras
    stabilityInv                 * 20 +  // estabilidade
    scores.dataDigitization      * 30 +  // dados manuais → oportunidade de automação
    scores.reworkRate            * 15;   // retrabalho
  // Σ = 100  →  max raw = 4 × 100 = 400  →  /4 = 0-100
  return Math.round(raw / 4);
}

/**
 * Impact score (0–100).
 * Mede o impacto operacional: quanto esforço/desperdício este processo gera.
 * Usado para priorizar onde a automação trará mais valor.
 *
 * Critérios (todos diretos — score alto = mais impacto):
 *   operationalVolume  35 — alto volume amplifica qualquer melhoria
 *   executionTime      25 — processos lentos = muito tempo consumido
 *   peopleInvolved     20 — muitas pessoas = multiplicador organizacional
 *   reworkRate         20 — muito retrabalho = desperdício direto
 *
 * Σ = 100  →  max raw = 4 × 100 = 400  →  /4 = 0–100
 */
export function calculateImpactScore(scores: CriteriaScores): number {
  const raw =
    scores.operationalVolume * 35 +
    scores.executionTime     * 25 +
    scores.peopleInvolved    * 20 +
    scores.reworkRate        * 20;
  return Math.round(raw / 4);
}

/**
 * Priority score (0–100).
 * Combina viabilidade técnica (automationScore) com impacto operacional (impactScore).
 * Este é o score usado para ordenar o ranking e o roadmap.
 *
 * Pesos: 55% automação + 45% impacto.
 * A viabilidade técnica pesa um pouco mais porque não adianta ter impacto alto
 * se o processo não é automatizável.
 */
export function calculatePriorityScore(automationScore: number, impactScore: number): number {
  return Math.round(automationScore * 0.55 + impactScore * 0.45);
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
