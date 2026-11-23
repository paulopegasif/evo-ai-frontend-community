import { type ChangeEvent, useState, useEffect, useCallback, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Card, CardHeader, CardPanel, CardTitle } from '@/components/ui/card';
import {
  SecretField,
  SelectField,
  SettingsHeader,
  SettingsSaveBar,
  SettingsSkeleton,
  TextField,
} from './components/SettingsUI';
import { useLanguage } from '@/hooks/useLanguage';
import { adminConfigService } from '@/services/admin/adminConfigService';
import { extractError } from '@/utils/apiHelpers';
import type { AdminConfigData } from '@/types/admin/adminConfig';

// --- Types ---

type InboundService = 'relay' | 'mailgun' | 'mandrill' | 'sendgrid';

// --- Schema factory with i18n ---

function createSchema(t: (key: string) => string) {
  const relaySchema = z.object({
    RAILS_INBOUND_EMAIL_SERVICE: z.literal('relay'),
    RAILS_INBOUND_EMAIL_PASSWORD_SECRET: z.string().optional().nullable(),
    MAILER_INBOUND_EMAIL_DOMAIN: z.string().min(1, t('inboundEmail.validation.domainRequired')),
  });

  const mailgunSchema = z.object({
    RAILS_INBOUND_EMAIL_SERVICE: z.literal('mailgun'),
    MAILGUN_SIGNING_SECRET: z.string().optional().nullable(),
    MAILER_INBOUND_EMAIL_DOMAIN: z.string().min(1, t('inboundEmail.validation.domainRequired')),
  });

  const mandrillSchema = z.object({
    RAILS_INBOUND_EMAIL_SERVICE: z.literal('mandrill'),
    MANDRILL_API_SECRET: z.string().optional().nullable(),
    MAILER_INBOUND_EMAIL_DOMAIN: z.string().min(1, t('inboundEmail.validation.domainRequired')),
  });

  const sendgridSchema = z.object({
    RAILS_INBOUND_EMAIL_SERVICE: z.literal('sendgrid'),
    RAILS_INBOUND_EMAIL_PASSWORD_SECRET: z.string().optional().nullable(),
    MAILER_INBOUND_EMAIL_DOMAIN: z.string().min(1, t('inboundEmail.validation.domainRequired')),
  });

  const inboundEmailSchema = z.discriminatedUnion('RAILS_INBOUND_EMAIL_SERVICE', [
    relaySchema,
    mailgunSchema,
    mandrillSchema,
    sendgridSchema,
  ]);

  return { inboundEmailSchema };
}

type InboundEmailFormData = z.infer<ReturnType<typeof createSchema>['inboundEmailSchema']>;

type InboundEmailFieldKey =
  | 'RAILS_INBOUND_EMAIL_SERVICE'
  | 'RAILS_INBOUND_EMAIL_PASSWORD_SECRET'
  | 'MAILER_INBOUND_EMAIL_DOMAIN'
  | 'MAILGUN_SIGNING_SECRET'
  | 'MANDRILL_API_SECRET';

const RELAY_DEFAULTS: InboundEmailFormData = {
  RAILS_INBOUND_EMAIL_SERVICE: 'relay',
  RAILS_INBOUND_EMAIL_PASSWORD_SECRET: null,
  MAILER_INBOUND_EMAIL_DOMAIN: '',
};

const SECRET_FIELDS = ['RAILS_INBOUND_EMAIL_PASSWORD_SECRET', 'MAILGUN_SIGNING_SECRET', 'MANDRILL_API_SECRET'];

function isSecretMasked(value: unknown): boolean {
  return typeof value === 'string' && value.includes('••••');
}

function getDefaults(service: InboundService): InboundEmailFormData {
  switch (service) {
    case 'mailgun':
      return { RAILS_INBOUND_EMAIL_SERVICE: 'mailgun', MAILGUN_SIGNING_SECRET: null, MAILER_INBOUND_EMAIL_DOMAIN: '' };
    case 'mandrill':
      return { RAILS_INBOUND_EMAIL_SERVICE: 'mandrill', MANDRILL_API_SECRET: null, MAILER_INBOUND_EMAIL_DOMAIN: '' };
    case 'sendgrid':
      return { RAILS_INBOUND_EMAIL_SERVICE: 'sendgrid', RAILS_INBOUND_EMAIL_PASSWORD_SECRET: null, MAILER_INBOUND_EMAIL_DOMAIN: '' };
    default:
      return { ...RELAY_DEFAULTS };
  }
}

function buildFormValues(data: Record<string, unknown>, service: InboundService): InboundEmailFormData {
  const formValues: Record<string, unknown> = { ...getDefaults(service) };
  for (const [key, value] of Object.entries(data)) {
    if (SECRET_FIELDS.includes(key)) {
      formValues[key] = isSecretMasked(value) ? '' : (value ?? '');
    } else {
      formValues[key] = value ?? formValues[key] ?? '';
    }
  }
  formValues.RAILS_INBOUND_EMAIL_SERVICE = service;
  return formValues as InboundEmailFormData;
}

