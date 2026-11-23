import type { ReactNode } from 'react';
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface AgentIntegrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Brand mark shown in a tile next to the title. */
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Renders a form-shaped skeleton instead of the body. */
  loading?: boolean;
  children?: ReactNode;
  /** Secondary action pinned to the start of the footer (e.g. disconnect). */
  footerStart?: ReactNode;
  /** Primary actions pinned to the end of the footer. */
  footer?: ReactNode;
  className?: string;
}

/**
 * Shared shell for every agent integration / MCP config dialog:
 * icon tile + title + description, scrollable body, sticky footer.
 */
export function AgentIntegrationDialog({
  open,
  onOpenChange,
  icon,
  title,
  description,
  loading = false,
  children,
  footerStart,
  footer,
  className,
}: AgentIntegrationDialogProps) {
  const hasFooter = !loading && (footer || footerStart);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className={cn('sm:max-w-xl', className)}>
        <DialogHeader className="flex-row items-center gap-3">
          {icon && (
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-card shadow-xs/5 [&_img]:size-5 [&_svg]:size-5">
              {icon}
            </div>
          )}
          <div className="flex min-w-0 flex-col gap-1">
            <DialogTitle className="text-lg">{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </div>
        </DialogHeader>

        <DialogPanel>{loading ? <AgentIntegrationDialogSkeleton /> : children}</DialogPanel>

        {hasFooter && (
          <DialogFooter className="sm:justify-between">
            <div className="flex flex-col-reverse gap-2 sm:flex-row">{footerStart}</div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">{footer}</div>
          </DialogFooter>
        )}
      </DialogPopup>
    </Dialog>
  );
}

export function AgentIntegrationDialogSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true">
      <Skeleton className="h-16 w-full rounded-xl" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-full rounded-lg" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-9 w-full rounded-lg" />
        <Skeleton className="h-9 w-full rounded-lg" />
      </div>
    </div>
  );
}

/** Green "connected" banner used by OAuth-backed integrations. */
export function ConnectedBanner({
  label,
  detail,
  secondary,
}: {
  label: ReactNode;
  detail?: ReactNode;
  secondary?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-success/24 bg-success/8 px-3.5 py-3">
      <span className="relative mt-1.5 flex size-2 shrink-0">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
        <span className="relative inline-flex size-2 rounded-full bg-success" />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5 text-sm">
        <span className="font-medium text-success-foreground">{label}</span>
        {detail && <span className="text-success-foreground">{detail}</span>}
        {secondary && <span className="truncate text-success-foreground/80">{secondary}</span>}
      </div>
    </div>
  );
}

/** A labelled row with a control on the end (switch, checkbox...). */
export function SettingRow({
  icon,
  title,
  description,
  control,
  htmlFor,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  control: ReactNode;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border bg-card px-3.5 py-3 transition-colors hover:bg-accent/50"
    >
      <div className="flex min-w-0 items-start gap-3">
        {icon && <span className="mt-0.5 text-muted-foreground [&_svg]:size-4">{icon}</span>}
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-medium text-sm">{title}</span>
          {description && <span className="text-muted-foreground text-xs">{description}</span>}
        </div>
      </div>
      {control}
    </label>
  );
}
