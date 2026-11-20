import type { ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  cancelLabel: ReactNode;
  confirmLabel: ReactNode;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
  /** Destructive by default: deletes, disconnects, removals. */
  variant?: 'destructive' | 'default';
  /** Keeps confirm disabled, e.g. until a typed confirmation (rendered as children) matches. */
  confirmDisabled?: boolean;
  /** Optional icon tile shown above the title. */
  icon?: ReactNode;
  children?: ReactNode;
}

/** Confirmation for irreversible actions: ghost cancel + (destructive) confirm. */
export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  cancelLabel,
  confirmLabel,
  onConfirm,
  loading = false,
  variant = 'destructive',
  confirmDisabled = false,
  icon,
  children,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={next => !loading && onOpenChange(next)}>
      <AlertDialogPopup>
        <AlertDialogHeader>
          {icon && (
            <div
              className={
                variant === 'destructive'
                  ? 'mb-1 flex size-10 items-center justify-center rounded-lg bg-destructive/8 text-destructive-foreground [&_svg]:size-5'
                  : 'mb-1 flex size-10 items-center justify-center rounded-lg bg-primary/12 text-primary [&_svg]:size-5'
              }
              aria-hidden="true"
            >
              {icon}
            </div>
          )}
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        {children && <div className="px-6">{children}</div>}
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="ghost" />} disabled={loading}>
            {cancelLabel}
          </AlertDialogClose>
          <Button variant={variant} onClick={() => void onConfirm()} loading={loading} disabled={confirmDisabled}>
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}
