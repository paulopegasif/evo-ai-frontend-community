import { useState, useEffect, useId } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DialogClose } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Webhook } from '@/types/integrations';
import { AgentIntegrationDialog, SettingRow } from '../../agentConfig/AgentIntegrationDialog';
import IntegrationNotice from '../../shared/IntegrationNotice';

interface WebhookModalProps {
  webhook?: Webhook | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isNew?: boolean;
  loading?: boolean;
}

const EVENT_IDS = [
  // Conversation Events
  'conversation_created',
  'conversation_updated',
  'conversation_status_changed',
  'conversation_typing_on',
  'conversation_typing_off',
  // Contact Events
  'contact_created',
  'contact_updated',
  // Message Events
  'message_created',
  'message_updated',
  // Inbox Events
  'inbox_created',
  'inbox_updated',
  // Webwidget Events
  'webwidget_triggered',
  // Pipeline Item Events
  'pipeline_item.created',
  'pipeline_item.updated',
  'pipeline_item.completed',
  'pipeline_item.cancelled',
  // Pipeline Task Events
  'pipeline_task.created',
  'pipeline_task.updated',
  'pipeline_task.completed',
  'pipeline_task.overdue',
  'pipeline_task.cancelled'
];

export default function WebhookModal({ webhook, open, onOpenChange, onSubmit, loading: submitting = false }: WebhookModalProps) {
  const { t } = useLanguage('integrations');
  const formId = useId();

  const AVAILABLE_EVENTS = EVENT_IDS.map(id => ({
    id,
    name: t(`webhooks.modal.eventTypes.${id}.name`),
    description: t(`webhooks.modal.eventTypes.${id}.description`)
  }));

  const [formData, setFormData] = useState({
    url: '',
    enabled: true,
    subscriptions: [] as string[],
    description: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (webhook) {
      setFormData({
        url: webhook.url || '',
        enabled: webhook.enabled ?? true,
        subscriptions: webhook.subscriptions || [],
        description: webhook.description || ''
      });
    } else {
      setFormData({
        url: '',
        enabled: true,
        subscriptions: [],
        description: ''
      });
    }
    setErrors({});
  }, [webhook, open]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.url.trim()) {
      newErrors.url = t('webhooks.modal.fields.url.required');
    } else if (!isValidUrl(formData.url)) {
      newErrors.url = t('webhooks.modal.fields.url.invalid');
    }

    if (formData.subscriptions.length === 0) {
      newErrors.subscriptions = t('webhooks.modal.fields.subscriptions.required');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (string: string) => {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      await onSubmit(formData);
    } catch {
      // Error is handled by parent component
    }
  };

  const updateField = (field: 'url' | 'description', value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleEventToggle = (eventId: string, checked: boolean) => {
    if (errors.subscriptions) setErrors(prev => ({ ...prev, subscriptions: '' }));
    setFormData(prev => ({
      ...prev,
      subscriptions: checked
        ? [...prev.subscriptions, eventId]
        : prev.subscriptions.filter(id => id !== eventId)
    }));
  };

  const handleSelectAll = () => {
    if (errors.subscriptions) setErrors(prev => ({ ...prev, subscriptions: '' }));
    const allEventIds = AVAILABLE_EVENTS.map(e => e.id);
    const allSelected = allEventIds.every(id => formData.subscriptions.includes(id));

    setFormData(prev => ({
      ...prev,
      subscriptions: allSelected ? [] : allEventIds
    }));
  };

  const allSelected = AVAILABLE_EVENTS.every(e => formData.subscriptions.includes(e.id));

  return (
    <AgentIntegrationDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={<Globe className="text-muted-foreground" />}
      title={webhook ? t('webhooks.modal.updateTitle') : t('webhooks.modal.title')}
      className="sm:max-w-2xl"
      footer={
        <>
          <DialogClose render={<Button type="button" variant="ghost" />} disabled={submitting}>
            {t('webhooks.modal.actions.cancel')}
          </DialogClose>
          <Button type="submit" form={formId} loading={submitting}>
            {submitting
              ? t('webhooks.modal.actions.saving')
              : webhook
                ? t('webhooks.modal.actions.update')
                : t('webhooks.modal.actions.create')}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        {/* Basic configuration */}
        <section className="flex flex-col gap-4">
          <h3 className="font-medium text-sm">{t('webhooks.modal.basicConfig')}</h3>

          <Field invalid={Boolean(errors.url)}>
            <FieldLabel htmlFor="webhook-url">
              {t('webhooks.modal.fields.url.label')} <span className="text-destructive-foreground">*</span>
            </FieldLabel>
            <Input
              id="webhook-url"
              type="url"
              inputMode="url"
              placeholder={t('webhooks.modal.fields.url.placeholder')}
              value={formData.url}
              onChange={e => updateField('url', e.target.value)}
              aria-invalid={errors.url ? true : undefined}
              autoFocus={!webhook}
            />
            {errors.url ? (
              <FieldError match>{errors.url}</FieldError>
            ) : (
              <FieldDescription>{t('webhooks.modal.fields.url.hint')}</FieldDescription>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="webhook-description">{t('webhooks.modal.fields.description.label')}</FieldLabel>
            <Textarea
              id="webhook-description"
              placeholder={t('webhooks.modal.fields.description.placeholder')}
              value={formData.description}
              onChange={e => updateField('description', e.target.value)}
              rows={3}
            />
          </Field>

          <SettingRow
            htmlFor="webhook-enabled"
            title={t('webhooks.modal.fields.enabled.label')}
            description={t('webhooks.modal.fields.enabled.description')}
            control={
              <Switch
                id="webhook-enabled"
                checked={formData.enabled}
                onCheckedChange={checked => setFormData(prev => ({ ...prev, enabled: checked }))}
              />
            }
          />
        </section>

        {/* Events */}
        <section className="flex flex-col gap-3" aria-labelledby={`${formId}-events`}>
          <div className="flex items-center justify-between gap-2">
            <h3 id={`${formId}-events`} className="flex items-center gap-2 font-medium text-sm">
              {t('webhooks.modal.events')}
              <Badge variant={formData.subscriptions.length ? 'secondary' : 'outline'} size="sm">
                {formData.subscriptions.length}/{AVAILABLE_EVENTS.length}
              </Badge>
            </h3>
            <Button type="button" variant="ghost" size="sm" onClick={handleSelectAll}>
              {allSelected
                ? t('webhooks.modal.eventList.deselectAll')
                : t('webhooks.modal.eventList.selectAll')}
            </Button>
          </div>

          {errors.subscriptions && (
            <IntegrationNotice variant="error">{errors.subscriptions}</IntegrationNotice>
          )}

          <div
            className={`divide-y overflow-hidden rounded-lg border bg-card ${
              errors.subscriptions ? 'border-destructive/36' : ''
            }`}
          >
            {AVAILABLE_EVENTS.map(event => {
              const checked = formData.subscriptions.includes(event.id);
              return (
                <label
                  key={event.id}
                  className="flex cursor-pointer items-start gap-3 px-3.5 py-3 transition-colors hover:bg-accent/50"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={value => handleEventToggle(event.id, value)}
                    className="mt-0.5"
                  />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-medium text-sm">{event.name}</span>
                    <span className="text-muted-foreground text-xs">{event.description}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </section>

        <IntegrationNotice variant="info" title={t('webhooks.modal.info.title')}>
          {t('webhooks.modal.info.description')}
        </IntegrationNotice>
      </form>
    </AgentIntegrationDialog>
  );
}
