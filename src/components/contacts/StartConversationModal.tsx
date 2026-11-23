import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Mail, MessageSquare, Phone, Send, TriangleAlert } from '@/components/icons';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Contact, ContactableInboxes } from '@/types/contacts';
import { contactsService } from '@/services/contacts';
import { conversationAPI } from '@/services/conversations';
import MessageTemplateService from '@/services/channels/messageTemplatesService';
import { MessageTemplate } from '@/types/channels/inbox';
import { ConversationCreateData } from '@/types/chat/api';
import {
  getStatusBadgeKey,
  hasUnsupportedFormat,
  isTemplateSendable,
} from '../chat/message-template/templateStatus';
import {
  buildInitialVariableParams,
  extractTemplateVariables,
} from '@/utils/templateVariables';

interface StartConversationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact;
  onConversationCreated?: (conversationId: string) => void;
}

const getTemplatePreviewText = (template: MessageTemplate, isEmailInbox: boolean) => {
  if (isEmailInbox) {
    const metadata = template.metadata as Record<string, unknown> | undefined;
    if (metadata?.html_content && typeof metadata.html_content === 'string') {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = metadata.html_content;
      return tempDiv.textContent || tempDiv.innerText || 'Template de email';
    }

    return template.content || 'Template de email visual';
  }

  const bodyComponent = Array.isArray(template.components)
    ? template.components.find(c => c.type === 'BODY')
    : template.components?.body;
  return bodyComponent?.text || template.content || '';
};

const replaceTemplateVariables = (content: string, params: Record<string, string>) => {
  let result = content;
  Object.entries(params).forEach(([key, value]) => {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(
      new RegExp(`\\{\\{\\s*${escapedKey}\\s*\\}\\}`, 'g'),
      value || `{{${key}}}`,
    );
  });
  return result;
};

