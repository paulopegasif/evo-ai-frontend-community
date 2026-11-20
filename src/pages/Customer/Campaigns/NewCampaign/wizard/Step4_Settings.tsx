import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group';
import { Radio, RadioGroup } from '@/components/ui/radio-group';
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import WizardStepLayout from './WizardStepLayout';
import { useLanguage } from '@/hooks/useLanguage';
import { ArrowRight, ArrowLeft, Clock, Zap, RotateCcw, Timer } from 'lucide-react';

interface Step4Props {
  data: {
    // Agendamento
    schedule_option: 'now' | 'later' | '';
    scheduled_date?: string;

    // Distribuição de Templates
    template_strategy?: 'round_robin' | 'weighted' | 'random' | 'ab_test';
    template_weights?: Record<string, number>;
    ab_test_percentage?: number; // % para fase de teste do A/B

    // Janelas de tempo
    use_business_hours?: boolean;
    business_hours_start?: string;
    business_hours_end?: string;
    timezone?: string;
    allowed_weekdays?: number[];

    // Técnicas
    enable_rate_limit?: boolean;
    rate_limit_per_hour?: number;
    enable_retry?: boolean;
    max_retry_attempts?: number;
    spread_sending_hours?: number;

    // A/B Test Details
    ab_test_winner_criteria?: 'open_rate' | 'click_rate';
    ab_test_schedule_option?: 'now' | 'later';
    ab_test_scheduled_date?: string;
    ab_test_skip_winner?: boolean;
    ab_test_winner_scheduled_date?: string;
    ab_test_spread_sending_hours?: number;

    // Templates selecionados (para mostrar configuração)
    template_ids?: string[];
  };
  availableTemplates?: { id: string; name: string }[];
  onChange: (data: Partial<Step4Props['data']>) => void;
  onNext: () => void;
  onBack: () => void;
}

const SPREAD_OPTIONS = [
  '0.166',
  '0.5',
  '1',
  '1.5',
  '2',
  '2.5',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '11',
  '12',
  '18',
  '24',
  '0',
];
const WEEKDAYS = [
  { id: 1, key: 'monday' },
  { id: 2, key: 'tuesday' },
  { id: 3, key: 'wednesday' },
  { id: 4, key: 'thursday' },
  { id: 5, key: 'friday' },
  { id: 6, key: 'saturday' },
  { id: 0, key: 'sunday' },
] as const;
const STRATEGIES = ['round_robin', 'weighted', 'random', 'ab_test'] as const;

/** Selectable card wrapping a radio: the whole tile is the label. */
function OptionCard({
  value,
  selected,
  icon,
  title,
  description,
}: {
  value: string;
  selected: boolean;
  icon?: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors',
        selected ? 'border-primary bg-primary/4' : 'bg-background hover:bg-accent/50',
      )}
    >
      <Radio value={value} className="mt-0.5" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-2 font-medium text-sm">
          {icon && (
            <span
              className={cn('[&_svg]:size-4', selected ? 'text-primary' : 'text-muted-foreground')}
            >
              {icon}
            </span>
          )}
          {title}
        </span>
        {description && <span className="text-muted-foreground text-xs">{description}</span>}
      </span>
    </label>
  );
}

