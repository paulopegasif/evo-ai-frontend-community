import { Fragment } from 'react';
import { Check } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/utils/cn';

interface WizardProgressProps {
  currentStep: number;
  totalSteps: number;
  steps: Array<{
    id: number;
    label: string;
  }>;
}

const WizardProgress = ({ currentStep, totalSteps, steps }: WizardProgressProps) => {
  const { t } = useLanguage('campaigns');
  const progressPercentage = Math.round(((currentStep - 1) / (totalSteps - 1)) * 100);

  return (
    <div className="flex w-full flex-col gap-3">
      <ol className="flex items-center gap-2 text-sm">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;

          return (
            <Fragment key={step.id}>
              {index > 0 && (
                <li
                  aria-hidden="true"
                  className={cn('h-px min-w-4 flex-1', isCompleted || isActive ? 'bg-primary/48' : 'bg-border')}
                />
              )}
              <li className="flex shrink-0 items-center gap-2" aria-current={isActive ? 'step' : undefined}>
                <span
                  className={cn(
                    'flex size-7 items-center justify-center rounded-full border font-medium text-xs tabular-nums transition-colors',
                    isCompleted && 'border-primary bg-primary text-primary-foreground',
                    isActive && 'border-primary bg-primary/8 text-primary',
                    !isCompleted && !isActive && 'bg-background text-muted-foreground',
                  )}
                >
                  {isCompleted ? <Check className="size-3.5" /> : stepNumber}
                </span>
                <span
                  className={cn(
                    'whitespace-nowrap',
                    isActive ? 'font-medium text-foreground' : 'text-muted-foreground',
                    !isActive && 'max-lg:hidden',
                  )}
                >
                  {step.label}
                </span>
              </li>
            </Fragment>
          );
        })}
      </ol>
      <div className="flex items-center gap-3">
        <Progress value={progressPercentage} className="flex-1" aria-label={t('wizard.stepOf', { current: currentStep, total: totalSteps })} />
        <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
          {t('wizard.stepOf', { current: currentStep, total: totalSteps })}
        </span>
      </div>
    </div>
  );
};

export default WizardProgress;
