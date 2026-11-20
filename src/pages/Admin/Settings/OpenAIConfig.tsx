import { type ChangeEvent, useState, useEffect, useCallback, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Card, CardHeader, CardPanel, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import {
  SecretField,
  SettingsHeader,
  SettingsSaveBar,
  SettingsSkeleton,
  TextField,
  ToggleGroupBox,
  ToggleRow,
  useConfiguredStatus,
} from './components/SettingsUI';
import { useLanguage } from '@/hooks/useLanguage';
import { adminConfigService } from '@/services/admin/adminConfigService';
import { extractError } from '@/utils/apiHelpers';
import type { AdminConfigData } from '@/types/admin/adminConfig';

// --- Schema factory with i18n ---

function createOpenAISchema(_t: (key: string) => string) {
  return z.object({
    OPENAI_API_URL: z.string().optional(),
    OPENAI_API_SECRET: z.string().optional().nullable(),
    OPENAI_MODEL: z.string().optional(),
    OPENAI_ENABLE_AUDIO_TRANSCRIPTION: z.union([z.boolean(), z.string()]).optional(),
    OPENAI_PROMPT_REPLY: z.string().optional(),
    OPENAI_PROMPT_SUMMARY: z.string().optional(),
    OPENAI_PROMPT_REPHRASE: z.string().optional(),
    OPENAI_PROMPT_FIX_GRAMMAR: z.string().optional(),
    OPENAI_PROMPT_SHORTEN: z.string().optional(),
    OPENAI_PROMPT_EXPAND: z.string().optional(),
    OPENAI_PROMPT_FRIENDLY: z.string().optional(),
    OPENAI_PROMPT_FORMAL: z.string().optional(),
    OPENAI_PROMPT_SIMPLIFY: z.string().optional(),
  });
}

type OpenAIFormData = z.infer<ReturnType<typeof createOpenAISchema>>;

const DEFAULTS: OpenAIFormData = {
  OPENAI_API_URL: '',
  OPENAI_API_SECRET: null,
  OPENAI_MODEL: '',
  OPENAI_ENABLE_AUDIO_TRANSCRIPTION: false,
  OPENAI_PROMPT_REPLY: '',
  OPENAI_PROMPT_SUMMARY: '',
  OPENAI_PROMPT_REPHRASE: '',
  OPENAI_PROMPT_FIX_GRAMMAR: '',
  OPENAI_PROMPT_SHORTEN: '',
  OPENAI_PROMPT_EXPAND: '',
  OPENAI_PROMPT_FRIENDLY: '',
  OPENAI_PROMPT_FORMAL: '',
  OPENAI_PROMPT_SIMPLIFY: '',
};

const SECRET_FIELDS = ['OPENAI_API_SECRET'];

const PROMPT_FIELDS = [
  'OPENAI_PROMPT_REPLY',
  'OPENAI_PROMPT_SUMMARY',
  'OPENAI_PROMPT_REPHRASE',
  'OPENAI_PROMPT_FIX_GRAMMAR',
  'OPENAI_PROMPT_SHORTEN',
  'OPENAI_PROMPT_EXPAND',
  'OPENAI_PROMPT_FRIENDLY',
  'OPENAI_PROMPT_FORMAL',
  'OPENAI_PROMPT_SIMPLIFY',
] as const;

function isSecretMasked(value: unknown): boolean {
  return typeof value === 'string' && value.includes('••••');
}

function toBool(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true';
  return false;
}

function buildFormValues(data: Record<string, unknown>): OpenAIFormData {
  const formValues: Record<string, unknown> = { ...DEFAULTS };
  for (const [key, value] of Object.entries(data)) {
    if (SECRET_FIELDS.includes(key)) {
      formValues[key] = isSecretMasked(value) ? '' : (value ?? '');
    } else {
      formValues[key] = value ?? formValues[key] ?? '';
    }
  }
  return formValues as OpenAIFormData;
}

export default function OpenAIConfig() {
  const { t } = useLanguage('adminSettings');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [secretModified, setSecretModified] = useState<Record<string, boolean>>({});
  const [secretConfigured, setSecretConfigured] = useState<Record<string, boolean>>({});

  const openaiSchema = useMemo(() => createOpenAISchema(t), [t]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isDirty },
  } = useForm<OpenAIFormData>({
    resolver: zodResolver(openaiSchema),
    defaultValues: DEFAULTS,
  });

  const updateSecretStatus = (data: Record<string, unknown>) => {
    const configured: Record<string, boolean> = {};
    for (const key of SECRET_FIELDS) {
      configured[key] = isSecretMasked(data[key]);
    }
    setSecretConfigured(configured);
    setSecretModified({});
  };

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminConfigService.getConfig('openai');
      updateSecretStatus(data);
      reset(buildFormValues(data));
    } catch (error) {
      toast.error(t('openai.messages.loadError'));
    } finally {
      setLoading(false);
    }
  }, [reset, t]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const onSubmit = async (formData: OpenAIFormData) => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(formData)) {
        if (SECRET_FIELDS.includes(key)) {
          if (!secretModified[key] || value === '') {
            payload[key] = null;
          } else {
            payload[key] = value;
          }
        } else {
          payload[key] = value;
        }
      }

      const data = await adminConfigService.saveConfig('openai', payload as AdminConfigData);
      updateSecretStatus(data);
      reset(buildFormValues(data));

      toast.success(t('openai.messages.saveSuccess'));
    } catch (error) {
      const errorInfo = extractError(error);
      toast.error(t('openai.messages.saveError'), {
        description: errorInfo.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSecretChange = (fieldName: string, value: string) => {
    setSecretModified((prev) => ({ ...prev, [fieldName]: value.length > 0 }));
  };

  const handleClearSecret = (fieldName: string) => {
    setValue(fieldName as keyof OpenAIFormData, '');
    setSecretModified((prev) => ({ ...prev, [fieldName]: true }));
  };

  const status = useConfiguredStatus(Boolean(secretConfigured.OPENAI_API_SECRET));
  const secretDirty = Object.values(secretModified).some(Boolean);

  if (loading) {
    return <SettingsSkeleton cards={2} fields={4} />;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex max-w-3xl flex-col gap-6">
      <SettingsHeader title={t('openai.title')} description={t('openai.description')} status={status} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('openai.connection.cardTitle')}</CardTitle>
        </CardHeader>
        <CardPanel className="flex flex-col gap-5">
          <div className="grid gap-5 md:grid-cols-2">
            <TextField
              id="OPENAI_API_URL"
              label={t('openai.connection.fields.apiUrl')}
              placeholder={t('openai.connection.placeholders.apiUrl')}
              registration={register('OPENAI_API_URL')}
              error={errors.OPENAI_API_URL?.message}
            />
            <TextField
              id="OPENAI_MODEL"
              label={t('openai.connection.fields.model')}
              placeholder={t('openai.connection.placeholders.model')}
              registration={register('OPENAI_MODEL')}
              error={errors.OPENAI_MODEL?.message}
            />
          </div>

          <SecretField
            id="OPENAI_API_SECRET"
            label={t('openai.connection.fields.apiSecret')}
            placeholder={t('openai.connection.placeholders.apiSecret')}
            registration={register('OPENAI_API_SECRET', {
              onChange: (e: ChangeEvent<HTMLInputElement>) => handleSecretChange('OPENAI_API_SECRET', e.target.value),
            })}
            configured={Boolean(secretConfigured.OPENAI_API_SECRET)}
            modified={Boolean(secretModified.OPENAI_API_SECRET)}
            onClear={() => handleClearSecret('OPENAI_API_SECRET')}
            configuredLabel={t('openai.secretConfigured')}
            notConfiguredLabel={t('openai.secretNotConfigured')}
            clearLabel={t('openai.clearSecret')}
          />

          <Controller
            name="OPENAI_ENABLE_AUDIO_TRANSCRIPTION"
            control={control}
            render={({ field }) => (
              <ToggleGroupBox>
                <ToggleRow
                  id="OPENAI_ENABLE_AUDIO_TRANSCRIPTION"
                  label={t('openai.connection.fields.audioTranscription')}
                  checked={toBool(field.value)}
                  onCheckedChange={field.onChange}
                />
              </ToggleGroupBox>
            )}
          />
        </CardPanel>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('openai.prompts.cardTitle')}</CardTitle>
        </CardHeader>
        <CardPanel className="grid gap-5 md:grid-cols-2">
          {PROMPT_FIELDS.map((fieldName) => (
            <Field key={fieldName}>
              <FieldLabel htmlFor={fieldName}>{t(`openai.prompts.fields.${fieldName}`)}</FieldLabel>
              <Textarea
                id={fieldName}
                rows={4}
                placeholder={t(`openai.prompts.placeholders.${fieldName}`)}
                {...register(fieldName)}
              />
            </Field>
          ))}
        </CardPanel>
      </Card>

      <SettingsSaveBar
        dirty={isDirty || secretDirty}
        saving={saving}
        saveLabel={t('openai.save')}
        savingLabel={t('openai.saving')}
      />
    </form>
  );
}
