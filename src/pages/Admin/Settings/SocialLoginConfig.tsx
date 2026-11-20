import { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Card, CardHeader, CardPanel, CardTitle } from '@/components/ui/card';
import { StatusBadge } from './components/StatusBadge';
import {
  CardSaveFooter,
  SecretField,
  SettingsHeader,
  SettingsSkeleton,
  TextField,
  useConfiguredStatus,
} from './components/SettingsUI';
import { useLanguage } from '@/hooks/useLanguage';
import { adminConfigService } from '@/services/admin/adminConfigService';
import { extractError } from '@/utils/apiHelpers';
import type { AdminConfigData } from '@/types/admin/adminConfig';
import CopyCallbackUrl from '@/components/common/CopyCallbackUrl';

// --- Schema factories with i18n ---

function createGoogleOauthSchema(t: (key: string) => string) {
  return z.object({
    GOOGLE_OAUTH_CLIENT_ID: z.string().min(1, t('socialLogin.validation.clientIdRequired')),
    GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional().nullable(),
  });
}

function createMicrosoftSchema(t: (key: string) => string) {
  return z.object({
    AZURE_APP_ID: z.string().min(1, t('socialLogin.validation.appIdRequired')),
    AZURE_APP_SECRET: z.string().optional().nullable(),
  });
}

type GoogleOauthFormData = z.infer<ReturnType<typeof createGoogleOauthSchema>>;
type MicrosoftFormData = z.infer<ReturnType<typeof createMicrosoftSchema>>;

type GoogleFieldKey = keyof GoogleOauthFormData;
type MicrosoftFieldKey = keyof MicrosoftFormData;

const GOOGLE_DEFAULTS: GoogleOauthFormData = {
  GOOGLE_OAUTH_CLIENT_ID: '',
  GOOGLE_OAUTH_CLIENT_SECRET: null,
};

const MICROSOFT_DEFAULTS: MicrosoftFormData = {
  AZURE_APP_ID: '',
  AZURE_APP_SECRET: null,
};

const GOOGLE_SECRET_FIELDS = ['GOOGLE_OAUTH_CLIENT_SECRET'];
const MICROSOFT_SECRET_FIELDS = ['AZURE_APP_SECRET'];

function isSecretMasked(value: unknown): boolean {
  return typeof value === 'string' && value.includes('••••');
}

function buildGoogleFormValues(data: Record<string, unknown>): GoogleOauthFormData {
  const formValues: Record<string, unknown> = { ...GOOGLE_DEFAULTS };
  for (const [key, value] of Object.entries(data)) {
    if (GOOGLE_SECRET_FIELDS.includes(key)) {
      formValues[key] = isSecretMasked(value) ? '' : (value ?? '');
    } else {
      formValues[key] = value ?? formValues[key] ?? '';
    }
  }
  return formValues as GoogleOauthFormData;
}

function buildMicrosoftFormValues(data: Record<string, unknown>): MicrosoftFormData {
  const formValues: Record<string, unknown> = { ...MICROSOFT_DEFAULTS };
  for (const [key, value] of Object.entries(data)) {
    if (MICROSOFT_SECRET_FIELDS.includes(key)) {
      formValues[key] = isSecretMasked(value) ? '' : (value ?? '');
    } else {
      formValues[key] = value ?? formValues[key] ?? '';
    }
  }
  return formValues as MicrosoftFormData;
}

// --- Main component ---

