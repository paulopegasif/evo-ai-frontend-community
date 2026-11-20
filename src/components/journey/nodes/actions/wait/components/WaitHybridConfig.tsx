import { useState } from 'react';
import { Field, FieldLabel } from '@/components/ui/field';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs';
import { WaitNodeData } from '../WaitNode';
import { WaitEventConfig } from './WaitEventConfig';
import { WaitConditionConfig } from './WaitConditionConfig';
import { VariableInput } from '@/components/journey/environment-manager';
import { useLanguage } from '@/hooks/useLanguage';

interface WaitHybridConfigProps {
  data: WaitNodeData;
  onChange: (updates: Partial<WaitNodeData>) => void;
  journeyId: string;
}

export function WaitHybridConfig({ data, onChange, journeyId }: WaitHybridConfigProps) {
  const { t } = useLanguage('journey');
  const [triggerType, setTriggerType] = useState<'event' | 'condition'>(
    data.eventTemplate ? 'event' : 'condition',
  );

  const TIME_UNIT_OPTIONS = [
    { value: 'minutes', label: t('panels.waitComponents.shared.timeUnits.minutes') },
    { value: 'hours', label: t('panels.waitComponents.shared.timeUnits.hours') },
    { value: 'days', label: t('panels.waitComponents.shared.timeUnits.days') },
  ];

  const handleMaxWaitTimeChange = (value: string) => {
    const maxWaitTime = parseInt(value) || 1;
    onChange({ maxWaitTime });
  };

  const handleMaxWaitUnitChange = (value: 'minutes' | 'hours' | 'days') => {
    onChange({ maxWaitUnit: value });
  };

  const handleTriggerTypeChange = (type: 'event' | 'condition') => {
    setTriggerType(type);

    // Limpar dados do tipo anterior
    if (type === 'event') {
      onChange({
        conditionType: undefined,
        conditionField: undefined,
        conditionOperator: undefined,
        conditionValue: undefined,
      });
    } else {
      onChange({
        eventTemplate: undefined,
        eventProperties: undefined,
      });
    }
  };

  const getTriggerSummary = () => {
    if (triggerType === 'event') {
      if (!data.eventType) return t('panels.waitComponents.hybrid.configureEvent');
      const eventTypeLabels: Record<string, string> = {
        event: t('panels.waitComponents.event.types.event'),
        segment: t('panels.waitComponents.event.types.segment'),
        contactCreated: t('panels.waitComponents.event.types.contactCreated'),
        contactUpdated: t('panels.waitComponents.event.types.contactUpdated'),
        label: t('panels.waitComponents.event.types.label'),
        customAttribute: t('panels.waitComponents.event.types.customAttribute'),
        webhook: t('panels.waitComponents.event.types.webhook'),
      };
      return eventTypeLabels[data.eventType] || data.eventType;
    } else if (triggerType === 'condition' && data.conditionField) {
      return t('panels.waitComponents.hybrid.conditionSummary', { field: data.conditionField });
    }
    return t('panels.waitComponents.hybrid.configureTrigger');
  };

  const getTimeSummary = () => {
    if (data.maxWaitTime && data.maxWaitUnit) {
      const unit =
        data.maxWaitTime === 1
          ? data.maxWaitUnit === 'minutes'
            ? t('panels.waitComponents.shared.timeUnitsSingular.minute')
            : data.maxWaitUnit === 'hours'
            ? t('panels.waitComponents.shared.timeUnitsSingular.hour')
            : t('panels.waitComponents.shared.timeUnitsSingular.day')
          : data.maxWaitUnit === 'minutes'
          ? t('panels.waitComponents.shared.timeUnits.minutes')
          : data.maxWaitUnit === 'hours'
          ? t('panels.waitComponents.shared.timeUnits.hours')
          : t('panels.waitComponents.shared.timeUnits.days');
      return `${data.maxWaitTime} ${unit}`;
    }
    return t('panels.waitComponents.hybrid.configureMaxTime');
  };

  return (
    <div className="space-y-4">
      {/* Tempo Máximo de Espera (obrigatório) */}
      <div className="flex flex-col gap-3 rounded-lg border bg-background p-4">
        <h4 className="font-medium text-sm">{t('panels.waitComponents.hybrid.maxWaitTimeLabel')}</h4>

        <div className="grid grid-cols-2 gap-3">
          <Field className="items-stretch">
            <FieldLabel className="text-xs">{t('panels.waitComponents.hybrid.timeLabel')}</FieldLabel>
            <VariableInput
              type="number"
              min="1"
              value={data.maxWaitTime?.toString() || '1'}
              onChange={e => handleMaxWaitTimeChange(e.target.value)}
              placeholder={t('panels.waitComponents.hybrid.timePlaceholder')}
              journeyId={journeyId}
              onVariableInsert={variable => {
                console.log('Variable inserted in hybrid max wait time:', variable);
              }}
            />
          </Field>
          <Field>
            <FieldLabel className="text-xs">{t('panels.waitComponents.hybrid.unitLabel')}</FieldLabel>
            <Select
              items={TIME_UNIT_OPTIONS}
              value={data.maxWaitUnit || 'hours'}
              onValueChange={value =>
                value != null && handleMaxWaitUnitChange(value as 'minutes' | 'hours' | 'days')
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectPopup alignItemWithTrigger={false}>
                {TIME_UNIT_OPTIONS.map(option => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          </Field>
        </div>
      </div>

      {/* Condição ou Evento */}
      <div className="flex flex-col gap-3">
        <h4 className="font-medium text-sm">{t('panels.waitComponents.hybrid.stopConditionLabel')}</h4>

        <Tabs
          value={triggerType}
          onValueChange={value => handleTriggerTypeChange(String(value) as 'event' | 'condition')}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTab value="event">{t('panels.waitComponents.hybrid.tabs.event')}</TabsTab>
            <TabsTab value="condition">
              {t('panels.waitComponents.hybrid.tabs.condition')}
            </TabsTab>
          </TabsList>

          <TabsPanel value="event" className="mt-4">
            <WaitEventConfig
              data={{ ...data, hasTimeout: false }} // Remove timeout pois já está configurado acima
              onChange={onChange}
              journeyId={journeyId}
            />
          </TabsPanel>

          <TabsPanel value="condition" className="mt-4">
            <WaitConditionConfig
              data={{ ...data, hasTimeout: false }} // Remove timeout pois já está configurado acima
              onChange={onChange}
              journeyId={journeyId}
            />
          </TabsPanel>
        </Tabs>
      </div>

      {/* Preview */}
      <div className="rounded-xl border border-info/24 bg-info/8 p-4">
        <p className="text-sm text-info-foreground">
          <strong>{t('panels.waitComponents.hybrid.summaryLabel')}:</strong>{' '}
          {t('panels.waitComponents.hybrid.summaryText', {
            time: getTimeSummary(),
            trigger: getTriggerSummary(),
          })}
        </p>

        <div className="mt-2 text-xs text-info-foreground/80">
          {t('panels.waitComponents.hybrid.pathDescription1')}
          <br />
          {t('panels.waitComponents.hybrid.pathDescription2')}
        </div>
      </div>
    </div>
  );
}
