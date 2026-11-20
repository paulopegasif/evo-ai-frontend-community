import type { ReactNode, Ref } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogPopup, DialogTitle } from '@/components/ui/dialog';
import WizardProgress from '@/pages/Customer/Agents/Agent/wizard/WizardProgress';

interface WizardShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Full-page view (app shell visible) instead of a Dialog overlay. */
  embedded?: boolean;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Accessible dialog title when the visible title is step-specific. */
  dialogTitle?: string;
  steps: Array<{ id: number; label: string }>;
  currentStep: number;
  totalSteps: number;
  showProgress?: boolean;
  contentRef?: Ref<HTMLDivElement>;
  children: ReactNode;
}

/** Layout shared by the agent, custom tool and custom MCP wizards. */
export default function WizardShell({
  open,
  onOpenChange,
  embedded = false,
  title,
  subtitle,
  dialogTitle,
  steps,
  currentStep,
  totalSteps,
  showProgress = true,
  contentRef,
  children,
}: WizardShellProps) {
  const content = (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 flex-col gap-5 border-b px-4 pt-4 pb-5 md:px-8 md:pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="font-semibold text-xl leading-tight md:text-2xl">{title}</h2>
            {subtitle && (
              <p className="whitespace-pre-line text-muted-foreground text-sm">{subtitle}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="-me-2 -mt-1 shrink-0"
            onClick={() => onOpenChange(false)}
            aria-label="Close wizard"
          >
            <X />
          </Button>
        </div>
        {showProgress && (
          <WizardProgress currentStep={currentStep} totalSteps={totalSteps} steps={steps} />
        )}
      </header>
      <div ref={contentRef} className="min-h-0 flex-1 overflow-y-auto px-4 md:px-8">
        {children}
      </div>
    </div>
  );

  if (embedded) {
    return <div className="h-full min-h-0 w-full overflow-hidden bg-background">{content}</div>;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup
        showCloseButton={false}
        className="h-[94vh] max-h-[94vh] overflow-hidden sm:max-w-5xl"
      >
        {dialogTitle && <DialogTitle className="sr-only">{dialogTitle}</DialogTitle>}
        {content}
      </DialogPopup>
    </Dialog>
  );
}
