'use client';

import { Macroprocess, Process, Subprocess } from '@/types';

interface Props {
  macroprocess: Macroprocess;
  process: Process;
  /** IDs that are currently selected in the global list. */
  selectedIds: Set<string>;
  onToggle: (subprocess: Subprocess) => void;
  onToggleAll: (subprocesses: Subprocess[], selectAll: boolean) => void;
  onBack: () => void;
}

export default function SubprocessSelector({
  macroprocess,
  process,
  selectedIds,
  onToggle,
  onToggleAll,
  onBack,
}: Props) {
  const allCurrentSelected =
    process.subprocesses.length > 0 &&
    process.subprocesses.every((sp) => selectedIds.has(sp.id));

  const handleToggleAll = () => {
    onToggleAll(process.subprocesses, !allCurrentSelected);
  };

  const selectedInProcess = process.subprocesses.filter((sp) => selectedIds.has(sp.id)).length;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-8">
        <button
          onClick={onBack}
          className="text-sm text-gray-500 hover:text-gray-600 transition-colors mb-4 block"
        >
          ← Voltar para processos
        </button>

        <p className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-1">
          {macroprocess.name} › {process.name}
        </p>
        <h2 className="text-2xl font-bold text-gray-900">Selecione os Subprocessos</h2>
        <p className="text-gray-500 mt-1">
          Escolha subprocessos de qualquer área — as seleções acumulam globalmente
        </p>
      </div>

      <div className="mb-3">
        <button
          onClick={handleToggleAll}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
        >
          {allCurrentSelected ? 'Desmarcar todos desta lista' : 'Selecionar todos desta lista'}
        </button>
      </div>

      <div className="space-y-2.5">
        {process.subprocesses.map((sp) => {
          const isSelected = selectedIds.has(sp.id);
          return (
            <button
              key={sp.id}
              onClick={() => onToggle(sp)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-150
                ${isSelected
                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }`}
            >
              {/* Checkbox */}
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

      <div className="mt-6 text-sm text-gray-500">
        {selectedInProcess === 0
          ? 'Nenhum subprocesso desta lista selecionado'
          : `${selectedInProcess} subprocesso${selectedInProcess !== 1 ? 's' : ''} desta lista selecionado${selectedInProcess !== 1 ? 's' : ''}`}
      </div>
    </div>
  );
}
