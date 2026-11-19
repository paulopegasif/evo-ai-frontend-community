/* eslint-disable @typescript-eslint/no-unused-vars -- Radix-only props are destructured to drop them. */
/**
 * Compatibility layer: the component names and props of the former
 * @evoapi/design-system (shadcn/Radix), implemented with coss ui (Base UI).
 * New code should import from '@/components/ui/<component>' directly.
 */
import type * as React from 'react';
import { cn } from '@/lib/utils';
import { Button as CossButton, buttonVariants, type ButtonProps as CossButtonProps } from '@/components/ui/button';
import { Badge as CossBadge, badgeVariants } from '@/components/ui/badge';
import { Alert as CossAlert, AlertDescription, AlertTitle, AlertAction } from '@/components/ui/alert';
import { Checkbox as CossCheckbox } from '@/components/ui/checkbox';
import { Separator as CossSeparator } from '@/components/ui/separator';
import { ScrollArea as CossScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Slider as CossSlider } from '@/components/ui/slider';
import { slot } from './slot';

export { buttonVariants, badgeVariants, AlertDescription, AlertTitle, AlertAction, ScrollBar };
export { Label } from '@/components/ui/label';
export { Skeleton } from '@/components/ui/skeleton';
export { Switch } from '@/components/ui/switch';
export { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
export { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from '@/components/ui/table';

export type ButtonProps = Omit<CossButtonProps, 'variant'> & {
  asChild?: boolean;
  variant?: CossButtonProps['variant'] | 'success';
};

export function Button({ asChild, children, render, type, variant, className, ...props }: ButtonProps): React.ReactElement {
  const s = slot(asChild, children, render);
  const success = variant === 'success';
  // Radix buttons kept the HTML default (submit inside forms); coss defaults to "button".
  return (
    <CossButton
      {...props}
      variant={success ? 'default' : variant}
      className={cn(success && 'border-success bg-success text-white hover:bg-success/90', className)}
      type={s.render ? type : (type ?? 'submit')}
      render={s.render}
    >
      {s.children}
    </CossButton>
  );
}

type BadgeProps = React.ComponentProps<typeof CossBadge> & { asChild?: boolean };

export function Badge({ asChild, children, render, ...props }: BadgeProps): React.ReactElement {
  const s = slot(asChild, children, render);
  return (
    <CossBadge {...props} render={s.render}>
      {s.children}
    </CossBadge>
  );
}

type AlertProps = Omit<React.ComponentProps<typeof CossAlert>, 'variant'> & {
  variant?: React.ComponentProps<typeof CossAlert>['variant'] | 'destructive';
};

export function Alert({ variant, ...props }: AlertProps): React.ReactElement {
  return <CossAlert variant={variant === 'destructive' ? 'error' : variant} {...props} />;
}

const inputClassName =
  'h-9 w-full min-w-0 rounded-lg border border-input bg-background px-[calc(--spacing(3)-1px)] text-base text-foreground shadow-xs/5 outline-none transition-shadow placeholder:text-muted-foreground/72 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/24 aria-invalid:border-destructive/36 focus-visible:aria-invalid:border-destructive/64 focus-visible:aria-invalid:ring-destructive/16 disabled:cursor-not-allowed disabled:opacity-64 sm:h-8 sm:text-sm dark:bg-input/32 file:me-3 file:h-full file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm [&::-webkit-search-cancel-button]:appearance-none';

/** Single <input> element, so `className` (e.g. `pl-9` next to an icon) reaches the input itself. */
export function Input({ className, type, ...props }: React.ComponentProps<'input'>): React.ReactElement {
  return <input type={type} data-slot="input" className={cn(inputClassName, className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>): React.ReactElement {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        inputClassName,
        'h-auto min-h-16 py-[calc(--spacing(1.5)-1px)] sm:h-auto',
        className,
      )}
      {...props}
    />
  );
}

type CheckboxProps = Omit<React.ComponentProps<typeof CossCheckbox>, 'checked' | 'onCheckedChange'> & {
  checked?: boolean | 'indeterminate';
  onCheckedChange?(checked: boolean): void;
  /** Radix accepted it on the underlying button; Base UI has no equivalent. */
  onChange?: unknown;
};

export function Checkbox({ checked, onCheckedChange, onChange: _onChange, ...props }: CheckboxProps): React.ReactElement {
  return (
    <CossCheckbox
      checked={checked === 'indeterminate' ? false : checked}
      indeterminate={checked === 'indeterminate'}
      onCheckedChange={onCheckedChange ? (value: boolean) => onCheckedChange(value) : undefined}
      {...props}
    />
  );
}

type SeparatorProps = React.ComponentProps<typeof CossSeparator> & { decorative?: boolean };

export function Separator({ decorative: _decorative, ...props }: SeparatorProps): React.ReactElement {
  return <CossSeparator {...props} />;
}

type ScrollAreaProps = React.ComponentProps<typeof CossScrollArea> & {
  type?: string;
  scrollHideDelay?: number;
};

export function ScrollArea({ type: _type, scrollHideDelay: _delay, ...props }: ScrollAreaProps): React.ReactElement {
  return <CossScrollArea {...props} />;
}

type SliderProps = Omit<React.ComponentProps<typeof CossSlider>, 'value' | 'defaultValue' | 'onValueChange'> & {
  value?: number[];
  defaultValue?: number[];
  onValueChange?(value: number[]): void;
};

/** Radix sliders always work with arrays. */
export function Slider({ onValueChange, ...props }: SliderProps): React.ReactElement {
  return (
    <CossSlider
      onValueChange={
        onValueChange ? (value: number | readonly number[]) => onValueChange(Array.isArray(value) ? [...value] : [value as number]) : undefined
      }
      {...props}
    />
  );
}
