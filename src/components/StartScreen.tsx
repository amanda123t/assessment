'use client';

import { useState } from 'react';
import { ClipboardList, BarChart3, TrendingUp, FileDown } from 'lucide-react';
import { INDUSTRIES } from '@/data/industryLibrary';
import { CRITERIA } from '@/types';

interface Props {
  onStart: () => void;
  onStartGroup: () => void;
  company: string;
  onCompanyChange: (value: string) => void;
  email: string;
  onEmailChange: (value: string) => void;
  /** Currently selected industry id, or null if none selected yet. */
  industry: string | null;
  onIndustryChange: (id: string) => void;
}

export default function StartScreen({
  onStart, onStartGroup,
  company, onCompanyChange,
  email, onEmailChange,
  industry, onIndustryChange,
}: Props) {
  const [showValidation, setShowValidation] = useState(false);

  const handleStart = () => {
    if (!industry) { setShowValidation(true); return; }
    setShowValidation(false);
    onStart();
  };

  const handleStartGroup = () => {
    if (!industry) { setShowValidation(true); return; }
    setShowValidation(false);
    onStartGroup();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 shadow-sm">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-base font-bold text-gray-900 leading-none">OEA</h1>
          <p className="text-xs text-gray-500">Diagnóstico de Eficiência Operacional</p>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">

        {/* Hero */}
        <div className="text-center mb-8 max-w-xl">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3 leading-tight">
            Ranking de automação com{' '}
            <span className="text-blue-600">horas e R$</span>
            {' '}em minutos
          </h2>
          <p className="text-base text-gray-500">
            Avalie seus processos, descubra quais automatizar primeiro e apresente o business case para a diretoria — sem consultoria.
          </p>
        </div>

        {/* Value props — above the form */}
        <div className="flex flex-wrap justify-center gap-6 mb-8 max-w-lg">
          <div className="flex items-center gap-2">
            <ClipboardList size={14} className="text-blue-500" strokeWidth={1.75} />
            <span className="text-sm text-gray-600">Diagnóstico em minutos</span>
          </div>
          <div className="flex items-center gap-2">
            <BarChart3 size={14} className="text-blue-500" strokeWidth={1.75} />
            <span className="text-sm text-gray-600">Ranking automático</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-blue-500" strokeWidth={1.75} />
            <span className="text-sm text-gray-600">Business case em R$</span>
          </div>
          <div className="flex items-center gap-2">
            <FileDown size={14} className="text-blue-500" strokeWidth={1.75} />
            <span className="text-sm text-gray-600">PDF pronto para apresentar</span>
          </div>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-8 w-full max-w-md mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6 text-center">Comece seu diagnóstico</h3>

          <div className="space-y-4">

            {/* Industry — required */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Indústria <span className="text-red-400">*</span>
              </label>
              <select
                value={industry ?? ''}
                onChange={(e) => { onIndustryChange(e.target.value); setShowValidation(false); }}
                className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-900 ${
                  showValidation && !industry
                    ? 'border-red-300 ring-2 ring-red-100'
                    : 'border-gray-200'
                }`}
              >
                <option value="" disabled>Selecione uma indústria...</option>
                {INDUSTRIES.map((ind) => (
                  <option key={ind.id} value={ind.id}>{ind.name}</option>
                ))}
              </select>
            </div>

            {/* Company — optional */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1.5">
                Empresa <span className="text-gray-300 text-xs font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                placeholder="Nome da empresa"
                value={company}
                onChange={(e) => onCompanyChange(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-900"
              />
            </div>

            {/* Email — optional */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1.5">
                Seu e-mail <span className="text-gray-300 text-xs font-normal">(opcional)</span>
              </label>
              <input
                type="email"
                placeholder="voce@empresa.com"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-900"
              />
            </div>
          </div>

          {/* Primary CTA */}
          <button
            onClick={handleStart}
            className="w-full mt-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-4 rounded-xl text-base shadow-md hover:shadow-lg transition-all duration-200"
          >
            Começar diagnóstico →
          </button>

          {showValidation && !industry && (
            <p className="text-xs text-red-500 mt-2 text-center">
              Selecione uma indústria para continuar
            </p>
          )}

          {/* Secondary CTA */}
          <button
            onClick={handleStartGroup}
            className="w-full mt-3 text-sm text-gray-500 hover:text-blue-600 transition-colors"
          >
            ou iniciar em grupo com sua equipe →
          </button>
        </div>

        {/* Credibility line */}
        <p className="text-xs text-gray-400 text-center mb-8">
          Baseado no{' '}
          <a
            href="https://www.apqc.org/process-classification-framework"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 underline hover:text-blue-700"
          >
            APQC Process Classification Framework
          </a>
          {' '}· Sem cadastro necessário
        </p>

        {/* Criteria accordion */}
        <details className="max-w-md w-full mx-auto text-center">
          <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700 select-none">
            Ver critérios de avaliação ({CRITERIA.length} critérios)
          </summary>
          <div className="flex flex-wrap gap-2 mt-3 justify-center">
            {CRITERIA.map((c) => (
              <span key={c.key} className="bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-lg border border-blue-100">
                {c.label}
              </span>
            ))}
          </div>
        </details>

      </main>
    </div>
  );
}
