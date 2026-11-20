import Stepper from '@/components/base/Stepper';

interface NewChannelStepperProps {
  steps: string[];
  /** Zero-based index of the current step. Steps before it render as done. */
  current: number;
  className?: string;
}

/** Compact horizontal progress for the guided new-channel flow. */
export default function NewChannelStepper(props: NewChannelStepperProps) {
  return <Stepper size="sm" {...props} />;
}
