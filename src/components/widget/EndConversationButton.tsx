import React, { useState } from 'react';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import { useLanguage } from '@/hooks/useLanguage';

interface EndConversationButtonProps {
  websiteToken: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  canEndConversation?: boolean; // Only show if conversation is open/pending/snoozed
  hasEndConversationEnabled?: boolean; // Feature flag
}

const EndConversationButton: React.FC<EndConversationButtonProps> = ({
  websiteToken,
  onSuccess,
  onError,
  disabled = false,
  canEndConversation = false,
  hasEndConversationEnabled = false,
}) => {
  const { t } = useLanguage('widget');
  const [isLoading, setIsLoading] = useState(false);

  // Don't render if feature is disabled or can't end conversation
  if (!hasEndConversationEnabled || !canEndConversation) {
    return null;
  }

  const handleEndConversation = async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);

    try {
      const { widgetService } = await import('@/services/widget/widgetService');
      await widgetService.toggleConversationStatus(websiteToken);
      onSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('endConversation.error');
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleEndConversation}
            disabled={disabled || isLoading}
            aria-label={t('endConversation.tooltip')}
            className="shrink-0 text-white hover:bg-white/16 hover:text-white data-pressed:bg-white/16"
          />
        }
      >
        {isLoading ? <Spinner /> : <LogOut />}
      </TooltipTrigger>
      <TooltipPopup>{t('endConversation.tooltip')}</TooltipPopup>
    </Tooltip>
  );
};

export default EndConversationButton;
