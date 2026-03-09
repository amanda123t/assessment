'use client';

import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { ProcessMap } from '@/types';

interface Props {
  onSave: (map: ProcessMap) => void;
  onCancel: () => void;
}

const FREQUENCY_OPTIONS = [
  'Diária',
  'Semanal',
  'Quinzenal',
  'Mensal',
  'Sob demanda',
  'Outro',
];

const INPUT_CLASS =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

const LABEL_CLASS = 'block text-xs font-semibold text-gray-600 mb-1.5';

export default function ProcessMappingForm({ onSave, onCancel }: Props) {
  const [name, setName] = useState('');
  const [objective, setObjective] = useState('');
  const [responsibleArea, setResponsibleArea] = useState('');
  const [frequency, setFrequency] = useState('');
  const [inputs, setInputs] = useState<string[]>(['']);
  const [outputs, setOutputs] = useState<string[]>(['']);

  const canSave =
    name.trim() &&
    objective.trim() &&
    responsibleArea.trim() &&
    frequency.trim() &&
    inputs.some((v) => v.trim()) &&
    outputs.some((v) => v.trim());

  const handleListChange = (
    list: string[],
    setList: (v: string[]) => void,
    index: number,
    value: string
  ) => {
    const next = [...list];
    next[index] = value;
    setList(next);
  };

  const addItem = (list: string[], setList: (v: string[]) => void) => {
    setList([...list, '']);
  };

  const removeItem = (list: string[], setList: (v: string[]) => void, index: number) => {
    if (list.length === 1) {
      setList(['']);
    } else {
      setList(list.filter((_, i) => i !== index));
    }
  };

  const handleSave = () => {
    if (!canSave) return;
    const map: ProcessMap = {
      id: `pm-${Date.now()}`,
      name: name.trim(),
      objective: objective.trim(),
      responsibleArea: responsibleArea.trim(),
      frequency: frequency.trim(),
      inputs: inputs.map((v) => v.trim()).filter(Boolean),
      outputs: outputs.map((v) => v.trim()).filter(Boolean),
      createdAt: new Date().toISOString(),
    };
    onSave(map);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900">Novo Mapeamento de Processo</h3>
            <p className="text-xs text-gray-500 mt-0.5">Preencha a estrutura básica do processo</p>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Name */}
          <div>
            <label className={LABEL_CLASS}>
              Nome do processo <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Conciliação bancária mensal"
              autoFocus
              className={INPUT_CLASS}
            />
          </div>

          {/* Objective */}
          <div>
            <label className={LABEL_CLASS}>
              Objetivo do processo <span className="text-red-400">*</span>
            </label>
            <textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="Descreva o que este processo busca alcançar"
              rows={2}
              className={`${INPUT_CLASS} resize-none`}
            />
          </div>

          {/* Responsible area */}
          <div>
            <label className={LABEL_CLASS}>
              Área responsável <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={responsibleArea}
              onChange={(e) => setResponsibleArea(e.target.value)}
              placeholder="Ex: Financeiro, RH, Operações"
              className={INPUT_CLASS}
            />
          </div>

          {/* Frequency */}
          <div>
            <label className={LABEL_CLASS}>
              Frequência de execução <span className="text-red-400">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {FREQUENCY_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setFrequency(opt)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    frequency === opt
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Inputs */}
          <div>
            <label className={LABEL_CLASS}>
              Entradas do processo <span className="text-red-400">*</span>
              <span className="font-normal text-gray-400 ml-1">(documentos, dados, gatilhos)</span>
            </label>
            <div className="space-y-2">
              {inputs.map((val, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => handleListChange(inputs, setInputs, i, e.target.value)}
                    placeholder={`Entrada ${i + 1}`}
                    className={INPUT_CLASS}
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(inputs, setInputs, i)}
                    className="p-2 text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addItem(inputs, setInputs)}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                <Plus size={12} /> Adicionar entrada
              </button>
            </div>
          </div>

          {/* Outputs */}
          <div>
            <label className={LABEL_CLASS}>
              Saídas do processo <span className="text-red-400">*</span>
              <span className="font-normal text-gray-400 ml-1">(resultados, documentos, dados)</span>
            </label>
            <div className="space-y-2">
              {outputs.map((val, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => handleListChange(outputs, setOutputs, i, e.target.value)}
                    placeholder={`Saída ${i + 1}`}
                    className={INPUT_CLASS}
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(outputs, setOutputs, i)}
                    className="p-2 text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addItem(outputs, setOutputs)}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                <Plus size={12} /> Adicionar saída
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-400 text-white text-sm font-semibold transition-colors"
          >
            Salvar processo
          </button>
        </div>
      </div>
    </div>
  );
}
