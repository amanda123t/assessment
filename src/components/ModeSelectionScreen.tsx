'use client';

import { useState } from 'react';
import { User, Users, ArrowRight } from 'lucide-react';
import { DiagnosticMode } from '@/types';

interface Props {
  onConfirm: (mode: DiagnosticMode) => void;
}

export default function ModeSelectionScreen({ onConfirm }: Props) {
  const [mode, setMode] = useState<DiagnosticMode>('individual');

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Como deseja responder o diagnóstico?</h2>
        <p className="text-sm text-gray-500 mt-2">
          Escolha se você responderá sozinho ou se vai convidar especialistas da empresa para colaborar.
        </p>
      </div>

      {/* Options */}
      <div className="space-y-3 mb-10">

        {/* Individual */}
        <button
          onClick={() => setMode('individual')}
          className={`w-full flex items-start gap-4 p-5 rounded-xl border-2 text-left transition-all ${
            mode === 'individual'
              ? 'border-blue-600 bg-blue-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <div
            className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
              mode === 'individual' ? 'border-blue-600' : 'border-gray-300'
            }`}
          >
            {mode === 'individual' && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <User size={16} className="text-gray-600" strokeWidth={1.75} />
              <span className="font-semibold text-gray-800">Responder sozinho</span>
            </div>
            <p className="text-sm text-gray-500">
              Você responderá todos os subprocessos selecionados. Fluxo padrão, individual.
            </p>
          </div>
        </button>

        {/* Collaborative */}
        <button
          onClick={() => setMode('collaborative')}
          className={`w-full flex items-start gap-4 p-5 rounded-xl border-2 text-left transition-all ${
            mode === 'collaborative'
              ? 'border-violet-600 bg-violet-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <div
            className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
              mode === 'collaborative' ? 'border-violet-600' : 'border-gray-300'
            }`}
          >
            {mode === 'collaborative' && <div className="w-2.5 h-2.5 rounded-full bg-violet-600" />}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Users size={16} className="text-gray-600" strokeWidth={1.75} />
              <span className="font-semibold text-gray-800">Diagnóstico colaborativo</span>
            </div>
            <p className="text-sm text-gray-500">
              Convide especialistas da empresa para responder subprocessos específicos. Um link de acesso será gerado após a seleção.
            </p>
          </div>
        </button>
      </div>

      {/* Continue */}
      <div className="flex justify-end">
        <button
          onClick={() => onConfirm(mode)}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors shadow-sm"
        >
          Continuar
          <ArrowRight size={15} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
