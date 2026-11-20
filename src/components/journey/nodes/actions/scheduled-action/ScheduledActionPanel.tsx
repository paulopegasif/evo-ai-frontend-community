import { useEffect, useMemo, useState } from 'react';
import { Clock } from 'lucide-react';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { NodeConfigModal } from '@/components/journey/shared/NodeConfigModal';
import { FlowFeedbackBanner } from '@/components/journey/_ui';
import { useLanguage } from '@/hooks/useLanguage';
import { journeyService } from '@/services/journeys';
import InboxesService from '@/services/channels/inboxesService';
import type { Journey } from '@/types/automation';
import type { Inbox } from '@/types/channels/inbox';
import { ScheduledActionNodeData } from './ScheduledActionNode';

const WEBHOOK_METHOD_ITEMS = ['GET', 'POST', 'PUT', 'DELETE'].map(method => ({
  value: method,
  label: method,
}));

interface ScheduledActionPanelProps {
  nodeId: string;
  data: ScheduledActionNodeData;
  onUpdate: (nodeId: string, newData: ScheduledActionNodeData) => void;
  onClose: () => void;
}

const CHANNEL_TYPE_MAP: Record<string, string> = {
  'Channel::WhatsappCloud': 'whatsapp',
  'Channel::Sms': 'sms',
  'Channel::Email': 'email',
  'Channel::Telegram': 'telegram',
};

const getChannelDisplayName = (channelType: string): string => {
  const simpleType = CHANNEL_TYPE_MAP[channelType];
  switch (simpleType) {
    case 'whatsapp':
      return 'WhatsApp';
    case 'sms':
      return 'SMS';
    case 'email':
      return 'Email';
    case 'telegram':
      return 'Telegram';
    default:
      return channelType;
  }
};

