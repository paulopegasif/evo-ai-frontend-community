import { useState, useEffect, useId } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Brain, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogClose } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import { OpenAIHook, OpenAIFormData, IntegrationHook } from '@/types/integrations';
import { AgentIntegrationDialog, SettingRow } from '../../agentConfig/AgentIntegrationDialog';
import IntegrationNotice from '../../shared/IntegrationNotice';
import SecretInput from '../../shared/SecretInput';

interface OpenAIModalProps {
  hook?: IntegrationHook;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isNew?: boolean;
  loading?: boolean;
}

export default function OpenAIModal({
  hook,
  open,
  onOpenChange,
  onSubmit,

  loading: submitting = false
}: OpenAIModalProps) {
  const { t } = useLanguage('integrations');
  const formId = useId();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<OpenAIFormData>({
    api_key: '',
    enable_audio_transcription: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const openaiHook = hook as OpenAIHook | undefined;
    if (openaiHook?.settings) {
      setFormData({
        api_key: openaiHook.settings.api_key || '',
        enable_audio_transcription: openaiHook.settings.enable_audio_transcription || false
      });
    } else {
      setFormData({
        api_key: '',
        enable_audio_transcription: false
      });
    }
    setErrors({});
  }, [hook, open]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.api_key.trim()) {
      newErrors.api_key = t('openai.modal.fields.apiKey.required');
    } else if (!formData.api_key.startsWith('sk-')) {
      newErrors.api_key = t('openai.modal.fields.apiKey.invalid');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      await onSubmit(formData as unknown as Record<string, unknown>);
    } catch {
      // Error is handled by parent component
    } finally {
      setLoading(false);
    }
  };

  const openOpenAIDoc = () => {
    window.open('https://platform.openai.com/api-keys', '_blank');
  };

  const saving = loading || submitting;
  const features = ['suggestions', 'summaries', 'improvement', 'correction', 'labels'];

  return (
    <AgentIntegrationDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={<Brain className="text-muted-foreground" />}
      title={hook ? t('openai.modal.updateTitle') : t('openai.modal.title')}
      description={t('openai.modal.description')}
      footerStart={
        <Button type="button" variant="ghost" onClick={openOpenAIDoc}>
          <ExternalLink />
          {t('openai.modal.actions.help')}
        </Button>
      }
      footer={
        <>
          <DialogClose render={<Button type="button" variant="ghost" />} disabled={saving}>
            {t('openai.modal.actions.cancel')}
          </DialogClose>
          <Button type="submit" form={formId} loading={saving}>
            {saving
              ? t('openai.modal.actions.saving')
              : hook
                ? t('openai.modal.actions.update')
                : t('openai.modal.actions.configure')}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        <section className="flex flex-col gap-4">
          <h3 className="font-medium text-sm">{t('openai.modal.apiConfig')}</h3>

          <Field invalid={Boolean(errors.api_key)}>
            <FieldLabel htmlFor="openai-api-key">
              {t('openai.modal.fields.apiKey.label')} <span className="text-destructive-foreground">*</span>
            </FieldLabel>
            <SecretInput
              id="openai-api-key"
              placeholder={t('openai.modal.fields.apiKey.placeholder')}
              value={formData.api_key}
              onChange={e => {
                setFormData(prev => ({ ...prev, api_key: e.target.value }));
                if (errors.api_key) setErrors(prev => ({ ...prev, api_key: '' }));
              }}
              aria-invalid={errors.api_key ? true : undefined}
            />
            {errors.api_key ? (
              <FieldError match>{errors.api_key}</FieldError>
            ) : (
              <FieldDescription>{t('openai.modal.fields.apiKey.hint')}</FieldDescription>
            )}
          </Field>

          <SettingRow
            htmlFor="enable_audio_transcription"
            title={t('openai.modal.fields.enableAudioTranscription.label')}
            description={t('openai.modal.fields.enableAudioTranscription.description')}
            control={
              <Switch
                id="enable_audio_transcription"
                checked={formData.enable_audio_transcription || false}
                onCheckedChange={checked =>
                  setFormData(prev => ({ ...prev, enable_audio_transcription: checked }))
                }
              />
            }
          />
        </section>

        <section className="flex flex-col gap-3 rounded-xl border bg-muted/24 p-4">
          <h3 className="font-medium text-sm">{t('openai.modal.features.title')}</h3>
          <ul className="grid gap-2 text-muted-foreground text-sm sm:grid-cols-2">
            {features.map(key => (
              <li key={key} className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-success" />
                {t(`openai.modal.features.${key}`)}
              </li>
            ))}
          </ul>
        </section>

        <IntegrationNotice variant="warning" title={t('openai.modal.security.title')}>
          {t('openai.modal.security.description')}
        </IntegrationNotice>
      </form>
    </AgentIntegrationDialog>
  );
}
