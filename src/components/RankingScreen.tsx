'use client';

import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import { SubprocessAssessment, CRITERIA } from '@/types';
import { buildRanking, buildChartData, buildPrioritySummary, RankedAssessment } from '@/lib/ranking';

interface Props {
  assessments: SubprocessAssessment[];
  onExport: () => void;
  onRestart: () => void;
}

// Custom tooltip for the bar chart
function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; score: number } }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-800 mb-1 max-w-[200px] leading-tight">{d.name}</p>
      <p className="text-blue-600 font-bold">Score: {d.score} / 30</p>
    </div>
  );
}

function DetailModal({ item, onClose }: { item: RankedAssessment; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-1">
              {item.macroprocessName} › {item.processName}
            </p>
            <h3 className="text-lg font-bold text-gray-900">{item.subprocessName}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors ml-4 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div className={`text-2xl font-extrabold ${item.priorityColor}`}>{item.totalScore}<span className="text-base font-normal text-gray-400">/30</span></div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${item.badgeColor}`}>
            {item.priority} Prioridade
          </span>
        </div>

        <div className="space-y-3">
          {CRITERIA.map((c) => {
            const score = item.scores[c.key];
            const pct = (score / 5) * 100;
            const barCls = score >= 4 ? 'bg-red-500' : score >= 3 ? 'bg-yellow-400' : 'bg-green-500';
            return (
              <div key={c.key}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600 font-medium">{c.label}</span>
                  <span className="font-bold text-gray-800">{score}/5</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className={`${barCls} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function RankingScreen({ assessments, onExport, onRestart }: Props) {
  const [selected, setSelected] = useState<RankedAssessment | null>(null);
  const [exporting, setExporting] = useState(false);

  const ranked = buildRanking(assessments);
  const chartData = buildChartData(ranked);
  const summary = buildPrioritySummary(ranked);

  const handleExport = async () => {
    setExporting(true);
    await onExport();
    setExporting(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Page header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Resultados da Avaliação</h2>
          <p className="text-gray-500 mt-1">{ranked.length} subprocesso{ranked.length !== 1 ? 's' : ''} avaliado{ranked.length !== 1 ? 's' : ''} • ordenados por potencial de melhoria</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-2 bg-white border border-gray-200 hover:border-blue-400 hover:text-blue-600 text-gray-600 font-medium px-4 py-2.5 rounded-lg text-sm transition-all shadow-sm"
          >
            {exporting ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            )}
            Exportar Excel
          </button>
          <button
            onClick={onRestart}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-lg text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Nova Avaliação
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Alta Prioridade', count: summary.alta, color: 'bg-red-50 border-red-100', text: 'text-red-600', dot: 'bg-red-500' },
          { label: 'Média Prioridade', count: summary.media, color: 'bg-orange-50 border-orange-100', text: 'text-orange-600', dot: 'bg-orange-400' },
          { label: 'Baixa Prioridade', count: summary.baixa, color: 'bg-green-50 border-green-100', text: 'text-green-600', dot: 'bg-green-500' },
        ].map((card) => (
          <div key={card.label} className={`${card.color} border rounded-xl p-4`}>
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full ${card.dot}`} />
              <span className="text-xs text-gray-500 font-medium">{card.label}</span>
            </div>
            <p className={`text-3xl font-extrabold ${card.text}`}>{card.count}</p>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-8">
        <h3 className="font-semibold text-gray-800 mb-5 flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Score por Subprocesso {chartData.length < ranked.length ? `(Top ${chartData.length})` : ''}
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
            <XAxis type="number" domain={[0, 30]} tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="name"
              width={180}
              tick={{ fontSize: 11, fill: '#6B7280' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F9FAFB' }} />
            <ReferenceLine x={15} stroke="#E5E7EB" strokeDasharray="4 4" />
            <ReferenceLine x={22} stroke="#FECACA" strokeDasharray="4 4" />
            <Bar dataKey="score" radius={[0, 4, 4, 0]} maxBarSize={22}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-5 mt-3 justify-end text-xs text-gray-400">
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-gray-300 inline-block" style={{ borderTop: '1px dashed #E5E7EB' }} />Score 15 (50%)</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-red-200 inline-block" />Score 22 (75%)</span>
        </div>
      </div>

      {/* Ranking table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Ranking Detalhado</h3>
          <p className="text-xs text-gray-400 mt-0.5">Clique em um item para ver o detalhamento por critério</p>
        </div>
        <div className="divide-y divide-gray-50">
          {ranked.map((item) => (
            <button
              key={item.subprocessId}
              onClick={() => setSelected(item)}
              className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors text-left group"
            >
              {/* Rank */}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                ${item.rank <= 3 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {item.rank}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 text-sm truncate group-hover:text-blue-600 transition-colors">
                  {item.subprocessName}
                </p>
                <p className="text-xs text-gray-400 truncate mt-0.5">
                  {item.macroprocessName} › {item.processName}
                </p>
              </div>

              {/* Score bar */}
              <div className="w-32 hidden md:block">
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className={`${item.barColor} h-1.5 rounded-full transition-all`}
                    style={{ width: `${item.scorePercent}%` }}
                  />
                </div>
              </div>

              {/* Score */}
              <div className={`text-lg font-extrabold flex-shrink-0 w-16 text-right ${item.priorityColor}`}>
                {item.totalScore}
                <span className="text-xs font-normal text-gray-400">/30</span>
              </div>

              {/* Priority badge */}
              <span className={`hidden sm:inline-flex text-xs font-semibold px-2.5 py-1 rounded-full border flex-shrink-0 ${item.badgeColor}`}>
                {item.priority}
              </span>

              {/* Arrow */}
              <svg className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      {selected && <DetailModal item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
