import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from '@/components/ui/empty';
import { Radio, RadioGroup } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import {
  ArrowRight,
  ArrowLeft,
  FileText,
  Inbox as InboxIcon,
  Mail,
  MessageCircle,
  Smartphone,
} from 'lucide-react';
import WizardStepLayout from './WizardStepLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/hooks/useLanguage';
import { CampaignChannelType } from '@/types/campaigns';
import InboxesService from '@/services/channels/inboxesService';
import MessageTemplateService from '@/services/channels/messageTemplatesService';
import type { Inbox } from '@/types/channels/inbox';
import type { MessageTemplate } from '@/types/channels/inbox';

interface Step3Props {
  data: {
    channel_type: CampaignChannelType | '';
    inbox_id: string;
    template_ids: string[];
  };
  onChange: (data: Partial<Step3Props['data']>) => void;
  onNext: () => void;
  onBack: () => void;
}

const Step3_Content = ({ data, onChange, onNext, onBack }: Step3Props) => {
  const { t } = useLanguage('campaigns');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [inboxes, setInboxes] = useState<Inbox[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loadingInboxes, setLoadingInboxes] = useState(true);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Fetch inboxes on mount
  useEffect(() => {
    const fetchInboxes = async () => {
      try {
        const response = await InboxesService.list();
        setInboxes(response.data || []);
      } catch (error) {
        console.error('Error fetching inboxes:', error);
        setInboxes([]);
      } finally {
        setLoadingInboxes(false);
      }
    };

    fetchInboxes();
  }, []);

  // Fetch templates when an inbox is selected
  useEffect(() => {
    if (!data.inbox_id) {
      setTemplates([]);
      return;
    }

    const fetchTemplates = async () => {
      setLoadingTemplates(true);
      try {
        const response = await MessageTemplateService.getTemplates(data.inbox_id, { active: true });
        setTemplates(response.data || []);
      } catch (error) {
        console.error('Error fetching templates:', error);
        setTemplates([]);
      } finally {
        setLoadingTemplates(false);
      }
    };

    fetchTemplates();
  }, [data.inbox_id]);

  const handleSelectInbox = (inboxId: string) => {
    const selectedInbox = inboxes.find(inbox => inbox.id === inboxId);

    if (selectedInbox) {
      // Map channel type to CampaignChannelType
      let channelType: CampaignChannelType = CampaignChannelType.WHATSAPP;
      if (selectedInbox.channel_type?.toLowerCase().includes('email')) {
        channelType = CampaignChannelType.EMAIL;
      } else if (selectedInbox.channel_type?.toLowerCase().includes('sms')) {
        channelType = CampaignChannelType.SMS;
      }

      onChange({
        inbox_id: inboxId,
        channel_type: channelType,
        template_ids: [], // Reset templates when inbox changes
      });
    }
  };

  const handleToggleTemplate = (templateId: string) => {
    const currentIds = data.template_ids || [];
    const newIds = currentIds.includes(templateId)
      ? currentIds.filter(id => id !== templateId)
      : [...currentIds, templateId];

    onChange({ template_ids: newIds });
  };

  const handleNext = () => {
    const newErrors: Record<string, string> = {};

    if (!data.inbox_id) {
      newErrors.inbox_id = t('wizard.validation.inboxRequired');
    }

    if (!data.template_ids || data.template_ids.length === 0) {
      newErrors.template_ids = t('wizard.validation.templateRequired');
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onNext();
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      onboarding: 'text-info-foreground bg-info/8',
      promocional: 'text-violet-700 bg-violet-500/10 dark:text-violet-300',
      transacional: 'text-warning-foreground bg-warning/8',
      feedback: 'text-success-foreground bg-success/8',
      informativo: 'text-cyan-700 bg-cyan-500/10 dark:text-cyan-300',
    };
    return colors[category] || 'text-muted-foreground bg-muted/48';
  };

  const getChannelName = (channelType: string) => {
    switch (channelType) {
      case CampaignChannelType.WHATSAPP:
        return 'WhatsApp';
      case CampaignChannelType.EMAIL:
        return 'Email';
      case CampaignChannelType.SMS:
        return 'SMS';
      default:
        return 'Desconhecido';
    }
  };

  // Filter inboxes by selected channel type
  const filteredInboxes = data.channel_type
    ? inboxes.filter(inbox => {
        const channelType = inbox.channel_type?.toLowerCase() || '';
        if (data.channel_type === CampaignChannelType.WHATSAPP) {
          return channelType.includes('whatsapp');
        } else if (data.channel_type === CampaignChannelType.EMAIL) {
          return channelType.includes('email');
        } else if (data.channel_type === CampaignChannelType.SMS) {
          return channelType.includes('sms') || channelType.includes('twilio');
        }
        return false;
      })
    : [];

  const isValid = !!data.inbox_id && data.template_ids?.length > 0;

  const channelOptions = [
    {
      type: CampaignChannelType.WHATSAPP,
      icon: MessageCircle,
      name: 'WhatsApp',
      tint: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400',
    },
    {
      type: CampaignChannelType.EMAIL,
      icon: Mail,
      name: 'Email',
      tint: 'bg-sky-500/12 text-sky-600 dark:text-sky-400',
    },
    {
      type: CampaignChannelType.SMS,
      icon: Smartphone,
      name: 'SMS',
      tint: 'bg-violet-500/12 text-violet-600 dark:text-violet-400',
    },
  ];
  const required = (
    <span className="ms-1 text-destructive-foreground" aria-hidden="true">
      *
    </span>
  );
  const emptyBlock = (icon: React.ReactNode, text: string) => (
    <Empty className="rounded-xl border border-dashed py-8">
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon}</EmptyMedia>
        <EmptyDescription>{text}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );

  return (
    <WizardStepLayout
      footer={
        <>
          <Button variant="ghost" className="me-auto" onClick={onBack}>
            <ArrowLeft />
            {t('wizard.actions.back')}
          </Button>
          <Button onClick={handleNext} disabled={!isValid}>
            {t('wizard.actions.continue')}
            <ArrowRight />
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>
              {t('wizard.step3.channelLabel')}
              {required}
            </CardTitle>
            <CardDescription>{t('wizard.step3.channelDescription')}</CardDescription>
          </CardHeader>
          <CardPanel className="flex flex-col gap-6">
            <div className="grid grid-cols-3 gap-3">
              {channelOptions.map(channel => {
                const Icon = channel.icon;
                const isSelected = data.channel_type === channel.type;
                return (
                  <button
                    key={channel.type}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onChange({ channel_type: channel.type, inbox_id: '' })}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-xl border p-4 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                      isSelected
                        ? 'border-primary bg-primary/4'
                        : 'bg-background hover:bg-accent/50',
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-10 items-center justify-center rounded-lg',
                        channel.tint,
                      )}
                    >
                      <Icon className="size-5" />
                    </span>
                    <span className="font-medium text-sm">{channel.name}</span>
                  </button>
                );
              })}
            </div>

            {data.channel_type && (
              <div className="flex flex-col gap-3">
                <div>
                  <p className="font-medium text-sm">
                    {t('wizard.step3.inboxLabel', { channel: getChannelName(data.channel_type) })}
                    {required}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {t('wizard.step3.inboxDescription')}
                  </p>
                </div>
                {loadingInboxes ? (
                  <div className="flex flex-col gap-2" aria-busy="true">
                    <Skeleton className="h-16 w-full rounded-xl" />
                    <Skeleton className="h-16 w-full rounded-xl" />
                  </div>
                ) : filteredInboxes.length === 0 ? (
                  emptyBlock(
                    <InboxIcon />,
                    t('wizard.step3.noInboxes', 'No inboxes available for this channel'),
                  )
                ) : (
                  <RadioGroup
                    value={data.inbox_id || null}
                    onValueChange={value => value != null && handleSelectInbox(String(value))}
                    className="flex flex-col gap-2"
                  >
                    {filteredInboxes.map(inbox => {
                      const inboxId = inbox.id.toString();
                      const selected = data.inbox_id === inboxId;
                      return (
                        <label
                          key={inbox.id}
                          className={cn(
                            'flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors',
                            selected ? 'border-primary bg-primary/4' : 'hover:bg-accent/50',
                          )}
                        >
                          <Radio value={inboxId} className="mt-0.5" />
                          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className="flex items-center justify-between gap-2">
                              <span className="truncate font-medium text-sm">{inbox.name}</span>
                              {inbox.phone_number && (
                                <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
                                  {inbox.phone_number}
                                </span>
                              )}
                            </span>
                            <span className="text-muted-foreground text-xs capitalize">
                              {inbox.channel_type}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </RadioGroup>
                )}
              </div>
            )}
            {errors.inbox_id && (
              <p className="text-destructive-foreground text-sm">{errors.inbox_id}</p>
            )}
          </CardPanel>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {t('wizard.step3.templatesLabel')}
              {required}
            </CardTitle>
            <CardDescription>
              {t('wizard.step3.templatesSelected', { count: data.template_ids?.length || 0 })}
            </CardDescription>
          </CardHeader>
          <CardPanel className="flex flex-col gap-2">
            {!data.inbox_id ? (
              emptyBlock(
                <InboxIcon />,
                t('wizard.step3.selectInboxFirst', 'Please select an inbox first'),
              )
            ) : loadingTemplates ? (
              <div className="flex flex-col gap-2" aria-busy="true">
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
              </div>
            ) : templates.length === 0 ? (
              emptyBlock(
                <FileText />,
                t('wizard.step3.noTemplates', 'No templates available for this inbox'),
              )
            ) : (
              templates.map(template => {
                if (!template.id) return null;
                const templateId = template.id.toString();
                const checked = !!data.template_ids?.includes(templateId);
                return (
                  <label
                    key={template.id}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors',
                      checked ? 'border-primary bg-primary/4' : 'hover:bg-accent/50',
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => handleToggleTemplate(templateId)}
                      className="mt-0.5"
                    />
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium text-sm">{template.name}</span>
                        {template.category && (
                          <Badge
                            variant="outline"
                            size="sm"
                            className={cn(
                              'border-transparent',
                              getCategoryColor(template.category),
                            )}
                          >
                            {template.category}
                          </Badge>
                        )}
                      </span>
                      <span className="line-clamp-2 text-muted-foreground text-sm">
                        {template.content || t('wizard.step3.noContentPreview')}
                      </span>
                    </span>
                  </label>
                );
              })
            )}
            {errors.template_ids && (
              <p className="text-destructive-foreground text-sm">{errors.template_ids}</p>
            )}
          </CardPanel>
        </Card>
      </div>
    </WizardStepLayout>
  );
};

export default Step3_Content;
