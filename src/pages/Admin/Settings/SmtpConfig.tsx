import { type ChangeEvent, useState, useEffect, useCallback, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { PlugZap } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardPanel, CardTitle } from '@/components/ui/card';
import {
  SecretField,
  SelectField,
  SettingsHeader,
  SettingsSaveBar,
  SettingsSkeleton,
  TextField,
  ToggleGroupBox,
  ToggleRow,
} from './components/SettingsUI';
import { useLanguage } from '@/hooks/useLanguage';
import { adminConfigService } from '@/services/admin/adminConfigService';
import { extractError } from '@/utils/apiHelpers';
import type { MailerType, AdminConfigData } from '@/types/admin/adminConfig';
import { ClearConfigButton } from '@/components/admin/ClearConfigButton';

// --- Schema factory with i18n ---

function createSchemas(t: (key: string) => string) {
  const smtpSchema = z.object({
    MAILER_TYPE: z.literal('smtp'),
    SMTP_ADDRESS: z.string().min(1, t('email.validation.hostRequired')),
    SMTP_PORT: z.coerce.number().min(1, t('email.validation.portMin')).max(65535, t('email.validation.portMax')),
    SMTP_USERNAME: z.string().optional().default(''),
    SMTP_PASSWORD_SECRET: z.string().optional().nullable(),
    SMTP_AUTHENTICATION: z.enum(['plain', 'login', 'cram_md5']).default('login'),
    SMTP_DOMAIN: z.string().optional().default(''),
    SMTP_ENABLE_STARTTLS_AUTO: z.boolean().default(true),
    SMTP_OPENSSL_VERIFY_MODE: z.enum(['none', 'peer']).default('peer'),
    MAILER_SENDER_EMAIL: z.string().email(t('email.validation.emailRequired')),
  });

  const bmsSchema = z.object({
    MAILER_TYPE: z.literal('bms'),
    BMS_API_SECRET: z.string().optional().nullable(),
    BMS_IPPOOL: z.string().default('default'),
    MAILER_SENDER_EMAIL: z.string().email(t('email.validation.emailRequired')),
  });

  const resendSchema = z.object({
    MAILER_TYPE: z.literal('resend'),
    RESEND_API_SECRET: z.string().optional().nullable(),
    MAILER_SENDER_EMAIL: z.string().email(t('email.validation.emailRequired')),
  });

  const emailConfigSchema = z.discriminatedUnion('MAILER_TYPE', [smtpSchema, bmsSchema, resendSchema]);

  return { smtpSchema, bmsSchema, resendSchema, emailConfigSchema };
}

type EmailFormData = z.infer<ReturnType<typeof createSchemas>['emailConfigSchema']>;
type SmtpFormData = z.infer<ReturnType<typeof createSchemas>['smtpSchema']>;
type BmsFormData = z.infer<ReturnType<typeof createSchemas>['bmsSchema']>;
type ResendFormData = z.infer<ReturnType<typeof createSchemas>['resendSchema']>;

// Union of all possible field keys across all provider schemas.
// RHF Path<EmailFormData> only includes shared fields since EmailFormData is a
// discriminated union; this alias lets us reference variant-specific fields safely.
type EmailFieldKey = keyof SmtpFormData | keyof BmsFormData | keyof ResendFormData;

const SMTP_DEFAULTS: SmtpFormData = {
  MAILER_TYPE: 'smtp',
  SMTP_ADDRESS: '',
  SMTP_PORT: 587,
  SMTP_USERNAME: '',
  SMTP_PASSWORD_SECRET: null,
  SMTP_AUTHENTICATION: 'login',
  SMTP_DOMAIN: '',
  SMTP_ENABLE_STARTTLS_AUTO: true,
  SMTP_OPENSSL_VERIFY_MODE: 'peer',
  MAILER_SENDER_EMAIL: '',
};

const BMS_DEFAULTS: BmsFormData = {
  MAILER_TYPE: 'bms',
  BMS_API_SECRET: null,
  BMS_IPPOOL: 'default',
  MAILER_SENDER_EMAIL: '',
};

const RESEND_DEFAULTS: ResendFormData = {
  MAILER_TYPE: 'resend',
  RESEND_API_SECRET: null,
  MAILER_SENDER_EMAIL: '',
};

const SECRET_FIELDS = ['SMTP_PASSWORD_SECRET', 'BMS_API_SECRET', 'RESEND_API_SECRET'];

function isSecretMasked(value: unknown): boolean {
  return typeof value === 'string' && value.includes('••••');
}

function getDefaults(type: MailerType): EmailFormData {
  switch (type) {
    case 'bms': return BMS_DEFAULTS;
    case 'resend': return RESEND_DEFAULTS;
    default: return SMTP_DEFAULTS;
  }
}

