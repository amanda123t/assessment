'use client';

import { useState } from 'react';
import {
  ChevronRight, ChevronDown,
  DollarSign, ShoppingCart, TrendingUp, Users,
  Truck, UserCog, ShieldCheck, LucideIcon,
  Plus, X,
} from 'lucide-react';
import { Macroprocess, Process, Subprocess, SelectedSubprocessItem } from '@/types';
import { processLibrary } from '@/data/processLibrary';

const MACRO_ICONS: Record<string, LucideIcon> = {
  'finance':         DollarSign,
  'procurement':     ShoppingCart,
  'sales':           TrendingUp,
  'customer-ops':    Users,
  'supply-chain':    Truck,
  'human-resources': UserCog,
  'governance':      ShieldCheck,
};

const MAX_CUSTOM = 3;

interface Props {
  selectedIds: Set<string>;
  customSubprocesses: SelectedSubprocessItem[];
  onToggle: (subprocess: Subprocess, macroprocess: Macroprocess, process: Process) => void;
  onToggleAll: (subprocesses: Subprocess[], macroprocess: Macroprocess, process: Process, selectAll: boolean) => void;
  onAddCustom: (item: SelectedSubprocessItem) => void;
  onRemoveCustom: (subprocessId: string) => void;
  onBack: () => void;
  lockedSubprocessIds?: Set<string>;
}

// ── Modal: create a custom subprocess for a specific process ──────────────

