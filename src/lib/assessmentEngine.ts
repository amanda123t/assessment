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

import { Macroprocess, Process, Subprocess, CriteriaScores, SubprocessAssessment } from '@/types';
import { calculateTotalScore, calculateAutomationScore } from './scoring';

/** Create an initial empty assessment entry for a subprocess. */
export function createAssessment(
  macroprocess: Macroprocess,
  process: Process,
  subprocess: Subprocess,
  scores: CriteriaScores
): SubprocessAssessment {
  return {
    subprocessId: subprocess.id,
    subprocessName: subprocess.name,
    processId: process.id,
    processName: process.name,
    macroprocessId: macroprocess.id,
    macroprocessName: macroprocess.name,
    scores,
    totalScore: calculateTotalScore(scores),
    automationScore: calculateAutomationScore(scores),
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
