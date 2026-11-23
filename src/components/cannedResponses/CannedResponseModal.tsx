import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  CannedResponse,
  CannedResponseFormData,
  CannedResponseAttachment
} from '@/types/knowledge';
import { cannedResponsesService } from '@/services/cannedResponses/cannedResponsesService';
import { Paperclip, X, FileText, Image as ImageIcon, Film, Music } from '@/components/icons';
import { toast } from 'sonner';

interface CannedResponseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cannedResponse?: CannedResponse;
  isNew: boolean;
  loading: boolean;
  onSubmit: (data: CannedResponseFormData) => void;
}

type VariableItem = {
  key: 'contactName' | 'agentName' | 'conversationId' | 'accountName';
  placeholder: string;
};

const VARIABLE_ITEMS: VariableItem[] = [
  { key: 'contactName', placeholder: '{{contact.name}}' },
  { key: 'agentName', placeholder: '{{agent.name}}' },
  { key: 'conversationId', placeholder: '{{conversation.id}}' },
  { key: 'accountName', placeholder: '{{account.name}}' },
];

export default function CannedResponseModal({
  open,
  onOpenChange,
  cannedResponse,
  isNew,
  loading,
  onSubmit,
}: CannedResponseModalProps) {
  const { t } = useLanguage('cannedResponses');
  const [formData, setFormData] = useState<CannedResponseFormData>({
    short_code: '',
    content: '',
    attachments: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [existingAttachments, setExistingAttachments] = useState<CannedResponseAttachment[]>([]);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<string[]>([]);
  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const contentSelectionRef = useRef({ start: 0, end: 0 });

  useEffect(() => {
    if (open) {
      if (cannedResponse && !isNew) {
        setFormData({
          short_code: cannedResponse.short_code,
          content: cannedResponse.content,
          attachments: [],
        });
        setExistingAttachments(cannedResponse.attachments || []);
      } else {
        setFormData({
          short_code: '',
          content: '',
          attachments: [],
        });
        setExistingAttachments([]);
      }
      setErrors({});
      setRemovedAttachmentIds([]);
    }
  }, [open, cannedResponse, isNew]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.short_code.trim()) {
      newErrors.short_code = t('modal.validation.shortCodeRequired');
    } else if (formData.short_code.length < 2) {
      newErrors.short_code = t('modal.validation.shortCodeMinLength');
    } else if (!cannedResponsesService.isValidShortCode(formData.short_code)) {
      newErrors.short_code = t('modal.validation.shortCodeInvalid');
    }

    if (!formData.content.trim()) {
      newErrors.content = t('modal.validation.contentRequired');
    } else if (formData.content.length < 10) {
      newErrors.content = t('modal.validation.contentMinLength');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSubmit({ ...formData, removeAttachmentIds: removedAttachmentIds });
  };

  const handleInputChange = (field: keyof CannedResponseFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Auto-generate short code suggestion when content changes
  const handleContentChange = (value: string) => {
    handleInputChange('content', value);

    // Only suggest if creating new and short_code is empty
    if (isNew && !formData.short_code.trim() && value.trim()) {
      const suggestion = cannedResponsesService.generateShortCode(value);
      if (suggestion) {
        setFormData(prev => ({ ...prev, short_code: suggestion }));
      }
    }
  };

  // 🎯 FILE UPLOAD: 1 anexo por resposta rápida (canais enviam só 1 mídia hoje)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';

    if (files.length === 0) return;

    const currentCount =
      existingAttachments.filter(a => !removedAttachmentIds.includes(a.id)).length +
      (formData.attachments?.length ?? 0);
    if (currentCount >= 1) {
      toast.error(t('modal.fields.attachments.errors.limitReached'));
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'audio/mpeg', 'audio/wav', 'audio/ogg',
      'video/mp4', 'video/webm',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    const file = files[0];
    if (file.size > maxSize) {
      toast.error(t('modal.fields.attachments.errors.tooLarge', { name: file.name }));
      return;
    }
    if (!allowedTypes.includes(file.type)) {
      toast.error(t('modal.fields.attachments.errors.invalidType', { name: file.name }));
      return;
    }

    setFormData(prev => ({ ...prev, attachments: [file] }));
  };

  const handleRemoveFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments?.filter((_, i) => i !== index)
    }));
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon className="size-4" />;
    if (fileType.startsWith('audio/')) return <Music className="size-4" />;
    if (fileType.startsWith('video/')) return <Film className="size-4" />;
    return <FileText className="size-4" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const updateSelection = (element: HTMLTextAreaElement) => {
    contentSelectionRef.current = {
      start: element.selectionStart ?? 0,
      end: element.selectionEnd ?? 0,
    };
  };

  const insertVariableAtCursor = (placeholder: string) => {
    const textarea = contentRef.current;
    const currentContent = formData.content || '';

    const selectionStart = textarea
      ? (textarea.selectionStart ?? currentContent.length)
      : Math.min(contentSelectionRef.current.start, currentContent.length);
    const selectionEnd = textarea
      ? (textarea.selectionEnd ?? currentContent.length)
      : Math.min(contentSelectionRef.current.end, currentContent.length);

    const nextContent = `${currentContent.slice(0, selectionStart)}${placeholder}${currentContent.slice(selectionEnd)}`;

    handleContentChange(nextContent);

    requestAnimationFrame(() => {
      if (!textarea) {
        return;
      }
      const newCursorPosition = selectionStart + placeholder.length;
      textarea.focus();
      textarea.setSelectionRange(newCursorPosition, newCursorPosition);
    });
  };

  const attachmentCount =
    existingAttachments.filter(a => !removedAttachmentIds.includes(a.id)).length +
    (formData.attachments?.length ?? 0);
  const attachmentLimitReached = attachmentCount >= 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isNew ? t('modal.new.title') : t('modal.edit.title')}
          </DialogTitle>
          <DialogDescription>
            {isNew
              ? t('modal.new.description')
              : t('modal.edit.description')}
          </DialogDescription>
        </DialogHeader>

        <DialogPanel>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Short Code */}
          <Field invalid={!!errors.short_code}>
            <FieldLabel htmlFor="short_code">
              {t('modal.fields.shortCode.label')} <span className="text-destructive-foreground" aria-hidden="true">*</span>
            </FieldLabel>
            <Input
              id="short_code"
              value={formData.short_code}
              onChange={(e) => handleInputChange('short_code', e.target.value)}
              placeholder={t('modal.fields.shortCode.placeholder')}
              className="font-mono"
              disabled={!isNew} // Can't change code when editing
            />
            <FieldError match={!!errors.short_code}>{errors.short_code}</FieldError>
            <FieldDescription>{t('modal.fields.shortCode.hint')}</FieldDescription>
          </Field>

          {/* Content */}
          <Field invalid={!!errors.content}>
            <FieldLabel htmlFor="content">
              {t('modal.fields.content.label')} <span className="text-destructive-foreground" aria-hidden="true">*</span>
            </FieldLabel>
            <Textarea
              id="content"
              ref={contentRef}
              value={formData.content}
              onChange={(e) => handleContentChange(e.target.value)}
              onSelect={(e) => updateSelection(e.currentTarget)}
              onClick={(e) => updateSelection(e.currentTarget)}
              onKeyUp={(e) => updateSelection(e.currentTarget)}
              placeholder={t('modal.fields.content.placeholder')}
              className="min-h-[120px] *:resize-none"
              rows={6}
            />
            <FieldError match={!!errors.content}>{errors.content}</FieldError>
            <FieldDescription>{t('modal.fields.content.hint')}</FieldDescription>
          </Field>

          {/* 🎯 ATTACHMENTS: Upload de arquivos */}
          <div className="flex flex-col gap-2">
            <Label>{t('modal.fields.attachments.label')}</Label>

            {/* Botão de upload */}
            <div className="flex items-center gap-2">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept="image/*,audio/*,video/*,.pdf,.doc,.docx"
                onChange={handleFileSelect}
                disabled={loading || attachmentLimitReached}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('file-upload')?.click()}
                disabled={loading || attachmentLimitReached}
              >
                <Paperclip />
                {t('modal.fields.attachments.addButton')}
              </Button>
              <p className="text-xs text-muted-foreground">
                {t('modal.fields.attachments.hint')}
              </p>
            </div>

            {/* Preview de anexos existentes (ao editar) */}
            {existingAttachments.some(a => !removedAttachmentIds.includes(a.id)) && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {t('modal.fields.attachments.existing')}
                </p>
                {existingAttachments
                  .filter(a => !removedAttachmentIds.includes(a.id))
                  .map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between rounded-lg border bg-muted/24 p-2"
                  >
                    <div className="flex items-center gap-2">
                      {attachment.file_type === 'image' && <ImageIcon className="size-4 text-info" />}
                      {attachment.file_type === 'audio' && <Music className="size-4 text-purple-500" />}
                      {attachment.file_type === 'video' && <Film className="size-4 text-destructive" />}
                      {attachment.file_type === 'file' && <FileText className="size-4 text-muted-foreground" />}
                      <div className="flex-1 min-w-0">
                        {/* não temos file_name; usa fallback_title ou o final da URL */}
                        <p className="text-sm font-medium truncate">
                          {attachment.fallback_title ||
                            decodeURIComponent(
                              (attachment.data_url ?? '').split('/').pop() || 'attachment'
                            )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(attachment.file_size ?? 0)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <a
                        href={attachment.data_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs underline text-primary"
                      >
                        {t('modal.fields.attachments.openAction')}
                      </a>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t('modal.fields.attachments.removeAriaLabel')}
                        onClick={() => setRemovedAttachmentIds(prev => [...prev, attachment.id])}
                        disabled={loading}
                      >
                        <X />
                      </Button>
                    </div>
                  </div>
                  ))}
              </div>
            )}


            {/* Preview de novos anexos */}
            {formData.attachments && formData.attachments.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {t('modal.fields.attachments.new')}
                </p>
                {formData.attachments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border border-info/24 bg-info/8 p-2"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {getFileIcon(file.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0"
                      aria-label={t('modal.fields.attachments.removeAriaLabel')}
                      onClick={() => handleRemoveFile(index)}
                      disabled={loading}
                    >
                      <X />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Variables Help */}
          <div className="rounded-xl border border-info/24 bg-info/8 p-4">
            <h4 className="text-sm font-medium text-info-foreground mb-2">
              {t('modal.variables.title')}
            </h4>
            <p className="text-xs text-info-foreground mb-3">
              {t('modal.variables.clickToInsert')}
            </p>
            <div className="space-y-2">
              {VARIABLE_ITEMS.map((variable) => (
                <button
                  key={variable.placeholder}
                  type="button"
                  className="w-full rounded-md border border-info/24 bg-background/70 px-3 py-2 text-left transition-colors hover:bg-info/12"
                  onClick={() => insertVariableAtCursor(variable.placeholder)}
                  disabled={loading}
                  aria-label={`${t('modal.variables.insertAction')} ${variable.placeholder}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-info-foreground">
                      <code className="bg-info/12 px-1 rounded">{variable.placeholder}</code>
                      <span className="ml-2">- {t(`modal.variables.${variable.key}`)}</span>
                    </div>
                    <span className="text-xs font-medium text-info-foreground">
                      {t('modal.variables.insertAction')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </form>
        </DialogPanel>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {t('actions.cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            loading={loading}
          >
            {loading ? t('modal.saving') : isNew ? t('actions.create') : t('actions.update')}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
