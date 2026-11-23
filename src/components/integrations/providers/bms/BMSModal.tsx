import { useState, useEffect, useId } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Check, ExternalLink, MessageSquare } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { DialogClose } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import { BMSHook, BMSFormData, IntegrationHook } from '@/types/integrations';
import { AgentIntegrationDialog, SettingRow } from '../../agentConfig/AgentIntegrationDialog';
import IntegrationNotice from '../../shared/IntegrationNotice';
import SecretInput from '../../shared/SecretInput';

const SYNC_OPTIONS = [
  { field: 'enable_contact_sync', key: 'contactSync' },
  { field: 'enable_label_sync', key: 'labelSync' },
  { field: 'enable_custom_attributes_sync', key: 'customAttributesSync' },
  { field: 'enable_campaign_sync', key: 'campaignSync' },
] as const;

const FEATURES = ['bidirectionalSync', 'labelSync', 'customAttributes', 'campaignSync', 'centralizedHistory'];

interface BMSModalProps {
  hook?: IntegrationHook;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isNew?: boolean;
  loading?: boolean;
}

export default function BMSModal({
  hook,
  open,
  onOpenChange,
  onSubmit,
  isNew: _ = false,
  loading: submitting = false
}: BMSModalProps) {
  const { t } = useLanguage('integrations');
  const formId = useId();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<BMSFormData>({
    api_key: '',
    enable_contact_sync: true,
    enable_label_sync: true,
    enable_custom_attributes_sync: false,
    enable_campaign_sync: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const bmsHook = hook as BMSHook | undefined;
    if (bmsHook?.settings) {
      setFormData({
        api_key: bmsHook.settings.api_key || '',
        enable_contact_sync: bmsHook.settings.enable_contact_sync ?? true,
        enable_label_sync: bmsHook.settings.enable_label_sync ?? true,
        enable_custom_attributes_sync: bmsHook.settings.enable_custom_attributes_sync ?? false,
        enable_campaign_sync: bmsHook.settings.enable_campaign_sync ?? false,
      });
    } else {
      setFormData({
        api_key: '',
        enable_contact_sync: true,
        enable_label_sync: true,
        enable_custom_attributes_sync: false,
        enable_campaign_sync: false,
      });
    }
    setErrors({});
  }, [hook, open]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.api_key.trim()) {
      newErrors.api_key = t('bms.modal.fields.apiKey.required');
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

  const openBMSDoc = () => {
    window.open('https://docs.brius.com/api', '_blank');
  };

  const saving = loading || submitting;

  return (
    <AgentIntegrationDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={<MessageSquare className="text-muted-foreground" />}
      title={hook ? t('bms.modal.updateTitle') : t('bms.modal.title')}
      description={t('bms.modal.description')}
      footerStart={
        <Button type="button" variant="ghost" onClick={openBMSDoc}>
          <ExternalLink />
          {t('bms.modal.actions.documentation')}
        </Button>
      }
      footer={
        <>
          <DialogClose render={<Button type="button" variant="ghost" />} disabled={saving}>
            {t('bms.modal.actions.cancel')}
          </DialogClose>
          <Button type="submit" form={formId} loading={saving}>
            {saving
              ? t('bms.modal.actions.saving')
              : hook
                ? t('bms.modal.actions.update')
                : t('bms.modal.actions.configure')}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        <section className="flex flex-col gap-4">
          <h3 className="font-medium text-sm">{t('bms.modal.apiConfig')}</h3>
          <Field invalid={Boolean(errors.api_key)}>
            <FieldLabel htmlFor="bms-api-key">
              {t('bms.modal.fields.apiKey.label')} <span className="text-destructive-foreground">*</span>
            </FieldLabel>
            <SecretInput
              id="bms-api-key"
              placeholder={t('bms.modal.fields.apiKey.placeholder')}
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
              <FieldDescription>{t('bms.modal.fields.apiKey.hint')}</FieldDescription>
            )}
          </Field>
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="font-medium text-sm">{t('bms.modal.syncOptions')}</h3>
          <div className="flex flex-col gap-2">
            {SYNC_OPTIONS.map(({ field, key }) => (
              <SettingRow
                key={field}
                htmlFor={field}
                title={t(`bms.modal.fields.${key}.label`)}
                description={t(`bms.modal.fields.${key}.description`)}
                control={
                  <Switch
                    id={field}
                    checked={Boolean(formData[field])}
                    onCheckedChange={checked => setFormData(prev => ({ ...prev, [field]: checked }))}
                  />
                }
              />
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-xl border bg-muted/24 p-4">
          <h3 className="font-medium text-sm">{t('bms.modal.features.title')}</h3>
          <ul className="grid gap-2 text-muted-foreground text-sm sm:grid-cols-2">
            {FEATURES.map(key => (
              <li key={key} className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-success" />
                {t(`bms.modal.features.${key}`)}
              </li>
            ))}
          </ul>
        </section>

        <IntegrationNotice variant="warning" title={t('bms.modal.security.title')}>
          {t('bms.modal.security.description')}
        </IntegrationNotice>
      </form>
    </AgentIntegrationDialog>
  );
}
