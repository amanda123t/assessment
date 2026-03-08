'use client';

import { useState } from 'react';
import {
  ChevronRight, ChevronDown,
  DollarSign, ShoppingCart, TrendingUp, Users,
  Truck, UserCog, ShieldCheck, LucideIcon,
  Plus, X, AlertCircle,
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
}

function CustomForm({
  onSubmit,
  onClose,
}: {
  onSubmit: (item: SelectedSubprocessItem) => void;
  onClose: () => void;
}) {
  const [macroId, setMacroId] = useState('');
  const [procId, setProcId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const selectedMacro = processLibrary.find((m) => m.id === macroId);
  const selectedProc = selectedMacro?.processes.find((p) => p.id === procId);
  const canSubmit = macroId && procId && name.trim().length > 0;

  const handleMacroChange = (id: string) => {
    setMacroId(id);
    setProcId(''); // reset process when macroprocess changes
  };

  const handleSubmit = () => {
    if (!canSubmit || !selectedMacro || !selectedProc) return;
    const customId = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const item: SelectedSubprocessItem = {
      macroprocess: selectedMacro,
      process: selectedProc,
      subprocess: {
        id: customId,
        code: 'CUSTOM',
        name: name.trim(),
        process: selectedProc.name,
        macroprocess: selectedMacro.name,
        category: 'custom',
      },
      isCustom: true,
    };
    // Attach description as a non-breaking side property if needed in future
    void description;
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
            <h3 className="text-base font-bold text-gray-900">Adicionar subprocesso personalizado</h3>
            <p className="text-xs text-gray-400 mt-0.5">Preencha os dados abaixo para incluir na avaliação</p>
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
          {/* Macroprocess */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Macroprocesso <span className="text-red-400">*</span>
            </label>
            <select
              value={macroId}
              onChange={(e) => handleMacroChange(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">Selecione...</option>
              {processLibrary.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Process */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Processo <span className="text-red-400">*</span>
            </label>
            <select
              value={procId}
              onChange={(e) => setProcId(e.target.value)}
              disabled={!selectedMacro}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="">Selecione...</option>
              {selectedMacro?.processes.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Subprocess name */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Nome do subprocesso <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Validação manual de reembolsos"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={100}
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

export default function SubprocessExplorer({
  selectedIds,
  customSubprocesses,
  onToggle,
  onToggleAll,
  onAddCustom,
  onRemoveCustom,
  onBack,
}: Props) {
  const [expandedMacros, setExpandedMacros] = useState<Set<string>>(new Set());
  const [expandedProcesses, setExpandedProcesses] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);

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
      <div className="mb-8">
        <button
          onClick={onBack}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors mb-4 block"
        >
          ← Voltar ao início
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
          const selectedInMacro = macro.processes.reduce(
            (acc, p) => acc + p.subprocesses.filter((sp) => selectedIds.has(sp.id)).length,
            0
          );

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
                    const selectedInProc = proc.subprocesses.filter((sp) => selectedIds.has(sp.id)).length;
                    const allInProcSelected =
                      proc.subprocesses.length > 0 &&
                      proc.subprocesses.every((sp) => selectedIds.has(sp.id));

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
                          {selectedInProc > 0 && (
                            <span className="text-xs text-blue-600 font-semibold mr-2">
                              {selectedInProc}/{proc.subprocesses.length}
                            </span>
                          )}
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {proc.subprocesses.length} subprocesso{proc.subprocesses.length !== 1 ? 's' : ''}
                          </span>
                        </button>

                        {/* ── Subprocesses (visible when process expanded) ── */}
                        {isProcExpanded && (
                          <div className="pb-2 bg-gray-50/50">
                            {/* Toggle-all row */}
                            <div className="pl-16 pr-5 pt-2 pb-1">
                              <button
                                onClick={() => onToggleAll(proc.subprocesses, macro, proc, !allInProcSelected)}
                                className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                              >
                                {allInProcSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                              </button>
                            </div>

                            {proc.subprocesses.map((sp) => {
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

      {/* ── Custom subprocesses section ────────────────────────────────── */}
      {customSubprocesses.length > 0 && (
        <div className="mt-2 bg-white rounded-xl border border-blue-100 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 bg-blue-50/60 border-b border-blue-100">
            <span className="font-bold text-gray-800 text-xs uppercase tracking-widest flex-1">
              Subprocessos Personalizados
            </span>
            <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {customSubprocesses.length}
            </span>
          </div>
          {customSubprocesses.map((item) => (
            <div
              key={item.subprocess.id}
              className="flex items-center gap-3 pl-5 pr-4 py-3 border-b border-gray-50 last:border-b-0 bg-blue-50/20"
            >
              {/* Checked box — always selected */}
              <div className="w-4 h-4 rounded border-2 bg-blue-600 border-blue-600 flex-shrink-0" />
              <span className="text-sm text-blue-700 font-medium flex-1">
                {item.subprocess.name}
              </span>
              <span className="text-xs text-gray-400 hidden sm:block">
                {item.macroprocess.name} › {item.process.name}
              </span>
              <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0">
                Custom
              </span>
              <button
                onClick={() => onRemoveCustom(item.subprocess.id)}
                className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 ml-1"
                aria-label="Remover subprocesso personalizado"
              >
                <X size={14} strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Add custom subprocess button ───────────────────────────────── */}
      <div className="mt-4">
        {atLimit ? (
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-5 py-3">
            <AlertCircle size={15} className="flex-shrink-0" strokeWidth={1.75} />
            Você atingiu o limite máximo de {MAX_CUSTOM} subprocessos personalizados.
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium border border-dashed border-blue-300 hover:border-blue-400 hover:bg-blue-50/50 rounded-xl px-5 py-3 w-full transition-all"
          >
            <Plus size={15} strokeWidth={2} />
            Adicionar subprocesso personalizado
            <span className="ml-auto text-xs text-gray-400 font-normal">
              {customSubprocesses.length}/{MAX_CUSTOM}
            </span>
          </button>
        )}
      </div>

      {showForm && (
        <CustomForm
          onSubmit={onAddCustom}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
