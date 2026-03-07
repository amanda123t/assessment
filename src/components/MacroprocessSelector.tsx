'use client';

import { Macroprocess } from '@/types';
import { processLibrary } from '@/data/processLibrary';

interface Props {
  onSelect: (macroprocess: Macroprocess) => void;
  onBack: () => void;
}

export default function MacroprocessSelector({ onSelect, onBack }: Props) {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-4 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar ao início
        </button>
        <h2 className="text-2xl font-bold text-gray-900">Selecione o Macroprocesso</h2>
        <p className="text-gray-500 mt-1">Escolha a área funcional que deseja avaliar</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {processLibrary.map((macro) => (
          <button
            key={macro.id}
            onClick={() => onSelect(macro)}
            className="group bg-white rounded-xl border border-gray-200 p-5 text-left hover:border-blue-400 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
          >
            <div className="text-3xl mb-3">{macro.icon}</div>
            <h3 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors text-sm">
              {macro.name}
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              {macro.processes.length} processo{macro.processes.length !== 1 ? 's' : ''}
            </p>
            <div className="mt-3 flex items-center text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
              Selecionar
              <svg className="w-3 h-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
