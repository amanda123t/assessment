'use client';

import { useState } from 'react';
import { User, Users, Copy, Check, ArrowRight } from 'lucide-react';
import { DiagnosticMode } from '@/types';

interface Props {
  diagnosticId: string;
  selectedCount: number;
  onConfirm: (mode: DiagnosticMode) => void;
}

export default function ModeSelectionScreen({ diagnosticId, selectedCount, onConfirm }: Props) {
  const [mode, setMode] = useState<DiagnosticMode>('solo');
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/assessment?diagnostic=${diagnosticId}`
      : `/assessment?diagnostic=${diagnosticId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard not available — silently ignore
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-1">
          {selectedCount} subprocesso{selectedCount !== 1 ? 's' : ''} selecionado{selectedCount !== 1 ? 's' : ''}
        </p>
        <h2 className="text-xl font-bold text-gray-900">Como deseja responder o diagnóstico?</h2>
        <p className="text-sm text-gray-500 mt-1">
          Você pode responder sozinho ou convidar colegas para responderem subprocessos específicos.
        </p>
      </div>

      {/* Mode options */}
      <div className="space-y-3 mb-8">

        {/* Solo */}
        <button
          onClick={() => setMode('solo')}
          className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${
            mode === 'solo'
              ? 'border-blue-600 bg-blue-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <div
            className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
              mode === 'solo' ? 'border-blue-600' : 'border-gray-300'
            }`}
          >
            {mode === 'solo' && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <User size={15} className="text-gray-600" strokeWidth={1.75} />
              <span className="font-semibold text-gray-800 text-sm">Responder sozinho</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Você responde todos os subprocessos selecionados. Fluxo padrão.
            </p>
          </div>
        </button>

        {/* Collaborative */}
        <button
          onClick={() => setMode('collaborative')}
          className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${
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
            <div className="flex items-center gap-2">
              <Users size={15} className="text-gray-600" strokeWidth={1.75} />
              <span className="font-semibold text-gray-800 text-sm">
                Convidar outras pessoas para responder subprocessos
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Gere um link e compartilhe com colegas. Cada pessoa escolhe e responde os subprocessos que lhe cabem.
            </p>
          </div>
        </button>
      </div>

      {/* Share link panel — only when collaborative is selected */}
      {mode === 'collaborative' && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 mb-6">
          <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide mb-3">
            Link do diagnóstico colaborativo
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white border border-violet-200 rounded-lg px-3 py-2 text-xs text-gray-600 font-mono truncate select-all">
              {shareUrl}
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors flex-shrink-0"
            >
              {copied ? (
                <><Check size={13} strokeWidth={2.5} /> Copiado</>
              ) : (
                <><Copy size={13} strokeWidth={1.75} /> Copiar link</>
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2.5">
            Compartilhe com sua equipe. Cada colaborador abre o link, seleciona e responde os subprocessos de sua área.
          </p>
        </div>
      )}

      {/* Continue */}
      <div className="flex justify-end">
        <button
          onClick={() => onConfirm(mode)}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors shadow-sm"
        >
          {mode === 'collaborative' ? 'Continuar respondendo' : 'Iniciar Avaliação'}
          <ArrowRight size={15} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