function buildFormValues(data: Record<string, unknown>, type: MailerType): EmailFormData {
  const formValues: Record<string, unknown> = { ...getDefaults(type) };
  for (const [key, value] of Object.entries(data)) {
    if (SECRET_FIELDS.includes(key)) {
      formValues[key] = isSecretMasked(value) ? '' : (value ?? '');
    } else if (key === 'SMTP_PORT') {
      formValues[key] = Number(value) || 587;
    } else if (key === 'SMTP_ENABLE_STARTTLS_AUTO') {
      formValues[key] = value === true || value === 'true';
    } else {
      formValues[key] = value ?? formValues[key] ?? '';
    }
  }
  formValues.MAILER_TYPE = type;
  return formValues as EmailFormData;
}

export default function SmtpConfig() {
  const { t } = useLanguage('adminSettings');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [secretModified, setSecretModified] = useState<Record<string, boolean>>({});
  const [secretConfigured, setSecretConfigured] = useState<Record<string, boolean>>({});
  const [serverData, setServerData] = useState<Record<string, unknown>>({});

  const { emailConfigSchema } = useMemo(() => createSchemas(t), [t]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<EmailFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(emailConfigSchema) as any,
    defaultValues: SMTP_DEFAULTS,
  });

  const mailerType = watch('MAILER_TYPE');

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
      const data = await adminConfigService.getConfig('smtp');
      setServerData(data);

      const type = (data.MAILER_TYPE as MailerType) || 'smtp';
      updateSecretStatus(data);
      reset(buildFormValues(data, type));
    } catch {
      toast.error(t('email.messages.loadError'));
    } finally {
      setLoading(false);
    }
  }, [reset, t]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleProviderChange = (newType: MailerType) => {
    const senderEmail = (serverData.MAILER_SENDER_EMAIL as string) || '';
    const defaults = { ...getDefaults(newType), MAILER_SENDER_EMAIL: senderEmail };
    reset(defaults);
    setSecretModified({});
  };

  const onSubmit = async (formData: EmailFormData) => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(formData)) {
        if (SECRET_FIELDS.includes(key) && !secretModified[key]) {
          payload[key] = null; // preserve existing on backend
        } else {
          payload[key] = value;
        }
      }

      const data = await adminConfigService.saveConfig('smtp', payload as AdminConfigData);
      setServerData(data);
      updateSecretStatus(data);
      reset(buildFormValues(data, mailerType));

      toast.success(t('email.messages.saveSuccess'));
    } catch (error) {
      const errorInfo = extractError(error);
      toast.error(t('email.messages.saveError'), {
        description: errorInfo.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const result = await adminConfigService.testConnection('smtp');
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(t('email.testFailed'), { description: result.message });
      }
    } catch {
      toast.error(t('email.testError'));
    } finally {
      setTesting(false);
    }
  };

  const handleSecretChange = (fieldName: string, value: string) => {
    setSecretModified((prev) => ({ ...prev, [fieldName]: value.length > 0 }));
  };

  const handleClearSecret = (fieldName: string) => {
    setValue(fieldName as EmailFieldKey, '');
    setSecretModified((prev) => ({ ...prev, [fieldName]: true }));
  };

  const fieldErrors = errors as Record<string, { message?: string } | undefined>;

  const secretField = (fieldName: string, label: string, placeholder: string) => (
    <SecretField
      id={fieldName}
      label={label}
      placeholder={placeholder}
      registration={register(fieldName as EmailFieldKey, {
        onChange: (e: ChangeEvent<HTMLInputElement>) => handleSecretChange(fieldName, e.target.value),
      })}
      configured={Boolean(secretConfigured[fieldName])}
      modified={Boolean(secretModified[fieldName])}
      onClear={() => handleClearSecret(fieldName)}
      configuredLabel={t('email.secretConfigured')}
      notConfiguredLabel={t('email.secretNotConfigured')}
      clearLabel={t('email.clearSecret')}
    />
  );

  const providerItems = [
    { value: 'smtp', label: t('email.provider.smtp') },
    { value: 'bms', label: t('email.provider.bms') },
    { value: 'resend', label: t('email.provider.resend') },
  ];
  const providerLabel = providerItems.find(i => i.value === mailerType)?.label;

  if (loading) {
    return <SettingsSkeleton cards={2} fields={4} />;
  }

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <form onSubmit={handleSubmit(onSubmit as any)} className="flex max-w-3xl flex-col gap-6">
      <SettingsHeader
        title={t('email.title')}
        description={t('email.description')}
        status={providerLabel ? { label: providerLabel, variant: 'info' } : null}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('email.provider.label')}</CardTitle>
        </CardHeader>
        <CardPanel className="flex flex-col gap-5">
          <Controller
            name="MAILER_TYPE"
            control={control}
            render={({ field }) => (
              <SelectField
                id="MAILER_TYPE"
                label={t('email.provider.label')}
                items={providerItems}
                value={field.value}
                onValueChange={(v) => handleProviderChange(v as MailerType)}
              />
            )}
          />
          <TextField
            id="MAILER_SENDER_EMAIL"
            type="email"
            label={t('email.fields.senderEmail')}
            placeholder={t('email.placeholders.senderEmail')}
            registration={register('MAILER_SENDER_EMAIL')}
            error={errors.MAILER_SENDER_EMAIL?.message}
          />
        </CardPanel>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{providerLabel}</CardTitle>
        </CardHeader>
        <CardPanel className="flex flex-col gap-5">
          {mailerType === 'smtp' && (
            <>
              <div className="grid gap-5 md:grid-cols-[1fr_160px]">
                <TextField
                  id="SMTP_ADDRESS"
                  label={t('email.fields.host')}
                  placeholder={t('email.placeholders.host')}
                  registration={register('SMTP_ADDRESS' as EmailFieldKey)}
                  error={fieldErrors.SMTP_ADDRESS?.message}
                />
                <TextField
                  id="SMTP_PORT"
                  type="number"
                  label={t('email.fields.port')}
                  placeholder={t('email.placeholders.port')}
                  registration={register('SMTP_PORT' as EmailFieldKey)}
                  error={fieldErrors.SMTP_PORT?.message}
                />
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <TextField
                  id="SMTP_USERNAME"
                  label={t('email.fields.username')}
                  placeholder={t('email.placeholders.username')}
                  registration={register('SMTP_USERNAME' as EmailFieldKey)}
                />
                {secretField('SMTP_PASSWORD_SECRET', t('email.fields.password'), t('email.placeholders.password'))}
              </div>
              <div className="grid gap-5 md:grid-cols-3">
                <Controller
                  name={'SMTP_AUTHENTICATION' as EmailFieldKey}
                  control={control}
                  render={({ field }) => (
                    <SelectField
                      id="SMTP_AUTHENTICATION"
                      label={t('email.fields.authentication')}
                      items={['plain', 'login', 'cram_md5'].map(v => ({ value: v, label: v }))}
                      value={field.value as string | undefined}
                      onValueChange={field.onChange}
                    />
                  )}
                />
                <Controller
                  name={'SMTP_OPENSSL_VERIFY_MODE' as EmailFieldKey}
                  control={control}
                  render={({ field }) => (
                    <SelectField
                      id="SMTP_OPENSSL_VERIFY_MODE"
                      label={t('email.fields.sslVerifyMode')}
                      items={['none', 'peer'].map(v => ({ value: v, label: v }))}
                      value={field.value as string | undefined}
                      onValueChange={field.onChange}
                    />
                  )}
                />
                <TextField
                  id="SMTP_DOMAIN"
                  label={t('email.fields.domain')}
                  placeholder={t('email.placeholders.domain')}
                  registration={register('SMTP_DOMAIN' as EmailFieldKey)}
                />
              </div>
              <Controller
                name={'SMTP_ENABLE_STARTTLS_AUTO' as EmailFieldKey}
                control={control}
                render={({ field }) => (
                  <ToggleGroupBox>
                    <ToggleRow
                      id="SMTP_ENABLE_STARTTLS_AUTO"
                      label={t('email.fields.starttls')}
                      checked={!!field.value}
                      onCheckedChange={field.onChange}
                    />
                  </ToggleGroupBox>
                )}
              />
            </>
          )}

          {mailerType === 'bms' && (
            <>
              {secretField('BMS_API_SECRET', t('email.fields.apiKey'), t('email.placeholders.apiKey'))}
              <TextField
                id="BMS_IPPOOL"
                label={t('email.fields.ipPool')}
                placeholder={t('email.placeholders.ipPool')}
                registration={register('BMS_IPPOOL' as EmailFieldKey)}
              />
            </>
          )}

          {mailerType === 'resend' &&
            secretField('RESEND_API_SECRET', t('email.fields.apiKey'), t('email.placeholders.apiKey'))}
        </CardPanel>
      </Card>

      <SettingsSaveBar
        dirty={isDirty || Object.values(secretModified).some(Boolean)}
        saving={saving}
        saveLabel={t('email.save')}
        savingLabel={t('email.saving')}
      >
        <ClearConfigButton configType="smtp" configLabel="Email / SMTP" onCleared={() => { reset(); loadConfig(); }} />
        <Button type="button" variant="outline" onClick={handleTestConnection} loading={testing}>
          <PlugZap />
          {testing ? t('email.testing') : t('email.testConnection')}
        </Button>
      </SettingsSaveBar>
    </form>
  );
}
