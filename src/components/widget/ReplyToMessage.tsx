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
    <div
      className={`flex items-center gap-2 mb-1 text-xs opacity-70 ${
        messageType === 'out' ? 'justify-end' : 'justify-start'
      }`}
    >
      <Reply size={12} className="text-muted-foreground" />
      <div className="bg-muted rounded px-2 py-1 border-l-2 border-border">
        {senderName && (
          <div className="text-muted-foreground font-medium">{senderName}</div>
        )}
        <div
          className={`text-muted-foreground ${isUnresolved ? 'italic' : ''}`}
        >
          {isUnresolved ? replyTo.text : truncateText(replyTo.text)}
        </div>
      </div>
    </div>
  );
};
