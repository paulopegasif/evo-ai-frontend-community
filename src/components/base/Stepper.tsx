import { Fragment } from 'react';
import { Check } from '@/components/icons';
import { cn } from '@/lib/utils';

export interface StepperProps {
  /** Step labels, in order. */
  steps: string[];
  /** Zero-based index of the current step. Steps before it render as done. */
  current: number;
  /** `sm` for inline headers, `default` for page-level wizards. */
  size?: 'sm' | 'default';
  /** Connectors grow to fill the available width instead of a fixed length. */
  stretch?: boolean;
  /** Below this breakpoint only the current step keeps its label. */
  collapseLabelsBelow?: 'sm' | 'lg';
  className?: string;
}

/** Horizontal step indicator: numbered dots, check for done steps, connectors between them. */
export default function Stepper({
  steps,
  current,
  size = 'default',
  stretch = false,
  collapseLabelsBelow = 'sm',
  className,
}: StepperProps) {
  return (
    <ol className={cn('flex items-center gap-2 text-sm', className)}>
      {steps.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <Fragment key={`${index}-${label}`}>
            {index > 0 && (
              <li
                aria-hidden="true"
                className={cn(
                  'h-px shrink-0',
                  stretch ? 'min-w-4 flex-1 shrink' : 'w-6 sm:w-10',
                  done || active ? 'bg-primary/48' : 'bg-border',
                )}
              />
            )}
            <li
              className={cn('flex items-center gap-2', stretch ? 'shrink-0' : 'min-w-0')}
              aria-current={active ? 'step' : undefined}
            >
              <span
                className={cn(
                  'flex shrink-0 items-center justify-center rounded-full border font-medium text-xs tabular-nums transition-colors',
                  size === 'sm' ? 'size-6' : 'size-7',
                  done && 'border-primary bg-primary text-primary-foreground',
                  active && 'border-primary bg-primary/8 text-primary',
                  !done && !active && 'bg-background text-muted-foreground',
                )}
              >
                {done ? <Check className="size-3.5" aria-hidden="true" /> : index + 1}
              </span>
              <span
                className={cn(
                  stretch ? 'whitespace-nowrap' : 'truncate',
                  active ? 'font-medium text-foreground' : 'text-muted-foreground',
                  !active && (collapseLabelsBelow === 'lg' ? 'max-lg:hidden' : 'max-sm:hidden'),
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
