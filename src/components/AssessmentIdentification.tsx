'use client';

import { useState } from 'react';
import { ArrowLeft, PlayCircle } from 'lucide-react';
import { AssessmentIdentification } from '@/types';

interface Props {
  onComplete: (data: AssessmentIdentification) => void;
  onBack: () => void;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function AssessmentIdentificationScreen({ onComplete, onBack }: Props) {
  const [company, setCompany] = useState('');
  const [area, setArea] = useState('');
  const [respondentName, setRespondentName] = useState('');
  const [date, setDate] = useState(today);

  const canSubmit = company.trim() && area.trim() && respondentName.trim() && date;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onComplete({
      company: company.trim(),
      area: area.trim(),
      respondentName: respondentName.trim(),
      date,
    });
  };

  return (
    <div className="max-w-xl mx-auto px-6 py-10">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-8"
      >
        <ArrowLeft size={14} strokeWidth={2} />
        Voltar à seleção
      </button>

      <h2 className="text-xl font-bold text-gray-900 mb-1">Identificação do diagnóstico</h2>
      <p className="text-sm text-gray-500 mb-8">
        Preencha os dados abaixo para personalizar o relatório gerado.
      </p>

      <div className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            Empresa <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Nome da empresa"
            autoFocus
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            Área <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="Ex: Financeiro, RH, Logística"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            Nome do respondente <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={respondentName}
            onChange={(e) => setRespondentName(e.target.value)}
            placeholder="Seu nome completo"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            Data <span className="text-red-400">*</span>
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full mt-8 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-400 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
      >
        <PlayCircle size={16} strokeWidth={1.75} />
        Iniciar diagnóstico
      </button>
    </div>
  );
}