export default function SocialLoginConfig() {
  const { t } = useLanguage('adminSettings');
  const [loading, setLoading] = useState(true);
  const [savingGoogle, setSavingGoogle] = useState(false);
  const [savingMicrosoft, setSavingMicrosoft] = useState(false);
  const [googleSecretModified, setGoogleSecretModified] = useState<Record<string, boolean>>({});
  const [googleSecretConfigured, setGoogleSecretConfigured] = useState<Record<string, boolean>>({});
  const [microsoftSecretModified, setMicrosoftSecretModified] = useState<Record<string, boolean>>({});
  const [microsoftSecretConfigured, setMicrosoftSecretConfigured] = useState<Record<string, boolean>>({});

  const googleSchema = useMemo(() => createGoogleOauthSchema(t), [t]);
  const microsoftSchema = useMemo(() => createMicrosoftSchema(t), [t]);

  const googleForm = useForm<GoogleOauthFormData>({
    resolver: zodResolver(googleSchema),
    defaultValues: GOOGLE_DEFAULTS,
  });

  const microsoftForm = useForm<MicrosoftFormData>({
    resolver: zodResolver(microsoftSchema),
    defaultValues: MICROSOFT_DEFAULTS,
  });

  const updateGoogleSecretStatus = (data: Record<string, unknown>) => {
    const configured: Record<string, boolean> = {};
    for (const key of GOOGLE_SECRET_FIELDS) {
      configured[key] = isSecretMasked(data[key]);
    }
    setGoogleSecretConfigured(configured);
    setGoogleSecretModified({});
  };

  const updateMicrosoftSecretStatus = (data: Record<string, unknown>) => {
    const configured: Record<string, boolean> = {};
    for (const key of MICROSOFT_SECRET_FIELDS) {
      configured[key] = isSecretMasked(data[key]);
    }
    setMicrosoftSecretConfigured(configured);
    setMicrosoftSecretModified({});
  };

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const [googleData, microsoftData] = await Promise.all([
        adminConfigService.getConfig('google_oauth'),
        adminConfigService.getConfig('microsoft'),
      ]);
      updateGoogleSecretStatus(googleData);
      googleForm.reset(buildGoogleFormValues(googleData));
      updateMicrosoftSecretStatus(microsoftData);
      microsoftForm.reset(buildMicrosoftFormValues(microsoftData));
    } catch {
      toast.error(t('socialLogin.messages.loadError'));
    } finally {
      setLoading(false);
    }
  }, [googleForm, microsoftForm, t]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const onSubmitGoogle = async (formData: GoogleOauthFormData) => {
    setSavingGoogle(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(formData)) {
        if (GOOGLE_SECRET_FIELDS.includes(key)) {
          if (!googleSecretModified[key] || value === '') {
            payload[key] = null;
          } else {
            payload[key] = value;
          }
        } else {
          payload[key] = value;
        }
      }

      const data = await adminConfigService.saveConfig('google_oauth', payload as AdminConfigData);
      updateGoogleSecretStatus(data);
      googleForm.reset(buildGoogleFormValues(data));
      toast.success(t('socialLogin.google.saveSuccess'));
    } catch (error) {
      const errorInfo = extractError(error);
      toast.error(t('socialLogin.google.saveError'), {
        description: errorInfo.message,
      });
    } finally {
      setSavingGoogle(false);
    }
  };

  const onSubmitMicrosoft = async (formData: MicrosoftFormData) => {
    setSavingMicrosoft(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(formData)) {
        if (MICROSOFT_SECRET_FIELDS.includes(key)) {
          if (!microsoftSecretModified[key] || value === '') {
            payload[key] = null;
          } else {
            payload[key] = value;
          }
        } else {
          payload[key] = value;
        }
      }

      const data = await adminConfigService.saveConfig('microsoft', payload as AdminConfigData);
      updateMicrosoftSecretStatus(data);
      microsoftForm.reset(buildMicrosoftFormValues(data));
      toast.success(t('socialLogin.microsoft.saveSuccess'));
    } catch (error) {
      const errorInfo = extractError(error);
      toast.error(t('socialLogin.microsoft.saveError'), {
        description: errorInfo.message,
      });
    } finally {
      setSavingMicrosoft(false);
    }
  };

  const handleClearGoogleSecret = (fieldName: GoogleFieldKey) => {
    googleForm.setValue(fieldName, '');
    setGoogleSecretModified((prev) => ({ ...prev, [fieldName]: true }));
  };

  const handleClearMicrosoftSecret = (fieldName: MicrosoftFieldKey) => {
    microsoftForm.setValue(fieldName, '');
    setMicrosoftSecretModified((prev) => ({ ...prev, [fieldName]: true }));
  };

  const googleStatus = useConfiguredStatus(Boolean(googleSecretConfigured.GOOGLE_OAUTH_CLIENT_SECRET));
  const microsoftStatus = useConfiguredStatus(Boolean(microsoftSecretConfigured.AZURE_APP_SECRET));

  if (loading) {
    return <SettingsSkeleton cards={2} fields={3} />;
  }

  const googleErrors = googleForm.formState.errors;
  const microsoftErrors = microsoftForm.formState.errors;

  return (
    <section className="flex flex-col gap-4">
      <SettingsHeader as="h3" title={t('socialLogin.title')} description={t('socialLogin.description')} />

      <div className="grid gap-4 xl:grid-cols-2">
        <form onSubmit={googleForm.handleSubmit(onSubmitGoogle)}>
          <Card className="h-full">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base">{t('socialLogin.google.cardTitle')}</CardTitle>
                <StatusBadge status={googleStatus} />
              </div>
            </CardHeader>
            <CardPanel className="flex flex-col gap-5">
              <TextField
                id="GOOGLE_OAUTH_CLIENT_ID"
                label={t('socialLogin.google.fields.clientId')}
                placeholder={t('socialLogin.google.placeholders.clientId')}
                registration={googleForm.register('GOOGLE_OAUTH_CLIENT_ID')}
                error={googleErrors.GOOGLE_OAUTH_CLIENT_ID?.message}
              />
              <SecretField
                id="GOOGLE_OAUTH_CLIENT_SECRET"
                label={t('socialLogin.google.fields.clientSecret')}
                placeholder={t('socialLogin.google.placeholders.clientSecret')}
                registration={googleForm.register('GOOGLE_OAUTH_CLIENT_SECRET', {
                  onChange: (e) =>
                    setGoogleSecretModified((prev) => ({ ...prev, GOOGLE_OAUTH_CLIENT_SECRET: e.target.value.length > 0 })),
                })}
                configured={Boolean(googleSecretConfigured.GOOGLE_OAUTH_CLIENT_SECRET)}
                modified={Boolean(googleSecretModified.GOOGLE_OAUTH_CLIENT_SECRET)}
                onClear={() => handleClearGoogleSecret('GOOGLE_OAUTH_CLIENT_SECRET')}
                configuredLabel={t('socialLogin.google.secretConfigured')}
                notConfiguredLabel={t('socialLogin.google.secretNotConfigured')}
                clearLabel={t('socialLogin.google.clearSecret')}
              />
              <CopyCallbackUrl
                url={`${window.location.origin}/google/callback`}
                label={t('socialLogin.callbackUrl.label')}
                hint={t('socialLogin.callbackUrl.hint')}
                copyLabel={t('socialLogin.callbackUrl.copy')}
                copiedMessage={t('socialLogin.callbackUrl.copied')}
              />
            </CardPanel>
            <CardSaveFooter
              dirty={googleForm.formState.isDirty || Boolean(googleSecretModified.GOOGLE_OAUTH_CLIENT_SECRET)}
              saving={savingGoogle}
              saveLabel={t('socialLogin.save')}
              savingLabel={t('socialLogin.saving')}
            />
          </Card>
        </form>

        <form onSubmit={microsoftForm.handleSubmit(onSubmitMicrosoft)}>
          <Card className="h-full">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base">{t('socialLogin.microsoft.cardTitle')}</CardTitle>
                <StatusBadge status={microsoftStatus} />
              </div>
            </CardHeader>
            <CardPanel className="flex flex-col gap-5">
              <TextField
                id="AZURE_APP_ID"
                label={t('socialLogin.microsoft.fields.appId')}
                placeholder={t('socialLogin.microsoft.placeholders.appId')}
                registration={microsoftForm.register('AZURE_APP_ID')}
                error={microsoftErrors.AZURE_APP_ID?.message}
              />
              <SecretField
                id="AZURE_APP_SECRET"
                label={t('socialLogin.microsoft.fields.appSecret')}
                placeholder={t('socialLogin.microsoft.placeholders.appSecret')}
                registration={microsoftForm.register('AZURE_APP_SECRET', {
                  onChange: (e) =>
                    setMicrosoftSecretModified((prev) => ({ ...prev, AZURE_APP_SECRET: e.target.value.length > 0 })),
                })}
                configured={Boolean(microsoftSecretConfigured.AZURE_APP_SECRET)}
                modified={Boolean(microsoftSecretModified.AZURE_APP_SECRET)}
                onClear={() => handleClearMicrosoftSecret('AZURE_APP_SECRET')}
                configuredLabel={t('socialLogin.microsoft.secretConfigured')}
                notConfiguredLabel={t('socialLogin.microsoft.secretNotConfigured')}
                clearLabel={t('socialLogin.microsoft.clearSecret')}
              />
              <CopyCallbackUrl
                url={`${window.location.origin}/microsoft/callback`}
                label={t('socialLogin.callbackUrl.label')}
                hint={t('socialLogin.callbackUrl.hint')}
                copyLabel={t('socialLogin.callbackUrl.copy')}
                copiedMessage={t('socialLogin.callbackUrl.copied')}
              />
            </CardPanel>
            <CardSaveFooter
              dirty={microsoftForm.formState.isDirty || Boolean(microsoftSecretModified.AZURE_APP_SECRET)}
              saving={savingMicrosoft}
              saveLabel={t('socialLogin.save')}
              savingLabel={t('socialLogin.saving')}
            />
          </Card>
        </form>
      </div>
    </section>
  );
}
