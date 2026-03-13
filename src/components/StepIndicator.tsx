'use client';

import { AssessmentState } from '@/types';
import ThemeToggle from '@/components/ThemeToggle';

const STEPS = [
  { key: 'explore',       label: 'Seleção' },
  { key: 'questionnaire', label: 'Avaliação' },
  { key: 'ranking',       label: 'Resultados' },
] as const;

const STEP_ORDER = ['explore', 'questionnaire', 'ranking'];

interface Props {
  step: AssessmentState['step'];
}

export default function StepIndicator({ step }: Props) {
  if (step === 'start') return null;

  const currentIndex = STEP_ORDER.indexOf(step);

  return (
    <div className="w-full bg-[var(--color-surface)] border-b border-[var(--color-border-light)] px-6 py-4">
      <div className="max-w-4xl mx-auto flex items-center">
        <div className="flex items-center justify-center max-w-sm mx-auto flex-1">
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
                      ${!isCompleted && !isActive ? 'bg-[var(--color-border-light)] text-[var(--color-text-secondary)]' : ''}
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
                      ${isActive ? 'text-blue-600' : isCompleted ? 'text-blue-400' : 'text-[var(--color-text-tertiary)]'}
                    `}
                  >
                    {s.label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 mb-4 transition-all ${
                      isCompleted ? 'bg-blue-600' : 'bg-[var(--color-border)]'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
        <ThemeToggle />
      </div>
    </div>
  );
}
