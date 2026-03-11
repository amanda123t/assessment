'use client';

import { ClipboardList, BarChart3, TrendingUp, FileDown, Users } from 'lucide-react';
import { INDUSTRIES } from '@/data/industryLibrary';

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

const features = [
  { icon: ClipboardList, title: 'Diagnóstico em minutos',      desc: 'Avalie múltiplos subprocessos com 6 critérios objetivos e obtenha resultados imediatos' },
  { icon: BarChart3,     title: 'Priorize o que importa',      desc: 'Descubra quais processos geram mais desperdício e onde automatizar primeiro' },
  { icon: TrendingUp,    title: 'Decisões baseadas em dados',  desc: 'Visualize o potencial de automação e o impacto financeiro de cada oportunidade' },
  { icon: FileDown,      title: 'Relatório pronto para usar',  desc: 'Exporte em PDF e apresente o diagnóstico para liderança sem retrabalho' },
];

const criteria = [
  'Volume Operacional',
  'Pessoas Envolvidas',
  'Tempo de Execução',
  'Retrabalho / Erros',
  'Uso de Sistemas / Planilhas',
  'Integrações entre Sistemas',
];

export default function StartScreen({
  onStart, onStartGroup,
  company, onCompanyChange,
  email, onEmailChange,
  industry, onIndustryChange,
}: Props) {
  const canStart = !!industry;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center gap-2">
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-none">OEA</h1>
            <p className="text-xs text-gray-500">Operational Efficiency Assessment</p>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="max-w-3xl w-full text-center">
          {/* 1. Title */}
          <h2 className="text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
            Descubra onde sua operação pode{' '}
            <span className="text-blue-600">ganhar eficiência</span>
          </h2>

          {/* 2. Subtitle */}
          <p className="text-lg text-gray-500 mb-3 max-w-xl mx-auto">
            Avalie seus processos, identifique gargalos operacionais e priorize automações com maior retorno.
          </p>

          {/* 3. Credibility line */}
          <p className="text-sm text-gray-400 mb-4">
            Diagnóstico rápido &bull; baseado em benchmarks operacionais &bull; relatório exportável
          </p>

          {/* 4. APQC reference */}
          <p className="text-xs text-gray-500 mb-8 max-w-md mx-auto">
            Biblioteca com processos de referência por indústria. Baseado no{' '}
            <a
              href="https://www.apqc.org/process-classification-framework"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-800"
            >
              Process Classification Framework (PCF) do APQC
            </a>
            .
          </p>

          <div className="flex flex-col items-center gap-3 mb-2">
            {/* 3. Industry selector (before email) */}
            <div className="w-72">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Selecione sua indústria
              </p>
              <select
                value={industry ?? ''}
                onChange={(e) => onIndustryChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-700"
              >
                <option value="" disabled>Selecione uma indústria...</option>
                {INDUSTRIES.map((ind) => (
                  <option key={ind.id} value={ind.id}>{ind.name}</option>
                ))}
              </select>
            </div>

            {/* 4. Email field */}
            <input
              type="text"
              placeholder="Nome da empresa"
              value={company}
              onChange={(e) => onCompanyChange(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-3 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-400 mt-1"
            />
            <input
              type="email"
              placeholder="Seu email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-3 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />

            {/* 5. Action buttons */}
            <div className="flex gap-3 mt-1 w-72">
              <button
                onClick={onStart}
                disabled={!canStart}
                title={!canStart ? 'Selecione uma indústria para iniciar' : undefined}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-400 text-white font-semibold px-4 py-3 rounded-xl text-sm shadow-md hover:shadow-lg transition-all duration-200"
              >
                Responder individual
              </button>
              <button
                onClick={onStartGroup}
                disabled={!canStart}
                title={!canStart ? 'Selecione uma indústria para iniciar' : undefined}
                className="flex-1 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400 text-gray-800 font-semibold px-4 py-3 rounded-xl text-sm shadow-md hover:shadow-lg border border-gray-200 transition-all duration-200 flex items-center justify-center gap-1.5"
              >
                <Users size={14} strokeWidth={2} />
                Em grupo
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1">Sem cadastro inicial</p>

        </div>

        {/* Feature cards */}
        <div className="max-w-4xl w-full mt-16 grid grid-cols-2 md:grid-cols-4 gap-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
              <Icon size={16} className="text-blue-500 mb-2" strokeWidth={1.75} />
              <h3 className="font-semibold text-gray-800 text-sm mb-1">{title}</h3>
              <p className="text-xs text-gray-500">{desc}</p>
            </div>
          ))}
        </div>

        {/* Criteria */}
        <div className="max-w-4xl w-full mt-8 bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            Critérios de Avaliação (pontuados de 1 a 5)
          </h3>
          <div className="flex flex-wrap gap-2">
            {criteria.map((c) => (
              <span key={c} className="bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-lg border border-blue-100">
                {c}
              </span>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
