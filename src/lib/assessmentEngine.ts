/**
 * Assessment Engine
 *
 * Responsible for:
 * - Creating SubprocessAssessment objects
 * - Accumulating scores across multiple subprocesses
 * - Advancing through the subprocess queue
 * - Preparing the final results list
 *
 * This module has no UI concerns. It returns plain data structures
 * that can be passed to components or to the ranking/export modules.
 */

import { Macroprocess, Process, Subprocess, CriteriaScores, SubprocessAssessment, RealValues } from '@/types';
import { calculateWeightedScore, calculateAutomationScore } from './scoring';
import { calculateAnnualHours, calculateAutomationSavings, calculateFinancialImpact, calculateFteCurrent, calculateFteEquivalent, calculateFteAfterAutomation } from './impactCalculator';

/** Create an initial empty assessment entry for a subprocess. */
export function createAssessment(
  macroprocess: Macroprocess,
  process: Process,
  subprocess: Subprocess,
  scores: CriteriaScores,
  isCustom?: boolean,
  realValues?: RealValues,
): SubprocessAssessment {
  const totalScore = calculateWeightedScore(scores);
  const automationScore = calculateAutomationScore(scores);
  const annualHours = calculateAnnualHours(scores, realValues);
  const automationSavingsHours = calculateAutomationSavings(annualHours, automationScore, scores.processStability);
  const financialImpact = calculateFinancialImpact(automationSavingsHours);
  const fteCurrent = calculateFteCurrent(annualHours);
  const fteAutomatable = calculateFteEquivalent(automationSavingsHours);
  const fteAfterAutomation = calculateFteAfterAutomation(fteCurrent, fteAutomatable);

  return {
    subprocessId: subprocess.id,
    subprocessName: subprocess.name,
    processId: process.id,
    processName: process.name,
    macroprocessId: macroprocess.id,
    macroprocessName: macroprocess.name,
    scores,
    totalScore,
    automationScore,
    annualHours,
    automationSavingsHours,
    financialImpact,
    fteCurrent,
    fteAutomatable,
    fteAfterAutomation,
    isCustom,
  };
}

/** Append a completed assessment to the existing list. */
export function addAssessment(
  existing: SubprocessAssessment[],
  next: SubprocessAssessment
): SubprocessAssessment[] {
  return [...existing, next];
}

/** Return the subprocess that should be evaluated next, or null if done. */
export function getNextSubprocess(
  subprocesses: Subprocess[],
  currentIndex: number
): Subprocess | null {
  const nextIdx = currentIndex + 1;
  return nextIdx < subprocesses.length ? subprocesses[nextIdx] : null;
}

/** Advance the index to the next subprocess. */
export function advanceIndex(currentIndex: number): number {
  return currentIndex + 1;
}

/** Check whether all subprocesses have been assessed. */
export function isAssessmentComplete(
  subprocesses: Subprocess[],
  currentIndex: number
): boolean {
  return currentIndex >= subprocesses.length - 1;
}
