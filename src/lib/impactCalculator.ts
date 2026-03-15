/**
 * Impact Calculator
 *
 * Converts questionnaire scores (1–4) into operational impact estimates using
 * the midpoint of each answer range, so estimates reflect realistic averages
 * rather than boundary values.
 *
 * Annual effort formula:
 *   baseHours   = (volume × timeMinutes × 12) / 60
 *   annualHours = baseHours × sqrt(people)
 *
 * - volume           → midpoint of operationalVolume range (executions/month)
 * - timeMinutes      → midpoint of executionTime range (minutes per execution)
 * - 12               → months per year
 * - ÷ 60             → converts minutes to hours
 * - sqrt(people)     → moderating people factor (sub-linear growth; accounts for
 *                      shared overhead and handoffs rather than fully additive effort)
 */

import { CriteriaScores, RealValues } from '@/types';

/**
 * Maps operationalVolume score (1–4) → estimated monthly executions.
 * Midpoint of each answer range:
 *   1 "Menos de 50 vezes/mês"    → 25
 *   2 "50 a 200 vezes/mês"       → 125
 *   3 "200 a 500 vezes/mês"      → 350
 *   4 "Mais de 500 vezes/mês"    → 750
 */
export const VOLUME_MAP: Record<number, number> = {
  1: 25,
  2: 125,
  3: 350,
  4: 750,
};

/**
 * Maps executionTime score (1–4) → estimated minutes per execution.
 * Midpoint of each answer range:
 *   1 "Menos de 5 minutos"  → 3
 *   2 "5 a 15 minutos"      → 10
 *   3 "15 a 30 minutos"     → 22
 *   4 "Mais de 30 minutos"  → 45
 */
export const TIME_MAP: Record<number, number> = {
  1: 3,
  2: 10,
  3: 22,
  4: 45,
};

/**
 * Maps peopleInvolved score (1–4) → estimated number of people.
 * Used as a sub-linear multiplier in the hours formula.
 *   1 "1 pessoa"          → 1
 *   2 "2 a 3 pessoas"     → 2.5
 *   3 "4 a 6 pessoas"     → 5
 *   4 "Mais de 6 pessoas" → 7
 */
export const PEOPLE_MAP: Record<number, number> = {
  1: 1,
  2: 2.5,
  3: 5,
  4: 7,
};

/**
 * Assumed average productive hours per FTE per year.
 * Standard 8 h/day × 220 working days.
 */
export const FTE_HOURS_YEAR = 1760;

/**
 * Default assumed total hourly cost of an operational employee.
 * Based on ~R$3,000/month salary + employer charges ÷ 160 h/month ≈ R$50/h.
 */
export const DEFAULT_HOURLY_COST = 50;

/**
 * Calculate annual operational effort in hours, incorporating people as a
 * sub-linear organisational effort multiplier.
 *
 * Formula: baseHours × sqrt(people)
 *   baseHours = (volume × timeMinutes × 12) / 60
 *
 * Using sqrt(people) as a moderating factor:
 *   1 person  → ×1.00 (no multiplication)
 *   2.5 people → ×1.58
 *   5 people  → ×2.24
 *   7 people  → ×2.65
 *
 * Justification: not all hours are additive across people (shared overhead,
 * meetings, handoffs), but organizational impact grows faster than for a
 * single person and slower than full linear scaling.
 *
 * @param scores     - Questionnaire scores (1–4) for each criterion.
 * @param realValues - Optional user-supplied exact values that override midpoints.
 */
export function calculateAnnualHours(scores: CriteriaScores, realValues?: RealValues): number {
  const volume  = realValues?.volume      ?? VOLUME_MAP[scores.operationalVolume]  ?? 0;
  const minutes = realValues?.timeMinutes ?? TIME_MAP[scores.executionTime]        ?? 0;
  const people  = realValues?.people      ?? PEOPLE_MAP[scores.peopleInvolved]     ?? 1;

  const baseHours    = (volume * minutes * 12) / 60;
  const peopleFactor = people <= 5
    ? people
    : people <= 20
      ? people * 0.7
      : people * 0.5;

  return Math.round(baseHours * peopleFactor);
}

