import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Megaphone,
  Users,
  MessageSquare,
  Settings2,
  Calendar,
  Zap,
  Clock,
} from 'lucide-react';
import WizardStepLayout from './WizardStepLayout';
import { Card, CardHeader, CardPanel, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { useLanguage } from '@/hooks/useLanguage';
import { useNavigate } from 'react-router-dom';

interface Step5Props {
  data: {
    // Step 1: Geral
    name: string;
    description: string;
    type: string;
    channel_type: string;

    // Step 2: Audiência
    contact_selection: string;
    segment_ids?: string[];
    tag_ids?: string[];
    estimated_contacts?: number;

    // Step 3: Conteúdo
    inbox_id: string;
    template_ids: string[];

    // Configurações
    schedule_option: string;
    scheduled_date?: string;
    template_strategy?: string;
    template_weights?: Record<string, number>;
    use_business_hours?: boolean;
    business_hours_start?: string;
    business_hours_end?: string;
    allowed_weekdays?: number[];
    enable_rate_limit?: boolean;
    enable_retry?: boolean;
    spread_sending_hours?: number;

    // A/B Test Details
    ab_test_winner_criteria?: string;
    ab_test_schedule_option?: string;
    ab_test_scheduled_date?: string;
    ab_test_skip_winner?: boolean;
    ab_test_winner_scheduled_date?: string;
    ab_test_spread_sending_hours?: number;
    ab_test_percentage?: number;
  };
  availableTemplates?: { id: string; name: string }[];
  onBack: () => void;
  onCreate: () => Promise<void>;
  isEditMode?: boolean;
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-4">
          {icon}
        </span>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardPanel className="flex flex-col gap-3 text-sm">{children}</CardPanel>
    </Card>
  );
}
function Row({
  label,
  children,
  icon,
}: {
  label: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-2 text-muted-foreground [&_svg]:size-4">
        {icon}
        {label}
      </span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

const Step5_Review = ({
  data,
  availableTemplates = [],
  onBack,
  onCreate,
  isEditMode = false,
}: Step5Props) => {
  const { t, currentLanguage } = useLanguage('campaigns');
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      await onCreate();
      setIsSuccess(true);
    } catch (error) {
      console.error('Erro ao criar campanha:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // SUCCESS STATE
  if (isSuccess) {
    return (
      <div className="flex h-full items-center justify-center p-4 md:p-6">
        <Card className="w-full max-w-lg">
          <Empty className="py-10">
            <EmptyHeader>
              <EmptyMedia variant="icon" className="bg-success/8 text-success">
                <CheckCircle2 />
              </EmptyMedia>
              <EmptyTitle>
                {isEditMode ? t('wizard.success.updatedTitle') : t('wizard.success.createdTitle')}
              </EmptyTitle>
              <EmptyDescription>
                {isEditMode
                  ? t('wizard.success.updatedDescription')
                  : t('wizard.success.createdDescription')}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent className="max-w-sm">
              <ul className="flex w-full flex-col gap-2 rounded-xl border bg-muted/24 p-4 text-left text-sm">
                <li className="font-medium">{t('wizard.success.nextSteps')}</li>
                {(['track', 'monitor', 'pause'] as const).map(key => (
                  <li key={key} className="flex items-start gap-2 text-muted-foreground">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" />
                    <span>{t(`wizard.success.steps.${key}`)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex w-full flex-col-reverse gap-2 sm:flex-row">
                <Button variant="outline" className="flex-1" onClick={() => navigate('/campaigns')}>
                  {t('wizard.success.viewCampaigns')}
                </Button>
                <Button className="flex-1" onClick={() => window.location.reload()}>
                  {isEditMode ? t('wizard.success.keepEditing') : t('wizard.success.newCampaign')}
                </Button>
              </div>
            </EmptyContent>
          </Empty>
        </Card>
      </div>
    );
  }

  const formatDate = (value?: string) =>
    value ? new Date(value).toLocaleString(currentLanguage) : t('wizard.step5.notAvailable');
  const strategyLabel = (strategy: string) =>
    ['round_robin', 'weighted', 'random', 'ab_test'].includes(strategy)
      ? t(`wizard.step4.ui.strategyOptions.${strategy}`)
      : strategy;
  const weekdays = [
    { id: 1, key: 'monday' },
    { id: 2, key: 'tuesday' },
    { id: 3, key: 'wednesday' },
    { id: 4, key: 'thursday' },
    { id: 5, key: 'friday' },
    { id: 6, key: 'saturday' },
    { id: 0, key: 'sunday' },
  ];

  return (
    <WizardStepLayout
      footer={
        <>
          <Button variant="ghost" className="me-auto" onClick={onBack} disabled={isCreating}>
            <ArrowLeft />
            {t('wizard.actions.back')}
          </Button>
          <Button onClick={handleCreate} loading={isCreating}>
            {isEditMode ? t('wizard.actions.save') : t('wizard.actions.create')}
            {!isCreating && <Check />}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section icon={<Megaphone />} title={t('wizard.step5.general')}>
          <Row label={t('wizard.step5.name')}>{data.name}</Row>
          {data.description && (
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">{t('wizard.step5.description')}</span>
              <p className="rounded-lg border bg-muted/24 p-3 text-muted-foreground">
                {data.description}
              </p>
            </div>
          )}
          <Row label={t('wizard.step5.channelAndType')}>
            <span className="inline-flex items-center gap-1.5">
              <Badge variant="info" size="sm" className="uppercase">
                {data.channel_type}
              </Badge>
              <Badge variant="secondary" size="sm" className="uppercase">
                {data.type}
              </Badge>
            </span>
          </Row>
        </Section>

        <Section icon={<Users />} title={t('wizard.step5.audience')}>
          <Row label={t('wizard.step5.selection')}>
            <span className="capitalize">{data.contact_selection}</span>
          </Row>
          {data.estimated_contacts && (
            <div className="flex items-center justify-between rounded-lg border bg-muted/24 p-3">
              <span className="text-muted-foreground">{t('wizard.step5.estimatedContacts')}</span>
              <span className="font-semibold text-lg tabular-nums">
                {data.estimated_contacts.toLocaleString(currentLanguage)}
              </span>
            </div>
          )}
        </Section>

        <Section icon={<MessageSquare />} title={t('wizard.step5.content')}>
          <Row label={t('wizard.step5.inbox')}>
            {data.inbox_id ? t('wizard.step5.inboxSelected') : t('wizard.step5.noneSelected')}
          </Row>
          <Row label={t('wizard.step5.templates')}>
            {t('wizard.step5.templatesSelected', { count: data.template_ids.length })}
          </Row>
        </Section>

        <Section icon={<Settings2 />} title={t('wizard.step5.settings')}>
          {data.template_strategy !== 'ab_test' ? (
            <>
              <Row icon={<Calendar />} label={t('wizard.step5.scheduling')}>
                {data.schedule_option === 'now'
                  ? t('wizard.step5.sendImmediately')
                  : formatDate(data.scheduled_date)}
              </Row>
              {data.template_strategy && (
                <Row label={t('wizard.step5.distributionStrategy')}>
                  {strategyLabel(data.template_strategy)}
                </Row>
              )}
              {data.template_strategy === 'weighted' && data.template_ids && (
                <div className="flex flex-col gap-2 rounded-xl border border-dashed p-3">
                  <span className="text-muted-foreground text-xs">
                    {t('wizard.step5.weightsPerTemplate')}
                  </span>
                  {data.template_ids.map(id => {
                    const templateName =
                      availableTemplates.find(template => template.id === id)?.name ||
                      t('wizard.step4.ui.templateFallback', { id });
                    const weight = data.template_weights?.[id] || 0;
                    return (
                      <div key={id} className="flex items-center justify-between gap-3">
                        <span className="min-w-0 truncate text-muted-foreground">
                          {templateName}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                            <span
                              className="block h-full bg-primary"
                              style={{ width: `${weight}%` }}
                            />
                          </span>
                          <span className="w-10 text-right font-medium tabular-nums">
                            {weight}%
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              <Row label={t('wizard.step5.winnerCriteria')}>
                {data.ab_test_winner_criteria === 'open_rate'
                  ? t('wizard.step4.ui.openRate')
                  : t('wizard.step4.ui.clickRate')}
              </Row>
              <Row label={t('wizard.step5.sampleSize')}>
                {t('wizard.step5.sampleOfContacts', { value: data.ab_test_percentage })}
              </Row>
              <div className="flex flex-col gap-2 rounded-xl border bg-muted/24 p-3">
                <Row icon={<Calendar />} label={t('wizard.step5.testPhase')}>
                  {data.ab_test_schedule_option === 'now'
                    ? t('wizard.step5.immediate')
                    : formatDate(data.ab_test_scheduled_date)}
                </Row>
                {data.ab_test_skip_winner ? (
                  <p className="flex items-center gap-2 text-warning-foreground text-xs">
                    <Settings2 className="size-3.5" />
                    {t('wizard.step5.winnerNotAutomatic')}
                  </p>
                ) : (
                  <Row icon={<CheckCircle2 />} label={t('wizard.step5.winnerSend')}>
                    {data.ab_test_winner_scheduled_date
                      ? formatDate(data.ab_test_winner_scheduled_date)
                      : t('wizard.step5.manual')}
                  </Row>
                )}
              </div>
            </>
          )}

          <div className="flex flex-col gap-3 border-t pt-3">
            {data.spread_sending_hours !== undefined && data.spread_sending_hours > 0 && (
              <Row icon={<Zap />} label={t('wizard.step5.sendInterval')}>
                {data.spread_sending_hours}h
              </Row>
            )}
            {data.use_business_hours ? (
              <div className="flex flex-col gap-2">
                <Row icon={<Clock />} label={t('wizard.step5.allowedHours')}>
                  <span className="tabular-nums">
                    {data.business_hours_start} – {data.business_hours_end}
                  </span>
                </Row>
                {data.allowed_weekdays && (
                  <div className="flex flex-wrap gap-1">
                    {weekdays.map(day => {
                      const active = data.allowed_weekdays?.includes(day.id);
                      return (
                        <Badge
                          key={day.id}
                          variant={active ? 'success' : 'outline'}
                          size="sm"
                          className={cn(!active && 'text-muted-foreground')}
                        >
                          {t(`wizard.step4.${day.key}`)}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <p className="flex items-center gap-2 text-muted-foreground text-xs">
                <Clock className="size-4" />
                {t('wizard.step5.noTimeRestriction')}
              </p>
            )}

            {(data.enable_rate_limit || data.enable_retry) && (
              <div className="flex flex-wrap gap-2">
                {data.enable_rate_limit && (
                  <Badge variant="info" size="sm">
                    {t('wizard.step5.rateLimit')}
                  </Badge>
                )}
                {data.enable_retry && (
                  <Badge variant="info" size="sm">
                    {t('wizard.step5.retriesEnabled')}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </Section>
      </div>
    </WizardStepLayout>
  );
};

export default Step5_Review;
