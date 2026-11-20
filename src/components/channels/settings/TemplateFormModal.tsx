import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Popover, PopoverPopup, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Smile, Braces } from 'lucide-react';
import EmojiPickerReact, { Theme } from 'emoji-picker-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useIsDarkClass } from '@/hooks/chat/useIsDarkClass';
import MessageTemplateService, {
  usesStructuredComponents,
  getChannelTemplateConfig,
} from '@/services/channels/messageTemplatesService';
import { TemplatePreview } from './TemplatePreview';
import { MessageTemplate, TemplateFormData } from '@/types';
import { detectTemplateFormVariables } from '@/utils/templateVariables';

/**
 * Message textarea with an emoji picker and a `{{ }}` variable inserter,
 * mirroring the chat composer affordances. Both insert at the caret; the typed
 * `{{name}}` tokens are then auto-detected into the variable rows below.
 */
const MessageTextarea: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  emojiLabel?: string;
  variableLabel?: string;
  variableHelpText?: string;
  variableSampleName?: string;
}> = ({
  value,
  onChange,
  placeholder,
  rows = 6,
  emojiLabel,
  variableLabel,
  variableHelpText,
  variableSampleName,
}) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  const isDark = useIsDarkClass();

  // Insert `snippet` at the caret. If `selFrom`/`selTo` are given, select that
  // sub-range of the inserted text (used to preselect a variable name so the user
  // can overtype it); otherwise place the caret right after the insertion.
  const insertAtCursor = (snippet: string, selFrom?: number, selTo?: number) => {
    const ta = ref.current;
    const start = ta?.selectionStart ?? value.length;
    const end = ta?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + snippet + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      if (!ta) return;
      ta.focus();
      if (selFrom != null && selTo != null) {
        ta.setSelectionRange(start + selFrom, start + selTo);
      } else {
        const pos = start + snippet.length;
        ta.setSelectionRange(pos, pos);
      }
    });
  };

  // Variables are optional: insert a NAMED placeholder (never an empty `{{}}`) and
  // preselect the name so the user can type over it — keeps the auto-detection happy.
  const insertVariable = () => {
    const name = variableSampleName || 'variable';
    insertAtCursor(`{{${name}}}`, 2, 2 + name.length);
  };

  return (
    <div className="relative">
      <Textarea
        ref={ref}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="pr-20"
      />
      <div className="absolute top-2 right-2 flex items-center gap-1">
        <Popover>
          <PopoverTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={emojiLabel}
                title={emojiLabel}
              />
            }
          >
            <Smile />
          </PopoverTrigger>
          {/* Radix Popover portals + auto-flips, so the panel stays anchored to the
              button and inside the dialog instead of overflowing off-screen. */}
          <PopoverPopup align="end" className="w-auto p-0 border-none">
            <EmojiPickerReact
              onEmojiClick={emojiData => insertAtCursor(emojiData.emoji)}
              theme={isDark ? Theme.DARK : Theme.LIGHT}
              width={320}
              height={380}
              previewConfig={{ showPreview: false }}
              lazyLoadEmojis
            />
          </PopoverPopup>
        </Popover>
        <Popover>
          <PopoverTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={variableLabel}
                title={variableLabel}
              />
            }
          >
            <Braces />
          </PopoverTrigger>
          <PopoverPopup align="end" className="w-72 space-y-3">
            {variableHelpText && (
              <p className="text-xs text-muted-foreground">{variableHelpText}</p>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={insertVariable}
            >
              <Braces />
              {variableLabel}
            </Button>
          </PopoverPopup>
        </Popover>
      </div>
    </div>
  );
};