/** Row inside the advanced options card: icon tile, title/description and a trailing control. */
function SettingRow({
  icon,
  title,
  description,
  action,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-4">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm">{title}</p>
          <p className="text-muted-foreground text-xs">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

const Step4_Settings = ({
  data,
  availableTemplates = [],
  onChange,
  onNext,
  onBack,
}: Step4Props) => {
  const { t } = useLanguage('campaigns');

  const handleNext = () => {
    const scheduleOption =
      data.template_strategy === 'ab_test' ? data.ab_test_schedule_option : data.schedule_option;
    const scheduleDate =
      data.template_strategy === 'ab_test' ? data.ab_test_scheduled_date : data.scheduled_date;

    if (!scheduleOption) return;
    if (scheduleOption === 'later' && !scheduleDate) return;

    if (
      data.template_strategy === 'ab_test' &&
      !data.ab_test_skip_winner &&
      !data.ab_test_winner_scheduled_date
    ) {
      return;
    }

    onNext();
  };

  const isAbTest = data.template_strategy === 'ab_test';

  const isScheduledValid = isAbTest
    ? (data.ab_test_schedule_option === 'now' || !!data.ab_test_scheduled_date) &&
      (data.ab_test_skip_winner || !!data.ab_test_winner_scheduled_date)
    : data.schedule_option === 'now' || !!data.scheduled_date;

  const weightTotal = Object.values(data.template_weights || {}).reduce((a, b) => a + b, 0);
  const isSplitValid = data.template_strategy === 'weighted' ? weightTotal === 100 : true;

  const isValid =
    !!(isAbTest ? data.ab_test_schedule_option : data.schedule_option) &&
    isScheduledValid &&
    isSplitValid;

  const currentScheduleOption = isAbTest ? data.ab_test_schedule_option : data.schedule_option;

  const showStrategySelector = (data.template_ids?.length || 0) > 1;
  const abPercentage = data.ab_test_percentage || 20;

  const spreadLabel = (value: string) => {
    const hours = parseFloat(value);
    if (hours === 0) return t('wizard.step4.ui.spread.none');
    if (hours < 1) return t('wizard.step4.ui.spread.minutes', { count: Math.round(hours * 60) });
    if (!Number.isInteger(hours)) {
      return t('wizard.step4.ui.spread.hoursMinutes', {
        hours: Math.floor(hours),
        minutes: Math.round((hours % 1) * 60),
      });
    }
    return t('wizard.step4.ui.spread.hours', { count: hours });
  };
  const spreadItems = SPREAD_OPTIONS.map(value => ({ value, label: spreadLabel(value) }));
  const strategyItems = STRATEGIES.map(value => ({
    value,
    label: t(`wizard.step4.ui.strategyOptions.${value}`),
  }));

  const setScheduleOption = (value: 'now' | 'later') => {
    if (isAbTest) onChange({ ab_test_schedule_option: value });
    else onChange({ schedule_option: value });
  };

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
        {showStrategySelector && (
          <Card>
            <CardHeader>
              <CardTitle>{t('wizard.step4.ui.sendStrategy')}</CardTitle>
              <CardDescription>{t('wizard.step4.ui.sendStrategyDescription')}</CardDescription>
            </CardHeader>
            <CardPanel className="flex flex-col gap-6">
              <Field>
                <FieldLabel>{t('wizard.step4.ui.distributionStrategy')}</FieldLabel>
                <Select
                  items={strategyItems}
                  value={data.template_strategy || 'round_robin'}
                  onValueChange={value =>
                    value &&
                    onChange({
                      template_strategy: value as Step4Props['data']['template_strategy'],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopup>
                    {strategyItems.map(item => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              </Field>

              {data.template_strategy === 'weighted' && (
                <div className="flex flex-col gap-3 border-t pt-4">
                  <p className="font-medium text-sm">{t('wizard.step4.ui.weightPerTemplate')}</p>
                  {data.template_ids?.map(id => {
                    const templateName =
                      availableTemplates.find(template => template.id === id)?.name ||
                      t('wizard.step4.ui.templateFallback', { id });
                    return (
                      <div
                        key={id}
                        className="flex items-center gap-4 rounded-xl border bg-muted/24 p-3"
                      >
                        <p className="min-w-0 flex-1 truncate font-medium text-sm">
                          {templateName}
                        </p>
                        <InputGroup className="w-28">
                          <InputGroupInput
                            type="number"
                            min="0"
                            max="100"
                            className="text-right tabular-nums"
                            aria-label={t('wizard.step4.ui.weightFor', { name: templateName })}
                            value={data.template_weights?.[id] || 0}
                            onChange={e => {
                              const val = parseInt(e.target.value) || 0;
                              onChange({
                                template_weights: {
                                  ...(data.template_weights || {}),
                                  [id]: val,
                                },
                              });
                            }}
                          />
                          <InputGroupAddon align="inline-end">
                            <InputGroupText>%</InputGroupText>
                          </InputGroupAddon>
                        </InputGroup>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between px-1">
                    <span className="text-muted-foreground text-xs">
                      {t('wizard.step4.ui.total')}
                    </span>
                    <span
                      className={cn(
                        'font-semibold text-sm tabular-nums',
                        weightTotal === 100 ? 'text-success-foreground' : 'text-warning-foreground',
                      )}
                    >
                      {weightTotal}%
                    </span>
                  </div>
                </div>
              )}

              {isAbTest && (
                <div className="flex flex-col gap-6 border-t pt-4">
                  <div className="flex flex-col gap-2">
                    <p className="font-medium text-sm">{t('wizard.step4.ui.winnerCriteria')}</p>
                    <RadioGroup
                      value={data.ab_test_winner_criteria || 'open_rate'}
                      onValueChange={value =>
                        onChange({
                          ab_test_winner_criteria:
                            value as Step4Props['data']['ab_test_winner_criteria'],
                        })
                      }
                      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                    >
                      <OptionCard
                        value="open_rate"
                        selected={(data.ab_test_winner_criteria || 'open_rate') === 'open_rate'}
                        title={t('wizard.step4.ui.openRate')}
                      />
                      <OptionCard
                        value="click_rate"
                        selected={data.ab_test_winner_criteria === 'click_rate'}
                        title={t('wizard.step4.ui.clickRate')}
                      />
                    </RadioGroup>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <label htmlFor="ab-test-sample" className="font-medium text-sm">
                        {t('wizard.step4.ui.testSample')}
                      </label>
                      <span className="font-semibold text-primary text-sm tabular-nums">
                        {abPercentage}%
                      </span>
                    </div>
                    <input
                      id="ab-test-sample"
                      type="range"
                      min="10"
                      max="50"
                      step="5"
                      value={abPercentage}
                      onChange={e => onChange({ ab_test_percentage: parseInt(e.target.value) })}
                      className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
                    />
                    <div className="flex justify-between text-muted-foreground text-xs tabular-nums">
                      <span>{t('wizard.step4.ui.baseMessage', { value: abPercentage / 2 })}</span>
                      <span>
                        {t('wizard.step4.ui.remainderWinner', { value: 100 - abPercentage })}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardPanel>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>
              {t('wizard.step4.scheduling')}
              <span className="ms-1 text-destructive-foreground" aria-hidden="true">
                *
              </span>
            </CardTitle>
          </CardHeader>
          <CardPanel className="flex flex-col gap-3">
            <RadioGroup
              value={currentScheduleOption || null}
              onValueChange={value => setScheduleOption(value as 'now' | 'later')}
              className="grid grid-cols-1 gap-3 sm:grid-cols-2"
            >
              <OptionCard
                value="now"
                selected={currentScheduleOption === 'now'}
                icon={<Zap />}
                title={t('wizard.step4.sendNow')}
                description={t('wizard.step4.sendNowDescription')}
              />
              <OptionCard
                value="later"
                selected={currentScheduleOption === 'later'}
                icon={<Clock />}
                title={t('wizard.step4.scheduleLater')}
                description={t('wizard.step4.scheduleLaterDescription')}
              />
            </RadioGroup>

            {currentScheduleOption === 'later' && (
              <Field className="rounded-xl border bg-muted/24 p-4">
                <FieldLabel>
                  {t('wizard.step4.dateTime')} {isAbTest ? t('wizard.step4.ui.testSuffix') : ''}
                </FieldLabel>
                <Input
                  type="datetime-local"
                  value={(isAbTest ? data.ab_test_scheduled_date : data.scheduled_date) || ''}
                  onChange={e => {
                    if (isAbTest) onChange({ ab_test_scheduled_date: e.target.value });
                    else onChange({ scheduled_date: e.target.value });
                  }}
                />
              </Field>
            )}

            {isAbTest && (
              <div className="flex flex-col gap-4 rounded-xl border bg-muted/24 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-sm">{t('wizard.step4.ui.winnerMessage')}</p>
                  <label className="flex cursor-pointer items-center gap-2 text-muted-foreground text-xs">
                    {t('wizard.step4.ui.skipWinner')}
                    <Switch
                      checked={!!data.ab_test_skip_winner}
                      onCheckedChange={v => onChange({ ab_test_skip_winner: v })}
                    />
                  </label>
                </div>

                {!data.ab_test_skip_winner && (
                  <Field>
                    <FieldLabel>{t('wizard.step4.ui.sendAt')}</FieldLabel>
                    <Input
                      type="datetime-local"
                      value={data.ab_test_winner_scheduled_date || ''}
                      onChange={e => onChange({ ab_test_winner_scheduled_date: e.target.value })}
                    />
                  </Field>
                )}
              </div>
            )}
          </CardPanel>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('wizard.step4.ui.advancedOptions')}</CardTitle>
            <CardDescription>{t('wizard.step4.ui.advancedOptionsDescription')}</CardDescription>
          </CardHeader>
          <CardPanel className="flex flex-col divide-y">
            <SettingRow
              icon={<Timer />}
              title={t('wizard.step4.ui.spreadWindow')}
              description={t('wizard.step4.ui.spreadWindowDescription')}
            >
              <Select
                items={spreadItems}
                value={String(data.spread_sending_hours || '0')}
                onValueChange={val =>
                  val != null && onChange({ spread_sending_hours: parseFloat(String(val)) })
                }
              >
                <SelectTrigger aria-label={t('wizard.step4.ui.spreadWindow')}>
                  <SelectValue placeholder={t('wizard.step4.ui.spread.none')} />
                </SelectTrigger>
                <SelectPopup>
                  {spreadItems.map(item => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </SettingRow>

            <SettingRow
              icon={<Clock />}
              title={t('wizard.step4.timeWindows')}
              description={t('wizard.step4.ui.timeWindowsHint')}
              action={
                <Switch
                  aria-label={t('wizard.step4.timeWindows')}
                  checked={!!data.use_business_hours}
                  onCheckedChange={v => onChange({ use_business_hours: v })}
                />
              }
            >
              {data.use_business_hours && (
                <div className="flex flex-col gap-4 sm:ps-11">
                  <div className="grid grid-cols-2 gap-4">
                    <Field>
                      <FieldLabel>{t('wizard.step4.start')}</FieldLabel>
                      <Input
                        type="time"
                        value={data.business_hours_start || '09:00'}
                        onChange={e => onChange({ business_hours_start: e.target.value })}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>{t('wizard.step4.end')}</FieldLabel>
                      <Input
                        type="time"
                        value={data.business_hours_end || '18:00'}
                        onChange={e => onChange({ business_hours_end: e.target.value })}
                      />
                    </Field>
                  </div>

                  <div className="flex flex-col gap-2">
                    <p className="font-medium text-sm">{t('wizard.step4.weekdays')}</p>
                    <div className="flex flex-wrap gap-2">
                      {WEEKDAYS.map(day => {
                        const isSelected = !!data.allowed_weekdays?.includes(day.id);
                        return (
                          <Button
                            key={day.id}
                            size="sm"
                            variant={isSelected ? 'default' : 'outline'}
                            aria-pressed={isSelected}
                            onClick={() => {
                              const current = data.allowed_weekdays || [];
                              const next = isSelected
                                ? current.filter(d => d !== day.id)
                                : [...current, day.id];
                              onChange({ allowed_weekdays: next });
                            }}
                          >
                            {t(`wizard.step4.${day.key}`)}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </SettingRow>

            <SettingRow
              icon={<RotateCcw />}
              title={t('wizard.step4.ui.retry')}
              description={t('wizard.step4.ui.retryDescription')}
              action={
                <Switch
                  aria-label={t('wizard.step4.ui.retry')}
                  checked={!!data.enable_retry}
                  onCheckedChange={v => onChange({ enable_retry: v })}
                />
              }
            />
          </CardPanel>
        </Card>
      </div>
    </WizardStepLayout>
  );
};

export default Step4_Settings;
