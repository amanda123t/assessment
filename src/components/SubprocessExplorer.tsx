'use client';

import { useState, useEffect } from 'react';
import {
  ChevronRight, ChevronDown,
  DollarSign, ShoppingCart, TrendingUp, Users,
  Truck, UserCog, ShieldCheck, LucideIcon,
  Plus, X, Layers,
} from 'lucide-react';
import { Macroprocess, Process, Subprocess, SelectedSubprocessItem, CustomArea, CustomAreaProcess, CustomAreaSubprocess } from '@/types';
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
  /** Pre-existing custom areas to restore on mount (e.g. after resume / share link). */
  initialCustomAreas?: CustomArea[];
  /** Called whenever the custom areas list changes so the parent can persist it. */
  onCustomAreasChange?: (areas: CustomArea[]) => void;
}

// ── Modal: create a custom subprocess for an existing library process ─────────

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
    void description;
    onSubmit(item);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-gray-900">Novo subprocesso</h3>
            <p className="text-xs text-gray-400 mt-0.5">{macroprocess.name} › {process.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors ml-4 flex-shrink-0">
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Nome do subprocesso <span className="text-red-400">*</span>
            </label>
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="Ex: Conciliação manual de PIX"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={100} autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Descrição <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva brevemente o subprocesso..." rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              maxLength={250}
            />
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium px-4 py-2 rounded-lg text-sm transition-colors">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={!canSubmit}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white disabled:text-gray-400 font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal: create a new custom area with processes and subprocesses ────────────

function NewAreaForm({
  onSubmit,
  onClose,
}: {
  onSubmit: (area: CustomArea) => void;
  onClose: () => void;
}) {
  const [areaName, setAreaName] = useState('');
  const [procName, setProcName] = useState('');
  const [spInput, setSpInput] = useState('');
  const [subprocesses, setSubprocesses] = useState<string[]>([]);

  const addSubprocess = () => {
    const trimmed = spInput.trim();
    if (!trimmed) return;
    setSubprocesses(prev => [...prev, trimmed]);
    setSpInput('');
  };

  const removeSubprocess = (idx: number) => {
    setSubprocesses(prev => prev.filter((_, i) => i !== idx));
  };

  const canSubmit = areaName.trim().length > 0 && procName.trim().length > 0 && subprocesses.length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const areaId = `custom-area-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const procId = `custom-proc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const area: CustomArea = {
      id: areaId,
      name: areaName.trim(),
      processes: [{
        id: procId,
        name: procName.trim(),
        subprocesses: subprocesses.map((name, i) => ({
          id: `custom-sp-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
          name,
        })),
      }],
    };
    onSubmit(area);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-gray-900">Nova área personalizada</h3>
            <p className="text-xs text-gray-400 mt-0.5">Crie uma área com seus próprios processos e subprocessos</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors ml-4 flex-shrink-0">
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        <div className="space-y-5">
          {/* Area name */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Nome da área <span className="text-red-400">*</span>
            </label>
            <input
              type="text" value={areaName} onChange={(e) => setAreaName(e.target.value)}
              placeholder="Ex: Jurídico, TI, Compliance..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={80} autoFocus
            />
          </div>

          {/* Process name */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Nome do processo <span className="text-red-400">*</span>
            </label>
            <input
              type="text" value={procName} onChange={(e) => setProcName(e.target.value)}
              placeholder="Ex: Gestão de contratos, Suporte técnico..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={80}
            />
          </div>

          {/* Subprocesses */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Subprocessos <span className="text-red-400">*</span>
              <span className="text-gray-400 font-normal ml-1">(adicione ao menos 1)</span>
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text" value={spInput} onChange={(e) => setSpInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addSubprocess()}
                placeholder="Nome do subprocesso..."
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={100}
              />
              <button
                onClick={addSubprocess} disabled={!spInput.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white disabled:text-gray-400 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
              >
                <Plus size={14} strokeWidth={2.5} />
                Adicionar
              </button>
            </div>
            {subprocesses.length > 0 && (
              <ul className="space-y-1.5">
                {subprocesses.map((sp, idx) => (
                  <li key={idx} className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2">
                    <div className="w-3 h-3 rounded-full bg-blue-600 flex-shrink-0" />
                    <span className="text-sm text-blue-700 font-medium flex-1">{sp}</span>
                    <button onClick={() => removeSubprocess(idx)} className="text-blue-300 hover:text-red-500 transition-colors">
                      <X size={13} strokeWidth={2} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium px-4 py-2 rounded-lg text-sm transition-colors">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={!canSubmit}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white disabled:text-gray-400 font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
            Criar área
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SubprocessExplorer({
  selectedIds,
  customSubprocesses,
  onToggle,
  onToggleAll,
  onAddCustom,
  onRemoveCustom,
  onBack,
  lockedSubprocessIds = new Set(),
  initialCustomAreas,
  onCustomAreasChange,
}: Props) {
  const [expandedMacros, setExpandedMacros]       = useState<Set<string>>(new Set());
  const [expandedProcesses, setExpandedProcesses] = useState<Set<string>>(new Set());
  const [showFormFor, setShowFormFor]             = useState<{ macro: Macroprocess; proc: Process } | null>(null);
  const [showNewAreaForm, setShowNewAreaForm]      = useState(false);
  const [customAreas, setCustomAreas]             = useState<CustomArea[]>(initialCustomAreas ?? []);
  const [expandedCustomAreas, setExpandedCustomAreas]       = useState<Set<string>>(
    new Set((initialCustomAreas ?? []).map(a => a.id))
  );
  const [expandedCustomProcesses, setExpandedCustomProcesses] = useState<Set<string>>(
    new Set((initialCustomAreas ?? []).flatMap(a => a.processes.map(p => p.id)))
  );
  const [showCustomSpFormFor, setShowCustomSpFormFor] = useState<string | null>(null); // procId

  // Notify parent whenever custom areas list changes
  useEffect(() => {
    onCustomAreasChange?.(customAreas);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customAreas]);

  const toggleMacro = (id: string) => {
    setExpandedMacros(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleProcess = (id: string) => {
    setExpandedProcesses(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleCustomArea = (id: string) => {
    setExpandedCustomAreas(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleCustomProcess = (id: string) => {
    setExpandedCustomProcesses(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const atLimit = customSubprocesses.length >= MAX_CUSTOM;

  // Build Macroprocess/Process objects from a CustomArea for use with onAddCustom
  const buildCustomMacro = (area: CustomArea): Macroprocess => ({
    id: area.id, name: area.name, icon: 'custom', processes: [],
  });
  const buildCustomProcess = (proc: CustomAreaProcess, area: CustomArea): Process => ({
    id: proc.id, name: proc.name,
    subprocesses: proc.subprocesses.map(sp => ({
      id: sp.id, code: 'CUSTOM', name: sp.name,
      process: proc.name, macroprocess: area.name, category: 'custom',
    })),
  });

  const isCustomSpSelected = (spId: string) =>
    customSubprocesses.some(c => c.subprocess.id === spId);

  const toggleCustomSp = (area: CustomArea, proc: CustomAreaProcess, sp: CustomAreaSubprocess) => {
    if (lockedSubprocessIds.has(sp.id)) return;
    const macro  = buildCustomMacro(area);
    const process = buildCustomProcess(proc, area);
    const subprocess: Subprocess = {
      id: sp.id, code: 'CUSTOM', name: sp.name,
      process: proc.name, macroprocess: area.name, category: 'custom',
    };
    if (isCustomSpSelected(sp.id)) {
      onRemoveCustom(sp.id);
    } else {
      onAddCustom({ macroprocess: macro, process, subprocess, isCustom: true });
    }
  };

  const handleNewArea = (area: CustomArea) => {
    setCustomAreas(prev => [...prev, area]);
    setExpandedCustomAreas(prev => { const n = new Set(prev); n.add(area.id); return n; });
    setExpandedCustomProcesses(prev => {
      const n = new Set(prev);
      area.processes.forEach(p => n.add(p.id));
      return n;
    });
    // Auto-select all subprocesses in the new area
    const macro = buildCustomMacro(area);
    area.processes.forEach(proc => {
      const process = buildCustomProcess(proc, area);
      proc.subprocesses.forEach(sp => {
        const subprocess: Subprocess = {
          id: sp.id, code: 'CUSTOM', name: sp.name,
          process: proc.name, macroprocess: area.name, category: 'custom',
        };
        onAddCustom({ macroprocess: macro, process, subprocess, isCustom: true });
      });
    });
  };

  const addSubprocessToCustomProc = (area: CustomArea, proc: CustomAreaProcess, item: SelectedSubprocessItem) => {
    // Add the subprocess to local state
    setCustomAreas(prev => prev.map(a => a.id !== area.id ? a : {
      ...a,
      processes: a.processes.map(p => p.id !== proc.id ? p : {
        ...p,
        subprocesses: [...p.subprocesses, { id: item.subprocess.id, name: item.subprocess.name }],
      }),
    }));
    onAddCustom(item);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-6">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 transition-colors mb-4 block">
          ← Voltar
        </button>
        <h2 className="text-2xl font-bold text-gray-900">Selecione os Subprocessos</h2>
        <p className="text-gray-500 mt-1">
          Expanda qualquer área e selecione subprocessos — as seleções acumulam globalmente
        </p>
      </div>

      {/* Collapsible tree — library areas */}
      <div className="space-y-2">
        {processLibrary.map((macro) => {
          const Icon = MACRO_ICONS[macro.id];
          const isMacroExpanded = expandedMacros.has(macro.id);
          const standardSelectedInMacro = macro.processes.reduce(
            (acc, p) => acc + p.subprocesses.filter((sp) => !lockedSubprocessIds.has(sp.id) && selectedIds.has(sp.id)).length, 0
          );
          const customInMacro = customSubprocesses.filter((c) => c.macroprocess.id === macro.id).length;
          const selectedInMacro = standardSelectedInMacro + customInMacro;

          return (
            <div key={macro.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleMacro(macro.id)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
              >
                {isMacroExpanded
                  ? <ChevronDown size={15} className="text-gray-400 flex-shrink-0" />
                  : <ChevronRight size={15} className="text-gray-400 flex-shrink-0" />
                }
                {Icon && <Icon size={15} strokeWidth={1.75} className="text-blue-500 flex-shrink-0" />}
                <span className="font-bold text-gray-800 text-xs uppercase tracking-widest flex-1">{macro.name}</span>
                {selectedInMacro > 0 && (
                  <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full mr-2">{selectedInMacro}</span>
                )}
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {macro.processes.length} processo{macro.processes.length !== 1 ? 's' : ''}
                </span>
              </button>

              {isMacroExpanded && (
                <div className="border-t border-gray-100">
                  {macro.processes.map((proc) => {
                    const isProcExpanded = expandedProcesses.has(proc.id);
                    const procCustoms = customSubprocesses.filter(
                      (c) => c.macroprocess.id === macro.id && c.process.id === proc.id
                    );
                    const visibleSubprocesses = proc.subprocesses.filter((sp) => !lockedSubprocessIds.has(sp.id));
                    const standardSelectedInProc = visibleSubprocesses.filter((sp) => selectedIds.has(sp.id)).length;
                    const totalSelectedInProc = standardSelectedInProc + procCustoms.length;
                    const totalInProc = visibleSubprocesses.length + procCustoms.length;
                    const allStandardSelected =
                      visibleSubprocesses.length > 0 &&
                      visibleSubprocesses.every((sp) => selectedIds.has(sp.id));

                    return (
                      <div key={proc.id} className="border-b border-gray-50 last:border-b-0">
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
                            <span className="text-xs text-blue-600 font-semibold mr-2">{totalSelectedInProc}/{totalInProc}</span>
                          )}
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {totalInProc} subprocesso{totalInProc !== 1 ? 's' : ''}
                          </span>
                        </button>

                        {isProcExpanded && (
                          <div className="pb-2 bg-gray-50/50">
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

                            {visibleSubprocesses.map((sp) => {
                              const isSelected = selectedIds.has(sp.id);
                              return (
                                <button
                                  key={sp.id}
                                  onClick={() => onToggle(sp, macro, proc)}
                                  className={`w-full flex items-center gap-3 pl-16 pr-5 py-2.5 text-left transition-colors
                                    ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-100'}`}
                                >
                                  <div className={`w-4 h-4 rounded border-2 flex-shrink-0 transition-all
                                    ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'}`} />
                                  <span className={`text-sm ${isSelected ? 'text-blue-700 font-medium' : 'text-gray-600'}`}>
                                    {sp.name}
                                  </span>
                                </button>
                              );
                            })}

                            {procCustoms.map((item) => (
                              <div key={item.subprocess.id} className="flex items-center gap-3 pl-16 pr-5 py-2.5 bg-blue-50/40">
                                <div className="w-4 h-4 rounded border-2 bg-blue-600 border-blue-600 flex-shrink-0" />
                                <span className="text-sm text-blue-700 font-medium flex-1">{item.subprocess.name}</span>
                                <span className="text-xs text-blue-500 font-medium flex-shrink-0">(custom)</span>
                                <button
                                  onClick={() => onRemoveCustom(item.subprocess.id)}
                                  className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 ml-1"
                                >
                                  <X size={13} strokeWidth={2} />
                                </button>
                              </div>
                            ))}

                            <div className="pl-16 pr-5 pt-2 pb-1">
                              <button
                                onClick={() => !atLimit && setShowFormFor({ macro, proc })}
                                disabled={atLimit}
                                className={`flex items-center gap-1.5 text-xs font-medium transition-colors
                                  ${atLimit ? 'text-gray-300 cursor-not-allowed' : 'text-blue-500 hover:text-blue-700'}`}
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

        {/* ── Custom areas ── */}
        {customAreas.map((area) => {
          const isAreaExpanded = expandedCustomAreas.has(area.id);
          const selectedInArea = area.processes.reduce(
            (acc, p) => acc + p.subprocesses.filter(sp => !lockedSubprocessIds.has(sp.id) && isCustomSpSelected(sp.id)).length, 0
          );

          return (
            <div key={area.id} className="bg-white rounded-xl border border-blue-200 overflow-hidden">
              <button
                onClick={() => toggleCustomArea(area.id)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-blue-50/40 transition-colors"
              >
                {isAreaExpanded
                  ? <ChevronDown size={15} className="text-gray-400 flex-shrink-0" />
                  : <ChevronRight size={15} className="text-gray-400 flex-shrink-0" />
                }
                <Layers size={15} strokeWidth={1.75} className="text-blue-500 flex-shrink-0" />
                <span className="font-bold text-gray-800 text-xs uppercase tracking-widest flex-1">{area.name}</span>
                {selectedInArea > 0 && (
                  <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full mr-2">{selectedInArea}</span>
                )}
                <span className="text-xs text-blue-400 font-medium flex-shrink-0">área personalizada</span>
              </button>

              {isAreaExpanded && (
                <div className="border-t border-blue-100">
                  {area.processes.map((proc) => {
                    const isProcExpanded = expandedCustomProcesses.has(proc.id);
                    const visibleSps = proc.subprocesses.filter(sp => !lockedSubprocessIds.has(sp.id));
                    const selectedInProc = visibleSps.filter(sp => isCustomSpSelected(sp.id)).length;

                    return (
                      <div key={proc.id} className="border-b border-blue-50 last:border-b-0">
                        <button
                          onClick={() => toggleCustomProcess(proc.id)}
                          className="w-full flex items-center gap-3 pl-10 pr-5 py-3 text-left hover:bg-blue-50/30 transition-colors"
                        >
                          {isProcExpanded
                            ? <ChevronDown size={13} className="text-gray-300 flex-shrink-0" />
                            : <ChevronRight size={13} className="text-gray-300 flex-shrink-0" />
                          }
                          <span className="text-sm font-medium text-gray-700 flex-1">{proc.name}</span>
                          {selectedInProc > 0 && (
                            <span className="text-xs text-blue-600 font-semibold mr-2">{selectedInProc}/{visibleSps.length}</span>
                          )}
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {visibleSps.length} subprocesso{visibleSps.length !== 1 ? 's' : ''}
                          </span>
                        </button>

                        {isProcExpanded && (
                          <div className="pb-2 bg-gray-50/50">
                            {visibleSps.map((sp) => {
                              const isSelected = isCustomSpSelected(sp.id);
                              return (
                                <button
                                  key={sp.id}
                                  onClick={() => toggleCustomSp(area, proc, sp)}
                                  className={`w-full flex items-center gap-3 pl-16 pr-5 py-2.5 text-left transition-colors
                                    ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-100'}`}
                                >
                                  <div className={`w-4 h-4 rounded border-2 flex-shrink-0 transition-all
                                    ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'}`} />
                                  <span className={`text-sm ${isSelected ? 'text-blue-700 font-medium' : 'text-gray-600'}`}>
                                    {sp.name}
                                  </span>
                                </button>
                              );
                            })}

                            {/* Add more subprocesses to this custom process */}
                            <div className="pl-16 pr-5 pt-2 pb-1">
                              <button
                                onClick={() => setShowCustomSpFormFor(proc.id)}
                                className="flex items-center gap-1.5 text-xs font-medium text-blue-500 hover:text-blue-700 transition-colors"
                              >
                                <Plus size={12} strokeWidth={2.5} />
                                Adicionar subprocesso
                              </button>
                            </div>

                            {/* Modal for adding subprocess to custom process */}
                            {showCustomSpFormFor === proc.id && (
                              <CustomForm
                                macroprocess={buildCustomMacro(area)}
                                process={buildCustomProcess(proc, area)}
                                onSubmit={(item) => addSubprocessToCustomProc(area, proc, item)}
                                onClose={() => setShowCustomSpFormFor(null)}
                              />
                            )}
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

        {/* ── Add new area button ── */}
        <button
          onClick={() => setShowNewAreaForm(true)}
          className="w-full flex items-center justify-center gap-2 px-5 py-4 rounded-xl border-2 border-dashed border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/30 transition-colors text-sm font-medium"
        >
          <Plus size={15} strokeWidth={2.5} />
          Adicionar nova área
        </button>
      </div>

      {/* Custom subprocess creation modal (library processes) */}
      {showFormFor && (
        <CustomForm
          macroprocess={showFormFor.macro}
          process={showFormFor.proc}
          onSubmit={onAddCustom}
          onClose={() => setShowFormFor(null)}
        />
      )}

      {/* New area form */}
      {showNewAreaForm && (
        <NewAreaForm
          onSubmit={handleNewArea}
          onClose={() => setShowNewAreaForm(false)}
        />
      )}
    </div>
  );
}
