'use client';

import { ClipboardList, BarChart3, TrendingUp, FileDown } from 'lucide-react';
import { INDUSTRIES } from '@/data/industryLibrary';
import { CRITERIA } from '@/types';
import ThemeToggle from '@/components/ThemeToggle';

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
  { icon: ClipboardList, title: 'Diagnóstico em minutos',      desc: 'Avalie múltiplos subprocessos com 7 critérios objetivos e obtenha resultados imediatos' },
  { icon: BarChart3,     title: 'Priorize o que importa',      desc: 'Descubra quais processos geram mais desperdício e onde automatizar primeiro' },
  { icon: TrendingUp,    title: 'Decisões baseadas em dados',  desc: 'Visualize o potencial de automação e o impacto financeiro de cada oportunidade' },
  { icon: FileDown,      title: 'Relatório pronto para usar',  desc: 'Exporte em PDF e apresente o diagnóstico para liderança sem retrabalho' },
];

export default function StartScreen({
  onStart, onStartGroup,
  company, onCompanyChange,
  email, onEmailChange,
  industry, onIndustryChange,
}: Props) {
  const canStart = !!industry;

  return (
    <div className="min-h-screen bg-[var(--color-surface-secondary)] flex flex-col">
      {/* Header */}
      <header className="bg-[var(--color-surface)] border-b border-[var(--color-border-light)] px-6 py-4 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
          <div>
            <h1 className="text-base font-bold text-[var(--color-text-primary)] leading-none">OEA</h1>
            <p className="text-xs text-[var(--color-text-secondary)]">Operational Efficiency Assessment</p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">

        {/* Hero — compact */}
        <div className="text-center mb-10 max-w-xl">
          <h2 className="text-3xl md:text-4xl font-extrabold text-[var(--color-text-primary)] mb-3 leading-tight">
            Descubra onde sua operação pode{' '}
            <span className="text-blue-600">ganhar eficiência</span>
          </h2>
          <p className="text-base text-[var(--color-text-secondary)]">
            Avalie processos, identifique gargalos e priorize automações com maior retorno — em minutos.
          </p>
        </div>

        {/* Form card — focal point */}
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-lg p-8 w-full max-w-md mb-6">
          <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-6 text-center">Comece seu diagnóstico</h3>

          <div className="space-y-4">
            {/* Industry */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">Indústria</label>
              <select
                value={industry ?? ''}
                onChange={(e) => onIndustryChange(e.target.value)}
                className="w-full border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-[var(--color-surface)] text-[var(--color-text-primary)]"
              >
                <option value="" disabled>Selecione uma indústria...</option>
                {INDUSTRIES.map((ind) => (
                  <option key={ind.id} value={ind.id}>{ind.name}</option>
                ))}
              </select>
            </div>

            {/* Company */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">Empresa</label>
              <input
                type="text"
                placeholder="Nome da empresa"
                value={company}
                onChange={(e) => onCompanyChange(e.target.value)}
                className="w-full border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-[var(--color-surface)] text-[var(--color-text-primary)]"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">Seu e-mail</label>
              <input
                type="email"
                placeholder="voce@empresa.com"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                className="w-full border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-[var(--color-surface)] text-[var(--color-text-primary)]"
              />
            </div>
          </div>

          {/* Primary CTA */}
          <button
            onClick={onStart}
            disabled={!canStart}
            title={!canStart ? 'Selecione uma indústria para iniciar' : undefined}
            className="w-full mt-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-400 text-white font-semibold py-4 rounded-xl text-base shadow-md hover:shadow-lg transition-all duration-200"
          >
            Começar diagnóstico
          </button>

          {/* Secondary CTA */}
          <button
            onClick={onStartGroup}
            disabled={!canStart}
            className="w-full mt-3 text-sm text-[var(--color-text-secondary)] hover:text-blue-600 transition-colors disabled:opacity-40"
          >
            ou iniciar em grupo com sua equipe →
          </button>
        </div>

        {/* Credibility line */}
        <p className="text-xs text-[var(--color-text-tertiary)] text-center mb-12">
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

        {/* Feature cards — secondary, below the fold */}
        <div className="max-w-3xl w-full grid grid-cols-2 md:grid-cols-4 gap-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border-light)] p-4 shadow-sm hover:shadow-md transition-shadow">
              <Icon size={15} className="text-blue-400 mb-2" strokeWidth={1.75} />
              <h3 className="font-semibold text-[var(--color-text-secondary)] text-xs mb-1">{title}</h3>
              <p className="text-xs text-[var(--color-text-tertiary)] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Criteria accordion */}
        <details className="max-w-md w-full mx-auto mt-8 text-center">
          <summary className="text-sm text-[var(--color-text-secondary)] cursor-pointer hover:text-[var(--color-text-primary)] select-none">
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
