/**
 * Ranking Module
 *
 * Responsible for:
 * - Sorting subprocesses by total score (descending)
 * - Assigning priority labels (Alta / Média / Baixa)
 * - Computing priority color tokens for UI and charts
 * - Preparing chart-ready data arrays
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
}

export interface ChartDataPoint {
  name: string;
  score: number;
  fill: string;            // hex color for Recharts
}

const MAX_SCORE = 30;

function getPriority(score: number): Priority {
  const pct = score / MAX_SCORE;
  if (pct >= 0.75) return 'Alta';
  if (pct >= 0.5) return 'Média';
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

/** Sort assessments by score descending and enrich with ranking metadata. */
export function buildRanking(assessments: SubprocessAssessment[]): RankedAssessment[] {
  return [...assessments]
    .sort((a, b) => b.totalScore - a.totalScore)
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
