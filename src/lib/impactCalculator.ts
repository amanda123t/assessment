/**
 * Impact Calculator
 *
 * Converts questionnaire scores (1–4) into operational impact estimates using
 * the midpoint of each answer range, so estimates reflect realistic averages
 * rather than boundary values.
 *
 * Annual effort formula:
 *   annualHours = (volumeEstimado × tempoPessoaEstimado × pessoasEstimadas × 12) / 60
 *
 * - volumeEstimado    → midpoint of operationalVolume range (executions/month)
 * - tempoPessoaEstimado → midpoint of executionTime range (minutes per person per task)
 * - pessoasEstimadas  → midpoint of peopleInvolved range
 * - 12               → months per year
 * - ÷ 60             → converts minutes to hours
 */

import { CriteriaScores, RealValues } from '@/types';

/**
 * Maps operationalVolume score (1–4) → estimated monthly executions.
 * Uses the midpoint of each answer range shown in the questionnaire:
 *   1 "Menos de 50"  → 25
 *   2 "50 a 200"     → 125
 *   3 "200 a 500"    → 350
 *   4 "Mais de 500"  → 750
 */
const VOLUME_MAP: Record<number, number> = {
  1: 25,
  2: 125,
  3: 350,
  4: 750,
};

/**
 * Maps executionTime score (1–4) → estimated minutes per person per task.
 * Uses the midpoint of each answer range shown in the questionnaire:
 *   1 "Menos de 5 minutos"  → 3
 *   2 "5 a 15 minutos"      → 10
 *   3 "15 a 30 minutos"     → 22
 *   4 "Mais de 30 minutos"  → 45
 */
const TIME_MAP: Record<number, number> = {
  1: 3,
  2: 10,
  3: 22,
  4: 45,
};

/**
 * Maps peopleInvolved score (1–4) → estimated number of people.
 * Uses the midpoint of each answer range shown in the questionnaire:
 *   1 "1 pessoa"       → 1
 *   2 "2–3 pessoas"    → 2.5
 *   3 "4–6 pessoas"    → 5
 *   4 "Mais de 6"      → 7
 */
const PEOPLE_MAP: Record<number, number> = {
  1: 1,
  2: 2.5,
  3: 5,
  4: 7,
};

/**
 * Assumed average productive hours per FTE per year.
 * Standard 40 h/week × 50 weeks.
 */
export const FTE_HOURS_YEAR = 2000;

/**
 * Assumed total hourly cost of an operational employee.
 * Based on ~R$3,000/month salary + employer charges ÷ 160 h/month ≈ R$50/h.
 */
export const HOURLY_COST = 50;

/**
 * Calculate annual operational effort in hours.
 * Formula: (volume × timePerPerson × people × 12) / 60
 *
 * Each dimension uses the real value provided by the user when available,
 * falling back to the midpoint of the selected questionnaire range.
 *
 * @param scores     - Questionnaire scores (1–4) for each criterion.
 * @param realValues - Optional user-supplied exact values that override midpoints.
 */
export function calculateAnnualHours(scores: CriteriaScores, realValues?: RealValues): number {
  const volume  = realValues?.volume      ?? VOLUME_MAP[scores.operationalVolume]  ?? 0;
  const minutes = realValues?.timeMinutes ?? TIME_MAP[scores.executionTime]        ?? 0;
  const people  = realValues?.people      ?? PEOPLE_MAP[scores.peopleInvolved]     ?? 1;
  return Math.round((volume * minutes * people * 12) / 60);
}

/**
 * Estimate automation savings hours based on automationScore threshold.
 * >= 80 → 70% savings
 * >= 60 → 40% savings
 * >= 40 → 20% savings
 * else  → 10% savings
 */
export function calculateAutomationSavings(
  annualHours: number,
  automationScore: number
): number {
  let rate = 0.10;
  if (automationScore >= 80) rate = 0.70;
  else if (automationScore >= 60) rate = 0.40;
  else if (automationScore >= 40) rate = 0.20;
  return Math.round(annualHours * rate);
}

/**
 * Calculate the FTE currently required to run the process.
 * Formula: annualHours / FTE_HOURS_YEAR
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
 * Estimate financial impact from automation savings (scenario).
 * Formula: savingsHours × HOURLY_COST
 * This is a scenario estimate based on an assumed administrative cost of R$50/hour.
 */
export function calculateFinancialImpact(savingsHours: number): number {
  return savingsHours * HOURLY_COST;
}
