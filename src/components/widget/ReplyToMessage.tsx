import React from 'react';
import { Reply } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { stripHtml } from '@/utils/stripHtml';

interface ReplyToMessageProps {
  replyTo: {
    id: string | number;
    text: string;
    sender?: string;
    type: 'in' | 'out';
    unresolved?: boolean;
  };
  messageType: 'in' | 'out';
}

export const ReplyToMessage: React.FC<ReplyToMessageProps> = ({ replyTo, messageType }) => {
  const { t } = useLanguage('widget');

  const truncateText = (text: string, maxLength: number = 40) => {
    const plain = stripHtml(text);
    if (plain.length <= maxLength) return plain;
    return plain.substring(0, maxLength) + '...';
  };

  const isUnresolved = replyTo.unresolved === true;
  const senderName = isUnresolved
    ? null
    : replyTo.sender || (replyTo.type === 'out' ? t('replyTo.you') : t('replyTo.agent'));

  return (
    <div className={`mb-1 flex items-center gap-1.5 text-xs ${messageType === 'out' ? 'justify-end' : 'justify-start'}`}>
      <Reply className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0 rounded-md border-s-2 border-border bg-muted/64 px-2 py-1 text-muted-foreground">
        {senderName && <p className="font-medium">{senderName}</p>}
        <p className={isUnresolved ? 'italic' : 'truncate'}>{isUnresolved ? replyTo.text : truncateText(replyTo.text)}</p>
      </div>
    </div>
  );
};
