import React from 'react';
import { Dialog, DialogDescription, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from '@/components/ui/dialog';
import { Sparkles, FileText, Type, Minimize2, Maximize2, Smile, Briefcase, Lightbulb, Shield } from 'lucide-react';
import { AIAction, AIActionType } from '@/types/chat/ai-assistance';
import { useLanguage } from '@/hooks/useLanguage';

interface AIActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (actionType: AIActionType) => void;
  actions: readonly AIAction[];
  hasMessage: boolean;
}

const getActionIcon = (actionType: AIActionType) => {
  const iconProps = { className: 'h-4 w-4' };

  switch (actionType) {
    case 'rephrase':
      return <Sparkles {...iconProps} />;
    case 'fix_spelling_grammar':
      return <FileText {...iconProps} />;
    case 'expand':
      return <Maximize2 {...iconProps} />;
    case 'shorten':
      return <Minimize2 {...iconProps} />;
    case 'make_friendly':
      return <Smile {...iconProps} />;
    case 'make_formal':
      return <Briefcase {...iconProps} />;
    case 'simplify':
      return <Lightbulb {...iconProps} />;
    case 'reply_suggestion':
      return <Sparkles {...iconProps} />;
    case 'summarize':
      return <Type {...iconProps} />;
    case 'analyze_sentiment':
      return <Shield {...iconProps} />;
    default:
      return <Sparkles {...iconProps} />;
  }
};

const AIActionsModal: React.FC<AIActionsModalProps> = ({
  isOpen,
  onClose,
  onSelectAction,
  actions,
  hasMessage,
}) => {
  const { t } = useLanguage('chat');
  const handleActionClick = (actionType: AIActionType) => {
    onSelectAction(actionType);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogPopup className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4.5 text-primary" />
            {t('aiAssistance.title')}
          </DialogTitle>
          <DialogDescription>
            {hasMessage
              ? t('aiAssistance.description.withMessage')
              : t('aiAssistance.description.withoutMessage')}
          </DialogDescription>
        </DialogHeader>

        <DialogPanel className="grid gap-1.5">
          {actions.map(action => (
            <button
              key={action.key}
              type="button"
              className="flex w-full min-w-0 items-start gap-3 rounded-lg border bg-card px-3.5 py-2.5 text-left outline-none transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => handleActionClick(action.key)}
            >
              <span className="mt-0.5 flex size-7 flex-shrink-0 items-center justify-center rounded-md bg-primary/10 [&_svg]:size-4">
                {getActionIcon(action.key)}
              </span>
              <span className="flex min-w-0 flex-1 flex-col break-words">
                <span className="font-medium text-sm">
                  {t(`aiAssistance.actions.${action.key}.label`)}
                </span>
                <span className="mt-0.5 text-muted-foreground text-xs">
                  {t(`aiAssistance.actions.${action.key}.description`)}
                </span>
              </span>
            </button>
          ))}
        </DialogPanel>
      </DialogPopup>
    </Dialog>
  );
};

export default AIActionsModal;
