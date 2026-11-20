import { useState, useEffect, useId } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Building2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogClose } from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { LeadSquaredHook, LeadSquaredFormData, IntegrationHook } from '@/types/integrations';
import { AgentIntegrationDialog, SettingRow } from '../../agentConfig/AgentIntegrationDialog';
import IntegrationNotice from '../../shared/IntegrationNotice';
import SecretInput from '../../shared/SecretInput';

interface LeadSquaredModalProps {
  hook?: IntegrationHook;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isNew?: boolean;
  loading?: boolean;
}

const TIMEZONE_OPTIONS = [
  { value: 'America/Sao_Paulo', label: 'São Paulo (GMT-3)' },
  { value: 'America/New_York', label: 'New York (GMT-5)' },
  { value: 'Europe/London', label: 'London (GMT+0)' },
  { value: 'Asia/Dubai', label: 'Dubai (GMT+4)' },
  { value: 'Asia/Kolkata', label: 'Mumbai (GMT+5:30)' },
];

export default function LeadSquaredModal({
  hook,
  open,
  onOpenChange,
  onSubmit,
  loading: submitting = false,
}: LeadSquaredModalProps) {
  const { t } = useLanguage('integrations');
  const formId = useId();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<LeadSquaredFormData>({
    access_key: '',
    secret_key: '',
    endpoint_url: '',
    app_url: '',
    host_url: '',
    timezone: 'America/Sao_Paulo',
    enable_conversation_activity: true,
    enable_transcript_activity: false,
    enable_contact_sync: false,
    enable_lead_creation: false,
    enable_activity_sync: false,
    enable_opportunity_sync: false,
    conversation_activity_score: '10',
    transcript_activity_score: '5',
    conversation_activity_code: 100,
    transcript_activity_code: 101,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const leadSquaredHook = hook as LeadSquaredHook | undefined;
    if (leadSquaredHook?.settings) {
      setFormData({
        access_key: leadSquaredHook.settings.access_key || '',
        secret_key: leadSquaredHook.settings.secret_key || '',
        endpoint_url: leadSquaredHook.settings.endpoint_url || '',
        app_url: leadSquaredHook.settings.app_url || '',
        host_url: leadSquaredHook.settings.host_url || '',
        timezone: leadSquaredHook.settings.timezone || 'America/Sao_Paulo',
        enable_conversation_activity: leadSquaredHook.settings.enable_conversation_activity ?? true,
        enable_transcript_activity: leadSquaredHook.settings.enable_transcript_activity ?? false,
        enable_contact_sync: leadSquaredHook.settings.enable_contact_sync ?? false,
        enable_lead_creation: leadSquaredHook.settings.enable_lead_creation ?? false,
        enable_activity_sync: leadSquaredHook.settings.enable_activity_sync ?? false,
        enable_opportunity_sync: leadSquaredHook.settings.enable_opportunity_sync ?? false,
        conversation_activity_score: leadSquaredHook.settings.conversation_activity_score || '10',
        transcript_activity_score: leadSquaredHook.settings.transcript_activity_score || '5',
        conversation_activity_code: leadSquaredHook.settings.conversation_activity_code || 100,
        transcript_activity_code: leadSquaredHook.settings.transcript_activity_code || 101,
      });
    } else {
      setFormData({
        access_key: '',
        secret_key: '',
        endpoint_url: '',
        app_url: '',
        host_url: '',
        timezone: 'America/Sao_Paulo',
        enable_conversation_activity: true,
        enable_transcript_activity: false,
        enable_contact_sync: false,
        enable_lead_creation: false,
        enable_activity_sync: false,
        enable_opportunity_sync: false,
        conversation_activity_score: '10',
        transcript_activity_score: '5',
        conversation_activity_code: 100,
        transcript_activity_code: 101,
      });
    }
    setErrors({});
  }, [hook, open]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.access_key.trim()) {
      newErrors.access_key = t('leadSquared.modal.fields.accessKey.required');
    }

    if (!formData.secret_key.trim()) {
      newErrors.secret_key = t('leadSquared.modal.fields.secretKey.required');
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

  const openLeadSquaredDoc = () => {
    window.open('https://apidocs.leadsquared.com/', '_blank');
  };

  const saving = loading || submitting;

  const setSecret = (field: 'access_key' | 'secret_key', value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const activities = [
    {
      kind: 'conversation',
      toggle: 'enable_conversation_activity',
      score: 'conversation_activity_score',
      code: 'conversation_activity_code',
      i18n: 'conversationActivity',
    },
    {
      kind: 'transcript',
      toggle: 'enable_transcript_activity',
      score: 'transcript_activity_score',
      code: 'transcript_activity_code',
      i18n: 'transcriptActivity',
    },
  ] as const;

  return (
    <AgentIntegrationDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={<Building2 className="text-muted-foreground" />}
      title={hook ? t('leadSquared.modal.updateTitle') : t('leadSquared.modal.title')}
      description={t('leadSquared.modal.description')}
      className="sm:max-w-2xl"
      footerStart={
        <Button type="button" variant="ghost" onClick={openLeadSquaredDoc}>
          <ExternalLink />
          {t('leadSquared.modal.actions.documentation')}
        </Button>
      }
      footer={
        <>
          <DialogClose render={<Button type="button" variant="ghost" />} disabled={saving}>
            {t('leadSquared.modal.actions.cancel')}
          </DialogClose>
          <Button type="submit" form={formId} loading={saving}>
            {saving
              ? t('leadSquared.modal.actions.saving')
              : hook
                ? t('leadSquared.modal.actions.update')
                : t('leadSquared.modal.actions.configure')}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        {/* API configuration */}
        <section className="flex flex-col gap-4">
          <h3 className="font-medium text-sm">{t('leadSquared.modal.apiConfig')}</h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field invalid={Boolean(errors.access_key)}>
              <FieldLabel htmlFor="leadsquared-access-key">
                {t('leadSquared.modal.fields.accessKey.label')}{' '}
                <span className="text-destructive-foreground">*</span>
              </FieldLabel>
              <SecretInput
                id="leadsquared-access-key"
                placeholder={t('leadSquared.modal.fields.accessKey.placeholder')}
                value={formData.access_key}
                onChange={e => setSecret('access_key', e.target.value)}
                aria-invalid={errors.access_key ? true : undefined}
              />
              {errors.access_key && <FieldError match>{errors.access_key}</FieldError>}
            </Field>

            <Field invalid={Boolean(errors.secret_key)}>
              <FieldLabel htmlFor="leadsquared-secret-key">
                {t('leadSquared.modal.fields.secretKey.label')}{' '}
                <span className="text-destructive-foreground">*</span>
              </FieldLabel>
              <SecretInput
                id="leadsquared-secret-key"
                placeholder={t('leadSquared.modal.fields.secretKey.placeholder')}
                value={formData.secret_key}
                onChange={e => setSecret('secret_key', e.target.value)}
                aria-invalid={errors.secret_key ? true : undefined}
              />
              {errors.secret_key && <FieldError match>{errors.secret_key}</FieldError>}
            </Field>

            <Field>
              <FieldLabel htmlFor="leadsquared-endpoint-url">
                {t('leadSquared.modal.fields.endpointUrl.label')}
              </FieldLabel>
              <Input
                id="leadsquared-endpoint-url"
                placeholder={t('leadSquared.modal.fields.endpointUrl.placeholder')}
                value={formData.endpoint_url}
                onChange={e => setFormData(prev => ({ ...prev, endpoint_url: e.target.value }))}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="leadsquared-app-url">{t('leadSquared.modal.fields.appUrl.label')}</FieldLabel>
              <Input
                id="leadsquared-app-url"
                placeholder={t('leadSquared.modal.fields.appUrl.placeholder')}
                value={formData.app_url}
                onChange={e => setFormData(prev => ({ ...prev, app_url: e.target.value }))}
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="leadsquared-timezone">{t('leadSquared.modal.fields.timezone.label')}</FieldLabel>
            <Select
              items={TIMEZONE_OPTIONS}
              value={formData.timezone}
              onValueChange={value => value && setFormData(prev => ({ ...prev, timezone: value as string }))}
            >
              <SelectTrigger id="leadsquared-timezone">
                <SelectValue placeholder={t('leadSquared.modal.fields.timezone.placeholder')} />
              </SelectTrigger>
              <SelectPopup>
                {TIMEZONE_OPTIONS.map(timezone => (
                  <SelectItem key={timezone.value} value={timezone.value}>
                    {timezone.label}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          </Field>
        </section>

        {/* Activity settings */}
        <section className="flex flex-col gap-3">
          <h3 className="font-medium text-sm">{t('leadSquared.modal.activitySettings')}</h3>
          {activities.map(activity => {
            const enabled = Boolean(formData[activity.toggle]);
            const base = `leadSquared.modal.fields.${activity.i18n}`;
            return (
              <div key={activity.kind} className="flex flex-col gap-3">
                <SettingRow
                  htmlFor={activity.toggle}
                  title={t(`${base}.label`)}
                  description={t(`${base}.description`)}
                  control={
                    <Switch
                      id={activity.toggle}
                      checked={enabled}
                      onCheckedChange={checked => setFormData(prev => ({ ...prev, [activity.toggle]: checked }))}
                    />
                  }
                />
                {enabled && (
                  <div className="ms-4 grid gap-4 border-s-2 ps-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor={activity.score}>{t(`${base}.score`)}</FieldLabel>
                      <Input
                        id={activity.score}
                        placeholder={t(`${base}.scorePlaceholder`)}
                        value={formData[activity.score]}
                        onChange={e => setFormData(prev => ({ ...prev, [activity.score]: e.target.value }))}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={activity.code}>{t(`${base}.code`)}</FieldLabel>
                      <Input
                        id={activity.code}
                        type="number"
                        placeholder={t(`${base}.codePlaceholder`)}
                        value={formData[activity.code]}
                        onChange={e =>
                          setFormData(prev => ({ ...prev, [activity.code]: parseInt(e.target.value) || 0 }))
                        }
                      />
                    </Field>
                  </div>
                )}
              </div>
            );
          })}
        </section>

        <IntegrationNotice variant="warning" title={t('leadSquared.modal.security.title')}>
          {t('leadSquared.modal.security.description')}
        </IntegrationNotice>
      </form>
    </AgentIntegrationDialog>
  );
}
