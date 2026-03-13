/**
 * Ranking Module
 *
 * Responsible for:
 * - Sorting subprocesses by priorityScore (descending)
 * - Assigning priority labels (Alta / Média / Baixa) based on totalScore
 * - Computing priority color tokens for UI and charts
 * - Preparing chart-ready data arrays
 *
 * priorityScore and impactScore come from SubprocessAssessment (0–100, see scoring.ts).
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
  // impactScore and priorityScore (0–100) are inherited from SubprocessAssessment
}

export interface ChartDataPoint {
  name: string;
  score: number;
  fill: string;            // hex color for Recharts
}

const MAX_SCORE = 24;


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
 * Sort assessments by priorityScore (0–100, from scoring.ts) descending and enrich with
 * ranking metadata.  Priority label (Alta/Média/Baixa) still derives from totalScore for
 * display consistency with the weighted-score scale.
 */
export function buildRanking(assessments: SubprocessAssessment[]): RankedAssessment[] {
  return [...assessments]
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
