'use client';

import { ListChecks, Trash2, PlayCircle } from 'lucide-react';

interface Props {
  count: number;
  onStart: () => void;
  onClear: () => void;
}

export default function SelectedSubprocessesPanel({ count, onStart, onClear }: Props) {
  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
        {/* Label */}
        <div className="flex items-center gap-2 min-w-0">
          <ListChecks size={16} className="text-blue-600 flex-shrink-0" strokeWidth={2} />
          <span className="text-sm font-semibold text-gray-800 truncate">
            Subprocessos selecionados{' '}
            <span
              className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold ml-1
                ${count > 0 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}
            >
              {count}
            </span>
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {count > 0 && (
            <button
              onClick={onClear}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
            >
              <Trash2 size={13} strokeWidth={2} />
              Limpar seleção
            </button>
          )}

          <button
            onClick={onStart}
            disabled={count === 0}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white disabled:text-gray-400 font-semibold px-4 py-1.5 rounded-lg transition-colors text-xs"
          >
            <PlayCircle size={14} strokeWidth={2} />
            Iniciar avaliação
          </button>
        </div>
      </div>
    </div>
  );
}