/**
 * Continuous automation savings rate (0.05 – 0.75) interpolated from anchor points.
 *
 * Anchor points [automationScore, rate]:
 *   0   → 5%   (minimum savings even for low-viability processes)
 *   50  → 30%
 *   75  → 50%
 *   100 → 75%  (maximum savings for highly automatable processes)
 *
 * Linear interpolation between segments.
 */
export function getAutomationRate(automationScore: number): number {
  const clamped = Math.max(0, Math.min(100, automationScore));

  const anchors: [number, number][] = [
    [0,   0.05],
    [50,  0.30],
    [75,  0.50],
    [100, 0.75],
  ];

  for (let i = 0; i < anchors.length - 1; i++) {
    const [x0, y0] = anchors[i];
    const [x1, y1] = anchors[i + 1];
    if (clamped >= x0 && clamped <= x1) {
      const t = (clamped - x0) / (x1 - x0);
      return Math.round((y0 + t * (y1 - y0)) * 100) / 100;
    }
  }

  return anchors[anchors.length - 1][1];
}

/**
 * Confidence multiplier for savings projections based on process stability.
 * Unstable processes are likely to require refactoring after automation.
 *
 * processStability score:
 *   1 "Estável há mais de 6 meses"     → 1.00 (no reduction)
 *   2 "Poucas mudanças recentes"       → 0.85
 *   3 "Muda com alguma frequência"     → 0.60
 *   4 "Em processo de mudança agora"   → 0.30
 */
export function getStabilityFactor(stabilityScore: number): number {
  const factors: Record<number, number> = { 1: 1.0, 2: 0.85, 3: 0.60, 4: 0.30 };
  return factors[stabilityScore] ?? 0.60;
}

/**
 * Estimate automation savings hours.
 * Formula: annualHours × automationRate × stabilityFactor
 */
export function calculateAutomationSavings(
  annualHours: number,
  automationScore: number,
  stabilityScore: number,
): number {
  const rate            = getAutomationRate(automationScore);
  const stabilityFactor = getStabilityFactor(stabilityScore);
  return Math.round(annualHours * rate * stabilityFactor);
}

/**
 * Calculate the FTE currently required to run the process.
 * Formula: annualHours / FTE_HOURS_YEAR (1 FTE = 1760 h/year)
 * Rounded to one decimal place.
 */
export function calculateFteCurrent(annualHours: number): number {
  return Math.round((annualHours / FTE_HOURS_YEAR) * 10) / 10;
}

/**
 * Calculate the FTE equivalent of automatable hours (FTE freed by automation).
 * Formula: automatableHours / FTE_HOURS_YEAR
 * Rounded to one decimal place.
 */
export function calculateFteEquivalent(automatableHours: number): number {
  return Math.round((automatableHours / FTE_HOURS_YEAR) * 10) / 10;
}

/**
 * Calculate the FTE remaining after automation.
 * Formula: max(0, fteCurrent - fteAutomatable)
 * Rounded to one decimal place.
 */
export function calculateFteAfterAutomation(fteCurrent: number, fteAutomatable: number): number {
  return Math.max(0, Math.round((fteCurrent - fteAutomatable) * 10) / 10);
}

/**
 * Calculate the operational capacity gain percentage.
 * Formula: (automatableHours / annualHours) × 100
 * Returns 0 if annualHours is 0.
 */
export function calculateCapacityGain(automatableHours: number, annualHours: number): number {
  if (annualHours === 0) return 0;
  return Math.round((automatableHours / annualHours) * 100);
}

/**
 * Estimate financial impact from automation savings.
 * Formula: savingsHours × hourlyCost
 */
export function calculateFinancialImpact(
  savingsHours: number,
  hourlyCost: number = DEFAULT_HOURLY_COST,
): number {
  return Math.round(savingsHours * hourlyCost);
}
