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
  children,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={next => !loading && onOpenChange(next)}>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        {children && <div className="px-6">{children}</div>}
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="ghost" />} disabled={loading}>
            {cancelLabel}
          </AlertDialogClose>
          <Button variant={variant} onClick={() => void onConfirm()} loading={loading}>
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}
