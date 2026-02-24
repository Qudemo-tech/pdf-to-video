'use client';

import { PipelineStep } from '@/types';

interface StatusTrackerProps {
  currentStep: PipelineStep;
}

const steps: { key: PipelineStep; label: string }[] = [
  { key: 'upload', label: 'Upload PDF' },
  { key: 'script', label: 'Generate Script' },
  { key: 'video', label: 'Create Video' },
  { key: 'complete', label: 'Done' },
];

function getStepIndex(step: PipelineStep): number {
  if (step === 'extract') return 0; // extract is part of upload step
  return steps.findIndex((s) => s.key === step);
}

export default function StatusTracker({ currentStep }: StatusTrackerProps) {
  const currentIndex = getStepIndex(currentStep);

  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isCurrent
                        ? 'bg-blue-600 text-white ring-4 ring-blue-200'
                        : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {isCompleted ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={`mt-2 text-xs font-medium ${
                    isCompleted ? 'text-green-600' : isCurrent ? 'text-blue-600' : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-3 mt-[-1.25rem] ${
                    index < currentIndex ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
