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
        <button
          onClick={onBack}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors mb-4 block"
        >
          ← Voltar para processos
        </button>

        <p className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-1">
          {macroprocess.name} › {process.name}
        </p>
        <h2 className="text-2xl font-bold text-gray-900">Selecione os Subprocessos</h2>
        <p className="text-gray-500 mt-1">Escolha um ou mais subprocessos para avaliar</p>
      </div>

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
              {/* Checkbox — filled box when selected, empty when not */}
              <div
                className={`w-5 h-5 rounded border-2 flex-shrink-0 transition-all
                  ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'}`}
              />
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
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white disabled:text-gray-400 font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm"
        >
          Iniciar Avaliação
        </button>
      </div>
    </div>
  );
}
