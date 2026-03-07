'use client';

import { useState } from 'react';
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
  const [scores, setScores] = useState<CriteriaScores>(getEmptyScores());

  const allAnswered = Object.values(scores).every((s) => s > 0);
  const totalScore = calculateTotalScore(scores);

  const handleScore = (key: keyof CriteriaScores, value: number) => {
    setScores((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    if (allAnswered) onComplete(scores);
  };

  const isLast = currentIndex === total - 1;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar
          </button>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Subprocesso {currentIndex + 1} de {total}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-100 rounded-full h-1.5 mb-5">
          <div
            className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
          />
        </div>

        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">{macroprocess.icon}</span>
          <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">
            {macroprocess.name} › {process.name}
          </p>
        </div>
        <h2 className="text-xl font-bold text-gray-900">{subprocess.name}</h2>
        <p className="text-sm text-gray-500 mt-1">Avalie cada critério de 1 a 5</p>
      </div>

      {/* Criteria */}
      <div className="space-y-5">
        {CRITERIA.map((criterion, idx) => {
          const currentScore = scores[criterion.key];
          return (
            <div key={criterion.key} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 text-sm">{criterion.label}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{criterion.description}</p>
                </div>
              </div>

              {/* Score buttons */}
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((val) => {
                  const isSelected = currentScore === val;
                  const getColor = (v: number) => {
                    if (v <= 2) return isSelected && currentScore === v ? 'bg-green-500 border-green-500 text-white' : 'border-green-200 text-green-600 hover:bg-green-50';
                    if (v === 3) return isSelected ? 'bg-yellow-400 border-yellow-400 text-white' : 'border-yellow-200 text-yellow-600 hover:bg-yellow-50';
                    return isSelected ? 'bg-red-500 border-red-500 text-white' : 'border-red-200 text-red-600 hover:bg-red-50';
                  };

                  return (
                    <button
                      key={val}
                      onClick={() => handleScore(criterion.key, val)}
                      className={`flex-1 h-10 rounded-lg border-2 font-bold text-sm transition-all duration-150 ${getColor(val)}`}
                    >
                      {val}
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-between text-xs text-gray-400 mt-1.5 px-0.5">
                <span>{criterion.lowLabel}</span>
                <span>{criterion.highLabel}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-8 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {allAnswered ? (
            <span className="text-blue-600 font-semibold">
              Score total: <span className="text-lg">{totalScore}</span>/30
            </span>
          ) : (
            <span>{Object.values(scores).filter((s) => s > 0).length} de {CRITERIA.length} respondidos</span>
          )}
        </div>
        <button
          onClick={handleSubmit}
          disabled={!allAnswered}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white disabled:text-gray-400 font-semibold px-6 py-2.5 rounded-lg transition-colors"
        >
          {isLast ? 'Ver Resultados' : 'Próximo Subprocesso'}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
