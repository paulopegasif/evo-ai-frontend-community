import React from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface ReplyToChipProps {
  replyToMessage: {
    id: string | number;
    text: string;
    sender?: {
      name?: string;
    };
    type: 'in' | 'out';
  };
  onClose: () => void;
}

const ReplyToChip: React.FC<ReplyToChipProps> = ({
  replyToMessage,
  onClose,
}) => {
  const { t } = useLanguage('widget');
  const senderName =
    replyToMessage.type === 'out' ? t('replyTo.you') : replyToMessage.sender?.name || t('replyTo.agent');

  const truncateText = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="mx-3 mt-2 flex items-center gap-2 rounded-lg border-s-2 border-foreground/24 bg-muted/48 py-1.5 ps-2.5 pe-1">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-muted-foreground text-xs">{t('replyTo.replyingTo', { name: senderName })}</p>
        <p className="truncate text-foreground text-sm">{truncateText(replyToMessage.text)}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label={t('replyTo.cancelReply')}
        title={t('replyTo.cancelReply')}
        className="rounded-md p-1 text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
};

export default ReplyToChip;
