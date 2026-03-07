'use client';

import { Macroprocess, Process } from '@/types';

interface Props {
  macroprocess: Macroprocess;
  onSelect: (process: Process) => void;
  onBack: () => void;
}

export default function ProcessSelector({ macroprocess, onSelect, onBack }: Props) {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-4 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar para macroprocessos
        </button>

        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">{macroprocess.icon}</span>
          <div>
            <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">{macroprocess.name}</p>
            <h2 className="text-2xl font-bold text-gray-900">Selecione o Processo</h2>
          </div>
        </div>
        <p className="text-gray-500">Escolha o processo dentro de {macroprocess.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {macroprocess.processes.map((process) => (
          <button
            key={process.id}
            onClick={() => onSelect(process)}
            className="group bg-white rounded-xl border border-gray-200 p-5 text-left hover:border-blue-400 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                  {process.name}
                </h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {process.subprocesses.map((sp) => (
                    <span key={sp.id} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md">
                      {sp.name}
                    </span>
                  ))}
                </div>
              </div>
              <div className="ml-4 flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              {process.subprocesses.length} subprocesso{process.subprocesses.length !== 1 ? 's' : ''}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