interface TemplateFormModalProps {
  isOpen: boolean;
  template?: MessageTemplate;
  onClose: () => void;
  onSave: (template: TemplateFormData) => void;
  mode: 'create' | 'edit';
  /**
   * Drives the field config: structured channels (WhatsApp/FB/IG) render the
   * header/body/footer/buttons editor; everything else renders the simple
   * content editor (+ email subject). For the global screen this is the
   * synthetic channel for the chosen provider (`Channel::Api` / `Channel::Email`).
   */
  channelType: string;
  /** Default language for a new template. Defaults to `en_US`; the global screen passes `pt_BR`. */
  defaultLanguage?: string;
  /**
   * Optional in-modal channel/provider selector (global screen only). Each option's
   * `value` is a `channelType`; selecting one calls `onChannelTypeChange`, which the
   * parent uses to update the controlled `channelType`. Disabled in edit mode (the
   * provider of an existing template cannot change). When omitted, no selector renders
   * and `channelType` is fixed (per-inbox scope).
   */
  channelOptions?: Array<{ value: string; label: string }>;
  /** Field label for the channel/provider selector (parent-supplied to keep this modal namespace-agnostic). */
  channelSelectLabel?: string;
  onChannelTypeChange?: (channelType: string) => void;
  /** Message shown when a channel/provider switch resets an unsupported category (parent-supplied). */
  categoryResetMessage?: string;
  /** Label for the "no header" option in the header-type selector (parent-supplied). */
  headerNoneLabel?: string;
  /** Helper text rendered under the Category selector (parent-supplied). */
  categoryHelp?: string;
  /** Accessible label/tooltip for the emoji button in the message editor. */
  insertEmojiLabel?: string;
  /** Accessible label/tooltip + insert-button label for the variable helper in the message editor. */
  insertVariableLabel?: string;
  /** Informative text shown in the variable helper popover ("variables are optional…"). */
  variableHelpText?: string;
  /** Placeholder name inserted by the variable helper (preselected for overtype). */
  variableSampleName?: string;
}

/**
 * Shared message-template form modal — the single editor reused by both the
 * per-inbox channel flow and the global Settings → Message Templates screen
 * (EVO-1907). Extracted verbatim from the former `MessageTemplateForm` inner
 * modal so there is exactly one rich form (structured WhatsApp components, live
 * preview, variable detection). Owns its own i18n on the `channels` namespace so
 * it carries the already-translated `settings.messageTemplates.*` keys without
 * duplication.
 */