function CustomForm({
  macroprocess,
  process,
  onSubmit,
  onClose,
}: {
  macroprocess: Macroprocess;
  process: Process;
  onSubmit: (item: SelectedSubprocessItem) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const canSubmit = name.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const customId = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const item: SelectedSubprocessItem = {
      macroprocess,
      process,
      subprocess: {
        id: customId,
        code: 'CUSTOM',
        name: name.trim(),
        process: process.name,
        macroprocess: macroprocess.name,
        category: 'custom',
      },
      isCustom: true,
    };
    void description; // preserved for future use
    onSubmit(item);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-gray-900">Novo subprocesso</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {macroprocess.name} › {process.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors ml-4 flex-shrink-0"
            aria-label="Fechar"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Name (required) */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Nome do subprocesso <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="Ex: Conciliação manual de PIX"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={100}
              autoFocus
            />
          </div>

          {/* Description (optional) */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Descrição <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva brevemente o subprocesso..."
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              maxLength={250}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white disabled:text-gray-400 font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export default function SubprocessExplorer({
  selectedIds,
  customSubprocesses,
  onToggle,
  onToggleAll,
  onAddCustom,
  onRemoveCustom,
  onBack,
  lockedSubprocessIds = new Set(),
}: Props) {
  const [expandedMacros, setExpandedMacros] = useState<Set<string>>(new Set());
  const [expandedProcesses, setExpandedProcesses] = useState<Set<string>>(new Set());
  const [showFormFor, setShowFormFor] = useState<{ macro: Macroprocess; proc: Process } | null>(null);

  const toggleMacro = (id: string) => {
    setExpandedMacros((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleProcess = (id: string) => {
    setExpandedProcesses((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const atLimit = customSubprocesses.length >= MAX_CUSTOM;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors mb-4 block"
        >
          ← Voltar
        </button>
        <h2 className="text-2xl font-bold text-gray-900">Selecione os Subprocessos</h2>
        <p className="text-gray-500 mt-1">
          Expanda qualquer área e selecione subprocessos — as seleções acumulam globalmente
        </p>
      </div>

      {/* Collapsible tree */}
      <div className="space-y-2">
        {processLibrary.map((macro) => {
          const Icon = MACRO_ICONS[macro.id];
          const isMacroExpanded = expandedMacros.has(macro.id);

          // Count standard selections + custom items in this macro (excluding locked)
          const standardSelectedInMacro = macro.processes.reduce(
            (acc, p) => acc + p.subprocesses.filter((sp) => !lockedSubprocessIds.has(sp.id) && selectedIds.has(sp.id)).length,
            0
          );
          const customInMacro = customSubprocesses.filter((c) => c.macroprocess.id === macro.id).length;
          const selectedInMacro = standardSelectedInMacro + customInMacro;

          return (
            <div key={macro.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">

              {/* ── Macroprocess row ── */}
              <button
                onClick={() => toggleMacro(macro.id)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
              >
                {isMacroExpanded
                  ? <ChevronDown size={15} className="text-gray-400 flex-shrink-0" />
                  : <ChevronRight size={15} className="text-gray-400 flex-shrink-0" />
                }
                {Icon && (
                  <Icon size={15} strokeWidth={1.75} className="text-blue-500 flex-shrink-0" />
                )}
                <span className="font-bold text-gray-800 text-xs uppercase tracking-widest flex-1">
                  {macro.name}
                </span>
                {selectedInMacro > 0 && (
                  <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full mr-2">
                    {selectedInMacro}
                  </span>
                )}
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {macro.processes.length} processo{macro.processes.length !== 1 ? 's' : ''}
                </span>
              </button>

              {/* ── Processes (visible when macro expanded) ── */}
              {isMacroExpanded && (
                <div className="border-t border-gray-100">
                  {macro.processes.map((proc) => {
                    const isProcExpanded = expandedProcesses.has(proc.id);

                    // Custom subprocesses that belong to this specific process
                    const procCustoms = customSubprocesses.filter(
                      (c) => c.macroprocess.id === macro.id && c.process.id === proc.id
                    );

                    const visibleSubprocesses = proc.subprocesses.filter(
                      (sp) => !lockedSubprocessIds.has(sp.id)
                    );

                    const standardSelectedInProc = visibleSubprocesses.filter((sp) => selectedIds.has(sp.id)).length;
                    const totalSelectedInProc = standardSelectedInProc + procCustoms.length;
                    const totalInProc = visibleSubprocesses.length + procCustoms.length;

                    const allStandardSelected =
                      visibleSubprocesses.length > 0 &&
                      visibleSubprocesses.every((sp) => selectedIds.has(sp.id));

                    return (
                      <div key={proc.id} className="border-b border-gray-50 last:border-b-0">

                        {/* ── Process row ── */}
                        <button
                          onClick={() => toggleProcess(proc.id)}
                          className="w-full flex items-center gap-3 pl-10 pr-5 py-3 text-left hover:bg-gray-50 transition-colors"
                        >
                          {isProcExpanded
                            ? <ChevronDown size={13} className="text-gray-300 flex-shrink-0" />
                            : <ChevronRight size={13} className="text-gray-300 flex-shrink-0" />
                          }
                          <span className="text-sm font-medium text-gray-700 flex-1">{proc.name}</span>
                          {totalSelectedInProc > 0 && (
                            <span className="text-xs text-blue-600 font-semibold mr-2">
                              {totalSelectedInProc}/{totalInProc}
                            </span>
                          )}
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {totalInProc} subprocesso{totalInProc !== 1 ? 's' : ''}
                          </span>
                        </button>

                        {/* ── Subprocesses (visible when process expanded) ── */}
                        {isProcExpanded && (
                          <div className="pb-2 bg-gray-50/50">
                            {/* Toggle-all row (visible standard subprocesses only) */}
                            {visibleSubprocesses.length > 0 && (
                              <div className="pl-16 pr-5 pt-2 pb-1">
                                <button
                                  onClick={() => onToggleAll(visibleSubprocesses, macro, proc, !allStandardSelected)}
                                  className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                                >
                                  {allStandardSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                                </button>
                              </div>
                            )}

                            {/* Standard subprocesses (locked ones hidden) */}
                            {visibleSubprocesses.map((sp) => {
                              const isSelected = selectedIds.has(sp.id);
                              return (
                                <button
                                  key={sp.id}
                                  onClick={() => onToggle(sp, macro, proc)}
                                  className={`w-full flex items-center gap-3 pl-16 pr-5 py-2.5 text-left transition-colors
                                    ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-100'}`}
                                >
                                  <div
                                    className={`w-4 h-4 rounded border-2 flex-shrink-0 transition-all
                                      ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'}`}
                                  />
                                  <span className={`text-sm ${isSelected ? 'text-blue-700 font-medium' : 'text-gray-600'}`}>
                                    {sp.name}
                                  </span>
                                </button>
                              );
                            })}

                            {/* Custom subprocesses — inline under this process */}
                            {procCustoms.map((item) => (
                              <div
                                key={item.subprocess.id}
                                className="flex items-center gap-3 pl-16 pr-5 py-2.5 bg-blue-50/40"
                              >
                                {/* Always-selected indicator */}
                                <div className="w-4 h-4 rounded border-2 bg-blue-600 border-blue-600 flex-shrink-0" />
                                <span className="text-sm text-blue-700 font-medium flex-1">
                                  {item.subprocess.name}
                                </span>
                                <span className="text-xs text-blue-500 font-medium flex-shrink-0">
                                  (custom)
                                </span>
                                <button
                                  onClick={() => onRemoveCustom(item.subprocess.id)}
                                  className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 ml-1"
                                  aria-label="Remover subprocesso personalizado"
                                >
                                  <X size={13} strokeWidth={2} />
                                </button>
                              </div>
                            ))}

                            {/* Per-process add button */}
                            <div className="pl-16 pr-5 pt-2 pb-1">
                              <button
                                onClick={() => !atLimit && setShowFormFor({ macro, proc })}
                                disabled={atLimit}
                                className={`flex items-center gap-1.5 text-xs font-medium transition-colors
                                  ${atLimit
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : 'text-blue-500 hover:text-blue-700'
                                  }`}
                              >
                                <Plus size={12} strokeWidth={2.5} />
                                Adicionar subprocesso personalizado
                                <span className={`ml-0.5 font-normal ${atLimit ? 'text-gray-300' : 'text-gray-400'}`}>
                                  ({customSubprocesses.length}/{MAX_CUSTOM})
                                </span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Custom subprocess creation modal */}
      {showFormFor && (
        <CustomForm
          macroprocess={showFormFor.macro}
          process={showFormFor.proc}
          onSubmit={onAddCustom}
          onClose={() => setShowFormFor(null)}
        />
      )}
    </div>
  );
}
