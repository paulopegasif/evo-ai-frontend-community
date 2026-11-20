import { type ChangeEvent, useState, useEffect, useCallback, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { AlertTriangle, PlugZap } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardPanel, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription } from '@/components/ui/field';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SecretField, SettingsHeader, SettingsSaveBar, SettingsSkeleton, TextField } from './components/SettingsUI';
import { useLanguage } from '@/hooks/useLanguage';
import { adminConfigService } from '@/services/admin/adminConfigService';
import { extractError } from '@/utils/apiHelpers';
import type { AdminConfigData } from '@/types/admin/adminConfig';
import { ClearConfigButton } from '@/components/admin/ClearConfigButton';

// --- Types ---

type StorageServiceType = 'local' | 'amazon' | 's3_compatible';

// --- Schema factory with i18n ---

function createStorageSchema(t: (key: string) => string) {
  const cloudFields = {
    STORAGE_BUCKET_NAME: z.string().min(1, t('storage.validation.bucketRequired')),
    STORAGE_ACCESS_KEY_ID: z.string().min(1, t('storage.validation.accessKeyRequired')),
    STORAGE_ACCESS_SECRET: z.string().optional().nullable(),
    STORAGE_REGION: z.string().min(1, t('storage.validation.regionRequired')),
  };

  const localSchema = z.object({
    ACTIVE_STORAGE_SERVICE: z.literal('local'),
  });

  const amazonSchema = z.object({
    ACTIVE_STORAGE_SERVICE: z.literal('amazon'),
    ...cloudFields,
    STORAGE_ENDPOINT: z.string().optional(),
  });

  const s3CompatibleSchema = z.object({
    ACTIVE_STORAGE_SERVICE: z.literal('s3_compatible'),
    ...cloudFields,
    STORAGE_ENDPOINT: z.string().min(1, t('storage.validation.endpointRequired')),
  });

  return z.discriminatedUnion('ACTIVE_STORAGE_SERVICE', [
    localSchema,
    amazonSchema,
    s3CompatibleSchema,
  ]);
}

type StorageFormData = z.infer<ReturnType<typeof createStorageSchema>>;

type StorageFieldKey =
  | 'ACTIVE_STORAGE_SERVICE'
  | 'STORAGE_BUCKET_NAME'
  | 'STORAGE_ACCESS_KEY_ID'
  | 'STORAGE_ACCESS_SECRET'
  | 'STORAGE_REGION'
  | 'STORAGE_ENDPOINT';

const LOCAL_DEFAULTS: StorageFormData = {
  ACTIVE_STORAGE_SERVICE: 'local',
};

const AMAZON_DEFAULTS = {
  ACTIVE_STORAGE_SERVICE: 'amazon' as const,
  STORAGE_BUCKET_NAME: '',
  STORAGE_ACCESS_KEY_ID: '',
  STORAGE_ACCESS_SECRET: null,
  STORAGE_REGION: '',
  STORAGE_ENDPOINT: '',
};

const S3_COMPATIBLE_DEFAULTS = {
  ACTIVE_STORAGE_SERVICE: 's3_compatible' as const,
  STORAGE_BUCKET_NAME: '',
  STORAGE_ACCESS_KEY_ID: '',
  STORAGE_ACCESS_SECRET: null,
  STORAGE_REGION: '',
  STORAGE_ENDPOINT: '',
};

const SECRET_FIELDS = ['STORAGE_ACCESS_SECRET'];

function isSecretMasked(value: unknown): boolean {
  return typeof value === 'string' && value.includes('••••');
}

function getDefaults(type: StorageServiceType): StorageFormData {
  switch (type) {
    case 'amazon': return AMAZON_DEFAULTS;
    case 's3_compatible': return S3_COMPATIBLE_DEFAULTS;
    default: return LOCAL_DEFAULTS;
  }
}

