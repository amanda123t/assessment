/**
 * Ranking Module
 *
 * Responsible for:
 * - Sorting subprocesses by priorityScore (descending)
 * - Assigning priority labels (Alta / Média / Baixa) based on totalScore
 * - Computing priority color tokens for UI and charts
 * - Preparing chart-ready data arrays
 *
 * priorityScore = automationScore × log(annualHours + 1)
 * impactScore   = log(annualHours + 1)
 *
 * No UI code here — only plain data transformations.
 */

import { SubprocessAssessment } from '@/types';

export type Priority = 'Alta' | 'Média' | 'Baixa';

export interface RankedAssessment extends SubprocessAssessment {
  rank: number;
  priority: Priority;
  priorityColor: string;   // Tailwind text color class
  barColor: string;        // Tailwind bg color class
  badgeColor: string;      // Tailwind badge class set
  scorePercent: number;    // 0–100 for progress bars
  /** Natural-log of annualHours+1 — normalized operational impact for matrix/roadmap. */
  impactScore: number;
  /** automationScore × log(annualHours + 1) — composite ranking metric. */
  priorityScore: number;
}

export interface ChartDataPoint {
  name: string;
  score: number;
  fill: string;            // hex color for Recharts
}

const MAX_SCORE = 24;

/** Normalized operational impact: log(annualHours + 1). */
export function computeImpactScore(annualHours: number): number {
  return Math.log(annualHours + 1);
}

/** Composite priority: automationScore × log(annualHours + 1). */
export function computePriorityScore(automationScore: number, annualHours: number): number {
  return automationScore * Math.log(annualHours + 1);
}

function getPriority(score: number): Priority {
  if (score >= 18) return 'Alta';  // ≥ 75% of 24
  if (score >= 12) return 'Média'; // ≥ 50% of 24
  return 'Baixa';
}

function getPriorityColors(priority: Priority) {
  switch (priority) {
    case 'Alta':
      return {
        priorityColor: 'text-red-600',
        barColor: 'bg-red-500',
        badgeColor: 'bg-red-100 text-red-700 border-red-200',
        chartFill: '#EF4444',
      };
    case 'Média':
      return {
        priorityColor: 'text-orange-500',
        barColor: 'bg-orange-400',
        badgeColor: 'bg-orange-100 text-orange-700 border-orange-200',
        chartFill: '#F59E0B',
      };
    default:
      return {
        priorityColor: 'text-gray-500',
        barColor: 'bg-gray-400',
        badgeColor: 'bg-gray-100 text-gray-600 border-gray-200',
        chartFill: '#9CA3AF',
      };
  }
}

/**
 * Sort assessments by priorityScore descending and enrich with ranking metadata.
 * priorityScore = automationScore × log(annualHours + 1)
 * impactScore   = log(annualHours + 1)
 * Priority label (Alta/Média/Baixa) continues to derive from totalScore for display consistency.
 */
export function buildRanking(assessments: SubprocessAssessment[]): RankedAssessment[] {
  return [...assessments]
    .map((assessment) => ({
      ...assessment,
      impactScore: computeImpactScore(assessment.annualHours),
      priorityScore: computePriorityScore(assessment.automationScore, assessment.annualHours),
    }))
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .map((assessment, idx) => {
      const priority = getPriority(assessment.totalScore);
      const colors = getPriorityColors(priority);
      return {
        ...assessment,
        rank: idx + 1,
        priority,
        priorityColor: colors.priorityColor,
        barColor: colors.barColor,
        badgeColor: colors.badgeColor,
        scorePercent: Math.round((assessment.totalScore / MAX_SCORE) * 100),
      };
    });
}

/** Prepare a chart-friendly array (truncated to top N for readability). */
export function buildChartData(ranked: RankedAssessment[], topN = 10): ChartDataPoint[] {
  return ranked.slice(0, topN).map((r) => {
    const priority = getPriority(r.totalScore);
    const colors = getPriorityColors(priority);
    return {
      name: r.subprocessName.length > 28
        ? r.subprocessName.slice(0, 26) + '…'
        : r.subprocessName,
      score: r.totalScore,
      fill: colors.chartFill,
    };
  });
}

/** Summary counts by priority tier. */
export function buildPrioritySummary(ranked: RankedAssessment[]) {
  return {
    alta: ranked.filter((r) => r.priority === 'Alta').length,
    media: ranked.filter((r) => r.priority === 'Média').length,
    baixa: ranked.filter((r) => r.priority === 'Baixa').length,
  };
}
