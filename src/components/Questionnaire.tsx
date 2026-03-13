'use client';

import { useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { Macroprocess, Process, Subprocess, CriteriaScores, RealValues, CRITERIA } from '@/types';
import { getEmptyScores, calculateWeightedScore, normalizeScore } from '@/lib/scoring';

interface Props {
  macroprocess: Macroprocess;
  process: Process;
  subprocess: Subprocess;
  currentIndex: number;
  total: number;
  onComplete: (
    scores: CriteriaScores,
    subprocess: Subprocess,
    macroprocess: Macroprocess,
    process: Process,
    realValues: RealValues,
  ) => void;
  onBack: () => void;
}

// ─── Optional real-value input config ────────────────────────────────────────

interface RealInputConfig {
  label: string;
  placeholder: string;
  stateKey: keyof RealValuesRaw;
  /** Maps the typed value to the corresponding range score (1–4). */
  autoScore: (v: number) => number;
}

const REAL_INPUT: Partial<Record<keyof CriteriaScores, RealInputConfig>> = {
  operationalVolume: {
    label:       'Valor mensal real (opcional)',
    placeholder: 'ex: 350',
    stateKey:    'volume',
    autoScore:   (v) => v < 50 ? 1 : v <= 200 ? 2 : v <= 500 ? 3 : 4,
  },
  executionTime: {
    label:       'Tempo médio real por pessoa, em minutos (opcional)',
    placeholder: 'ex: 12',
    stateKey:    'timeMinutes',
    autoScore:   (v) => v < 5 ? 1 : v <= 15 ? 2 : v <= 30 ? 3 : 4,
  },
  peopleInvolved: {
    label:       'Quantidade exata de pessoas (opcional)',
    placeholder: 'ex: 4',
    stateKey:    'people',
    autoScore:   (v) => v <= 1 ? 1 : v <= 3 ? 2 : v <= 6 ? 3 : 4,
  },
};

// Raw state uses strings so inputs are fully controlled
interface RealValuesRaw {
  volume:      string;
  timeMinutes: string;
  people:      string;
}

const EMPTY_REAL: RealValuesRaw = { volume: '', timeMinutes: '', people: '' };

function parseRealValues(raw: RealValuesRaw): RealValues {
  const parse = (v: string) => {
    const n = parseFloat(v);
    return !isNaN(n) && n > 0 ? n : undefined;
  };
  return {
    volume:      parse(raw.volume),
    timeMinutes: parse(raw.timeMinutes),
    people:      parse(raw.people),
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Questionnaire({
  macroprocess,
  process,
  subprocess,
  currentIndex,
  total,
  onComplete,
  onBack,
}: Props) {
  const [scores, setScores] = useState<CriteriaScores>(getEmptyScores());
  const [realRaw, setRealRaw] = useState<RealValuesRaw>(EMPTY_REAL);
  const [showCompletion, setShowCompletion] = useState(false);
  const [currentCriterion, setCurrentCriterion] = useState(0);

  const criterion = CRITERIA[currentCriterion];
  const isLastCriterion = currentCriterion === CRITERIA.length - 1;
  const allAnswered = Object.values(scores).every((s) => s > 0);
  const totalScore = calculateWeightedScore(scores);
  const isLast = currentIndex === total - 1;
  const realInputCfg = REAL_INPUT[criterion.key];

  const handleScore = (key: keyof CriteriaScores, value: number) => {
    setScores((prev) => ({ ...prev, [key]: value }));
  };

  /**
   * Handles real-value input change:
   * 1. Sanitises the string to digits + at most one decimal point (blocks letters).
   * 2. Auto-selects the matching range button so the criterion counts as answered.
   */
  const handleRealInput = (
    criterionKey: keyof CriteriaScores,
    cfg: RealInputConfig,
    rawValue: string,
  ) => {
    const clean = rawValue.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    setRealRaw((prev) => ({ ...prev, [cfg.stateKey]: clean }));
    const n = parseFloat(clean);
    if (!isNaN(n) && n > 0) {
      setScores((prev) => ({ ...prev, [criterionKey]: cfg.autoScore(n) }));
    }
  };

  const handleSubmit = () => {
    if (!allAnswered || showCompletion) return;
    setShowCompletion(true);
    setTimeout(() => {
      onComplete(scores, subprocess, macroprocess, process, parseRealValues(realRaw));
    }, 800);
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">

      {/* ── Completion overlay ───────────────────────────────────────────── */}
      {showCompletion && (
        <div className="fixed inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-bold text-gray-900">{subprocess.name}</p>
            <p className="text-sm text-emerald-600 font-medium mt-1">✓ Avaliado com sucesso</p>
            {!isLast && (
              <p className="text-xs text-gray-400 mt-3">
                Próximo: subprocesso {currentIndex + 2} de {total}
              </p>
            )}
            {isLast && (
              <p className="text-sm text-blue-600 font-semibold mt-3">
                Diagnóstico completo — preparando resultados...
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-1">
          Subprocesso {currentIndex + 1} de {total}
        </p>

        {/* Criteria progress bar */}
        <div className="w-full bg-gray-100 rounded-full h-1 mb-3">
          <div
            className="bg-blue-600 h-1 rounded-full transition-all duration-500"
            style={{ width: `${((currentCriterion + 1) / CRITERIA.length) * 100}%` }}
          />
        </div>

        {/* Criteria progress dots */}
        <div className="flex gap-1 justify-center mb-5">
          {CRITERIA.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i < currentCriterion  ? 'w-6 bg-blue-600' :
                i === currentCriterion ? 'w-6 bg-blue-400' :
                                         'w-3 bg-gray-200'
              }`}
            />
          ))}
        </div>

        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
          {macroprocess.name} › {process.name}
        </p>

        <h2 className="text-xl font-bold text-gray-900">{subprocess.name}</h2>

        <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
          <ClipboardCheck size={14} className="text-gray-400" strokeWidth={1.75} />
          Critério {currentCriterion + 1} de {CRITERIA.length}
        </p>
      </div>

      {/* ── Criterion card ───────────────────────────────────────────────── */}
      <div key={criterion.key} className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm animate-slide-in">
        <div className="mb-5">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-2">
            {criterion.label}
          </p>
          <p className="text-sm text-gray-600">{criterion.description}</p>
          {criterion.example && (
            <p className="text-sm text-blue-500 mt-2 italic">{criterion.example}</p>
          )}
        </div>

        {/* Options — 2 columns so each option has more breathing room */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {criterion.options.map((optLabel, optIdx) => {
            const val = optIdx + 1;
            const isSelected = scores[criterion.key] === val;
            return (
              <button
                key={val}
                onClick={() => {
                  handleScore(criterion.key, val);
                  // Auto-advance after 300 ms — skip on last criterion
                  setTimeout(() => {
                    if (currentCriterion < CRITERIA.length - 1) {
                      setCurrentCriterion((prev) => prev + 1);
                    }
                  }, 300);
                }}
                className={`px-4 py-4 rounded-xl border text-left text-sm font-medium transition-all duration-200 leading-snug ${
                  isSelected
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md scale-[1.02]'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700'
                }`}
              >
                {optLabel}
              </button>
            );
          })}
        </div>

        {/* Optional real-value input */}
        {realInputCfg && (
          <div className="mt-4 flex items-center gap-3">
            <label className="text-xs text-gray-500 whitespace-nowrap">
              {realInputCfg.label}
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={realRaw[realInputCfg.stateKey]}
              onChange={(e) => handleRealInput(criterion.key, realInputCfg, e.target.value)}
              placeholder={realInputCfg.placeholder}
              className="w-28 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />
          </div>
        )}
      </div>

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={() => currentCriterion > 0 ? setCurrentCriterion((prev) => prev - 1) : onBack()}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          ← {currentCriterion > 0 ? 'Critério anterior' : 'Voltar'}
        </button>

        <div className="flex items-center gap-3">
          {allAnswered && isLastCriterion && (
            <span className="text-sm text-blue-600 font-semibold hidden sm:block">
              Pontuação: {normalizeScore(totalScore)}/100
            </span>
          )}

          {isLastCriterion && allAnswered ? (
            <button
              onClick={handleSubmit}
              disabled={showCompletion}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
            >
              {showCompletion
                ? (isLast ? 'Preparando resultados…' : 'Salvando…')
                : (isLast ? 'Ver ranking de oportunidades' : 'Avaliar próximo subprocesso')}
            </button>
          ) : (
            <button
              onClick={() => setCurrentCriterion((prev) => prev + 1)}
              disabled={!scores[criterion.key]}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-400 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
            >
              Próximo critério →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
