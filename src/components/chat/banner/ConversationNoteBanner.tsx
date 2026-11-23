import React from 'react';
import { MessageSquareText, X } from 'lucide-react';

import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import type { Message } from '@/types/chat/api';

interface ConversationNoteBannerProps {
  note: Message;
  onHide: () => void;
}

/**
 * Pinned strip with the conversation's latest private note (the last private
 * message; notes have no entity of their own). Warning tokens keep it legible
 * in both themes.
 */
const ConversationNoteBanner: React.FC<ConversationNoteBannerProps> = ({ note, onHide }) => {
  const { t } = useLanguage('chat');

  return (
    <div className="self-stretch border-warning/24 border-b border-t-2 border-t-warning bg-warning/8 px-4 py-2.5 md:px-6">
      <div className="flex items-start gap-2.5">
        <MessageSquareText aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2.5">
            <span className="font-semibold text-warning-foreground text-xs uppercase tracking-wide">
              {t('chatArea.noteBanner.title', 'Nota do atendimento')}
            </span>
            <div className="flex shrink-0 items-center gap-1.5">
              <span className="text-muted-foreground text-xs">{note.sender?.name}</span>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={onHide}
                aria-label={t('chatArea.noteBanner.hide', 'Ocultar')}
                className="text-muted-foreground"
              >
                <X />
              </Button>
            </div>
          </div>
          <p className="mt-0.5 line-clamp-3 text-foreground text-sm leading-relaxed">{note.content}</p>
        </div>
      </div>
    </div>
  );
};

export default ConversationNoteBanner;
