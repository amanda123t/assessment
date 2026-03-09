/**
 * Impact Calculator
 *
 * Converts questionnaire scores (1–4) into operational impact estimates:
 * - Annual operational hours (volume × time × 12 months)
 * - Automation savings hours (based on automationScore thresholds)
 * - FTE equivalent of automatable hours
 * - Operational capacity gain percentage
 * - Estimated financial impact (scenario, based on R$3,000/month salary profile)
 */

import { CriteriaScores } from '@/types';

/** Maps operationalVolume score (1–4) → monthly executions */
const VOLUME_MAP: Record<number, number> = {
  1: 25,
  2: 125,
  3: 350,
  4: 700,
};

/** Maps executionTime score (1–4) → minutes per task */
const TIME_MAP: Record<number, number> = {
  1: 1,
  2: 3,
  3: 10,
  4: 20,
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
 * Formula: (volume_per_month × minutes_per_task × 12) / 60
 */
export function calculateAnnualHours(scores: CriteriaScores): number {
  const volume = VOLUME_MAP[scores.operationalVolume] ?? 0;
  const minutes = TIME_MAP[scores.executionTime] ?? 0;
  return Math.round((volume * minutes * 12) / 60);
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
 * Calculate the FTE equivalent of automatable hours.
 * Formula: automatableHours / FTE_HOURS_YEAR
 * Rounded to one decimal place.
 */
export function calculateFteEquivalent(automatableHours: number): number {
  return Math.round((automatableHours / FTE_HOURS_YEAR) * 10) / 10;
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
