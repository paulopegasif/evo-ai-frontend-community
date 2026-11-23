import React from 'react';
import { CheckCircle, Clock, MessageCircle, Pause } from '@/components/icons';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import { useLanguage } from '@/hooks/useLanguage';
import { getStatusConfig } from '@/utils/chat/conversationStatus';

interface ConversationStatusIconProps {
  status: string;
  size?: 'xs' | 'sm' | 'md';
}

const STATUS_ICONS: Record<string, typeof MessageCircle> = {
  open: MessageCircle,
  pending: Clock,
  resolved: CheckCircle,
  snoozed: Pause,
};

const ConversationStatusIcon: React.FC<ConversationStatusIconProps> = ({ status, size = 'sm' }) => {
  const { t } = useLanguage('chat');

  const config = getStatusConfig(status, t);
  const Icon = STATUS_ICONS[status] || MessageCircle;

  const iconSize = size === 'xs' ? 'w-2.5 h-2.5' : size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const containerSize = size === 'xs' ? 'w-4 h-4' : size === 'sm' ? 'w-5 h-5' : 'w-6 h-6';

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            aria-label={config.label}
            className={`${containerSize} flex flex-shrink-0 cursor-help items-center justify-center rounded-full ${config.bgColor}`}
          />
        }
      >
        <Icon aria-hidden="true" className={`${iconSize} ${config.color}`} />
      </TooltipTrigger>
      <TooltipPopup side="top" className="px-1 py-1">
        <div className="text-center">
          <div className="font-semibold text-foreground text-sm">{config.label}</div>
          <div className="mt-0.5 text-muted-foreground text-xs">{config.description}</div>
        </div>
      </TooltipPopup>
    </Tooltip>
  );
};

export default ConversationStatusIcon;
