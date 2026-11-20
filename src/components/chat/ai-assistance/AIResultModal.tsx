import React from 'react';
import { Button } from '@/components/ui/button';
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
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';

interface AIResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: () => void;
  originalMessage?: string;
  generatedMessage?: string;
  isLoading: boolean;
  actionLabel?: string;
}

const AIResultModal: React.FC<AIResultModalProps> = ({
  isOpen,
  onClose,
  onApply,
  originalMessage,
  generatedMessage,
  isLoading,
  actionLabel,
}) => {
  const { t } = useLanguage('chat');
  const displayActionLabel = actionLabel || t('aiAssistance.button.fallbackLabel');
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    if (generatedMessage) {
      await navigator.clipboard.writeText(generatedMessage);
      setCopied(true);
      toast.success(t('aiAssistance.resultModal.copy.success'));
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogPopup className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t('aiAssistance.resultModal.title', { actionLabel: displayActionLabel })}</DialogTitle>
          <DialogDescription>
            {isLoading
              ? t('aiAssistance.resultModal.description.loading')
              : t('aiAssistance.resultModal.description.ready')}
          </DialogDescription>
        </DialogHeader>

        <DialogPanel className="space-y-4">
          {originalMessage && (
            <section>
              <h4 className="mb-1.5 font-medium text-muted-foreground text-xs">
                {t('aiAssistance.resultModal.originalMessage')}
              </h4>
              <div className="whitespace-pre-wrap rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                {originalMessage}
              </div>
            </section>
          )}

          <section>
            <div className="mb-1.5 flex items-center justify-between">
              <h4 className="font-medium text-muted-foreground text-xs">
                {t('aiAssistance.resultModal.generatedResult')}
              </h4>
              {generatedMessage && !isLoading && (
                <Button variant="ghost" size="xs" onClick={handleCopy}>
                  {copied ? <Check className="text-success-foreground" /> : <Copy />}
                  {copied
                    ? t('aiAssistance.resultModal.copy.copied')
                    : t('aiAssistance.resultModal.copy.label')}
                </Button>
              )}
            </div>
            <div
              aria-live="polite"
              aria-busy={isLoading || undefined}
              className="min-h-[100px] whitespace-pre-wrap rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm"
            >
              {isLoading ? (
                <div className="space-y-2 py-1" aria-label={t('aiAssistance.resultModal.processing')}>
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-11/12" />
                  <Skeleton className="h-3.5 w-3/5" />
                </div>
              ) : generatedMessage ? (
                generatedMessage
              ) : (
                <span className="text-muted-foreground italic">
                  {t('aiAssistance.resultModal.noContent')}
                </span>
              )}
            </div>
          </section>
        </DialogPanel>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            {t('aiAssistance.resultModal.actions.cancel')}
          </Button>
          <Button onClick={onApply} disabled={isLoading || !generatedMessage}>
            {t('aiAssistance.resultModal.actions.apply')}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
};

export default AIResultModal;
