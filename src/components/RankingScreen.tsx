'use client';

import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { SubprocessAssessment, CRITERIA } from '@/types';
import { buildRanking, buildChartData, buildPrioritySummary, RankedAssessment } from '@/lib/ranking';

interface Props {
  assessments: SubprocessAssessment[];
  onExport: () => void;
  onRestart: () => void;
}

function CustomTooltip({ active, payload }: {
  active?: boolean;
  payload?: Array<{ payload: { name: string; score: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-800 mb-1 max-w-[220px] leading-snug">{d.name}</p>
      <p className="text-blue-600 font-bold">Score: {d.score} / 30</p>
    </div>
  );
}

function DetailModal({ item, onClose }: { item: RankedAssessment; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-1">
              {item.macroprocessName} › {item.processName}
            </p>
            <h3 className="text-lg font-bold text-gray-900">{item.subprocessName}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors ml-4 flex-shrink-0 text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <span className={`text-2xl font-extrabold ${item.priorityColor}`}>
            {item.totalScore}
            <span className="text-base font-normal text-gray-400">/30</span>
          </span>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${item.badgeColor}`}>
            {item.priority} Prioridade
          </span>
        </div>

        <div className="space-y-3">
          {CRITERIA.map((c) => {
            const score = item.scores[c.key];
            const pct = (score / 5) * 100;
            const barCls = score >= 4 ? 'bg-red-500' : score >= 3 ? 'bg-yellow-400' : 'bg-gray-400';
            return (
              <div key={c.key}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600 font-medium">{c.label}</span>
                  <span className="font-bold text-gray-800">{score}/5</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className={`${barCls} h-2 rounded-full`} style={{ width: `${pct}%` }} />
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
  const top3 = ranked.slice(0, 3);

  const handleExport = async () => {
    setExporting(true);
    await onExport();
    setExporting(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">

      {/* ── Page title ───────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Oportunidades de Eficiência Operacional
          </h2>
          <p className="text-gray-500 mt-2 max-w-2xl text-sm leading-relaxed">
            Subprocessos com maiores scores indicam maior potencial de melhoria operacional.
            Os resultados abaixo foram ordenados do maior para o menor score.
          </p>
        </div>
        <div className="flex gap-3 ml-6 flex-shrink-0">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="bg-white border border-gray-200 hover:border-blue-400 hover:text-blue-600 text-gray-600 font-medium px-4 py-2.5 rounded-lg text-sm transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? 'Exportando...' : 'Exportar Excel'}
          </button>
          <button
            onClick={onRestart}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-lg text-sm transition-colors"
          >
            Nova Avaliação
          </button>
        </div>
      </div>

      {/* ── Summary cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4 mt-8 mb-8">
        {[
          { label: 'Alta Prioridade',  count: summary.alta,  bg: 'bg-red-50    border-red-100',    text: 'text-red-600',    bar: 'bg-red-500' },
          { label: 'Média Prioridade', count: summary.media, bg: 'bg-orange-50 border-orange-100', text: 'text-orange-600', bar: 'bg-orange-400' },
          { label: 'Baixa Prioridade', count: summary.baixa, bg: 'bg-gray-50   border-gray-200',   text: 'text-gray-600',   bar: 'bg-gray-400' },
        ].map((card) => (
          <div key={card.label} className={`${card.bg} border rounded-xl p-4`}>
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full ${card.bar}`} />
              <span className="text-xs text-gray-500 font-medium">{card.label}</span>
            </div>
            <p className={`text-3xl font-extrabold ${card.text}`}>{card.count}</p>
          </div>
        ))}
      </div>

      {/* ── Top Opportunities ───────────────────────────────────────── */}
      {top3.length > 0 && (
        <section className="mb-8">
          <h3 className="text-base font-semibold text-gray-800 mb-3">
            Principais Oportunidades
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {top3.map((item, i) => (
              <button
                key={item.subprocessId}
                onClick={() => setSelected(item)}
                className="text-left bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-blue-200 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    #{i + 1}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${item.badgeColor}`}>
                    {item.priority}
                  </span>
                </div>
                <p className="font-semibold text-gray-900 text-sm leading-snug mb-1">
                  {item.subprocessName}
                </p>
                <p className="text-xs text-gray-400 mb-3">
                  {item.macroprocessName} › {item.processName}
                </p>
                <p className={`text-2xl font-extrabold ${item.priorityColor}`}>
                  {item.totalScore}
                  <span className="text-sm font-normal text-gray-400">/30</span>
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Chart ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-8">
        <h3 className="font-semibold text-gray-800 mb-1">
          Score por Subprocesso{chartData.length < ranked.length ? ` (Top ${chartData.length})` : ''}
        </h3>
        <p className="text-xs text-gray-400 mb-5">Ordenado do maior para o menor score</p>
        <ResponsiveContainer width="100%" height={Math.max(260, chartData.length * 32)}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 24, left: 8, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
            <XAxis
              type="number"
              domain={[0, 30]}
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={190}
              tick={{ fontSize: 11, fill: '#6B7280' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F9FAFB' }} />
            <Bar dataKey="score" radius={[0, 4, 4, 0]} maxBarSize={20}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Ranking table ───────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Ranking Detalhado</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Clique em um item para ver o detalhamento por critério
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-10">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Macroprocesso</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Processo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Subprocesso</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Score</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">Prioridade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ranked.map((item) => (
                <tr
                  key={item.subprocessId}
                  onClick={() => setSelected(item)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors group"
                >
                  {/* Rank */}
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex w-7 h-7 items-center justify-center rounded-full text-xs font-bold
                      ${item.rank <= 3 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                      {item.rank}
                    </span>
                  </td>

                  {/* Macroprocess */}
                  <td className="px-4 py-3.5 text-gray-500 text-xs">
                    {item.macroprocessName}
                  </td>

                  {/* Process */}
                  <td className="px-4 py-3.5 text-gray-500 text-xs">
                    {item.processName}
                  </td>

                  {/* Subprocess */}
                  <td className="px-4 py-3.5">
                    <span className="font-medium text-gray-800 group-hover:text-blue-600 transition-colors">
                      {item.subprocessName}
                    </span>
                  </td>

                  {/* Score */}
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className={`font-extrabold ${item.priorityColor}`}>
                        {item.totalScore}
                        <span className="text-xs font-normal text-gray-400">/30</span>
                      </span>
                      <div className="w-16 bg-gray-100 rounded-full h-1">
                        <div
                          className={`${item.barColor} h-1 rounded-full`}
                          style={{ width: `${item.scorePercent}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Priority */}
                  <td className="px-4 py-3.5 text-center">
                    <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full border ${item.badgeColor}`}>
                      {item.priority} Prioridade
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && <DetailModal item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
