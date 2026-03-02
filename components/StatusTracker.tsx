'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { PipelineStep } from '@/types';

interface StatusTrackerProps {
  currentStep: PipelineStep;
}

const steps: { key: PipelineStep; label: string }[] = [
  { key: 'upload', label: 'Upload PDF' },
  { key: 'mode-select', label: 'Choose Mode' },
  { key: 'script', label: 'Generate Script' },
  { key: 'video', label: 'Create Video' },
  { key: 'complete', label: 'Done' },
];

function getStepIndex(step: PipelineStep): number {
  if (step === 'extract') return 0; // extract is part of upload step
  if (step === 'page-by-page') return 1; // page-by-page is after mode select
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
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                    isCompleted
                      ? 'bg-primary text-primary-foreground glow-primary'
                      : isCurrent
                        ? 'bg-primary text-primary-foreground ring-4 ring-primary/30'
                        : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    index + 1
                  )}
                </motion.div>
                <span
                  className={`mt-2 text-xs font-medium transition-colors duration-300 ${
                    isCompleted ? 'text-primary' : isCurrent ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-3 mt-[-1.25rem] transition-colors duration-500 ${
                    index < currentIndex ? 'bg-primary' : 'bg-secondary'
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
