import React, { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuPopup,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import ConfirmDialog from '@/components/base/ConfirmDialog';
import { LockIcon, Reply, Copy, Trash2, Shield, Ban, Pencil } from '@/components/icons';
import { Message, MESSAGE_TYPE } from '@/types/chat/api';
import { useLanguage } from '@/hooks/useLanguage';
import MessageText from '@/components/chat/messages/MessageText';
import MessageImage from '@/components/chat/messages/MessageImage';
import MessageFile from '@/components/chat/messages/MessageFile';
import MessageAudio from '@/components/chat/messages/MessageAudio';
import MessageVideo from '@/components/chat/messages/MessageVideo';
import MessageInputSelect from '@/components/chat/messages/MessageInputSelect';
import MessageLocation from '@/components/chat/messages/MessageLocation';
import MessageCarousel from '@/components/chat/messages/MessageCarousel';
import MessageStatus from '@/components/chat/messages/MessageStatus';
import SystemMessage from '@/components/chat/messages/SystemMessage';
import ReplyPreview from '@/components/chat/messages/ReplyPreview';
import EditMessageDialog from '@/components/chat/messages/EditMessageDialog';
import { WHATSAPP_EDIT_WINDOW_MS, messageTimestampMs } from '@/components/chat/messages/messageErrors';
import { FacebookCommentModeration } from '@/types/channels/inbox';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  isFromBot?: boolean;
  isFromAgent?: boolean;
  showAvatar?: boolean;
  showTimestamp?: boolean;
  labels?: Array<{ id: string; title: string; color: string }>;
  allMessages?: Message[]; // Todas as mensagens para buscar reply
  isPostConversation?: boolean;
  isThreadRoot?: boolean;
  isThreadReply?: boolean;
  isFacebookStyle?: boolean; // Estilo Facebook (tudo à esquerda, bubble simples)
  moderation?: FacebookCommentModeration; // Moderation data for this message
  onRetry?: () => void;
  onReply?: (message: Message) => void;
  onCopy?: (message: Message) => void;
  onDelete?: (message: Message) => void;
  // Saves an edit; resolves true on success. Omitted → no "Edit" action.
  onEdit?: (message: Message, content: string) => Promise<boolean>;
  // The conversation's channel can mirror edits (WhatsApp via Evolution Go).
  canEditOnChannel?: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  isFromBot = false,
  isFromAgent = false,
  showAvatar = true,
  showTimestamp = true,
  labels = [],
  allMessages = [],
  isPostConversation: _isPostConversation = false, // Prefixado com _ para evitar erro TS (pode ser usado no futuro)
  isThreadRoot: _isThreadRoot = false, // Prefixado com _ para evitar erro TS (pode ser usado no futuro)
  isThreadReply = false,
  isFacebookStyle = false,
  moderation,
  onRetry,
  onReply,
  onCopy,
  onDelete,
  onEdit,
  canEditOnChannel = false,
}) => {
  const { t } = useLanguage('chat');
  const isTemplate = message.message_type === MESSAGE_TYPE.TEMPLATE;
  const isActivity = message.message_type === MESSAGE_TYPE.ACTIVITY;
  const isPrivate = message.private;
  const isDeleted = message.content_attributes?.deleted === true;
  const isRevokedByContact = message.content_attributes?.revoked_by_contact === true;
  const isRevokeCrmOnly = message.content_attributes?.revoke_propagated === false;

  // Moderation indicators
  const hasPendingModeration = moderation?.status === 'pending';
  const isBlocked = moderation?.status === 'approved' &&
    (moderation.moderation_action === 'delete_comment' || moderation.moderation_action === 'block_user');
  const isPendingResponse = moderation?.moderation_action === 'response_approval' && hasPendingModeration;

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const replyToMessageId = message.content_attributes?.in_reply_to;
  const replyToExternalId = message.content_attributes?.in_reply_to_external_id;
  const hasReplyReference = Boolean(replyToMessageId || replyToExternalId);

  const replyToMessage = useMemo(() => {
    if (!hasReplyReference) return null;
    if (replyToMessageId) {
      return allMessages.find(msg => String(msg.id) === String(replyToMessageId)) ?? null;
    }
    if (replyToExternalId) {
      return allMessages.find(
        msg => msg.source_id && String(msg.source_id) === String(replyToExternalId),
      ) ?? null;
    }
    return null;
  }, [hasReplyReference, replyToMessageId, replyToExternalId, allMessages]);

  const handleCopyMessage = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
    }
    onCopy?.(message);
  };

  const handleReplyMessage = () => {
    onReply?.(message);
  };

  const handleDeleteMessage = () => {
    setShowDeleteDialog(true);
  };

  const confirmDeleteMessage = async () => {
    setShowDeleteDialog(false);
    await onDelete?.(message);
  };

  // Mirrors Messages::EditService: text only; private notes any time; sent
  // WhatsApp messages only within WhatsApp's 15-minute edit window.
  const isEditableText =
    !message.attachments?.length && (!message.content_type || message.content_type === 'text');
  const canEdit =
    Boolean(onEdit) &&
    isOwn &&
    !isDeleted &&
    isEditableText &&
    Boolean(message.content) &&
    (isPrivate ||
      (canEditOnChannel &&
        message.status !== 'failed' &&
        Boolean(message.source_id) &&
        Date.now() - messageTimestampMs(message.created_at) < WHATSAPP_EDIT_WINDOW_MS));

  const renderContextMenu = (children: React.ReactNode) => {
    // Template, Activity messages e mensagens deletadas não têm context menu
    if (isTemplate || isActivity || isDeleted) {
      return children;
    }

    // REGRA EVOLUTION: Mensagens privadas não podem ser respondidas
    const canReply = !isPrivate;

    return (
      <ContextMenu>
        <ContextMenuTrigger render={children as React.ReactElement} />
        <ContextMenuPopup className="w-48">
          {canReply && (
            <ContextMenuItem onClick={handleReplyMessage}>
              <Reply />
              {t('messages.messageBubble.contextMenu.reply')}
            </ContextMenuItem>
          )}
          <ContextMenuItem onClick={handleCopyMessage}>
            <Copy />
            {t('messages.messageBubble.contextMenu.copy')}
          </ContextMenuItem>
          {canEdit && (
            <ContextMenuItem onClick={() => setShowEditDialog(true)}>
              <Pencil />
              {t('messages.messageBubble.contextMenu.edit')}
            </ContextMenuItem>
          )}
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={handleDeleteMessage}
            variant="destructive"
          >
            <Trash2 />
            {t('messages.messageBubble.contextMenu.delete')}
          </ContextMenuItem>
        </ContextMenuPopup>
      </ContextMenu>
    );
  };

  // Decide o layout do timestamp: 'tuck' (float dentro do texto, estilo WhatsApp) só faz
  // sentido pra texto puro — mídia/cards/preview usam 'default' (bloco abaixo do conteúdo),
  // que é como o protótipo trata a bolha alta (LinkedIn preview).
  const hasAttachments = Boolean(message.attachments && message.attachments.length > 0);
  const isPlainTextContent =
    !hasAttachments &&
    (message.content_type === 'text' ||
      message.content_type === 'incoming_email' ||
      !message.content_type);
  // Áudio puro (sem legenda) também usa 'tuck': a bolha de áudio é compacta e sem altura
  // variável (mesmo player em toda mensagem), então o timestamp flutuante cai logo abaixo
  // do player sem sobrepor nada — evita a inconsistência de tamanho/cor/posição do 'default'
  // (ver MessageStatus.tsx) entre bolha de texto e bolha de áudio. Áudio com legenda mantém
  // 'default' (mesma lógica de imagem/vídeo com legenda: bolha mais alta, layout em bloco).
  const firstAttachmentFileType = hasAttachments
    ? String(message.attachments[0]?.file_type || message.attachments[0]?.data_url || '').toLowerCase()
    : '';
  const isAudioOnly =
    hasAttachments &&
    !message.content &&
    (firstAttachmentFileType === 'audio' || firstAttachmentFileType.includes('audio/'));
  const timestampVariant: 'default' | 'tuck' =
    isPlainTextContent || isAudioOnly ? 'tuck' : 'default';

  const renderMessageContent = () => {
    // 🎯 CORREÇÃO: Detectar attachments automaticamente

    if (hasAttachments) {
      const firstAttachment = message.attachments[0];
      // 🔒 PROTEÇÃO: Garantir que fileType seja sempre string válida
      const fileType = String(firstAttachment?.file_type || firstAttachment?.data_url || '').toLowerCase();

      // Detectar tipo de arquivo pelos attachments
      if (fileType === 'location') {
        return (
          <>
            {message.content && (
              <MessageText
                content={message.content}
                isPrivateNote={isPrivate}
                contentType={message.content_type}
                contentAttributes={message.content_attributes}
              />
            )}
            <MessageLocation attachments={message.attachments} />
          </>
        );
      } else if (fileType === 'image' || fileType.includes('image/')) {
        return (
          <>
            {message.content && (
              <MessageText
                content={message.content}
                isPrivateNote={isPrivate}
                contentType={message.content_type}
                contentAttributes={message.content_attributes}
              />
            )}
            <MessageImage attachments={message.attachments} />
          </>
        );
      } else if (fileType === 'audio' || fileType.includes('audio/')) {
        return (
          <>
            {message.content && (
              <MessageText
                content={message.content}
                isPrivateNote={isPrivate}
                contentType={message.content_type}
                contentAttributes={message.content_attributes}
              />
            )}
            <MessageAudio attachments={message.attachments} />
          </>
        );
      } else if (fileType === 'video' || fileType.includes('video/')) {
        return (
          <>
            {message.content && (
              <MessageText
                content={message.content}
                isPrivateNote={isPrivate}
                contentType={message.content_type}
                contentAttributes={message.content_attributes}
              />
            )}
            <MessageVideo attachments={message.attachments} />
          </>
        );
      } else {
        return (
          <>
            {message.content && (
              <MessageText
                content={message.content}
                isPrivateNote={isPrivate}
                contentType={message.content_type}
                contentAttributes={message.content_attributes}
              />
            )}
            <MessageFile attachments={message.attachments} />
          </>
        );
      }
    }

    // Fallback para content_type tradicional
    switch (message.content_type) {
      case 'text':
      case 'incoming_email':
        return (
          <MessageText
            content={message.content}
            isPrivateNote={isPrivate}
            contentType={message.content_type}
            contentAttributes={message.content_attributes}
          />
        );
      case 'image':
        return <MessageImage attachments={message.attachments || []} />;
      case 'file':
        return <MessageFile attachments={message.attachments || []} />;
      case 'audio':
        return <MessageAudio attachments={message.attachments || []} />;
      case 'video':
        return <MessageVideo attachments={message.attachments || []} />;
      case 'cards':
        return (
          <MessageCarousel
            content={message.content}
            contentAttributes={message.content_attributes}
          />
        );
      case 'input_select':
        return (
          <MessageInputSelect
            content={message.content}
            contentAttributes={message.content_attributes}
          />
        );
      default:
        return (
          <MessageText
            content={message.content}
            isPrivateNote={isPrivate}
            contentType={message.content_type}
            contentAttributes={message.content_attributes}
          />
        );
    }
  };

  // Template messages - usar SystemMessage com identidade visual moderna
  if (isTemplate) {
    return <SystemMessage message={message} labels={labels} />;
  }

  // Activity messages - usar SystemMessage com identidade visual moderna
  if (isActivity) {
    return <SystemMessage message={message} labels={labels} />;
  }

  // Estilo Facebook: tudo à esquerda, bubble simples e limpo
  if (isFacebookStyle) {
    return (
      <>
        <div className="mb-1">
          {renderContextMenu(
            <div
              className={`rounded-xl border px-3 py-1.5 ${isDeleted ? 'cursor-default' : 'cursor-pointer'} ${isPrivate
                ? 'border-warning/32 bg-warning/8'
                : 'bg-card hover:bg-accent/40'
                }`}
            >
              {/* Indicador de mensagem privada */}
              {isPrivate && (
                <div className="mb-1.5 flex items-center gap-1.5 text-muted-foreground">
                  <LockIcon className="size-3 text-warning-foreground" />
                  <Badge variant="warning" size="sm">
                    {t('messages.messageBubble.privateNote.badge')}
                  </Badge>
                </div>
              )}

              {/* Moderation indicators */}
              {hasPendingModeration && !isPendingResponse && (
                <div className="mb-1.5 flex items-center gap-1.5">
                  <Shield className="size-3 text-warning-foreground" />
                  <Badge variant="warning" size="sm">
                    {t('messages.messageBubble.moderation.pending')}
                  </Badge>
                </div>
              )}

              {isBlocked && (
                <div className="mb-1.5 flex items-center gap-1.5">
                  <Ban className="size-3 text-destructive-foreground" />
                  <Badge variant="error" size="sm">
                    {t('messages.messageBubble.moderation.blocked')}
                  </Badge>
                </div>
              )}

              {hasReplyReference && !isPrivate && (
                <ReplyPreview message={replyToMessage} isOwn={false} />
              )}

              <div className={timestampVariant === 'tuck' ? 'overflow-hidden' : undefined}>
                {renderMessageContent()}
                {(isDeleted || isRevokedByContact) && (
                  <div className="mt-1 text-xs italic text-muted-foreground opacity-80">
                    {isRevokedByContact
                      ? t('messages.messageBubble.revokedByContact', 'Deleted by the contact')
                      : t('messages.messageBubble.deletedPlaceholder', 'This message was deleted')}
                    {isDeleted && isRevokeCrmOnly && (
                      <span className="ml-1">· {t('messages.messageBubble.revokeCrmOnly', 'removed only in the CRM')}</span>
                    )}
                  </div>
                )}
                {showTimestamp && timestampVariant === 'tuck' && (
                  <MessageStatus message={message} isOwn={false} onRetry={onRetry} variant="tuck" />
                )}
              </div>

              {showTimestamp && timestampVariant === 'default' && (
                <MessageStatus message={message} isOwn={false} onRetry={onRetry} variant="default" />
              )}
            </div>,
          )}
        </div>

        {canEdit && onEdit && (
          <EditMessageDialog
            message={message}
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
            onSave={content => onEdit(message, content)}
          />
        )}

        <ConfirmDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          title={t('messages.messageBubble.deleteDialog.title')}
          description={t('messages.messageBubble.deleteDialog.description')}
          cancelLabel={t('messages.messageBubble.deleteDialog.cancel')}
          confirmLabel={t('messages.messageBubble.deleteDialog.confirm')}
          onConfirm={confirmDeleteMessage}
        />
      </>
    );
  }

  // Regular messages (incoming/outgoing/bot) - estilo padrão
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${isThreadReply ? 'mb-1' : 'mb-2.5'}`}>
      {/* 👤 Avatar: REMOVIDO - não mostrar avatar nas mensagens */}
      {/* {!isOwn && showAvatar && !isThreadReply && (
        <Avatar className="w-8 h-8 mr-2 flex-shrink-0">
          <AvatarImage src={message.sender?.thumbnail} />
          <AvatarFallback className={isFromBot ? 'bg-purple-100 text-purple-700' : ''}>
            {isFromBot ? '🤖' : message.sender?.name?.[0]?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
      )} */}

      {/* Linha conectora para replies em thread (estilo Facebook) */}
      {isThreadReply && (
        <div className="w-6 flex-shrink-0 flex items-start justify-center mr-1 pt-1">
          <div className="relative w-full flex flex-col items-center">
            {/* Linha vertical */}
            <div className="w-0.5 h-full bg-primary/30 dark:bg-primary/20 min-h-[1rem]" />
            {/* Círculo conector */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary/40 dark:bg-primary/30 -mt-0.5" />
          </div>
        </div>
      )}

      <div
        className={`min-w-0 ${isThreadReply ? 'max-w-[min(calc(75%-2rem),40rem)]' : 'max-w-[min(75%,40rem)]'} ${isOwn ? 'ml-auto' : ''}`}
      >
        {/* Em conversa de grupo o backend anexa content_attributes.sender_name por mensagem;
            destaca o participante acima da bolha. Em 1:1, mantém o comportamento antigo. */}
        {!isOwn && (message.content_attributes?.sender_name || isThreadReply || !showAvatar) && (
          <div
            className={`mb-1 flex items-center gap-1.5 px-1 text-xs ${
              message.content_attributes?.sender_name
                ? 'font-medium text-primary'
                : 'text-muted-foreground'
            }`}
          >
            {message.content_attributes?.sender_name ||
              message.sender?.name ||
              t('messages.messageBubble.userFallback')}
          </div>
        )}

        {renderContextMenu(
          <div
            data-slot="message-bubble"
            className={`rounded-2xl border px-3 py-2 text-foreground text-sm shadow-xs/5 transition-colors ${isDeleted ? 'cursor-default' : 'cursor-pointer'} ${
              isOwn ? 'rounded-br-md' : 'rounded-bl-md'
            } ${isPrivate
                ? 'border-warning/32 border-s-2 border-s-warning bg-warning/8'
                : isFromBot
                  ? 'border-info/20 bg-info/8 hover:bg-info/12'
                  : isFromAgent || isOwn
                    ? 'border-primary/20 bg-primary/10 hover:bg-primary/14 dark:bg-primary/14 dark:hover:bg-primary/18'
                    : isThreadReply
                      ? 'border-s-2 border-s-primary/40 bg-card' // Estilo mais sutil para replies
                      : 'bg-card hover:bg-accent/40'
              }`}
          >
            {/* Nome do remetente DENTRO da bolha (não como badge externo) — estilo do
                protótipo: nome em destaque no topo, cor clara sobre o fundo colorido. */}
            {isOwn && (isFromAgent || isFromBot) && (
              <div className={`mb-0.5 font-semibold text-xs ${isFromBot ? 'text-info-foreground' : 'text-foreground/80'}`}>
                {message.sender?.name ||
                  (isFromBot ? t('messages.messageBubble.bot.fallback') : t('messages.messageBubble.agent.fallback'))}
              </div>
            )}

            {/* Indicador de mensagem privada */}
            {isPrivate && (
              <div className="mb-1.5 flex items-center gap-1.5 text-muted-foreground">
                <LockIcon className="size-3 text-warning-foreground" />
                <Badge variant="warning" size="sm">
                  {t('messages.messageBubble.privateNote.badge')}
                </Badge>
                <span className="text-xs">{t('messages.messageBubble.privateNote.description')}</span>
              </div>
            )}

            {/* Moderation indicators */}
            {hasPendingModeration && !isPendingResponse && (
              <div className="mb-1.5 flex items-center gap-1.5">
                <Shield className="size-3 text-warning-foreground" />
                <Badge variant="warning" size="sm">
                  {t('messages.messageBubble.moderation.pending')}
                </Badge>
              </div>
            )}

            {isBlocked && (
              <div className="mb-1.5 flex items-center gap-1.5">
                <Ban className="size-3 text-destructive-foreground" />
                <Badge variant="error" size="sm">
                  {t('messages.messageBubble.moderation.blocked')}
                </Badge>
              </div>
            )}

            {hasReplyReference && !isPrivate && (
              <ReplyPreview message={replyToMessage} isOwn={isOwn} />
            )}

            <div className={timestampVariant === 'tuck' ? 'overflow-hidden' : undefined}>
              {renderMessageContent()}
              {(isDeleted || isRevokedByContact) && (
                <div className="mt-1 text-xs italic text-muted-foreground opacity-80">
                  {isRevokedByContact
                    ? t('messages.messageBubble.revokedByContact', 'Deleted by the contact')
                    : t('messages.messageBubble.deletedPlaceholder', 'This message was deleted')}
                  {isDeleted && isRevokeCrmOnly && (
                    <span className="ml-1">· {t('messages.messageBubble.revokeCrmOnly', 'removed only in the CRM')}</span>
                  )}
                </div>
              )}
              {showTimestamp && timestampVariant === 'tuck' && (
                <MessageStatus message={message} isOwn={isOwn} onRetry={onRetry} variant="tuck" />
              )}
            </div>

            {showTimestamp && timestampVariant === 'default' && (
              <MessageStatus message={message} isOwn={isOwn} onRetry={onRetry} variant="default" />
            )}
          </div>,
        )}
      </div>

      {canEdit && onEdit && (
        <EditMessageDialog
          message={message}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onSave={content => onEdit(message, content)}
        />
      )}

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title={t('messages.messageBubble.deleteDialog.title')}
        description={t('messages.messageBubble.deleteDialog.description')}
        cancelLabel={t('messages.messageBubble.deleteDialog.cancel')}
        confirmLabel={t('messages.messageBubble.deleteDialog.confirm')}
        onConfirm={confirmDeleteMessage}
      />
    </div>
  );
};

export default MessageBubble;
