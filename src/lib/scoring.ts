import { CriteriaScores, SubprocessAssessment } from '@/types';

export function calculateTotalScore(scores: CriteriaScores): number {
  return Object.values(scores).reduce((sum, score) => sum + score, 0);
}

export function getScoreColor(score: number): string {
  const max = 30;
  const pct = score / max;
  if (pct >= 0.75) return 'text-red-600';
  if (pct >= 0.5) return 'text-orange-500';
  return 'text-green-600';
}

export function getScoreBadgeColor(score: number): string {
  const max = 30;
  const pct = score / max;
  if (pct >= 0.75) return 'bg-red-100 text-red-700 border-red-200';
  if (pct >= 0.5) return 'bg-orange-100 text-orange-700 border-orange-200';
  return 'bg-green-100 text-green-700 border-green-200';
}

export function getScoreBarColor(score: number): string {
  const max = 30;
  const pct = score / max;
  if (pct >= 0.75) return 'bg-red-500';
  if (pct >= 0.5) return 'bg-orange-400';
  return 'bg-green-500';
}

export function getPriorityLabel(score: number): string {
  const max = 30;
  const pct = score / max;
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
    peopleInvolved: 0,
    executionTime: 0,
    reworkOrErrors: 0,
    systemsOrSpreadsheets: 0,
    systemIntegrations: 0,
  };
}
