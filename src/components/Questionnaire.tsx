'use client';

import { useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { Macroprocess, Process, Subprocess, CriteriaScores, RealValues, CRITERIA } from '@/types';
import { getEmptyScores, calculateWeightedScore } from '@/lib/scoring';

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

  const allAnswered = Object.values(scores).every((s) => s > 0);
  const totalScore = calculateWeightedScore(scores);
  const criteriaAnsweredCount = Object.values(scores).filter((s) => s > 0).length;
  const isLast = currentIndex === total - 1;

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
    // Strip anything that isn't a digit or decimal point; allow only one dot
    const clean = rawValue.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');

    setRealRaw((prev) => ({ ...prev, [cfg.stateKey]: clean }));

    // Auto-select the matching range so the criterion is considered answered
    const n = parseFloat(clean);
    if (!isNaN(n) && n > 0) {
      const autoScore = cfg.autoScore(n);
      setScores((prev) => ({ ...prev, [criterionKey]: autoScore }));
    }
  };

  const handleSubmit = () => {
    if (!allAnswered) return;
    onComplete(scores, subprocess, macroprocess, process, parseRealValues(realRaw));
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={onBack}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors mb-5 block"
        >
          ← Voltar
        </button>

        <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-1">
          Subprocesso {currentIndex + 1} de {total}
        </p>

        <div className="w-full bg-gray-100 rounded-full h-1 mb-4">
          <div
            className="bg-blue-600 h-1 rounded-full transition-all duration-500"
            style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
          />
        </div>

        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
          {macroprocess.name} › {process.name}
        </p>

        <h2 className="text-xl font-bold text-gray-900">{subprocess.name}</h2>

        <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
          <ClipboardCheck size={14} className="text-gray-400" strokeWidth={1.75} />
          Selecione uma opção para cada critério
        </p>
      </div>

      {/* Criteria cards */}
      <div className="space-y-4">
        {CRITERIA.map((criterion) => {
          const currentScore = scores[criterion.key];
          const realInputCfg = REAL_INPUT[criterion.key];

          return (
            <div key={criterion.key} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="mb-4">
                <h3 className="font-semibold text-gray-800 text-sm">{criterion.label}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{criterion.description}</p>
              </div>

              {/* Range buttons */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {criterion.options.map((optLabel, optIdx) => {
                  const val = optIdx + 1;
                  const isSelected = currentScore === val;
                  return (
                    <button
                      key={val}
                      onClick={() => handleScore(criterion.key, val)}
                      className={`px-3 py-3.5 rounded-lg border text-center text-sm font-medium transition-all duration-150 leading-snug
                        ${isSelected
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm ring-2 ring-blue-300 ring-offset-1'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700'
                        }`}
                    >
                      {optLabel}
                    </button>
                  );
                })}
              </div>

              {/* Optional real-value input — auto-selects matching range on input */}
              {realInputCfg && (
                <div className="mt-3 flex items-center gap-3">
                  <label className="text-xs text-gray-400 whitespace-nowrap">
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
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-8 flex items-center justify-between">
        <span className="text-sm text-gray-500">
          {allAnswered
            ? <span className="text-blue-600 font-semibold">Score total: <span className="text-lg">{totalScore}</span></span>
            : <>{criteriaAnsweredCount} de {CRITERIA.length} respondidos</>
          }
        </span>
        <button
          onClick={handleSubmit}
          disabled={!allAnswered}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white disabled:text-gray-400 font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm"
        >
          {isLast ? 'Ver Resultados' : 'Próximo Subprocesso'}
        </button>
      </div>
    </div>
  );
}