export default function StartConversationModal({
  open,
  onOpenChange,
  contact,
}: StartConversationModalProps) {
  const { t } = useLanguage('contacts');
  const [selectedInboxId, setSelectedInboxId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [availableInboxes, setAvailableInboxes] = useState<ContactableInboxes[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingInboxes, setLoadingInboxes] = useState(false);

  const [messageTemplates, setMessageTemplate] = useState<MessageTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [useTemplate, setUseTemplate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [templateParams, setTemplateParams] = useState<Record<string, string>>({});
  const [enableMessage, setEnableMessage] = useState(false);

  // Check if selected inbox
  const selectedInbox = useMemo(() => {
    return availableInboxes.find(inbox => inbox.id.toString() === selectedInboxId);
  }, [availableInboxes, selectedInboxId]);

  const isEmailInbox = useMemo(() => {
    return selectedInbox?.channel_type === 'Channel::Email';
  }, [selectedInbox]);

  const isWhatsAppInbox = useMemo(() => {
    return selectedInbox?.channel_type === 'Channel::Whatsapp';
  }, [selectedInbox]);

  // Check if it's WhatsApp Cloud (requires template)
  const isWhatsAppCloud = useMemo(() => {
    if (!isWhatsAppInbox) return false;
    const provider = (selectedInbox?.channel.provider as string)?.toLowerCase();
    // WhatsApp Cloud providers (not baileys, evolution, evolution_go)
    return !provider || !['baileys', 'evolution', 'evolution_go'].includes(provider);
  }, [isWhatsAppInbox, selectedInbox]);

  const loadAvailableInboxes = useCallback(async () => {
    setLoadingInboxes(true);
    try {
      const inboxes = await contactsService.getContactableInboxes(contact.id);

      setAvailableInboxes(inboxes);

      // Auto-select first available inbox
      const firstAvailable = inboxes.find(
        (inbox: ContactableInboxes) => inbox.available && inbox.can_create_conversation,
      );
      if (firstAvailable) {
        setSelectedInboxId(firstAvailable.id.toString());
      }
    } catch (error) {
      console.error('Error loading contactable inboxes:', error);
      setAvailableInboxes([]);
    } finally {
      setLoadingInboxes(false);
    }
  }, [contact.id]);

  const loadMessageTemplate = useCallback(
    async (inboxId: string, cloudInbox: boolean, isCancelled: () => boolean) => {
      setLoadingTemplates(true);
      try {
        const response = await MessageTemplateService.getTemplates(inboxId);

        if (isCancelled()) return;

        const templates = response?.data || [];

        if (!cloudInbox) {
          setMessageTemplate(templates);
          return;
        }

        // Keep pending/unknown templates visible so the user can see why the flow
        // is blocked. Submit-time guard still requires isTemplateSendable(t).
        const visible = templates.filter(template => !hasUnsupportedFormat(template));
        setMessageTemplate(visible);
      } catch (error) {
        if (isCancelled()) return;
        console.error('Error loading templates:', error);
        setMessageTemplate([]);
      } finally {
        if (!isCancelled()) {
          setLoadingTemplates(false);
        }
      }
    },
    [],
  );

  // Load available inboxes when modal opens
  useEffect(() => {
    if (open) {
      loadAvailableInboxes();
    }
  }, [open, contact.id, loadAvailableInboxes]);

  // Load templates when inbox is selected
  useEffect(() => {
    setMessageTemplate([]);
    setSelectedTemplate(null);

    if (!selectedInboxId) {
      setUseTemplate(false);
      return;
    }

    // Only auto-enable template if it's WhatsApp Cloud (requires template)
    setUseTemplate(isWhatsAppCloud);

    let cancelled = false;
    loadMessageTemplate(selectedInboxId, isWhatsAppCloud, () => cancelled);

    return () => {
      cancelled = true;
    };
  }, [selectedInboxId, loadMessageTemplate, isWhatsAppCloud]);

  const getChannelIcon = (channelType: string) => {
    switch (channelType) {
      case 'Channel::Whatsapp':
        return <MessageSquare className="h-4 w-4 text-success-foreground" />;
      case 'Channel::Email':
        return <Mail className="h-4 w-4 text-info-foreground" />;
      case 'Channel::Sms':
        return <Phone className="h-4 w-4 text-purple-600" />;
      default:
        return <MessageSquare className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getChannelLabel = (channelType: string) => {
    switch (channelType) {
      case 'Channel::Whatsapp':
        return t('startConversation.channels.whatsapp');
      case 'Channel::Email':
        return t('startConversation.channels.email');
      case 'Channel::Sms':
        return t('startConversation.channels.sms');
      case 'Channel::WebWidget':
        return t('startConversation.channels.webWidget');
      case 'Channel::Api':
        return t('startConversation.channels.api');
      default:
        return channelType.replace('Channel::', '');
    }
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const someTemplateParams = (): boolean => {
    return (
      Object.keys(templateParams).length > 0 && Object.values(templateParams).some(v => !v.trim())
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate based on mode
    if (!selectedInboxId) return;

    // WhatsApp Cloud requires a Meta-approved template.
    if (isWhatsAppCloud && !(selectedTemplate && isTemplateSendable(selectedTemplate))) return;

    // WhatsApp with template mode requires template selected
    if (isWhatsAppInbox && useTemplate && !selectedTemplate) return;

    // WhatsApp with template and variables requires all params filled
    if (isWhatsAppInbox && useTemplate && selectedTemplate && someTemplateParams()) return;

    // Regular message requires content (when not using template)
    if (!isWhatsAppInbox && !useTemplate && !message.trim()) return;

    // WhatsApp free text (baileys, evolution) without template requires message
    if (isWhatsAppInbox && !isWhatsAppCloud && !useTemplate && !message.trim()) return;

    // Non-WhatsApp with template mode requires template selected
    if (!isWhatsAppInbox && useTemplate && !selectedTemplate) return;

    // Non-WhatsApp with template and variables requires all params filled
    if (!isWhatsAppInbox && useTemplate && selectedTemplate && someTemplateParams()) return;

    setLoading(true);
    try {
      // Build conversation data - match Vue implementation structure
      // EVO-1551: when the PII masking flag is on, the backend omits
      // source_id from /contactable_inboxes for PII-derived channels (WA/
      // SMS/Email/Twilio) and rebuilds it server-side from contact_id +
      // inbox_id. Only send source_id when the server actually gave us one
      // (Instagram, BSUID-only WhatsApp, web widget, etc.) — sending an
      // empty string used to break the builder.
      const conversationData: ConversationCreateData = {
        contact_id: contact.id,
        inbox_id: selectedInboxId,
      };
      if (selectedInbox?.source_id) {
        conversationData.source_id = selectedInbox.source_id;
      }

      // Add message or template params
      // Backend will process templates (both WhatsApp and Email) based on template_params
      if (useTemplate && selectedTemplate) {
        conversationData.message = {
          content: '', // Backend will populate this from template
          template_params: {
            id: selectedTemplate.id, // EVO-1235: canonical key — backend resolves id-first (global-aware)
            name: selectedTemplate.name,
            category: selectedTemplate.category || 'UTILITY',
            language: selectedTemplate.language,
            namespace: selectedTemplate.namespace || '',
            processed_params: templateParams,
          },
        };
      } else {
        // Regular message
        conversationData.message = {
          content: message.trim(),
        };
      }

      const data = await conversationAPI.create(conversationData);

      // Close modal and redirect to conversation
      if (data && data.id) {
        onOpenChange(false);

        // Redirect to conversation like the Vue frontend does
        window.location.href = `/conversations/${data.id}`;

        // Reset form
        setMessage('');
        setSelectedInboxId('');
        setUseTemplate(false);
        setSelectedTemplate(null);
        setTemplateParams({});
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setMessage('');
    setSelectedInboxId('');
    onOpenChange(false);
  };

  // Auto-disable template mode if no templates available (except WhatsApp Cloud)
  useEffect(() => {
    if (!isWhatsAppCloud && messageTemplates.length === 0 && useTemplate) {
      setUseTemplate(false);
      setSelectedTemplate(null);
      setTemplateParams({});
    }
  }, [messageTemplates.length, isWhatsAppCloud, useTemplate]);

  useEffect(() => {
    // Message is enabled when:
    // - Not WhatsApp Cloud
    // - Not WhatsApp with template mode

    if (!isWhatsAppCloud && !isWhatsAppInbox && !useTemplate) {
      setEnableMessage(true);
      return;
    }

    if (!isWhatsAppCloud && isWhatsAppInbox && !useTemplate) {
      setEnableMessage(true);
      return;
    }

    setEnableMessage(false);
  }, [isWhatsAppCloud, isWhatsAppInbox, useTemplate]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="size-5 text-muted-foreground" />
            {t('startConversation.title')}
          </DialogTitle>
          <DialogDescription>
            {t('startConversation.description', { name: contact.name })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="contents">
          <DialogPanel className="flex flex-col gap-5">
          {/* Contact Info */}
          <div className="flex items-center gap-3 rounded-lg border bg-muted/48 p-3 dark:bg-muted/24">
            <Avatar className="size-10">
              {contact.avatar_url && <AvatarImage src={contact.avatar_url} alt={contact.name} />}
              <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                {getUserInitials(contact.name || 'NA')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{contact.name}</p>
              {contact.email && (
                <p className="truncate text-muted-foreground text-xs">{contact.email}</p>
              )}
            </div>
          </div>

          {/* Inbox Selection */}
          <div className="space-y-2">
            <Label htmlFor="inbox">{t('startConversation.fields.channel.label')} *</Label>
            {loadingInboxes ? (
              <Skeleton className="h-9 w-full rounded-lg sm:h-8" aria-label={t('startConversation.loading.channels')} />
            ) : availableInboxes.length === 0 ? (
              <Alert variant="warning">
                <TriangleAlert />
                <AlertDescription>{t('startConversation.empty.noChannels')}</AlertDescription>
              </Alert>
            ) : (
              <Select
                items={availableInboxes.filter(inbox => inbox?.id).map(inbox => ({ value: inbox.id.toString(), label: inbox.name }))}
                value={selectedInboxId || null}
                onValueChange={value => value != null && setSelectedInboxId(String(value))}
                required
              >
                <SelectTrigger id="inbox" className="w-full">
                  <SelectValue placeholder={t('startConversation.fields.channel.placeholder')} />
                </SelectTrigger>
                <SelectPopup>
                  {availableInboxes.map(inbox =>
                    inbox && inbox.id ? (
                      <SelectItem
                        key={inbox.id}
                        value={inbox.id.toString()}
                        disabled={!inbox.available || !inbox.can_create_conversation}
                      >
                        <div className="flex w-full items-center gap-2">
                          {getChannelIcon(inbox.channel_type)}
                          <span className="truncate">{inbox.name}</span>
                          <Badge variant={inbox.available ? 'outline' : 'secondary'} className="ms-auto">
                            {getChannelLabel(inbox.channel_type)}
                          </Badge>
                          {!inbox.can_create_conversation && (
                            <span className="text-xs text-muted-foreground">
                              ({t('startConversation.unavailable')})
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ) : null,
                  )}
                </SelectPopup>
              </Select>
            )}
          </div>

          {/* WhatsApp Cloud requires a Meta-approved template. Two warning states. */}
          {isWhatsAppCloud && !loadingTemplates && messageTemplates.length === 0 && (
            <Alert variant="warning">
              <TriangleAlert />
              <AlertDescription>{t('startConversation.templates.noneForInbox')}</AlertDescription>
            </Alert>
          )}
          {isWhatsAppCloud &&
            !loadingTemplates &&
            messageTemplates.length > 0 &&
            messageTemplates.every(tpl => !isTemplateSendable(tpl)) && (
              <Alert variant="warning">
                <TriangleAlert />
                <AlertDescription>{t('startConversation.templates.noApproved')}</AlertDescription>
              </Alert>
            )}

          {/* Template Selection */}
          {/* Always show template toggle for non-WhatsApp Cloud, even if no templates */}
          {(!isWhatsAppCloud || messageTemplates.length > 0) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label>{t('startConversation.toggle.label')}</Label>
                  {isWhatsAppCloud && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('startConversation.toggle.cloudRequires')}
                    </p>
                  )}
                </div>
                {!isWhatsAppCloud && (
                  <Button
                    type="button"
                    variant={useTemplate ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setUseTemplate(!useTemplate);
                      if (useTemplate) {
                        setSelectedTemplate(null);
                        setTemplateParams({});
                      }
                    }}
                    disabled={loadingTemplates}
                  >
                    {useTemplate
                      ? t('startConversation.toggle.using')
                      : t('startConversation.toggle.label')}
                  </Button>
                )}
              </div>

              {useTemplate && (
                <div className="space-y-3 rounded-lg border p-3">
                  {messageTemplates.length === 0 ? (
                    <Alert variant="warning">
                      <TriangleAlert />
                      <AlertDescription>{t('startConversation.templates.noneForInbox')}</AlertDescription>
                    </Alert>
                  ) : !selectedTemplate ? (
                    <>
                      <Label>{t('startConversation.templates.select')}</Label>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {messageTemplates.map(template => {
                          const previewText = getTemplatePreviewText(template, isEmailInbox);

                          const cloudBadgeKey = isWhatsAppCloud
                            ? getStatusBadgeKey(template)
                            : null;
                          const showCloudBadge =
                            cloudBadgeKey !== null && cloudBadgeKey !== 'approved';

                          return (
                            <button
                              type="button"
                              key={template.id}
                              className="w-full rounded-lg border p-3 text-left transition-colors hover:border-ring/40 hover:bg-accent/50"
                              onClick={() => {
                                setSelectedTemplate(template);
                                setTemplateParams(
                                  buildInitialVariableParams(extractTemplateVariables(template)),
                                );
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <div className="font-medium text-sm">{template.name}</div>
                                {showCloudBadge && (
                                  <Badge variant="outline" size="sm">
                                    {t(
                                      `startConversation.templates.statusBadge.${cloudBadgeKey}`,
                                    )}
                                  </Badge>
                                )}
                              </div>
                              <div className="mt-1 line-clamp-2 text-muted-foreground text-xs">
                                {previewText}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <Label>{t('startConversation.templates.selected', { name: selectedTemplate.name })}</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedTemplate(null);
                            setTemplateParams({});
                          }}
                        >
                          {t('startConversation.templates.change')}
                        </Button>
                      </div>

                      {isWhatsAppCloud && !isTemplateSendable(selectedTemplate) && (
                        <p className="text-xs text-warning-foreground mt-1">
                          {t('startConversation.templates.pendingSelectedHint')}
                        </p>
                      )}

                      {/* Template Variables */}
                      {Object.keys(templateParams).length > 0 && (
                        <div className="space-y-2">
                          <Label>{t('startConversation.templates.fillVariables')}</Label>
                          {extractTemplateVariables(selectedTemplate).map(variable => {
                            const key = variable.name;
                            return (
                              <div key={key} className="flex items-center gap-2">
                                <span className="inline-block min-w-12 rounded-md bg-muted px-3 py-2 text-center font-medium text-muted-foreground text-xs">
                                  {variable.label || key}
                                </span>
                                <Input
                                  type="text"
                                  value={templateParams[key] ?? ''}
                                  onChange={e =>
                                    setTemplateParams(prev => ({ ...prev, [key]: e.target.value }))
                                  }
                                  className="flex-1"
                                  aria-label={variable.label || key}
                                  placeholder={variable.example || t('startConversation.templates.valueFor', { key: `{{${key}}}` })}
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Preview of processed message */}
                      <div className="mt-3 rounded-lg border bg-muted/48 p-3 dark:bg-muted/24">
                        <span className="mb-1 block text-muted-foreground text-xs">{t('startConversation.templates.preview')}</span>
                        {isEmailInbox ? (
                          <div className="text-sm">
                            {(() => {
                              // For email templates, get HTML from metadata or content
                              const metadata = selectedTemplate.metadata as
                                | Record<string, unknown>
                                | undefined;
                              let html = '';

                              if (
                                metadata?.html_content &&
                                typeof metadata.html_content === 'string'
                              ) {
                                html = metadata.html_content;
                              } else if (selectedTemplate.content) {
                                const content = selectedTemplate.content.trim();
                                if (
                                  content.startsWith('<!DOCTYPE') ||
                                  content.startsWith('<html') ||
                                  content.startsWith('<!doctype')
                                ) {
                                  html = content;
                                } else {
                                  // JSON format - show message that HTML will be generated
                                  html =
                                    `<p class="text-muted-foreground">${t('startConversation.templates.visualEmail')}</p>`;
                                }
                              }

                              html = replaceTemplateVariables(html, templateParams);

                              return (
                                <div
                                  className="prose prose-sm max-w-none"
                                  dangerouslySetInnerHTML={{ __html: html }}
                                />
                              );
                            })()}
                          </div>
                        ) : (
                          <div className="text-sm whitespace-pre-wrap">
                            {(() => {
                              return replaceTemplateVariables(
                                getTemplatePreviewText(selectedTemplate, false),
                                templateParams,
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Message (hidden when using WhatsApp template or WhatsApp Cloud) */}
          {enableMessage && (
            <div className="space-y-2">
              <Label htmlFor="message">{t('startConversation.fields.message.label')} *</Label>
              <Textarea
                id="message"
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={t('startConversation.fields.message.placeholder')}
                rows={4}
                required={!(isWhatsAppInbox && useTemplate)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                {t('startConversation.fields.message.characters', { count: message.length })}
              </p>
            </div>
          )}

          </DialogPanel>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleCancel} disabled={loading}>
              {t('startConversation.actions.cancel')}
            </Button>
            <Button
              type="submit"
              loading={loading}
              disabled={Boolean(
                  !selectedInboxId ||
                  availableInboxes.length === 0 ||
                  // WhatsApp Cloud requires a Meta-approved template
                  (isWhatsAppCloud &&
                    !(selectedTemplate && isTemplateSendable(selectedTemplate))) ||
                  // WhatsApp with template mode requires template selected
                  (isWhatsAppInbox && useTemplate && !selectedTemplate) ||
                  // WhatsApp with template and variables requires all params filled
                  (isWhatsAppInbox && useTemplate && selectedTemplate && someTemplateParams()) ||
                  // Regular message requires content
                  (!isWhatsAppInbox && !useTemplate && !message.trim()) ||
                  // WhatsApp free text (baileys, evolution) without template requires message
                  (isWhatsAppInbox && !isWhatsAppCloud && !useTemplate && !message.trim()) ||
                  // Non-WhatsApp with template mode requires template selected
                  (!isWhatsAppInbox && useTemplate && !selectedTemplate) ||
                  // Non-WhatsApp with template and variables requires all params filled
                  (!isWhatsAppInbox && useTemplate && selectedTemplate && someTemplateParams()),
              )}
            >
              <Send />
              {t('startConversation.actions.send')}
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}
