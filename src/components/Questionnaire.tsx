'use client';

import { useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { Macroprocess, Process, Subprocess, CriteriaScores, CRITERIA } from '@/types';
import { getEmptyScores, calculateTotalScore } from '@/lib/scoring';

interface Props {
  macroprocess: Macroprocess;
  process: Process;
  subprocess: Subprocess;
  currentIndex: number;
  total: number;
  onComplete: (scores: CriteriaScores) => void;
  onBack: () => void;
}

export default function Questionnaire({
  macroprocess,
  process,
  subprocess,
  currentIndex,
  total,
  onComplete,
  onBack,
}: Props) {
  // State initialises fresh on every mount. The parent passes key={subprocess.id}
  // which forces a remount whenever the subprocess changes, so scores always
  // start empty for each new subprocess.
  const [scores, setScores] = useState<CriteriaScores>(getEmptyScores());

  const allAnswered = Object.values(scores).every((s) => s > 0);
  const totalScore = calculateTotalScore(scores);
  const criteriaAnsweredCount = Object.values(scores).filter((s) => s > 0).length;
  const isLast = currentIndex === total - 1;

  const handleScore = (key: keyof CriteriaScores, value: number) => {
    setScores((prev) => ({ ...prev, [key]: value }));
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

        {/* Progress counter — primary label */}
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-1">
          Subprocesso {currentIndex + 1} de {total}
        </p>

        {/* Progress bar */}
        <div className="w-full bg-gray-100 rounded-full h-1 mb-4">
          <div
            className="bg-blue-600 h-1 rounded-full transition-all duration-500"
            style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
          />
        </div>

        {/* Breadcrumb */}
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
          {macroprocess.name} › {process.name}
        </p>

        {/* Subprocess name — main heading */}
        <h2 className="text-xl font-bold text-gray-900">{subprocess.name}</h2>

        {/* Subheading with icon */}
        <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
          <ClipboardCheck size={14} className="text-gray-400" strokeWidth={1.75} />
          Selecione uma opção para cada critério
        </p>
      </div>

      {/* Criteria cards */}
      <div className="space-y-4">
        {CRITERIA.map((criterion) => {
          const currentScore = scores[criterion.key];
          return (
            <div key={criterion.key} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="mb-4">
                <h3 className="font-semibold text-gray-800 text-sm">{criterion.label}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{criterion.description}</p>
              </div>

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
          onClick={() => { if (allAnswered) onComplete(scores); }}
          disabled={!allAnswered}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white disabled:text-gray-400 font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm"
        >
          {isLast ? 'Ver Resultados' : 'Próximo Subprocesso'}
        </button>
      </div>
    </div>
  );
}