function buildFormValues(data: Record<string, unknown>, type: StorageServiceType): StorageFormData {
  const formValues: Record<string, unknown> = { ...getDefaults(type) };
  for (const [key, value] of Object.entries(data)) {
    if (SECRET_FIELDS.includes(key)) {
      formValues[key] = isSecretMasked(value) ? '' : (value ?? '');
    } else {
      formValues[key] = value ?? formValues[key] ?? '';
    }
  }
  formValues.ACTIVE_STORAGE_SERVICE = type;
  return formValues as StorageFormData;
}

export default function StorageConfig() {
  const { t } = useLanguage('adminSettings');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [secretModified, setSecretModified] = useState<Record<string, boolean>>({});
  const [secretConfigured, setSecretConfigured] = useState<Record<string, boolean>>({});

  const storageSchema = useMemo(() => createStorageSchema(t), [t]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<StorageFormData>({
    resolver: zodResolver(storageSchema),
    defaultValues: LOCAL_DEFAULTS,
  });

  const storageService = watch('ACTIVE_STORAGE_SERVICE');
  const isCloud = storageService !== 'local';

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
      const data = await adminConfigService.getConfig('storage');


      const type = (data.ACTIVE_STORAGE_SERVICE as StorageServiceType) || 'local';
      updateSecretStatus(data);
      reset(buildFormValues(data, type));
    } catch {
      toast.error(t('storage.messages.loadError'));
    } finally {
      setLoading(false);
    }
  }, [reset, t]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleProviderChange = (newType: StorageServiceType) => {
    const currentValues = watch();
    const currentIsCloud = currentValues.ACTIVE_STORAGE_SERVICE !== 'local';
    const newIsCloud = newType !== 'local';

    if (currentIsCloud && newIsCloud) {
      // Preserve shared cloud fields when switching between cloud providers
      reset({
        ...currentValues,
        ACTIVE_STORAGE_SERVICE: newType,
      } as StorageFormData);
    } else {
      reset(getDefaults(newType));
    }
    setSecretModified({});
  };

  const onSubmit = async (formData: StorageFormData) => {
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

      const data = await adminConfigService.saveConfig('storage', payload as AdminConfigData);

      updateSecretStatus(data);
      reset(buildFormValues(data, storageService));

      toast.success(t('storage.messages.saveSuccess'));
    } catch (error) {
      const errorInfo = extractError(error);
      toast.error(t('storage.messages.saveError'), {
        description: errorInfo.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const result = await adminConfigService.testConnection('storage');
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(t('storage.testFailed'), { description: result.message });
      }
    } catch (error) {
      const errorInfo = extractError(error);
      toast.error(t('storage.testError'), { description: errorInfo.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSecretChange = (fieldName: string, value: string) => {
    setSecretModified((prev) => ({ ...prev, [fieldName]: value.length > 0 }));
  };

  const handleClearSecret = (fieldName: string) => {
    setValue(fieldName as StorageFieldKey, '');
    setSecretModified((prev) => ({ ...prev, [fieldName]: true }));
  };

  const fieldErrors = errors as Record<string, { message?: string } | undefined>;
  const providerItems = [
    { value: 'local', label: t('storage.provider.local') },
    { value: 'amazon', label: t('storage.provider.amazon') },
    { value: 's3_compatible', label: t('storage.provider.s3Compatible') },
  ];
  const providerLabel = providerItems.find(i => i.value === storageService)?.label;

  if (loading) {
    return <SettingsSkeleton cards={2} fields={3} />;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex max-w-3xl flex-col gap-6">
      <SettingsHeader
        title={t('storage.title')}
        description={t('storage.description')}
        status={providerLabel ? { label: providerLabel, variant: isCloud ? 'info' : 'secondary' } : null}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('storage.provider.label')}</CardTitle>
        </CardHeader>
        <CardPanel className="flex flex-col gap-5">
          <Controller
            name="ACTIVE_STORAGE_SERVICE"
            control={control}
            render={({ field }) => (
              <Field>
                <Select
                  items={providerItems}
                  value={field.value}
                  onValueChange={(v) => v && handleProviderChange(v as StorageServiceType)}
                >
                  <SelectTrigger aria-label={t('storage.provider.label')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopup>
                    {providerItems.map(item => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
                {storageService !== 'local' && (
                  <FieldDescription>
                    {storageService === 'amazon'
                      ? t('storage.provider.amazonHelp')
                      : t('storage.provider.s3CompatibleHelp')}
                  </FieldDescription>
                )}
              </Field>
            )}
          />

          {isCloud && (
            <Alert variant="warning">
              <AlertTriangle />
              <AlertTitle>{t('storage.cloudWarning.title')}</AlertTitle>
              <AlertDescription>{t('storage.cloudWarning.body')}</AlertDescription>
            </Alert>
          )}
        </CardPanel>
      </Card>

      {isCloud && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{providerLabel}</CardTitle>
          </CardHeader>
          <CardPanel className="flex flex-col gap-5">
            <TextField
              id="STORAGE_BUCKET_NAME"
              label={t('storage.fields.bucketName')}
              placeholder={t('storage.placeholders.bucketName')}
              registration={register('STORAGE_BUCKET_NAME' as StorageFieldKey)}
              error={fieldErrors.STORAGE_BUCKET_NAME?.message}
            />
            <div className="grid gap-5 md:grid-cols-2">
              <TextField
                id="STORAGE_ACCESS_KEY_ID"
                label={t('storage.fields.accessKeyId')}
                placeholder={t('storage.placeholders.accessKeyId')}
                registration={register('STORAGE_ACCESS_KEY_ID' as StorageFieldKey)}
                error={fieldErrors.STORAGE_ACCESS_KEY_ID?.message}
              />
              <SecretField
                id="STORAGE_ACCESS_SECRET"
                label={t('storage.fields.accessSecret')}
                placeholder={t('storage.placeholders.accessSecret')}
                registration={register('STORAGE_ACCESS_SECRET' as StorageFieldKey, {
                  onChange: (e: ChangeEvent<HTMLInputElement>) => handleSecretChange('STORAGE_ACCESS_SECRET', e.target.value),
                })}
                configured={Boolean(secretConfigured.STORAGE_ACCESS_SECRET)}
                modified={Boolean(secretModified.STORAGE_ACCESS_SECRET)}
                onClear={() => handleClearSecret('STORAGE_ACCESS_SECRET')}
                configuredLabel={t('storage.secretConfigured')}
                notConfiguredLabel={t('storage.secretNotConfigured')}
                clearLabel={t('storage.clearSecret')}
              />
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <TextField
                id="STORAGE_REGION"
                label={t('storage.fields.region')}
                placeholder={t('storage.placeholders.region')}
                registration={register('STORAGE_REGION' as StorageFieldKey)}
                error={fieldErrors.STORAGE_REGION?.message}
              />
              <TextField
                id="STORAGE_ENDPOINT"
                label={t('storage.fields.endpoint')}
                placeholder={t('storage.placeholders.endpoint')}
                registration={register('STORAGE_ENDPOINT' as StorageFieldKey)}
                error={storageService === 's3_compatible' ? fieldErrors.STORAGE_ENDPOINT?.message : undefined}
                description={t('storage.fields.endpointHelp')}
              />
            </div>
          </CardPanel>
        </Card>
      )}

      <SettingsSaveBar
        dirty={isDirty || Object.values(secretModified).some(Boolean)}
        saving={saving}
        saveLabel={t('storage.save')}
        savingLabel={t('storage.saving')}
      >
        <ClearConfigButton configType="storage" configLabel="Storage" onCleared={() => { reset(); loadConfig(); }} />
        {isCloud && (
          <Button type="button" variant="outline" onClick={handleTestConnection} loading={testing}>
            <PlugZap />
            {testing ? t('storage.testing') : t('storage.testConnection')}
          </Button>
        )}
      </SettingsSaveBar>
    </form>
  );
}
