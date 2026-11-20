import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WaitNodeData } from '../WaitNode';
import {
  EventConfiguration,
  SegmentConfiguration,
  ContactConfiguration,
  LabelConfiguration,
  CustomAttributeConfiguration,
  WebhookConfiguration,
} from '../../../trigger/components';
import { useLanguage } from '@/hooks/useLanguage';

interface WaitEventConfigProps {
  data: WaitNodeData;
  onChange: (updates: Partial<WaitNodeData>) => void;
  journeyId: string;
}

export function WaitEventConfig({ data, onChange, journeyId }: WaitEventConfigProps) {
  const { t } = useLanguage('journey');
  const [eventType, setEventType] = useState(data.eventType || 'event');

  const EVENT_TYPE_OPTIONS = [
    { value: 'event', label: t('panels.waitComponents.event.types.event') },
    { value: 'segment', label: t('panels.waitComponents.event.types.segment') },
    { value: 'contactCreated', label: t('panels.waitComponents.event.types.contactCreated') },
    { value: 'contactUpdated', label: t('panels.waitComponents.event.types.contactUpdated') },
    { value: 'label', label: t('panels.waitComponents.event.types.label') },
    { value: 'customAttribute', label: t('panels.waitComponents.event.types.customAttribute') },
    { value: 'webhook', label: t('panels.waitComponents.event.types.webhook') },
  ];

  const TIME_UNIT_OPTIONS = [
    { value: 'minutes', label: t('panels.waitComponents.shared.timeUnits.minutes') },
    { value: 'hours', label: t('panels.waitComponents.shared.timeUnits.hours') },
    { value: 'days', label: t('panels.waitComponents.shared.timeUnits.days') },
  ];

  // Garantir que eventType seja sempre definido
  useEffect(() => {
    if (!data.eventType) {
      onChange({ eventType: 'event' });
    }
  }, [data.eventType, onChange]);

  const handleEventTypeChange = (value: string) => {
    setEventType(value);
    onChange({
      eventType: value,
      // Limpar dados específicos quando muda o tipo
      eventTemplate: undefined,
      eventProperties: undefined,
      segmentId: undefined,
      segmentAction: undefined,
      labelId: undefined,
      labelAction: undefined,
      attributeName: undefined,
      attributeOperator: undefined,
      attributeValue: undefined,
      webhookUrl: undefined,
      webhookHeaders: undefined,
    });
  };

  const handleFallbackChange = (checked: boolean) => {
    if (checked) {
      onChange({
        enableFallback: checked,
        fallbackTime: data.fallbackTime || 1,
        fallbackUnit: data.fallbackUnit || 'hours',
      });
    } else {
      onChange({
        enableFallback: checked,
        fallbackTime: undefined,
        fallbackUnit: undefined,
      });
    }
  };

  const handleFallbackTimeChange = (value: string) => {
    const fallbackTime = parseInt(value) || 1;
    onChange({ fallbackTime });
  };

  const handleFallbackUnitChange = (value: 'minutes' | 'hours' | 'days') => {
    onChange({ fallbackUnit: value });
  };

  const getEventSummary = () => {
    if (!eventType) return t('panels.waitComponents.event.selectEventType');

    const typeOption = EVENT_TYPE_OPTIONS.find(t => t.value === eventType);
    let summary = typeOption?.label || eventType;

    switch (eventType) {
      case 'event':
        if (data.eventTemplate) summary += `: ${data.eventTemplate}`;
        break;
      case 'segment':
        if (data.segmentId) summary += `: ${data.segmentId}`;
        break;
      case 'label':
        if (data.labelId) summary += `: ${data.labelId}`;
        break;
      case 'customAttribute':
        if (data.attributeName) summary += `: ${data.attributeName}`;
        break;
      case 'webhook':
        if (data.webhookUrl) summary += `: ${data.webhookUrl}`;
        break;
    }

    return summary;
  };

  const renderEventConfiguration = () => {
    switch (eventType) {
      case 'event':
        return (
          <EventConfiguration
            eventName={data.eventTemplate || ''}
            eventProperties={data.eventProperties || []}
            onEventNameChange={name => onChange({ eventTemplate: name })}
            onEventPropertiesChange={properties => onChange({ eventProperties: properties })}
            variableMappings={data.variableMappings || []}
            onVariableMappingsChange={mappings => onChange({ variableMappings: mappings })}
            journeyId={journeyId}
          />
        );
      case 'segment':
        return (
          <SegmentConfiguration
            segmentId={data.segmentId || ''}
            segmentAction={data.segmentAction || 'entered'}
            onSegmentIdChange={segmentId => onChange({ segmentId })}
            onSegmentActionChange={action => onChange({ segmentAction: action })}
          />
        );
      case 'contactCreated':
      case 'contactUpdated':
        return (
          <ContactConfiguration
            triggerType={eventType as 'contactCreated' | 'contactUpdated'}
            contactFields={(data.contactFields || []).map(field => ({
              field: field.field || '',
              operator: field.operator || 'equals',
              value: field.value || '',
            }))}
            onContactFieldsChange={fields => onChange({ contactFields: fields as any })}
            variableMappings={data.variableMappings || []}
            onVariableMappingsChange={mappings => onChange({ variableMappings: mappings })}
            journeyId={journeyId}
          />
        );
      case 'label':
        return (
          <LabelConfiguration
            labelId={data.labelId || ''}
            labelAction={data.labelAction || 'applied'}
            onLabelIdChange={labelId => onChange({ labelId })}
            onLabelActionChange={action => onChange({ labelAction: action })}
          />
        );
      case 'customAttribute':
        return (
          <CustomAttributeConfiguration
            attributeName={data.attributeName || ''}
            operator={data.attributeOperator || 'equals'}
            value={data.attributeValue || ''}
            onAttributeNameChange={name => onChange({ attributeName: name })}
            onOperatorChange={operator => onChange({ attributeOperator: operator })}
            onValueChange={value => onChange({ attributeValue: value })}
            variableMappings={data.variableMappings || []}
            onVariableMappingsChange={mappings => onChange({ variableMappings: mappings })}
            journeyId={journeyId}
          />
        );
      case 'webhook':
        return (
          <WebhookConfiguration
            webhookUrl={data.webhookUrl || ''}
            expectedHeaders={(data.webhookHeaders || []) as any}
            onWebhookUrlChange={url => onChange({ webhookUrl: url })}
            onExpectedHeadersChange={headers =>
              onChange({
                webhookHeaders: headers as any,
              })
            }
            variableMappings={data.variableMappings || []}
            onVariableMappingsChange={mappings => onChange({ variableMappings: mappings })}
            journeyId={journeyId}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Seletor de Tipo */}
      <Field>
        <FieldLabel>{t('panels.waitComponents.event.typeLabel')}</FieldLabel>
        <Select
          items={EVENT_TYPE_OPTIONS}
          value={eventType || null}
          onValueChange={value => handleEventTypeChange(String(value ?? ''))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t('panels.waitComponents.event.selectTypePlaceholder')} />
          </SelectTrigger>
          <SelectPopup alignItemWithTrigger={false}>
            {EVENT_TYPE_OPTIONS.map(option => (
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

      {/* Configuração específica do tipo */}
      {eventType && (
        <div className="flex flex-col gap-3">
          <h4 className="font-medium text-sm">
            {t('panels.waitComponents.event.configurationLabel')} -{' '}
            {EVENT_TYPE_OPTIONS.find(t => t.value === eventType)?.label}
          </h4>
          {renderEventConfiguration()}
        </div>
      )}

      {/* Caso contrário (substituindo o timeout antigo) */}
      <div className="flex flex-col gap-3 rounded-lg border bg-background p-4">
        <Label className="flex items-center gap-2 font-medium text-sm">
          <Checkbox
            checked={data.enableFallback || false}
            onCheckedChange={checked => handleFallbackChange(checked)}
          />
          {t('panels.waitComponents.event.fallbackLabel')}
        </Label>

        <p className="text-xs text-muted-foreground pl-6">
          {t('panels.waitComponents.event.fallbackDescription')}
        </p>

        {data.enableFallback && (
          <div className="grid grid-cols-2 gap-3 pl-6">
            <Field>
              <FieldLabel className="text-xs">
                {t('panels.waitComponents.event.fallbackTimeLabel')}
              </FieldLabel>
              <Input
                type="number"
                min="1"
                value={data.fallbackTime || 1}
                onChange={e => handleFallbackTimeChange(e.target.value)}
                placeholder={t('panels.waitComponents.event.fallbackTimePlaceholder')}
              />
            </Field>
            <Field>
              <FieldLabel className="text-xs">
                {t('panels.waitComponents.event.fallbackUnitLabel')}
              </FieldLabel>
              <Select
                items={TIME_UNIT_OPTIONS}
                value={data.fallbackUnit || 'hours'}
                onValueChange={value =>
                  value != null && handleFallbackUnitChange(value as 'minutes' | 'hours' | 'days')
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
        )}
      </div>

      {/* Preview */}
      <div className="rounded-xl border border-success/24 bg-success/8 p-4">
        <p className="text-sm text-success-foreground">
          <strong>{t('panels.waitComponents.event.summaryLabel')}:</strong>{' '}
          {t('panels.waitComponents.event.summaryText', { event: getEventSummary() })}.
          {data.enableFallback && data.fallbackTime && data.fallbackUnit && (
            <>
              {' '}
              {t('panels.waitComponents.event.fallbackSummary', {
                time: data.fallbackTime,
                unit:
                  data.fallbackUnit === 'minutes'
                    ? t('panels.waitComponents.shared.timeUnits.minutes')
                    : data.fallbackUnit === 'hours'
                    ? t('panels.waitComponents.shared.timeUnits.hours')
                    : t('panels.waitComponents.shared.timeUnits.days'),
              })}
              .
            </>
          )}
        </p>
      </div>
    </div>
  );
}
