import Stepper from '@/components/base/Stepper';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/hooks/useLanguage';

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
      <Stepper
        steps={steps.map(step => step.label)}
        current={currentStep - 1}
        stretch
        collapseLabelsBelow="lg"
      />
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
