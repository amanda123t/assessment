'use client';

import { useState } from 'react';
import {
  ChevronRight, ChevronDown,
  DollarSign, ShoppingCart, TrendingUp, Users,
  Truck, UserCog, ShieldCheck, LucideIcon,
} from 'lucide-react';
import { Macroprocess, Process, Subprocess } from '@/types';
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

interface Props {
  selectedIds: Set<string>;
  onToggle: (subprocess: Subprocess, macroprocess: Macroprocess, process: Process) => void;
  onToggleAll: (subprocesses: Subprocess[], macroprocess: Macroprocess, process: Process, selectAll: boolean) => void;
  onBack: () => void;
}

export default function SubprocessExplorer({ selectedIds, onToggle, onToggleAll, onBack }: Props) {
  const [expandedMacros, setExpandedMacros] = useState<Set<string>>(new Set());
  const [expandedProcesses, setExpandedProcesses] = useState<Set<string>>(new Set());

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
    </div>
  );
}