export default function InboundEmailConfig() {
  const { t } = useLanguage('adminSettings');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [secretModified, setSecretModified] = useState<Record<string, boolean>>({});
  const [secretConfigured, setSecretConfigured] = useState<Record<string, boolean>>({});
  const [serverData, setServerData] = useState<Record<string, unknown>>({});

  const { inboundEmailSchema } = useMemo(() => createSchema(t), [t]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<InboundEmailFormData>({
    resolver: zodResolver(inboundEmailSchema),
    defaultValues: RELAY_DEFAULTS,
  });

  const service = watch('RAILS_INBOUND_EMAIL_SERVICE');

  const updateSecretStatus = useCallback((data: Record<string, unknown>) => {
    const configured: Record<string, boolean> = {};
    for (const key of SECRET_FIELDS) {
      configured[key] = isSecretMasked(data[key]);
    }
    setSecretConfigured(configured);
    setSecretModified({});
  }, []);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminConfigService.getConfig('inbound_email');
      setServerData(data);

      const svc = (data.RAILS_INBOUND_EMAIL_SERVICE as InboundService) || 'relay';
      updateSecretStatus(data);
      reset(buildFormValues(data, svc));
    } catch {
      toast.error(t('inboundEmail.messages.loadError'));
    } finally {
      setLoading(false);
    }
  }, [reset, t, updateSecretStatus]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleServiceChange = (newService: InboundService) => {
    const domain = (serverData.MAILER_INBOUND_EMAIL_DOMAIN as string) || '';
    const defaults = { ...getDefaults(newService), MAILER_INBOUND_EMAIL_DOMAIN: domain };
    reset(defaults);
    setSecretModified({});
  };

  const onSubmit = async (formData: InboundEmailFormData) => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(formData)) {
        if (SECRET_FIELDS.includes(key) && !secretModified[key]) {
          payload[key] = null;
        } else {
          payload[key] = value;
        }
      }

      const data = await adminConfigService.saveConfig('inbound_email', payload as AdminConfigData);
      setServerData(data);
      updateSecretStatus(data);
      reset(buildFormValues(data, service));

      toast.success(t('inboundEmail.messages.saveSuccess'));
    } catch (error) {
      const errorInfo = extractError(error);
      toast.error(t('inboundEmail.messages.saveError'), {
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
    setValue(fieldName as InboundEmailFieldKey, '');
    setSecretModified((prev) => ({ ...prev, [fieldName]: true }));
  };

  const secretField = (fieldName: string, label: string, placeholder: string) => (
    <SecretField
      id={fieldName}
      label={label}
      placeholder={placeholder}
      registration={register(fieldName as InboundEmailFieldKey, {
        onChange: (e: ChangeEvent<HTMLInputElement>) => handleSecretChange(fieldName, e.target.value),
      })}
      configured={Boolean(secretConfigured[fieldName])}
      modified={Boolean(secretModified[fieldName])}
      onClear={() => handleClearSecret(fieldName)}
      configuredLabel={t('inboundEmail.secretConfigured')}
      notConfiguredLabel={t('inboundEmail.secretNotConfigured')}
      clearLabel={t('inboundEmail.clearSecret')}
    />
  );

  const serviceItems = (['relay', 'mailgun', 'mandrill', 'sendgrid'] as const).map(value => ({
    value,
    label: t(`inboundEmail.provider.${value}`),
  }));

  if (loading) {
    return <SettingsSkeleton cards={1} fields={3} />;
  }

  const domainError =
    'MAILER_INBOUND_EMAIL_DOMAIN' in errors ? errors.MAILER_INBOUND_EMAIL_DOMAIN?.message : undefined;

  return (
    <section className="flex flex-col gap-4">
      <SettingsHeader
        as="h3"
        title={t('inboundEmail.title')}
        description={t('inboundEmail.description')}
        status={{ label: serviceItems.find(i => i.value === service)?.label ?? '', variant: 'info' }}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('inboundEmail.provider.label')}</CardTitle>
          </CardHeader>
          <CardPanel className="flex flex-col gap-5">
            <Controller
              name="RAILS_INBOUND_EMAIL_SERVICE"
              control={control}
              render={({ field }) => (
                <SelectField
                  id="RAILS_INBOUND_EMAIL_SERVICE"
                  label={t('inboundEmail.provider.label')}
                  items={serviceItems}
                  value={field.value}
                  onValueChange={(v) => handleServiceChange(v as InboundService)}
                />
              )}
            />

            <div className="grid gap-5 md:grid-cols-2">
              {(service === 'relay' || service === 'sendgrid') &&
                secretField('RAILS_INBOUND_EMAIL_PASSWORD_SECRET', t('inboundEmail.fields.password'), t('inboundEmail.placeholders.password'))}
              {service === 'mailgun' &&
                secretField('MAILGUN_SIGNING_SECRET', t('inboundEmail.fields.mailgunSigningKey'), t('inboundEmail.placeholders.mailgunSigningKey'))}
              {service === 'mandrill' &&
                secretField('MANDRILL_API_SECRET', t('inboundEmail.fields.mandrillApiKey'), t('inboundEmail.placeholders.mandrillApiKey'))}

              <TextField
                id="MAILER_INBOUND_EMAIL_DOMAIN"
                label={t('inboundEmail.fields.domain')}
                placeholder={t('inboundEmail.placeholders.domain')}
                registration={register('MAILER_INBOUND_EMAIL_DOMAIN' as InboundEmailFieldKey)}
                error={domainError}
              />
            </div>
          </CardPanel>
        </Card>

        <SettingsSaveBar
          dirty={isDirty || Object.values(secretModified).some(Boolean)}
          saving={saving}
          saveLabel={t('inboundEmail.save')}
          savingLabel={t('inboundEmail.saving')}
        />
      </form>
    </section>
  );
}
