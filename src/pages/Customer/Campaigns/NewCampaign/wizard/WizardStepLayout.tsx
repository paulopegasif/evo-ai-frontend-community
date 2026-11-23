import type { ReactNode } from 'react';

interface WizardStepLayoutProps {
  children: ReactNode;
  /** Actions pinned to the bottom of the step (back / continue). */
  footer: ReactNode;
}

/** Shared frame for every campaign wizard step: scrollable body + sticky action bar. */
export default function WizardStepLayout({ children, footer }: WizardStepLayoutProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-6">{children}</div>
      </div>
      <div className="shrink-0 border-t bg-background/95 px-4 py-3 backdrop-blur md:px-6">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-end gap-2">{footer}</div>
      </div>
    </div>
  );
}
