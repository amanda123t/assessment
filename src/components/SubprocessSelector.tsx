'use client';

import { useState } from 'react';
import { Macroprocess, Process, Subprocess } from '@/types';

interface Props {
  macroprocess: Macroprocess;
  process: Process;
  onConfirm: (subprocesses: Subprocess[]) => void;
  onBack: () => void;
}

export default function SubprocessSelector({ macroprocess, process, onConfirm, onBack }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === process.subprocesses.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(process.subprocesses.map((s) => s.id)));
    }
  };

  const handleConfirm = () => {
    const chosen = process.subprocesses.filter((s) => selected.has(s.id));
    onConfirm(chosen);
  };

  const allSelected = selected.size === process.subprocesses.length;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-8">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-4 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar para processos
        </button>

        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{macroprocess.icon}</span>
          <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">
            {macroprocess.name} › {process.name}
          </p>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Selecione os Subprocessos</h2>
        <p className="text-gray-500 mt-1">Escolha um ou mais subprocessos para avaliar</p>
      </div>

      {/* Select all */}
      <div className="mb-3">
        <button
          onClick={toggleAll}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
        >
          {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
        </button>
      </div>

      <div className="space-y-2.5">
        {process.subprocesses.map((sp) => {
          const isSelected = selected.has(sp.id);
          return (
            <button
              key={sp.id}
              onClick={() => toggle(sp.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-150
                ${isSelected
                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }`}
            >
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all
                  ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}
              >
                {isSelected && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className={`font-medium text-sm ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
                {sp.name}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <span className="text-sm text-gray-500">
          {selected.size === 0
            ? 'Nenhum subprocesso selecionado'
            : `${selected.size} subprocesso${selected.size !== 1 ? 's' : ''} selecionado${selected.size !== 1 ? 's' : ''}`}
        </span>
        <button
          onClick={handleConfirm}
          disabled={selected.size === 0}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white disabled:text-gray-400 font-semibold px-6 py-2.5 rounded-lg transition-colors"
        >
          Iniciar Avaliação
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
