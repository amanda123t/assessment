/**
 * Shared helper used by vote, report, and phase2 pages to rebuild a
 * SubprocessAssessment from a raw Firestore response document.
 */

import { lookupSubprocessById } from '@/data/industryLibrary';
import { CriteriaScores, SubprocessAssessment } from '@/types';
import { createAssessment } from '@/lib/assessmentEngine';

export const EMPTY_SCORES: CriteriaScores = {
  operationalVolume: 0, executionTime: 0, peopleInvolved: 0,
  standardization: 0, dataDigitization: 0, systemCount: 0, reworkRate: 0, processStability: 0,
};

export function reconstructAssessment(data: Record<string, unknown>): SubprocessAssessment {
  const subprocessId = data.subprocess_id as string;
  const looked       = lookupSubprocessById(subprocessId);
  const found        = looked
    ? { macro: looked.macroprocess, process: looked.process, subprocess: looked.subprocess }
    : null;
  const storedScores = data.scores as CriteriaScores | undefined;

  if (found && storedScores) {
    return createAssessment(found.macro, found.process, found.subprocess, storedScores);
  }

  return {
    subprocessId,
    subprocessName:         found?.subprocess.name ?? subprocessId,
    processId:              found?.process.id      ?? '',
    processName:            found?.process.name    ?? (data.process as string ?? ''),
    macroprocessId:         found?.macro.id        ?? '',
    macroprocessName:       found?.macro.name      ?? '',
    scores:                 EMPTY_SCORES,
    totalScore:             (data.score as number) ?? 0,
    automationScore:        0,
    impactScore:            0,
    priorityScore:          0,
    annualHours:            0,
    automationSavingsHours: 0,
    financialImpact:        0,
    fteCurrent:             0,
    fteAutomatable:         0,
    fteAfterAutomation:     0,
  };
}

/** Deduplica assessments por subprocessId — mantém o último (mais recente). */
export function deduplicateAssessments(assessments: SubprocessAssessment[]): SubprocessAssessment[] {
  const map = new Map<string, SubprocessAssessment>();
  assessments.forEach(a => map.set(a.subprocessId, a));
  return Array.from(map.values());
}
