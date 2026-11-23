import React from 'react';
import { CircleAlert, CircleCheck, Info, X } from '@/components/icons';
import { cn } from '@/lib/utils';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
  closeLabel?: string;
}

const STYLES = {
  success: { icon: CircleCheck, className: 'text-success-foreground', iconClassName: 'text-success' },
  error: { icon: CircleAlert, className: 'text-destructive-foreground', iconClassName: 'text-destructive' },
  info: { icon: Info, className: 'text-info-foreground', iconClassName: 'text-info' },
} as const;

/** In-widget toast (the widget runs in an iframe, so it renders its own instead of the app Toaster). */
const Toast: React.FC<ToastProps> = ({ message, type, onClose, closeLabel = 'Close' }) => {
  const { icon: Icon, className, iconClassName } = STYLES[type];

  return (
    <div className="fade-in slide-in-from-top-2 fixed inset-x-3 top-3 z-50 flex animate-in justify-center duration-200">
      <div
        role={type === 'error' ? 'alert' : 'status'}
        className={cn(
          'flex w-full max-w-sm items-center gap-3 rounded-xl border bg-popover px-3 py-2.5 shadow-lg/5',
          className,
        )}
      >
        <Icon className={cn('size-4 shrink-0', iconClassName)} aria-hidden="true" />
        <span className="flex-1 font-medium text-sm">{message}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="rounded-md p-1 text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
};

export default Toast;
