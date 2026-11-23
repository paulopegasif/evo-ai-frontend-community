import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface RadioCardOption<T extends string> {
  value: T;
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  /** Extra content under the description (e.g. key hints). */
  extra?: ReactNode;
  disabled?: boolean;
}

export interface RadioCardGroupProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  options: RadioCardOption<T>[];
  'aria-label'?: string;
  'aria-labelledby'?: string;
  disabled?: boolean;
  className?: string;
}

/** Group of selectable cards with radio semantics (role="radiogroup" / role="radio"). */
export default function RadioCardGroup<T extends string>({
  value,
  onValueChange,
  options,
  disabled,
  className,
  ...aria
}: RadioCardGroupProps<T>) {
  const move = (from: number, delta: number) => {
    const enabled = options.filter(o => !o.disabled);
    if (!enabled.length) return;
    const idx = enabled.findIndex(o => o.value === options[from].value);
    const next = enabled[(idx + delta + enabled.length) % enabled.length];
    onValueChange(next.value);
  };

  return (
    <div role="radiogroup" {...aria} className={cn('grid gap-3 sm:grid-cols-2', className)}>
      {options.map((opt, i) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active || (!options.some(o => o.value === value) && i === 0) ? 0 : -1}
            disabled={disabled || opt.disabled}
            onClick={() => onValueChange(opt.value)}
            onKeyDown={e => {
              if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                e.preventDefault();
                move(i, 1);
              } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                e.preventDefault();
                move(i, -1);
              }
            }}
            className={cn(
              'flex items-start gap-3 rounded-xl border p-4 text-start outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-64',
              active ? 'border-primary/48 bg-primary/4' : 'hover:bg-accent/50',
            )}
          >
            {opt.icon && (
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground [&_svg]:size-4">
                {opt.icon}
              </span>
            )}
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="font-medium text-sm">{opt.title}</span>
              {opt.description && <span className="text-muted-foreground text-sm">{opt.description}</span>}
              {opt.extra}
            </span>
            <span
              aria-hidden="true"
              className={cn(
                'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border',
                active ? 'border-primary bg-primary' : 'border-input',
              )}
            >
              {active && <span className="size-1.5 rounded-full bg-primary-foreground" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
