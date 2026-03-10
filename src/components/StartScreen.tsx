'use client';

import { useState } from 'react';
import { Activity, ClipboardList, BarChart3, TrendingUp, FileDown, Users } from 'lucide-react';

interface Props {
  onStart: () => void;
  onStartGroup: () => void;
  company: string;
  onCompanyChange: (value: string) => void;
  email: string;
  onEmailChange: (value: string) => void;
  onContinue: (code: string) => void;
  continueError: string | null;
  isContinuing: boolean;
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

export default function StartScreen({ onStart, onStartGroup, company, onCompanyChange, email, onEmailChange, onContinue, continueError, isContinuing }: Props) {
  const [showContinueForm, setShowContinueForm] = useState(false);
  const [continueCode, setContinueCode] = useState('');

  const handleContinueSubmit = () => {
    const trimmed = continueCode.trim();
    if (!trimmed) return;
    onContinue(trimmed);
  };

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
          <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full mb-6 uppercase tracking-wide">
            Consultoria de Eficiência
          </span>
          <h2 className="text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
            Identifique oportunidades de{' '}
            <span className="text-blue-600">automação e eficiência operacional</span>
            {' '}em minutos
          </h2>
          <p className="text-lg text-gray-500 mb-4 max-w-xl mx-auto">
            Avalie seus processos, descubra gargalos operacionais e priorize as iniciativas
            de automação com maior retorno — com base em critérios objetivos.
          </p>
          <p className="text-sm text-gray-400 mb-10">
            Diagnóstico gratuito &bull; leva menos de 3 minutos &bull; relatório exportável
          </p>

          <div className="flex flex-col items-center gap-3 mb-2">
            <input
              type="text"
              placeholder="Nome da empresa"
              value={company}
              onChange={(e) => onCompanyChange(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-3 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <input
              type="email"
              placeholder="Seu email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-3 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />

            {/* Mode selection */}
            <div className="flex gap-3 mt-1 w-72">
              <button
                onClick={onStart}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-3 rounded-xl text-sm shadow-md hover:shadow-lg transition-all duration-200"
              >
                Responder individual
              </button>
              <button
                onClick={onStartGroup}
                className="flex-1 bg-white hover:bg-gray-50 text-gray-800 font-semibold px-4 py-3 rounded-xl text-sm shadow-md hover:shadow-lg border border-gray-200 transition-all duration-200 flex items-center justify-center gap-1.5"
              >
                <Users size={14} strokeWidth={2} />
                Em grupo
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1">Sem cadastro inicial</p>

          {/* Continue Diagnostic */}
          <div className="mt-6">
            {!showContinueForm ? (
              <button
                onClick={() => setShowContinueForm(true)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium underline underline-offset-2 transition-colors"
              >
                Continue Diagnostic
              </button>
            ) : (
              <div className="flex flex-col items-center gap-2 mt-2">
                <input
                  type="text"
                  placeholder="Enter diagnostic code"
                  value={continueCode}
                  onChange={(e) => {
                    setContinueCode(e.target.value);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleContinueSubmit()}
                  className="border border-gray-300 rounded-lg px-4 py-3 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  autoFocus
                />
                {continueError && (
                  <p className="text-xs text-red-500">{continueError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowContinueForm(false); setContinueCode(''); }}
                    className="border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleContinueSubmit}
                    disabled={!continueCode.trim() || isContinuing}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white disabled:text-gray-400 font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    {isContinuing ? 'Loading...' : 'Continue'}
                  </button>
                </div>
              </div>
            )}
          </div>
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
