import React, { useMemo } from 'react';
import { Reply } from 'lucide-react';
import { Message } from '@/types/chat/api';
import { useLanguage } from '@/hooks/useLanguage';
import { stripHtml } from '@/utils/stripHtml';
import {
  attachmentI18nKey,
  mediaTypeFromAttributes,
  senderNameFromAttributes,
} from '@/utils/chat/mediaLabels';

interface ReplyPreviewProps {
  message?: Message | null;
  isOwn: boolean;
}

const ReplyPreview: React.FC<ReplyPreviewProps> = ({ message, isOwn }) => {
  const { t } = useLanguage('chat');

  const previewContent = useMemo(() => {
    if (!message) {
      return t('messages.replyPreview.previousMessage');
    }

    if (message.content) {
      const plainText = stripHtml(message.content);
      if (plainText) {
        const maxLength = 100;
        return plainText.length > maxLength
          ? `${plainText.substring(0, maxLength)}...`
          : plainText;
      }
    }

    if (message.attachments && message.attachments.length > 0) {
      const fileType = message.attachments[0].file_type || 'file';
      return t(`messages.replyPreview.${attachmentI18nKey(fileType)}`);
    }

    // Fallback: media message whose attachment didn't materialize (inline base64).
    const mediaType = mediaTypeFromAttributes(message.content_attributes);
    if (mediaType) {
      return t(`messages.replyPreview.${attachmentI18nKey(mediaType)}`);
    }

    return t('messages.replyPreview.noContent');
  }, [message, t]);

  const senderName = message
    ? senderNameFromAttributes(message.content_attributes) ||
      message.sender?.name ||
      t('messages.replyPreview.userFallback')
    : t('messages.replyPreview.userFallback');
  const isResolved = !!message;

  const handleClick = () => {
    if (!message) return;
    const messageElement = document.querySelector(
      `[data-message-id="${CSS.escape(String(message.id))}"]`,
    );
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div
      role={isResolved ? 'button' : undefined}
      tabIndex={isResolved ? 0 : undefined}
      className={`mb-1.5 rounded-md border-s-2 px-2 py-1.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
        isResolved ? 'cursor-pointer hover:bg-foreground/6' : 'opacity-75'
      } ${isOwn ? 'border-s-primary bg-foreground/4' : 'border-s-muted-foreground/40 bg-muted/72'}`}
      onClick={handleClick}
      onKeyDown={e => {
        if (isResolved && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          e.stopPropagation();
          handleClick();
        }
      }}
    >
      <div className="flex items-start gap-1.5">
        <Reply className="mt-0.5 size-3 flex-shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          {isResolved && (
            <div className="mb-0.5 font-medium text-foreground text-xs">{senderName}</div>
          )}
          <div className={`line-clamp-2 text-muted-foreground text-xs ${isResolved ? '' : 'italic'}`}>
            {previewContent}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReplyPreview;
