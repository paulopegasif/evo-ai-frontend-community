import { Fragment } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/utils/cn';

interface NewChannelStepperProps {
  steps: string[];
  /** Zero-based index of the current step. Steps before it render as done. */
  current: number;
  className?: string;
}

/** Compact horizontal progress for the guided new-channel flow. */
export default function NewChannelStepper({ steps, current, className }: NewChannelStepperProps) {
  return (
    <ol className={cn('flex items-center gap-2 text-sm', className)}>
      {steps.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <Fragment key={label}>
            {index > 0 && (
              <li aria-hidden="true" className={cn('h-px w-6 shrink-0 sm:w-10', done || active ? 'bg-primary/48' : 'bg-border')} />
            )}
            <li className="flex min-w-0 items-center gap-2" aria-current={active ? 'step' : undefined}>
              <span
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full border font-medium text-xs tabular-nums',
                  done && 'border-primary bg-primary text-primary-foreground',
                  active && 'border-primary bg-primary/8 text-primary',
                  !done && !active && 'bg-background text-muted-foreground',
                )}
              >
                {done ? <Check className="size-3.5" /> : index + 1}
              </span>
              <span
                className={cn(
                  'truncate',
                  active ? 'font-medium text-foreground' : 'text-muted-foreground',
                  !active && 'max-sm:hidden',
                )}
              >
                {label}
              </span>
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}
