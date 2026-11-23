import React, { useRef, useEffect, useMemo } from 'react';
import { History, Reply, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { formatDistanceToNow } from 'date-fns';
import { enUS, es, fr, it, pt, ptBR } from 'date-fns/locale';
import { useLanguage } from '@/hooks/useLanguage';

import type { AttachmentFile } from '@/types/core';
import {
  SharedImageBubble,
  SharedAudioBubble,
  SharedVideoBubble,
  SharedFileBubble,
  getAttachmentType,
  type SharedAttachment,
} from '@/components/shared/attachments';
import { ReplyToMessage } from './ReplyToMessage';
import { EmailCollectInput } from './EmailCollectInput';
import { openAttachmentInNewTab } from '@/components/chat/messages/utils/openAttachmentInNewTab';

export interface MessageItem {
  id: string;
  originalId?: string | number; // Keep original ID for backend queries
  type: 'in' | 'out' | 'system';
  text: string;
  ts?: number;
  status?: 'sending' | 'sent' | 'failed';
  avatarUrl?: string;
  isSystem?: boolean;
  echoId?: string;
  attachments?: AttachmentFile[];
  sender?: {
    name?: string;
    avatar_url?: string;
  };
  replyTo?: {
    id: string | number;
    text: string;
    sender?: string;
    type?: 'in' | 'out';
    unresolved?: boolean;
  };
  contentType?: string;
  submittedEmail?: string;
  items?: Array<{ title?: string; value?: string }>;
  submittedValues?: any;
  contentAttributes?: {
    email?: {
      html_content?: {
        full?: string;
        reply?: string;
        quoted?: string;
      };
      text_content?: {
        full?: string;
        reply?: string;
        quoted?: string;
      };
    };
  };
}

interface MessageListProps {
  items: MessageItem[];
  inboundAvatarUrl?: string;
  onRetry?: (id: string, text: string) => void;
  onReply?: (message: MessageItem) => void;
  onSelectOption?: (message: MessageItem, item: { title?: string; value?: string }) => void;
  widgetColor?: string;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  onEmailSubmitted?: (email: string) => void;
}

const MessageList: React.FC<MessageListProps> = ({
  items,
  inboundAvatarUrl,
  onRetry,
  onReply,
  onSelectOption,
  widgetColor = '#00d4aa',
  onLoadMore,
  isLoadingMore = false,
  hasMore = true,
  onEmailSubmitted,
}) => {
  const { t, currentLanguage } = useLanguage('widget');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const shouldScrollToBottom = useRef(true);

  const dateLocale = useMemo(() => {
    const map: Record<string, typeof enUS> = { en: enUS, es, fr, it, pt, 'pt-BR': ptBR };
    return map[currentLanguage] ?? enUS;
  }, [currentLanguage]);

  const sanitizeMessageHTML = (html: string): string => {
    if (!html) return '';

    let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');
    return sanitized;
  };

  const hasHtmlTags = (text: string): boolean => /<\/?[a-z][\s\S]*>/i.test(text);

  const stripSelectFromText = (text: string, items: Array<{ title?: string }>) => {
    if (!text) return '';
    if (!items?.length) return text;

    const lines = text.split('\n');
    let removed = 0;

    while (lines.length > 0) {
      const last = lines[lines.length - 1]?.trim() || '';
      const m = last.match(/^(\d+)\.\s+(.*)$/);
      if (!m) break;
      lines.pop();
      removed += 1;
    }

    if (removed === 0) return text;
    const pruned = lines.join('\n').trim();
    return pruned || text;
  };

  // Handle scroll event for loading more messages
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !onLoadMore) return;

    const handleScroll = () => {
      // Check if user scrolled to the top
      if (container.scrollTop <= 50 && hasMore && !isLoadingMore) {
        onLoadMore();
      }

      // Track if user is near bottom to decide whether to auto-scroll on new messages
      const { scrollTop, scrollHeight, clientHeight } = container;
      shouldScrollToBottom.current = scrollHeight - scrollTop - clientHeight < 100;
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [onLoadMore, hasMore, isLoadingMore]);

  // Auto-scroll to bottom when messages are initially loaded or new messages arrive
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container && shouldScrollToBottom.current) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        container.scrollTop = container.scrollHeight;
      }, 50);
    }
  }, [items]);

  return (
    <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-y-auto bg-muted/40 px-3 py-4 dark:bg-background">
      {/* Load More Button / Loading Indicator */}
      {(hasMore || isLoadingMore) && (
        <div className="mb-3 flex justify-center">
          {isLoadingMore ? (
            <div className="flex items-center gap-2 text-muted-foreground text-xs" aria-live="polite">
              <Spinner className="size-3.5" />
              {t('messageList.loadingOld')}
            </div>
          ) : hasMore ? (
            <Button variant="outline" size="xs" onClick={onLoadMore}>
              <History />
              {t('messageList.loadOldMessages')}
            </Button>
          ) : null}
        </div>
      )}

      {items.map(m => {
        const hasAvatar = !!(m.avatarUrl || inboundAvatarUrl);
        const isEmailCollect = m.contentType === 'input_email';
        const isSelect =
          m.contentType === 'input_select' && Array.isArray(m.items) && m.items.length > 0;
        const selectDisabled = isSelect && !!m.submittedValues;
        const selectText = isSelect ? stripSelectFromText(m.text, m.items || []) : m.text;

        // Render email collect input as a special interactive message
        if (isEmailCollect) {
          return (
            <div key={m.id} className="mb-3 flex animate-fadeIn justify-center">
              <div className="mx-auto w-full max-w-[90%]">
                <div className="rounded-2xl border bg-card p-3 text-[13px] leading-snug shadow-xs/5">
                  {m.text && (
                    <div className="mb-2 whitespace-pre-wrap break-words text-foreground">{m.text}</div>
                  )}
                  <EmailCollectInput
                    messageId={m.originalId || m.id}
                    widgetColor={widgetColor}
                    onSubmitted={onEmailSubmitted}
                    alreadySubmitted={!!m.submittedEmail}
                  />
                </div>
              </div>
            </div>
          );
        }

        return (
          <div
            key={m.id}
            className={`mb-3 flex items-end gap-2 ${m.isSystem || m.type === 'system'
              ? 'justify-center animate-fadeIn'
              : m.type === 'out'
                ? 'justify-end animate-slideInFromRight'
                : 'justify-start animate-slideInFromLeft'
              }`}
          >
            {m.type === 'in' && !m.isSystem && hasAvatar && (
              <img
                src={m.avatarUrl || inboundAvatarUrl}
                alt=""
                className="mb-5 size-6 shrink-0 rounded-full object-cover ring-1 ring-border"
              />
            )}
            <div className={`flex min-w-0 max-w-[82%] flex-col ${m.isSystem || m.type === 'system' ? 'mx-auto items-center' : m.type === 'out' ? 'items-end' : 'items-start'}`}>
              {/* Reply-to chip */}
              {m.replyTo && m.type !== 'system' && m.replyTo.type && (
                <ReplyToMessage
                  replyTo={m.replyTo as typeof m.replyTo & { type: 'in' | 'out' }}
                  messageType={m.type}
                />
              )}
              <div
                className={`max-w-full text-[13px] leading-snug transition-opacity duration-200 ${m.status === 'sending' ? 'opacity-70' : ''
                  } ${m.type === 'out'
                    ? 'rounded-2xl rounded-br-md text-white shadow-xs/5'
                    : m.isSystem || m.type === 'system'
                      ? 'rounded-xl bg-muted px-3 py-1.5 text-center text-muted-foreground text-xs'
                      : 'rounded-2xl rounded-bl-md border bg-card text-card-foreground shadow-xs/5'
                  } ${m.isSystem || m.type === 'system' ? '' : m.attachments?.length ? 'p-1.5' : 'px-3 py-2'}`}
                style={m.type === 'out' ? { backgroundColor: widgetColor } : undefined}
              >
                {/* Attachments */}
                {m.attachments && m.attachments.length > 0 && (
                  <>
                    {/* Group attachments by type */}
                    {(() => {
                      const attachmentsByType = m.attachments.reduce((groups, attachment) => {
                        const fileType = attachment.file_type || '';
                        const attachmentType = getAttachmentType(fileType);

                        // Additional check for images based on URL extension
                        const isImageByUrl =
                          attachment.data_url &&
                          (attachment.data_url.includes('.png') ||
                            attachment.data_url.includes('.jpg') ||
                            attachment.data_url.includes('.jpeg') ||
                            attachment.data_url.includes('.gif') ||
                            attachment.data_url.includes('.webp'));

                        const finalType =
                          fileType === 'image' || isImageByUrl ? 'image' : attachmentType;

                        if (!groups[finalType]) groups[finalType] = [];

                        // Convert to SharedAttachment format
                        const sharedAttachment: SharedAttachment = {
                          id: attachment.id,
                          file_url: attachment.file_url,
                          data_url: attachment.data_url,
                          thumb_url: attachment.thumb_url,
                          file_type: attachment.file_type,
                          file_size: attachment.file_size,
                          fallback_title: attachment.fallback_title,
                        };

                        groups[finalType].push(sharedAttachment);
                        return groups;
                      }, {} as Record<string, SharedAttachment[]>);

                      return Object.entries(attachmentsByType).map(([type, attachments]) => {
                        return (
                          <div key={type} className="mb-2">
                            {type === 'image' && (
                              <SharedImageBubble
                                attachments={attachments}
                                messageType={m.type === 'system' ? 'in' : m.type}
                                onOpenFullscreen={({ url, title }) => {
                                  openAttachmentInNewTab({
                                    url,
                                    filename: title,
                                  });
                                }}
                              />
                            )}
                            {type === 'video' && (
                              <SharedVideoBubble
                                attachments={attachments}
                                messageType={m.type === 'system' ? 'in' : m.type}
                              />
                            )}
                            {type === 'audio' && (
                              <SharedAudioBubble
                                attachments={attachments}
                                messageType={m.type === 'system' ? 'in' : m.type}
                              />
                            )}
                            {type === 'file' && (
                              <SharedFileBubble
                                attachments={attachments}
                                messageType={m.type === 'system' ? 'in' : m.type}
                              />
                            )}
                          </div>
                        );
                      });
                    })()}
                  </>
                )}

                {/* Text content */}
                {selectText && (
                  <div className={m.attachments?.length ? 'mt-2' : ''}>
                    {/* Render HTML for incoming email messages */}
                    {m.contentType === 'incoming_email' &&
                      m.contentAttributes?.email?.html_content?.full ? (
                      <div
                        className="email-html-content"
                        dangerouslySetInnerHTML={{
                          __html: m.contentAttributes.email.html_content.full,
                        }}
                        style={{
                          maxWidth: '100%',
                          overflow: 'auto',
                          wordBreak: 'break-word',
                          fontSize: '13px',
                          lineHeight: '1.4',
                          color: m.type === 'out' ? '#ffffff' : 'inherit',
                        }}
                      />
                    ) : (
                      hasHtmlTags(selectText) ? (
                        <div
                          className="whitespace-pre-wrap break-words rich-content"
                          dangerouslySetInnerHTML={{ __html: sanitizeMessageHTML(selectText) }}
                        />
                      ) : (
                        <div className="whitespace-pre-wrap break-words">{selectText}</div>
                      )
                    )}
                  </div>
                )}

                {isSelect && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.items?.map((item, idx) => {
                      const title = (item?.title || '').trim();
                      if (!title) return null;

                      return (
                        <Button
                          key={`${m.id}-opt-${idx}`}
                          variant="outline"
                          size="sm"
                          disabled={selectDisabled || !onSelectOption}
                          onClick={() => onSelectOption?.(m, item)}
                          className="h-auto min-h-8 whitespace-normal py-1.5 text-left text-[13px]"
                        >
                          {title}
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div
                className={`mt-1 flex items-center gap-2 px-1 ${m.type === 'out' ? 'justify-end' : 'justify-start'
                  }`}
              >
                <span className="text-[10px] text-muted-foreground">
                  {m.ts
                    ? formatDistanceToNow(new Date(m.ts), { addSuffix: true, locale: dateLocale })
                    : ''}
                </span>
                {m.type === 'out' && m.status === 'sending' && (
                  <span className="text-[10px] text-muted-foreground">{t('messageList.sending')}</span>
                )}
                {m.type === 'out' && m.status === 'failed' && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-0.5 font-medium text-[10px] text-destructive-foreground hover:underline"
                    onClick={() => onRetry?.(m.id, m.text)}
                  >
                    <RotateCcw className="size-2.5" aria-hidden="true" />
                    {t('messageList.retry')}
                  </button>
                )}
                {m.type === 'in' && !m.isSystem && onReply && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:underline"
                    onClick={() => onReply(m)}
                  >
                    <Reply className="size-2.5" aria-hidden="true" />
                    {t('messageList.reply')}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MessageList;
