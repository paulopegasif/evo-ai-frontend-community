import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WizardProgressProps {
  currentStep: number;
  totalSteps: number;
  steps: Array<{
    id: number;
    label: string;
  }>;
}

/**
 * Step indicator shared by the agent, custom tool and custom MCP wizards.
 * Full labelled stepper from `sm`, compact "n/total · label" + bar on mobile.
 */
const WizardProgress = ({ currentStep, totalSteps, steps }: WizardProgressProps) => {
  const current = steps[currentStep - 1];
  const percent = totalSteps > 1 ? ((currentStep - 1) / (totalSteps - 1)) * 100 : 100;

  return (
    <nav aria-label={current?.label} className="mx-auto w-full max-w-3xl">
      <div className="flex flex-col gap-2 sm:hidden">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-foreground">{current?.label}</span>
          <span className="text-muted-foreground tabular-nums">
            {currentStep}/{totalSteps}
          </span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <ol className="hidden items-start sm:flex">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isLast = index === steps.length - 1;

          return (
            <li
              key={step.id}
              aria-current={isCurrent ? 'step' : undefined}
              className="relative flex flex-1 flex-col items-center gap-1.5"
            >
              {!isLast && (
                <span
                  aria-hidden="true"
                  className="absolute top-3.5 left-[calc(50%+1rem)] h-px w-[calc(100%-2rem)] bg-border"
                >
                  <span
                    className="block h-full bg-primary transition-[width] duration-500 ease-out"
                    style={{ width: isCompleted ? '100%' : '0%' }}
                  />
                </span>
              )}
              <span
                className={cn(
                  'relative z-10 flex size-7 items-center justify-center rounded-full border font-semibold text-xs tabular-nums transition-colors',
                  isCompleted && 'border-primary bg-primary text-primary-foreground',
                  isCurrent && 'border-primary bg-background text-primary ring-4 ring-primary/12',
                  !isCompleted && !isCurrent && 'bg-background text-muted-foreground',
                )}
              >
                {isCompleted ? <Check className="size-3.5" strokeWidth={3} /> : stepNumber}
              </span>
              <span
                className={cn(
                  'max-w-24 text-center font-medium text-[11px] leading-tight',
                  isCurrent ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default WizardProgress;
