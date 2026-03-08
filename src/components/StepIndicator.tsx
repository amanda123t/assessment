'use client';

import { AssessmentState } from '@/types';

const STEPS = [
  { key: 'explore', label: 'Seleção' },
  { key: 'questionnaire', label: 'Avaliação' },
  { key: 'ranking', label: 'Resultados' },
] as const;

// 'mode-selection' sits between explore and questionnaire but maps to the
// same visual position as 'explore' (it's part of the "Seleção" phase).
const STEP_ORDER = ['explore', 'questionnaire', 'ranking'];

interface Props {
  step: AssessmentState['step'];
}

export default function StepIndicator({ step }: Props) {
  if (step === 'start') return null;

  const currentIndex = STEP_ORDER.indexOf(step);

  return (
    <div className="w-full bg-white border-b border-gray-100 px-6 py-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center max-w-sm mx-auto">
          {STEPS.map((s, idx) => {
            const isCompleted = idx < currentIndex;
            const isActive = idx === currentIndex;

            return (
              <div key={s.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all
                      ${isCompleted ? 'bg-blue-600 text-white' : ''}
                      ${isActive ? 'bg-blue-600 text-white ring-4 ring-blue-100' : ''}
                      ${!isCompleted && !isActive ? 'bg-gray-100 text-gray-400' : ''}
                    `}
                  >
                    {isCompleted ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <span
                    className={`mt-1.5 text-xs font-medium whitespace-nowrap
                      ${isActive ? 'text-blue-600' : isCompleted ? 'text-blue-400' : 'text-gray-400'}
                    `}
                  >
                    {s.label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 mb-4 transition-all ${
                      isCompleted ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