export function ScheduledActionPanel({
  nodeId,
  data,
  onUpdate,
  onClose,
}: ScheduledActionPanelProps) {
  const { t } = useLanguage('journey');
  const initialFormData: ScheduledActionNodeData = {
    label: data.label || 'Schedule Action',
    delayDuration: data.delayDuration || 1,
    delayUnit: data.delayUnit || 'hours',
    actionType: data.actionType || '',
    actionConfig: data.actionConfig || {},
    retryPolicy: data.retryPolicy || { maxRetries: 0, backoffMultiplier: 1 },
    createScheduledAction: data.createScheduledAction || true,
    notifyUserId: data.notifyUserId,
  };
  const [originalData] = useState<ScheduledActionNodeData>(() => initialFormData);
  const [formData, setFormData] = useState<ScheduledActionNodeData>(initialFormData);
  const [error] = useState<string | null>(null);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loadingJourneys, setLoadingJourneys] = useState(false);
  const [availableInboxes, setAvailableInboxes] = useState<Inbox[]>([]);
  const [loadingInboxes, setLoadingInboxes] = useState(false);

  useEffect(() => {
    setFormData({
      label: data.label || 'Schedule Action',
      delayDuration: data.delayDuration || 1,
      delayUnit: data.delayUnit || 'hours',
      actionType: data.actionType || '',
      actionConfig: data.actionConfig || {},
      retryPolicy: data.retryPolicy || { maxRetries: 0, backoffMultiplier: 1 },
      createScheduledAction: data.createScheduledAction || true,
      notifyUserId: data.notifyUserId,
    });
  }, [data]);

  useEffect(() => {
    const loadJourneys = async () => {
      try {
        setLoadingJourneys(true);
        const response = await journeyService.getJourneys();
        setJourneys(response.data || []);
      } catch (err) {
        console.error('Error loading journeys:', err);
      } finally {
        setLoadingJourneys(false);
      }
    };

    loadJourneys();
  }, []);

  useEffect(() => {
    const fetchInboxes = async () => {
      setLoadingInboxes(true);
      try {
        const response = await InboxesService.list();
        const inboxes = response.data || [];

        const messagingInboxes = inboxes.filter(inbox => {
          const channelType = inbox.channel_type;
          return Object.keys(CHANNEL_TYPE_MAP).includes(channelType);
        });

        setAvailableInboxes(messagingInboxes);
      } catch (error) {
        console.error('Error fetching inboxes:', error);
      } finally {
        setLoadingInboxes(false);
      }
    };

    fetchInboxes();
  }, []);

  const handleSave = () => {
    onUpdate(nodeId, formData);
    onClose();
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      delayDuration: parseInt(e.target.value) || 0,
    });
  };

  const handleUnitChange = (value: string) => {
    setFormData({
      ...formData,
      delayUnit: value as 'minutes' | 'hours' | 'days' | 'weeks',
    });
  };

  const handleActionTypeChange = (value: string) => {
    setFormData({
      ...formData,
      actionType: value,
      actionConfig: {},
    });
  };

  const handleSendMessageChange = (channel: string, message: string) => {
    setFormData({
      ...formData,
      actionConfig: {
        ...formData.actionConfig,
        channel,
        message,
      },
    });
  };

  const handleWebhookChange = (webhook_url: string, method?: string, data?: object) => {
    setFormData({
      ...formData,
      actionConfig: {
        ...formData.actionConfig,
        webhook_url,
        method: method || 'POST',
        data: data || {},
      },
    });
  };

  const handleTriggerJourneyChange = (journey_id: string) => {
    setFormData({
      ...formData,
      actionConfig: {
        ...formData.actionConfig,
        journey_id,
      },
    });
  };

  const handleCreateTaskChange = (task_title: string, task_description?: string) => {
    setFormData({
      ...formData,
      actionConfig: {
        ...formData.actionConfig,
        task_title,
        task_description: task_description || undefined,
      },
    });
  };

  const isDelayConfigured = formData.delayDuration && formData.delayUnit;
  const isActionConfigured = () => {
    if (!formData.actionType) return false;

    switch (formData.actionType) {
      case 'send_message':
        return (
          formData.actionConfig?.channel &&
          formData.actionConfig?.message &&
          formData.actionConfig.message.trim().length > 0
        );
      case 'execute_webhook':
        return (
          formData.actionConfig?.webhook_url && formData.actionConfig?.webhook_url.trim().length > 0
        );
      case 'trigger_journey':
        return (
          formData.actionConfig?.journey_id && formData.actionConfig.journey_id.trim().length > 0
        );
      case 'create_task':
        return (
          formData.actionConfig?.task_title && formData.actionConfig.task_title.trim().length > 0
        );
      default:
        return false;
    }
  };

  const isConfigured = Boolean(isDelayConfigured && isActionConfigured());
  const dirty = useMemo(
    () => JSON.stringify(formData) !== JSON.stringify(originalData),
    [formData, originalData],
  );

  const unitItems = (['minutes', 'hours', 'days', 'weeks'] as const).map(unit => ({
    value: unit,
    label: t(`panels.scheduledAction.units.${unit}`),
  }));
  const actionTypeItems = (
    ['send_message', 'execute_webhook', 'trigger_journey', 'create_task'] as const
  ).map(action => ({ value: action, label: t(`panels.scheduledAction.actions.${action}`) }));
  const channelItems = availableInboxes.flatMap(inbox => {
    const channelValue = CHANNEL_TYPE_MAP[inbox.channel_type];
    return channelValue
      ? [
          {
            value: channelValue,
            label: `${inbox.name} (${getChannelDisplayName(inbox.channel_type)})`,
          },
        ]
      : [];
  });

  return (
    <NodeConfigModal
      open
      variant="simple"
      title={t('panels.scheduledAction.title')}
      icon={<Clock className="h-5 w-5 text-flow-node-action-webhook-fg" />}
      onCancel={onClose}
      onSave={handleSave}
      dirty={dirty && isConfigured}
      saveLabel={t('panels.actions.save')}
      cancelLabel={t('panels.actions.cancel')}
      savingAriaLabel={t('modal.actions.saving')}
    >
      <div className="space-y-4">
        {error && (
          <FlowFeedbackBanner variant="error">
            <p>{error}</p>
          </FlowFeedbackBanner>
        )}

        <Field>
          <FieldLabel>{t('panels.scheduledAction.delayDuration')}</FieldLabel>
          <div className="flex w-full gap-2">
            <Input
              type="number"
              min="1"
              max="999"
              value={formData.delayDuration || ''}
              onChange={handleDurationChange}
              placeholder="1"
              className="flex-1"
            />
            <Select
              items={unitItems}
              value={formData.delayUnit || 'hours'}
              onValueChange={v => handleUnitChange(String(v ?? ''))}
            >
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectPopup alignItemWithTrigger={false}>
                {unitItems.map(item => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          </div>
        </Field>

        <Separator />

        <Field>
          <FieldLabel>{t('panels.scheduledAction.actionType')}</FieldLabel>
          <Select
            items={actionTypeItems}
            value={formData.actionType || null}
            onValueChange={v => handleActionTypeChange(String(v ?? ''))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('panels.scheduledAction.placeholders.selectAction')} />
            </SelectTrigger>
            <SelectPopup alignItemWithTrigger={false}>
              {actionTypeItems.map(item => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </Field>

        {formData.actionType === 'send_message' && (
          <>
            <Separator />
            <div className="space-y-3">
              <Field>
                <FieldLabel>{t('panels.scheduledAction.labels.channel')}</FieldLabel>
                <Select
                  items={channelItems}
                  value={formData.actionConfig?.channel || null}
                  onValueChange={value =>
                    handleSendMessageChange(
                      String(value ?? ''),
                      formData.actionConfig?.message || '',
                    )
                  }
                  disabled={loadingInboxes || availableInboxes.length === 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        loadingInboxes
                          ? t('panels.scheduledAction.placeholders.loadingChannels')
                          : t('panels.scheduledAction.placeholders.selectChannel')
                      }
                    />
                  </SelectTrigger>
                  <SelectPopup alignItemWithTrigger={false}>
                    {availableInboxes.length === 0 && !loadingInboxes && (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        {t('panels.scheduledAction.messages.noChannelsConfiguredInline')}
                      </div>
                    )}
                    {availableInboxes.map(inbox => {
                      const channelValue = CHANNEL_TYPE_MAP[inbox.channel_type];
                      if (!channelValue) return null;

                      return (
                        <SelectItem key={inbox.id} value={channelValue}>
                          {inbox.name} ({getChannelDisplayName(inbox.channel_type)})
                        </SelectItem>
                      );
                    })}
                  </SelectPopup>
                </Select>
                {availableInboxes.length === 0 && !loadingInboxes && (
                  <FlowFeedbackBanner variant="warn">
                    <p className="text-sm">
                      {t('panels.scheduledAction.messages.noChannelsConfigured')}
                    </p>
                  </FlowFeedbackBanner>
                )}
              </Field>
              <Field>
                <FieldLabel>{t('panels.scheduledAction.labels.message')}</FieldLabel>
                <Textarea
                  value={formData.actionConfig?.message || ''}
                  onChange={e =>
                    handleSendMessageChange(formData.actionConfig?.channel || '', e.target.value)
                  }
                  placeholder={t('panels.scheduledAction.placeholders.message')}
                  rows={3}
                  className="font-mono"
                />
                <FieldDescription>
                  {t('panels.scheduledAction.hints.characterCount', {
                    count: formData.actionConfig?.message?.length || 0,
                  })}
                </FieldDescription>
              </Field>
            </div>
          </>
        )}

        {formData.actionType === 'execute_webhook' && (
          <>
            <Separator />
            <div className="space-y-3">
              <Field>
                <FieldLabel>{t('panels.scheduledAction.labels.webhookUrl')}</FieldLabel>
                <Input
                  type="url"
                  value={formData.actionConfig?.webhook_url || ''}
                  onChange={e =>
                    handleWebhookChange(
                      e.target.value,
                      formData.actionConfig?.webhook_method || 'POST',
                    )
                  }
                  placeholder={t('panels.scheduledAction.placeholders.webhookUrl')}
                />
              </Field>
              <Field>
                <FieldLabel>{t('panels.scheduledAction.labels.webhookMethod')}</FieldLabel>
                <Select
                  items={WEBHOOK_METHOD_ITEMS}
                  value={formData.actionConfig?.webhook_method || 'POST'}
                  onValueChange={v =>
                    handleWebhookChange(formData.actionConfig?.webhook_url || '', String(v ?? ''))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopup alignItemWithTrigger={false}>
                    {WEBHOOK_METHOD_ITEMS.map(item => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              </Field>
            </div>
          </>
        )}

        {formData.actionType === 'trigger_journey' && (
          <>
            <Separator />
            <Field>
              <FieldLabel>{t('panels.scheduledAction.labels.journeyId')}</FieldLabel>
              <Select
                items={journeys.map(journey => ({
                  value: String(journey.id),
                  label: journey.name,
                }))}
                value={formData.actionConfig?.journey_id || null}
                onValueChange={v => handleTriggerJourneyChange(String(v ?? ''))}
                disabled={loadingJourneys}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      loadingJourneys
                        ? t('panels.scheduledAction.placeholders.loadingJourneys')
                        : t('panels.scheduledAction.placeholders.journeyId')
                    }
                  />
                </SelectTrigger>
                <SelectPopup alignItemWithTrigger={false}>
                  {journeys.map(journey => (
                    <SelectItem key={journey.id} value={String(journey.id)}>
                      {journey.name}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
              <FieldDescription>{t('panels.scheduledAction.hints.journeyId')}</FieldDescription>
            </Field>
          </>
        )}

        {formData.actionType === 'create_task' && (
          <>
            <Separator />
            <div className="space-y-3">
              <Field>
                <FieldLabel>{t('panels.scheduledAction.labels.taskTitle')}</FieldLabel>
                <Input
                  type="text"
                  value={formData.actionConfig?.task_title || ''}
                  onChange={e =>
                    handleCreateTaskChange(
                      e.target.value,
                      formData.actionConfig?.task_description || '',
                    )
                  }
                  placeholder={t('panels.scheduledAction.placeholders.taskTitle')}
                />
              </Field>
              <Field>
                <FieldLabel>{t('panels.scheduledAction.labels.taskDescription')}</FieldLabel>
                <Textarea
                  value={formData.actionConfig?.task_description || ''}
                  onChange={e =>
                    handleCreateTaskChange(formData.actionConfig?.task_title || '', e.target.value)
                  }
                  placeholder={t('panels.scheduledAction.placeholders.taskDescription')}
                  rows={3}
                />
              </Field>
            </div>
          </>
        )}

        {!isConfigured && formData.actionType && (
          <FlowFeedbackBanner variant="warn">
            <p className="text-xs">{t('panels.scheduledAction.configure')}</p>
          </FlowFeedbackBanner>
        )}
      </div>
    </NodeConfigModal>
  );
}
