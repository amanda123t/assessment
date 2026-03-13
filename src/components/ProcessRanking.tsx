'use client';

import { RankedAssessment } from '@/lib/ranking';

interface Props {
  ranked: RankedAssessment[];
}

function getPriority(score: number): { label: string; className: string } {
  if (score >= 18) return { label: 'Alta',  className: 'bg-red-100 text-red-700 border-red-200' };
  if (score >= 12) return { label: 'Média', className: 'bg-orange-100 text-orange-700 border-orange-200' };
  return              { label: 'Baixa', className: 'bg-gray-100 text-gray-600 border-gray-200' };
}

export default function ProcessRanking({ ranked }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-8">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-800">Ranking de Processos</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Subprocessos ordenados por score total — do maior para o menor
        </p>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-10">#</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Processo</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Subprocesso</th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Score Total</th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Prioridade</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((item) => {
            const { label, className } = getPriority(item.totalScore);
            return (
              <tr
                key={item.subprocessId}
                className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors"
              >
                <td className="px-4 py-3">
                  <span className={`inline-flex w-7 h-7 items-center justify-center rounded-full text-xs font-bold ${
                    item.rank <= 3 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {item.rank}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <p className="text-xs text-gray-400">{item.macroprocessName}</p>
                  <p className="font-medium text-gray-800">{item.processName}</p>
                </td>
                <td className="px-4 py-3 text-gray-700">{item.subprocessName}</td>
                <td className="px-4 py-3 text-center">
                  <span className="font-extrabold text-gray-900">{item.totalScore}</span>
                  <span className="text-xs text-gray-400">/24</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full border ${className}`}>
                    {label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
