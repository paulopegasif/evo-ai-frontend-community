/* eslint-disable @typescript-eslint/no-unused-vars -- Radix-only props are destructured to drop them. */
/**
 * Dialog, AlertDialog, Sheet, Popover, Tooltip and Collapsible with the former
 * shadcn/Radix API (asChild, *Content, padded content), on coss ui.
 */
import type * as React from 'react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogClose as CossDialogClose,
  DialogDescription,
  DialogPopup,
  DialogTitle,
  DialogTrigger as CossDialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogDescription,
  AlertDialogPopup,
  AlertDialogPrimitive,
  AlertDialogTitle,
  AlertDialogTrigger as CossAlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Sheet,
  SheetClose as CossSheetClose,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetPopup,
  SheetTitle,
  SheetTrigger as CossSheetTrigger,
} from '@/components/ui/sheet';
import { Popover, PopoverPopup, PopoverTrigger as CossPopoverTrigger } from '@/components/ui/popover';
import {
  Tooltip as CossTooltip,
  TooltipPopup,
  TooltipProvider as CossTooltipProvider,
  TooltipTrigger as CossTooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger as CossCollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button, type ButtonProps } from './basic';
import { slot } from './slot';

type AsChild = { asChild?: boolean };

function withSlot<P extends { children?: React.ReactNode; render?: unknown }>(
  Component: React.ComponentType<P>,
  displayName: string,
) {
  function Slotted({ asChild, children, render, ...props }: P & AsChild): React.ReactElement {
    const s = slot(asChild, children, render);
    const Comp = Component as React.ComponentType<Record<string, unknown>>;
    return (
      <Comp {...props} render={s.render}>
        {s.children}
      </Comp>
    );
  }
  Slotted.displayName = displayName;
  return Slotted;
}

const headerClassName = 'flex flex-col gap-2 text-center sm:text-start';
const footerClassName = 'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end';

// Dialog -------------------------------------------------------------------

export { Dialog, DialogTitle, DialogDescription };
export const DialogTrigger = withSlot(CossDialogTrigger, 'DialogTrigger');
export const DialogClose = withSlot(CossDialogClose, 'DialogClose');

type DialogContentProps = React.ComponentProps<typeof DialogPopup> & {
  onInteractOutside?: unknown;
  onEscapeKeyDown?: unknown;
  onPointerDownOutside?: unknown;
  onOpenAutoFocus?: unknown;
  onCloseAutoFocus?: unknown;
};

/** Content goes straight inside, so the popup carries the padding (shadcn layout). */
export function DialogContent({
  className,
  onInteractOutside: _a,
  onEscapeKeyDown: _b,
  onPointerDownOutside: _c,
  onOpenAutoFocus: _d,
  onCloseAutoFocus: _e,
  ...props
}: DialogContentProps): React.ReactElement {
  return (
    <DialogPopup
      bottomStickOnMobile={false}
      className={cn('grid gap-4 overflow-y-auto p-6', className)}
      {...props}
    />
  );
}

export function DialogHeader({ className, ...props }: React.ComponentProps<'div'>): React.ReactElement {
  return <div data-slot="dialog-header" className={cn(headerClassName, 'pe-6', className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.ComponentProps<'div'>): React.ReactElement {
  return <div data-slot="dialog-footer" className={cn(footerClassName, className)} {...props} />;
}

// AlertDialog ----------------------------------------------------------------

export { AlertDialog, AlertDialogTitle, AlertDialogDescription };
export const AlertDialogTrigger = withSlot(CossAlertDialogTrigger, 'AlertDialogTrigger');

export function AlertDialogContent({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPopup>): React.ReactElement {
  return <AlertDialogPopup className={cn('grid gap-4 p-6', className)} {...props} />;
}

export function AlertDialogHeader({ className, ...props }: React.ComponentProps<'div'>): React.ReactElement {
  return <div data-slot="alert-dialog-header" className={cn(headerClassName, className)} {...props} />;
}

export function AlertDialogFooter({ className, ...props }: React.ComponentProps<'div'>): React.ReactElement {
  return <div data-slot="alert-dialog-footer" className={cn(footerClassName, className)} {...props} />;
}

/** Closes the dialog on click, like Radix's Action. */
export function AlertDialogAction({ variant, size, className, ...props }: ButtonProps): React.ReactElement {
  return (
    <AlertDialogPrimitive.Close
      render={<Button variant={variant} size={size} className={className} type="button" />}
      {...(props as AlertDialogPrimitive.Close.Props)}
    />
  );
}

export function AlertDialogCancel({ variant = 'outline', size, className, ...props }: ButtonProps): React.ReactElement {
  return (
    <AlertDialogPrimitive.Close
      render={<Button variant={variant} size={size} className={className} type="button" />}
      {...(props as AlertDialogPrimitive.Close.Props)}
    />
  );
}

// Sheet ----------------------------------------------------------------------

export { Sheet, SheetHeader, SheetFooter, SheetTitle, SheetDescription };
export const SheetTrigger = withSlot(CossSheetTrigger, 'SheetTrigger');
export const SheetClose = withSlot(CossSheetClose, 'SheetClose');

export function SheetContent({ className, ...props }: React.ComponentProps<typeof SheetPopup>): React.ReactElement {
  return <SheetPopup className={cn('gap-4', className)} {...props} />;
}

// Popover --------------------------------------------------------------------

export { Popover };
export const PopoverTrigger = withSlot(CossPopoverTrigger, 'PopoverTrigger');

type PopoverContentProps = React.ComponentProps<typeof PopoverPopup> & {
  collisionPadding?: unknown;
  avoidCollisions?: unknown;
  onOpenAutoFocus?: unknown;
  onInteractOutside?: unknown;
  forceMount?: unknown;
};

export function PopoverContent({
  collisionPadding: _a,
  avoidCollisions: _b,
  onOpenAutoFocus: _c,
  onInteractOutside: _d,
  forceMount: _e,
  ...props
}: PopoverContentProps): React.ReactElement {
  return <PopoverPopup {...props} />;
}

// Tooltip --------------------------------------------------------------------

type TooltipProviderProps = React.ComponentProps<typeof CossTooltipProvider> & {
  delayDuration?: number;
  skipDelayDuration?: number;
};

export function TooltipProvider({
  delayDuration,
  skipDelayDuration: _skip,
  delay,
  ...props
}: TooltipProviderProps): React.ReactElement {
  return <CossTooltipProvider delay={delay ?? delayDuration} {...props} />;
}

type TooltipProps = React.ComponentProps<typeof CossTooltip> & { delayDuration?: number };

export function Tooltip({ delayDuration: _delay, ...props }: TooltipProps): React.ReactElement {
  return <CossTooltip {...props} />;
}

export const TooltipTrigger = withSlot(CossTooltipTrigger, 'TooltipTrigger');
export const TooltipContent = TooltipPopup;

// Collapsible ----------------------------------------------------------------

export { Collapsible, CollapsibleContent };
export const CollapsibleTrigger = withSlot(CossCollapsibleTrigger, 'CollapsibleTrigger');
