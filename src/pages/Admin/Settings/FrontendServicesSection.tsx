import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { SettingsHeader, SettingsSaveBar, TextField } from './components/SettingsUI';
import { useLanguage } from '@/hooks/useLanguage';
import { adminConfigService } from '@/services/admin/adminConfigService';
import { extractError } from '@/utils/apiHelpers';
import type { AdminConfigData } from '@/types/admin/adminConfig';

// Non-OAuth third-party front-end service keys (reCAPTCHA, Microsoft Clarity).
// These are NOT OAuth apps (clientId/secret), so they live in their own section,
// separate from the OAuth integration catalog — see B3. Persisted under the
// `frontend_runtime` app_config bucket (RECAPTCHA_SITE_KEY, CLARITY_PROJECT_ID).

const frontendServicesSchema = z.object({
  RECAPTCHA_SITE_KEY: z.string().optional().nullable(),
  CLARITY_PROJECT_ID: z.string().optional().nullable(),
});

type FrontendServicesFormData = z.infer<typeof frontendServicesSchema>;

const DEFAULTS: FrontendServicesFormData = {
  RECAPTCHA_SITE_KEY: '',
  CLARITY_PROJECT_ID: '',
};

function buildFormValues(data: Record<string, unknown>): FrontendServicesFormData {
  return {
    RECAPTCHA_SITE_KEY: (data.RECAPTCHA_SITE_KEY as string) ?? '',
    CLARITY_PROJECT_ID: (data.CLARITY_PROJECT_ID as string) ?? '',
  };
}

export default function FrontendServicesSection() {
  const { t } = useLanguage('adminSettings');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<FrontendServicesFormData>({
    resolver: zodResolver(frontendServicesSchema),
    defaultValues: DEFAULTS,
  });

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminConfigService.getConfig('frontend_runtime');
      reset(buildFormValues(data));
    } catch {
      toast.error(t('frontendRuntime.messages.loadError'));
    } finally {
      setLoading(false);
    }
  }, [reset, t]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const onSubmit = async (formData: FrontendServicesFormData) => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        RECAPTCHA_SITE_KEY: formData.RECAPTCHA_SITE_KEY || '',
        CLARITY_PROJECT_ID: formData.CLARITY_PROJECT_ID || '',
      };

      const data = await adminConfigService.saveConfig('frontend_runtime', payload as AdminConfigData);
      reset(buildFormValues(data));
      toast.success(t('frontendRuntime.messages.saveSuccess'));
    } catch (error) {
      const errorInfo = extractError(error);
      toast.error(t('frontendRuntime.messages.saveError'), {
        description: errorInfo.message,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="flex flex-col gap-4 border-t pt-8">
      <SettingsHeader as="h3" title={t('frontendRuntime.title')} description={t('frontendRuntime.description')} />

      {loading ? (
        <Card aria-busy="true">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Spinner className="size-4 text-muted-foreground" />
              <Skeleton className="h-5 w-40" />
            </div>
          </CardHeader>
          <CardPanel className="flex flex-col gap-5">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </CardPanel>
        </Card>
      ) : (
        <form data-testid="frontend-runtime-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('frontendRuntime.fields.cardTitle')}</CardTitle>
              <CardDescription>reCAPTCHA · Microsoft Clarity</CardDescription>
            </CardHeader>
            <CardPanel className="grid gap-5 md:grid-cols-2">
              <TextField
                id="RECAPTCHA_SITE_KEY"
                label={t('frontendRuntime.fields.recaptchaSiteKey')}
                placeholder={t('frontendRuntime.placeholders.recaptchaSiteKey')}
                registration={register('RECAPTCHA_SITE_KEY')}
              />
              <TextField
                id="CLARITY_PROJECT_ID"
                label={t('frontendRuntime.fields.clarityProjectId')}
                placeholder={t('frontendRuntime.placeholders.clarityProjectId')}
                registration={register('CLARITY_PROJECT_ID')}
              />
            </CardPanel>
          </Card>
          <SettingsSaveBar
            dirty={isDirty}
            saving={saving}
            saveLabel={t('frontendRuntime.save')}
            savingLabel={t('frontendRuntime.saving')}
          />
        </form>
      )}
    </section>
  );
}