const TemplateFormModal: React.FC<TemplateFormModalProps> = ({
  isOpen,
  template,
  onClose,
  onSave,
  mode,
  channelType,
  defaultLanguage = 'en_US',
  channelOptions,
  channelSelectLabel,
  onChannelTypeChange,
  categoryResetMessage,
  headerNoneLabel,
  categoryHelp,
  insertEmojiLabel,
  insertVariableLabel,
  variableHelpText,
  variableSampleName,
}) => {
  const { t } = useLanguage('channels');
  // Memoise on channelType so the category-revalidation effect below fires only
  // on an actual channel/provider change, not on every render.
  const channelConfig = useMemo(() => getChannelTemplateConfig(channelType), [channelType]);
  const isStructured = useMemo(() => usesStructuredComponents(channelType), [channelType]);

  const buildEmptyForm = useCallback(
    (): TemplateFormData => ({
      name: '',
      content: '',
      language: defaultLanguage,
      category: (channelConfig.categories[0] as TemplateFormData['category']) || 'MARKETING',
      template_type:
        (channelConfig.templateTypes[0] as TemplateFormData['template_type']) || 'text',
      active: true,
      // Structured fields — header defaults to "none" (matches the template editor mockup).
      headerFormat: 'NONE',
      headerText: '',
      bodyText: '',
      footerText: '',
      buttons: [],
    }),
    [channelConfig, defaultLanguage],
  );

  const [formData, setFormData] = useState<TemplateFormData>(buildEmptyForm);

  const detectedVariables = useMemo(() => detectTemplateFormVariables(formData), [formData]);

  useEffect(() => {
    setFormData(prev => {
      const currentByName = new Map(
        (prev.variables ?? []).map(variable => [variable.name, variable]),
      );
      const nextVariables = detectedVariables.map(variable => ({
        ...variable,
        ...currentByName.get(variable.name),
      }));

      const changed =
        nextVariables.length !== (prev.variables ?? []).length ||
        nextVariables.some((variable, index) => variable.name !== prev.variables?.[index]?.name);

      return changed ? { ...prev, variables: nextVariables } : prev;
    });
  }, [detectedVariables]);

  // (Re)initialise when the modal opens or the target template changes.
  // Deliberately NOT keyed on channelType: switching the provider mid-edit in the
  // global screen must preserve the user's input (EVO-1907 F3). Category coherence
  // is handled by the effect below.
  useEffect(() => {
    if (!isOpen) return;
    if (mode === 'edit' && template) {
      setFormData(MessageTemplateService.transformToFrontendFormat(template, channelType));
    } else {
      setFormData(buildEmptyForm());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode, template]);

  // Keep the category valid when channelType changes (provider switch): the
  // allowed list can shrink (e.g. email -> generic). The functional update reads
  // the latest form, so name/content/variables survive the switch.
  useEffect(() => {
    setFormData(prev => {
      if (channelConfig.categories.includes(prev.category ?? '')) return prev;
      toast.info(categoryResetMessage ?? t('settings.messageTemplates.form.categoryReset'));
      return { ...prev, category: channelConfig.categories[0] as TemplateFormData['category'] };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelType]);

  const handleSave = () => {
    // Validate based on channel type
    if (isStructured) {
      if (!formData.name.trim() || !formData.bodyText?.trim()) {
        toast.error(t('settings.messageTemplates.errors.requiredFields'));
        return;
      }
    } else {
      if (!formData.name.trim() || !formData.content.trim()) {
        toast.error(t('settings.messageTemplates.errors.requiredFields'));
        return;
      }
    }

    onSave(formData);
    onClose();
  };

  const addButton = () => {
    setFormData(prev => ({
      ...prev,
      buttons: [...(prev.buttons || []), { type: 'QUICK_REPLY', text: '' }],
    }));
  };

  const removeButton = (index: number) => {
    setFormData(prev => ({
      ...prev,
      buttons: prev.buttons?.filter((_, i) => i !== index) || [],
    }));
  };

  const updateButton = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      buttons:
        prev.buttons?.map((btn, i) => (i === index ? { ...btn, [field]: value } : btn)) || [],
    }));
  };

  // Edit the metadata of a detected variable (the name itself is derived from the
  // {{token}} in the text and stays read-only). These fields are persisted by the
  // backend and drive the consumption surfaces (EVO-1971): `example` prefills the
  // composer / Start-Conversation value, `source` auto-maps automation
  // `send_template` to `{{contact.x}}`, `label` is the human-readable caption.
  const updateVariable = (name: string, field: 'label' | 'example' | 'source', value: string) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables?.map(variable =>
        variable.name === name ? { ...variable, [field]: value } : variable,
      ),
    }));
  };

  const isFormValid = isStructured
    ? formData.name.trim() && formData.bodyText?.trim()
    : formData.name.trim() && formData.content.trim();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogPopup
        bottomStickOnMobile={false}
        className="max-h-[90vh] w-[95vw] max-w-[95vw]"
      >
        <DialogHeader>
          <DialogTitle>
            {mode === 'create'
              ? t('settings.messageTemplates.form.createTitle')
              : t('settings.messageTemplates.form.editTitle')}
          </DialogTitle>
        </DialogHeader>

        <DialogPanel className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Form */}
          <div className="space-y-4">
            {/* Optional channel/provider selector (global screen only) */}
            {channelOptions && channelOptions.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">{channelSelectLabel}</label>
                <Select
                  items={channelOptions}
                  value={channelType || null}
                  onValueChange={value => onChannelTypeChange?.(String(value ?? ''))}
                  disabled={mode === 'edit'}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopup alignItemWithTrigger={false}>
                    {channelOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              </div>
            )}

            {/* Basic Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('settings.messageTemplates.form.name')}
                </label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t('settings.messageTemplates.form.namePlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('settings.messageTemplates.form.category')}
                </label>
                <Select
                  items={channelConfig.categories.map((cat: string) => ({
                    value: cat,
                    label: t(`settings.messageTemplates.form.categories.${cat.toLowerCase()}`),
                  }))}
                  value={formData.category || null}
                  onValueChange={value =>
                    setFormData(prev => ({
                      ...prev,
                      category: String(value ?? '') as TemplateFormData['category'],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopup alignItemWithTrigger={false}>
                    {channelConfig.categories.map((cat: string) => (
                      <SelectItem key={cat} value={cat}>
                        {t(`settings.messageTemplates.form.categories.${cat.toLowerCase()}`)}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
                {categoryHelp && (
                  <p className="text-xs text-muted-foreground mt-1">{categoryHelp}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('settings.messageTemplates.form.language')}
                </label>
                <Select
                  items={[
                    { value: 'pt_BR', label: 'Português (BR)' },
                    { value: 'en_US', label: 'English (US)' },
                    { value: 'es_ES', label: 'Español' },
                  ]}
                  value={formData.language || null}
                  onValueChange={value =>
                    setFormData(prev => ({ ...prev, language: String(value ?? '') }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopup alignItemWithTrigger={false}>
                    <SelectItem value="pt_BR">Português (BR)</SelectItem>
                    <SelectItem value="en_US">English (US)</SelectItem>
                    <SelectItem value="es_ES">Español</SelectItem>
                  </SelectPopup>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('settings.messageTemplates.form.templateType')}
                </label>
                <Select
                  items={channelConfig.templateTypes.map((type: string) => ({
                    value: type,
                    label: t(`settings.messageTemplates.form.templateTypes.${type}`),
                  }))}
                  value={formData.template_type || null}
                  onValueChange={value =>
                    setFormData(prev => ({
                      ...prev,
                      template_type: String(value ?? '') as TemplateFormData['template_type'],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopup alignItemWithTrigger={false}>
                    {channelConfig.templateTypes.map((type: string) => (
                      <SelectItem key={type} value={type}>
                        {t(`settings.messageTemplates.form.templateTypes.${type}`)}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              </div>
            </div>

            {/* Structured Components (WhatsApp, Facebook, Instagram) */}
            {isStructured && channelConfig.supportsStructured && (
              <>
                {/* Header */}
                {channelConfig.supportsMedia && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1">
                      <label className="block text-sm font-medium mb-2">
                        {t('settings.messageTemplates.form.headerFormat')}
                      </label>
                      <Select
                        items={[
                          {
                            value: 'NONE',
                            label:
                              headerNoneLabel ??
                              t('settings.messageTemplates.form.headerFormats.none'),
                          },
                          {
                            value: 'TEXT',
                            label: t('settings.messageTemplates.form.headerFormats.text'),
                          },
                          {
                            value: 'IMAGE',
                            label: t('settings.messageTemplates.form.headerFormats.image'),
                          },
                          {
                            value: 'VIDEO',
                            label: t('settings.messageTemplates.form.headerFormats.video'),
                          },
                          {
                            value: 'DOCUMENT',
                            label: t('settings.messageTemplates.form.headerFormats.document'),
                          },
                        ]}
                        value={formData.headerFormat || null}
                        onValueChange={next => {
                          const value = String(next ?? '');
                          setFormData(prev => ({
                            ...prev,
                            headerFormat: value as TemplateFormData['headerFormat'],
                            // No header → drop any previously typed header text so it
                            // is not folded into the stored content.
                            ...(value === 'NONE' ? { headerText: '' } : {}),
                          }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectPopup alignItemWithTrigger={false}>
                          <SelectItem value="NONE">
                            {headerNoneLabel ??
                              t('settings.messageTemplates.form.headerFormats.none')}
                          </SelectItem>
                          <SelectItem value="TEXT">
                            {t('settings.messageTemplates.form.headerFormats.text')}
                          </SelectItem>
                          <SelectItem value="IMAGE">
                            {t('settings.messageTemplates.form.headerFormats.image')}
                          </SelectItem>
                          <SelectItem value="VIDEO">
                            {t('settings.messageTemplates.form.headerFormats.video')}
                          </SelectItem>
                          <SelectItem value="DOCUMENT">
                            {t('settings.messageTemplates.form.headerFormats.document')}
                          </SelectItem>
                        </SelectPopup>
                      </Select>
                    </div>
                    {formData.headerFormat === 'TEXT' && (
                      <div className="col-span-2">
                        <label className="block text-sm font-medium mb-2">
                          {t('settings.messageTemplates.form.headerText')}
                        </label>
                        <Input
                          value={formData.headerText}
                          onChange={e =>
                            setFormData(prev => ({ ...prev, headerText: e.target.value }))
                          }
                          placeholder={t('settings.messageTemplates.form.headerTextPlaceholder')}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Body */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('settings.messageTemplates.form.bodyText')}
                  </label>
                  <MessageTextarea
                    value={formData.bodyText ?? ''}
                    onChange={value => setFormData(prev => ({ ...prev, bodyText: value }))}
                    placeholder={t('settings.messageTemplates.form.bodyTextPlaceholder')}
                    rows={4}
                    emojiLabel={insertEmojiLabel}
                    variableLabel={insertVariableLabel}
                    variableHelpText={variableHelpText}
                    variableSampleName={variableSampleName}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('settings.messageTemplates.form.variablesHelp')}
                  </p>
                </div>

                {/* Footer */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('settings.messageTemplates.form.footerText')}
                  </label>
                  <Input
                    value={formData.footerText}
                    onChange={e => setFormData(prev => ({ ...prev, footerText: e.target.value }))}
                    placeholder={t('settings.messageTemplates.form.footerTextPlaceholder')}
                  />
                </div>

                {/* Buttons */}
                {channelConfig.supportsButtons && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium">
                        {t('settings.messageTemplates.form.buttons')}
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addButton}
                        disabled={(formData.buttons?.length || 0) >= 3}
                      >
                        <Plus />
                        {t('settings.messageTemplates.form.addButton')}
                      </Button>
                    </div>

                    {formData.buttons?.map((button, index) => (
                      <div key={index} className="mb-2 rounded-xl border bg-muted/24 p-3">
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <Select
                            items={[
                              {
                                value: 'QUICK_REPLY',
                                label: t('settings.messageTemplates.form.buttonTypes.quickReply'),
                              },
                              { value: 'URL', label: t('settings.messageTemplates.form.buttonTypes.url') },
                              {
                                value: 'PHONE_NUMBER',
                                label: t('settings.messageTemplates.form.buttonTypes.phone'),
                              },
                            ]}
                            value={button.type || null}
                            onValueChange={value => updateButton(index, 'type', String(value ?? ''))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectPopup alignItemWithTrigger={false}>
                              <SelectItem value="QUICK_REPLY">
                                {t('settings.messageTemplates.form.buttonTypes.quickReply')}
                              </SelectItem>
                              <SelectItem value="URL">
                                {t('settings.messageTemplates.form.buttonTypes.url')}
                              </SelectItem>
                              <SelectItem value="PHONE_NUMBER">
                                {t('settings.messageTemplates.form.buttonTypes.phone')}
                              </SelectItem>
                            </SelectPopup>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeButton(index)}
                            aria-label={t('actions.delete')}
                          >
                            <Trash2 />
                          </Button>
                        </div>

                        <Input
                          value={button.text}
                          onChange={e => updateButton(index, 'text', e.target.value)}
                          placeholder={t('settings.messageTemplates.form.buttonTextPlaceholder')}
                          className="mb-2"
                        />

                        {button.type === 'URL' && (
                          <Input
                            value={button.url || ''}
                            onChange={e => updateButton(index, 'url', e.target.value)}
                            placeholder={t('settings.messageTemplates.form.urlPlaceholder')}
                          />
                        )}

                        {button.type === 'PHONE_NUMBER' && (
                          <Input
                            value={button.phone_number || ''}
                            onChange={e => updateButton(index, 'phoneNumber', e.target.value)}
                            placeholder={t('settings.messageTemplates.form.phonePlaceholder')}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Email-specific fields */}
            {channelType === 'Channel::Email' && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('settings.messageTemplates.form.subject')}
                </label>
                <Input
                  value={formData.subject || ''}
                  onChange={e => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder={t('settings.messageTemplates.form.subjectPlaceholder')}
                />
              </div>
            )}

            {/* Simple Text Content (SMS, API, Telegram, Line) */}
            {/* Note: Email templates are edited in a dedicated page, not in this modal */}
            {!isStructured && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('settings.messageTemplates.form.content')}
                </label>
                <MessageTextarea
                  value={formData.content}
                  onChange={value => setFormData(prev => ({ ...prev, content: value }))}
                  placeholder={t('settings.messageTemplates.form.contentPlaceholder')}
                  rows={6}
                  emojiLabel={insertEmojiLabel}
                  variableLabel={insertVariableLabel}
                  variableHelpText={variableHelpText}
                  variableSampleName={variableSampleName}
                />
                {channelConfig.usesLiquid && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('settings.messageTemplates.form.liquidHelp')}
                  </p>
                )}
              </div>
            )}

            {(formData.variables?.length ?? 0) > 0 && (
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  {t('settings.messageTemplates.form.variables')}
                </label>
                {/* Each variable is detected from a {{token}} in the text (name is
                    read-only) and carries optional metadata that the backend
                    PRESERVES on save and feeds back on edit (EVO-1971): `label`
                    (caption), `example` (composer / Start-Conversation prefill) and
                    `source` (auto-maps automation send_template to {{contact.x}}). */}
                <div className="space-y-3">
                  {formData.variables?.map(variable => (
                    <div key={variable.name} className="space-y-2 rounded-xl border bg-muted/24 p-3">
                      <Badge variant="secondary">{`{{${variable.name}}}`}</Badge>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Input
                          value={variable.label ?? ''}
                          onChange={e => updateVariable(variable.name, 'label', e.target.value)}
                          placeholder={t('settings.messageTemplates.form.variableLabel')}
                        />
                        <Input
                          value={variable.example ?? ''}
                          onChange={e => updateVariable(variable.name, 'example', e.target.value)}
                          placeholder={t('settings.messageTemplates.form.variableExample')}
                        />
                        <Input
                          value={variable.source ?? ''}
                          onChange={e => updateVariable(variable.name, 'source', e.target.value)}
                          placeholder={t('settings.messageTemplates.form.variableSource')}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active toggle */}
            <div className="flex items-center justify-between p-3 bg-muted/48 rounded-lg">
              <div>
                <label className="block text-sm font-medium">
                  {t('settings.messageTemplates.form.active')}
                </label>
                <p className="text-xs text-muted-foreground">
                  {t('settings.messageTemplates.form.activeHelp')}
                </p>
              </div>
              <Switch
                checked={formData.active !== false}
                onCheckedChange={checked => setFormData(prev => ({ ...prev, active: checked }))}
              />
            </div>
          </div>

          {/* Preview - Sticky on larger screens */}
          <div className="lg:sticky lg:top-0 lg:self-start">
            <TemplatePreview template={formData} channelType={channelType} t={t} />
          </div>
        </DialogPanel>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('settings.messageTemplates.form.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!isFormValid}>
            {mode === 'create'
              ? t('settings.messageTemplates.form.create')
              : t('settings.messageTemplates.form.save')}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
};

export default TemplateFormModal;
