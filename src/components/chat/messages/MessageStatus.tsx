import React from 'react';
import { Button } from '@/components/ui/compat';
import { Check, CheckCheck, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Message } from '@/types/chat/api';
import { formatMessageTime } from '@/utils/time/timeHelpers';
import { useLanguage } from '@/hooks/useLanguage';
import { explainSendError, htmlToPlainText } from './messageErrors';

interface MessageStatusProps {
  message: Message;
  isOwn: boolean;
  onRetry?: () => void;
  // 'tuck': float:right dentro do fluxo do texto (bolha curta, estilo WhatsApp).
  // 'default': bloco separado abaixo do conteúdo (mídia/cards/preview, mais alto).
  // Nunca 'absolute' — o protótipo reserva espaço em fluxo nos dois casos, sem overlap.
  variant?: 'default' | 'tuck';
}

const MessageStatus: React.FC<MessageStatusProps> = ({ message, isOwn, onRetry, variant = 'default' }) => {
  const { t } = useLanguage('chat');

  // MessageBubble só colore a bolha (bg-primary/bg-purple-600) quando isOwn — isFromAgent/
  // isFromBot ali só ficam true junto de isOwn (ver MessageList.tsx). Notas privadas mantêm
  // fundo claro mesmo com isOwn, então ficam com o texto neutro.
  const isOnColoredBubble = isOwn && !message.private;
  // On the colored bubble, inherit the bubble's foreground (white on a dark
  // primary, black on a light one) instead of a fixed white that vanished on
  // light brand palettes in dark mode.
  const timeTextClass = isOnColoredBubble ? 'opacity-70' : 'text-muted-foreground';
  const tickClass = isOnColoredBubble ? 'opacity-70' : 'text-muted-foreground';
  const readTickClass = isOnColoredBubble ? 'text-sky-500' : 'text-primary';

  const getStatusIcon = () => {
    if (!isOwn) return null;

    // CORREÇÃO: Tratar mensagens privadas sempre como enviadas com sucesso
    if (message.private) {
      // Mensagens privadas são sempre "bem-sucedidas" (salvas no banco)
      return <Check className="h-3 w-3 text-muted-foreground" />;
    }

    switch (message.status) {
      case 'sent':
        // Para mensagens privadas, 'sent' é o status final correto
        // Para mensagens públicas, 'sent' indica que foi enviada para o canal
        return <Check className={`h-3 w-3 ${tickClass}`} />;
      case 'delivered':
        return <CheckCheck className={`h-3 w-3 ${tickClass}`} />;
      case 'read':
        return <CheckCheck className={`h-3 w-3 ${readTickClass}`} />;
      case 'progress':
        return <Loader2 className="h-3 w-3 text-info animate-spin" />;
      case 'failed': {
        // Explain the real provider error (e.g. recipient not on WhatsApp) and
        // offer a retry, instead of the old generic "check the webhook" notice.
        const explained = explainSendError(message.content_attributes?.external_error);
        const reason = explained.key ? t(explained.key) : explained.raw;
        return (
          <Button
            size="sm"
            variant="ghost"
            className="h-auto p-0 text-destructive hover:text-destructive/80"
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              toast.error(t('messages.messageStatus.sendFailedTitle'), {
                description: reason || t('messages.messageStatus.sendFailedNoReason'),
                ...(onRetry
                  ? { action: { label: t('messages.messageStatus.tryAgain'), onClick: () => onRetry() } }
                  : {}),
              });
            }}
            title={reason || t('messages.messageStatus.sendFailed')}
            aria-label={t('messages.messageStatus.sendFailed')}
          >
            <AlertCircle className="h-3 w-3" />
            <span className="ml-1 text-xs">{t('messages.messageStatus.failedText')}</span>
          </Button>
        );
      }
      default:
        return <Clock className="h-3 w-3 text-muted-foreground animate-pulse" />;
    }
  };

  const isEdited = message.content_attributes?.is_edited === true && !message.content_attributes?.deleted;
  const editedLabel = isEdited ? (
    <span className={`italic ${timeTextClass}`} title={htmlToPlainText(message.content_attributes?.previous_content || '') || undefined}>
      {t('messages.messageStatus.edited')}
    </span>
  ) : null;

  // 'tuck' fica em fluxo normal (float, sem position:absolute) — precisa ser renderizado
  // como o último nó dentro do MESMO bloco de texto para "grudar" na última linha, à
  // la WhatsApp. Ver uso em MessageBubble (wrapper com overflow:hidden faz o clearfix).
  if (variant === 'tuck') {
    return (
      <span
        className={`float-right inline-flex items-center gap-1 mt-1.5 ml-3.5 text-[11px] leading-none ${timeTextClass}`}
      >
        {editedLabel}
        <span>{formatMessageTime(message.created_at)}</span>
        {getStatusIcon()}
      </span>
    );
  }

  return (
    <div
      className={`flex items-center gap-1 mt-1.5 text-xs ${isOwn ? 'justify-end' : 'justify-start'}`}
    >
      {editedLabel}
      <span className={timeTextClass}>{formatMessageTime(message.created_at)}</span>
      {getStatusIcon()}
    </div>
  );
};

export default MessageStatus;
