import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardPanel, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import OptionSelect from '@/components/segments/ui/OptionSelect';
import { ArrowLeft, Save } from 'lucide-react';
import EmailEditorComponent, { EditorRef } from 'react-email-editor';
import { useLanguage } from '@/hooks/useLanguage';
import BaseHeader from '@/components/base/BaseHeader';
import MessageTemplateService, {
  getChannelTemplateConfig,
} from '@/services/channels/messageTemplatesService';
import { TemplateFormData } from '@/types/channels/inbox';

const EmailTemplateEditor: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage('channels');

  const inboxId = searchParams.get('inboxId') || '';
  const templateId = searchParams.get('templateId') || '';
  const channelType = searchParams.get('channelType') || 'Channel::Email';
  const mode = templateId ? 'edit' : 'create';

  const emailEditorRef = useRef<EditorRef>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [isLegacyHtml, setIsLegacyHtml] = useState(false);

  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    content: '',
    subject: '',
    language: 'en_US',
    category: 'MARKETING',
    template_type: 'text',
    active: true,
    headerFormat: 'TEXT',
    headerText: '',
    bodyText: '',
    footerText: '',
    buttons: [],
  });

  const channelConfig = getChannelTemplateConfig(channelType);

  // Helper to detect if content is HTML or JSON
  const isHtmlContent = useCallback((content: string): boolean => {
    if (!content || !content.trim()) return false;
    const trimmed = content.trim();
    return (
      trimmed.startsWith('<!DOCTYPE') ||
      trimmed.startsWith('<!doctype') ||
      trimmed.startsWith('<html') ||
      trimmed.startsWith('<HTML')
    );
  }, []);

  // Load template if editing
  useEffect(() => {
    if (mode === 'edit' && templateId && inboxId) {
      setIsLoading(true);
      MessageTemplateService.getTemplates(inboxId)
        .then(response => {
          const template = response.data.find(t => t.id === templateId);
          if (template) {
            const converted = MessageTemplateService.transformToFrontendFormat(
              template,
              channelType,
            );

            // Check if we have design JSON in metadata (new format) or content is HTML (legacy)
            if (converted.metadata?.design_json) {
              // New format: design JSON is in metadata, use it for content
              setFormData({
                ...converted,
                content: JSON.stringify(converted.metadata.design_json),
              });
              setIsLegacyHtml(false);
            } else if (converted.content && isHtmlContent(converted.content)) {
              // Legacy format: HTML in content
              setFormData(converted);
              setIsLegacyHtml(true);
            } else {
              // Try to parse as JSON design (might be JSON string in content)
              try {
                JSON.parse(converted.content);
                setFormData(converted);
                setIsLegacyHtml(false);
              } catch {
                // Not JSON, treat as legacy HTML
                setFormData(converted);
                setIsLegacyHtml(true);
              }
            }
          }
        })
        .catch(error => {
          console.error('Error loading template:', error);
          toast.error(t('settings.messageTemplates.errors.loadError'));
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [mode, templateId, inboxId, channelType, t, isHtmlContent]);

  // Handle editor ready
  const onReady = useCallback(() => {
    if (!emailEditorRef.current?.editor) return;

    // Load design if content exists
    if (formData.content) {
      // Check if content is HTML (legacy) or JSON (new format)
      if (isHtmlContent(formData.content)) {
        // Legacy HTML content - cannot load into editor
        // Show warning and mark as legacy HTML
        setIsLegacyHtml(true);
        console.warn('Template contains HTML (legacy format). Cannot load into visual editor.');
        toast.warning(
          t('settings.messageTemplates.editor.legacyHtmlWarning') ||
            'Este template foi criado com HTML. Você pode editá-lo visualmente agora.',
        );
        // Start with empty editor - user can recreate the template visually
      } else {
        setIsLegacyHtml(false);
        // Try to parse as JSON design (new format)
        try {
          const design = JSON.parse(formData.content);
          if (design && typeof design === 'object') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (emailEditorRef.current.editor as any).loadDesign(design);
          }
        } catch (error) {
          // Invalid JSON - start with empty editor
          console.warn('Content is not valid JSON design:', error);
          toast.warning(
            t('settings.messageTemplates.editor.invalidContentWarning') ||
              'Não foi possível carregar o conteúdo. Editor iniciado vazio.',
          );
        }
      }
    }

    // Mark editor as ready immediately - onReady callback means editor is ready
    setIsEditorReady(true);
  }, [formData.content, isHtmlContent, t]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!formData.name.trim()) {
      toast.error(t('settings.messageTemplates.errors.requiredFields'));
      return;
    }

    if (!isEditorReady || !emailEditorRef.current?.editor) {
      toast.error(t('settings.messageTemplates.editor.editorNotReady'));
      return;
    }

    setIsSaving(true);

    try {
      // Export both design JSON and HTML from editor
      // Design JSON is needed to load back into editor for editing
      // HTML is needed for sending emails
      emailEditorRef.current.editor.exportHtml((data: { design: unknown; html: string }) => {
        const { design, html } = data;

        // Save design JSON in content (for editing) and HTML in metadata (for sending)
        // This way we can load the JSON back into the editor AND use HTML for email sending
        const templateData: TemplateFormData = {
          ...formData,
          content: JSON.stringify(design), // Design JSON for editor
          metadata: {
            ...formData.metadata,
            html_content: html, // HTML for email sending
            design_json: design, // Also save design JSON in metadata as backup
          },
        };

        if (mode === 'create') {
          MessageTemplateService.createTemplate(inboxId, templateData, channelType)
            .then(() => {
              toast.success(t('settings.messageTemplates.success.createSuccess'));
              navigate(-1); // Go back
            })
            .catch(error => {
              console.error('Error creating template:', error);
              toast.error(t('settings.messageTemplates.errors.createError'));
            })
            .finally(() => {
              setIsSaving(false);
            });
        } else {
          if (!templateId) {
            toast.error(t('settings.messageTemplates.editor.incompleteData'));
            setIsSaving(false);
            return;
          }

          MessageTemplateService.updateTemplate(inboxId, templateId, templateData, channelType)
            .then(() => {
              toast.success(t('settings.messageTemplates.success.updateSuccess'));
              navigate(-1); // Go back
            })
            .catch(error => {
              console.error('Error updating template:', error);
              toast.error(t('settings.messageTemplates.errors.updateError'));
            })
            .finally(() => {
              setIsSaving(false);
            });
        }
      });
    } catch (error) {
      console.error('Error exporting HTML:', error);
      toast.error(t('settings.messageTemplates.editor.exportError'));
      setIsSaving(false);
    }
  }, [formData, isEditorReady, mode, inboxId, channelType, templateId, navigate, t]);

  // Editor options
  const editorOptions = {
    minHeight: '100%',
    locale: 'pt-BR',
    appearance: {
      theme: 'dark' as const,
      panels: {
        tools: {
          dock: 'left' as const,
        },
      },
    },
    features: {
      preview: true,
      stockImages: true,
    },
    tools: {
      form: { enabled: true },
      button: { enabled: true },
      divider: { enabled: true },
      image: { enabled: true },
      social: { enabled: true },
      spacer: { enabled: true },
      text: { enabled: true },
    },
    customJS: [],
    customCSS: [],
  };

  if (isLoading) {
    return (
      <div className="flex h-full flex-col p-4 md:p-6">
        <BaseHeader
          title={
            mode === 'create'
              ? t('settings.messageTemplates.form.createTitle')
              : t('settings.messageTemplates.form.editTitle')
          }
          subtitle={t('settings.messageTemplates.editor.subtitle')}
        />
        <div className="mt-4 flex flex-1 gap-4" aria-busy="true">
          <Skeleton className="hidden h-96 w-80 shrink-0 rounded-2xl md:block" />
          <Skeleton className="flex-1 rounded-2xl" />
          <span className="sr-only">{t('settings.messageTemplates.editor.loadingTemplate')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 p-4 pb-0 md:p-6 md:pb-0">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <BaseHeader
            title={
              mode === 'create'
                ? t('settings.messageTemplates.form.createTitle')
                : t('settings.messageTemplates.form.editTitle')
            }
            subtitle={t('settings.messageTemplates.editor.subtitle')}
          />
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft />
              {t('settings.messageTemplates.editor.back')}
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !isEditorReady}
              loading={isSaving}
              size="sm"
            >
              {!isSaving && <Save />}
              {mode === 'create'
                ? t('settings.messageTemplates.form.create')
                : t('settings.messageTemplates.form.save')}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-hidden px-4 pb-4 md:flex-row md:px-6 md:pb-6">
        {/* Left Sidebar - Form Fields */}
        <div className="shrink-0 overflow-y-auto md:w-80">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.messageTemplates.editor.templateInfo')}</CardTitle>
            </CardHeader>
            <CardPanel className="flex flex-col gap-5">
              <Field>
                <FieldLabel htmlFor="email-tpl-name">{t('settings.messageTemplates.form.name')}</FieldLabel>
                <Input
                  id="email-tpl-name"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t('settings.messageTemplates.form.namePlaceholder')}
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field className="min-w-0">
                  <FieldLabel htmlFor="email-tpl-category">{t('settings.messageTemplates.form.category')}</FieldLabel>
                  <OptionSelect
                    id="email-tpl-category"
                    className="min-w-0"
                    value={formData.category}
                    onValueChange={value =>
                      setFormData(prev => ({
                        ...prev,
                        category: value as TemplateFormData['category'],
                      }))
                    }
                    options={channelConfig.categories.map((cat: string) => ({
                      value: cat,
                      label: t(`settings.messageTemplates.form.categories.${cat.toLowerCase()}`),
                    }))}
                  />
                </Field>

                <Field className="min-w-0">
                  <FieldLabel htmlFor="email-tpl-language">{t('settings.messageTemplates.form.language')}</FieldLabel>
                  <OptionSelect
                    id="email-tpl-language"
                    className="min-w-0"
                    value={formData.language}
                    onValueChange={value => setFormData(prev => ({ ...prev, language: value }))}
                    options={[
                      { value: 'pt_BR', label: 'Português (BR)' },
                      { value: 'en_US', label: 'English (US)' },
                      { value: 'es_ES', label: 'Español' },
                    ]}
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="email-tpl-subject">{t('settings.messageTemplates.form.subject')}</FieldLabel>
                <Input
                  id="email-tpl-subject"
                  value={formData.subject || ''}
                  onChange={e => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder={t('settings.messageTemplates.form.subjectPlaceholder')}
                />
              </Field>

              <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/24 p-3">
                <Field className="gap-1">
                  <FieldLabel htmlFor="email-tpl-active">{t('settings.messageTemplates.form.active')}</FieldLabel>
                  <FieldDescription className="text-xs">{t('settings.messageTemplates.form.activeHelp')}</FieldDescription>
                </Field>
                <Switch
                  id="email-tpl-active"
                  checked={formData.active !== false}
                  onCheckedChange={checked => setFormData(prev => ({ ...prev, active: checked }))}
                />
              </div>

              {channelConfig.usesLiquid && (
                <Alert variant="info">
                  <AlertDescription className="text-xs">{t('settings.messageTemplates.form.liquidHelp')}</AlertDescription>
                </Alert>
              )}
            </CardPanel>
          </Card>
        </div>

        {/* Editor Area */}
        <div
          className="flex min-h-[60vh] flex-1 flex-col overflow-hidden rounded-2xl border bg-background md:min-h-0"
          style={{ position: 'relative', minHeight: 0 }}
        >
          {!isEditorReady && !isLegacyHtml && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background">
              <div className="flex flex-col items-center gap-3">
                <Spinner className="size-6 text-muted-foreground" />
                <p className="text-muted-foreground text-sm">
                  {t('settings.messageTemplates.editor.loadingEditor')}
                </p>
              </div>
            </div>
          )}
          {isLegacyHtml && isEditorReady ? (
            // Show HTML preview for legacy templates
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="shrink-0 border-b p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-medium text-sm">
                      {t('settings.messageTemplates.editor.htmlPreview') || 'Visualização HTML'}
                    </h3>
                    <p className="mt-1 text-muted-foreground text-xs">
                      {t('settings.messageTemplates.editor.htmlPreviewDescription') ||
                        'Este template foi criado com HTML. Você pode editá-lo visualmente no editor abaixo.'}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsLegacyHtml(false);
                      // Clear content to start fresh
                      setFormData(prev => ({ ...prev, content: '' }));
                    }}
                  >
                    {t('settings.messageTemplates.editor.startVisualEdit') ||
                      'Começar Edição Visual'}
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="email-preview-container border border-border rounded-lg overflow-hidden bg-card max-w-2xl mx-auto">
                  {/* Email header */}
                  <div className="email-header bg-muted/48 p-4 border-b border-border">
                    <div className="mb-2">
                      <span className="text-xs text-muted-foreground">Subject:</span>
                      <div className="text-sm font-medium text-foreground mt-1">
                        {formData.subject || 'Email Subject'}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">From:</span>
                      <div className="text-sm text-foreground mt-1">
                        noreply@example.com
                      </div>
                    </div>
                  </div>

                  {/* Email body with HTML content */}
                  <div className="email-body p-4 bg-card">
                    <div
                      dangerouslySetInnerHTML={{ __html: formData.content }}
                      className="text-sm text-foreground"
                      style={{
                        maxWidth: '100%',
                        wordBreak: 'break-word',
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="shrink-0 border-t p-4">
                <div className="flex-1 w-full overflow-hidden" style={{ minHeight: 0 }}>
                  <EmailEditorComponent
                    ref={emailEditorRef}
                    onReady={onReady}
                    options={editorOptions}
                    style={{ height: '400px', width: '100%' }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 w-full overflow-hidden" style={{ minHeight: 0 }}>
              <EmailEditorComponent
                ref={emailEditorRef}
                onReady={onReady}
                options={editorOptions}
                style={{ height: '100vh', width: '100%' }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailTemplateEditor;
