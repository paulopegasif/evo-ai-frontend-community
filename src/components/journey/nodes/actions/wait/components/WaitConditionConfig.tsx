import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WaitNodeData } from '../WaitNode';
import {
  LabelConfiguration,
  CustomAttributeConfiguration,
  ContactConfiguration,
} from '../../../trigger/components';
import { VariableSelect } from '@/components/journey/environment-manager';
import { useLanguage } from '@/hooks/useLanguage';

interface WaitConditionConfigProps {
  data: WaitNodeData;
  onChange: (updates: Partial<WaitNodeData>) => void;
  journeyId: string;
}

export function WaitConditionConfig({ data, onChange, journeyId }: WaitConditionConfigProps) {
  const { t } = useLanguage('journey');
  const [conditionType, setConditionType] = useState(data.conditionType || 'contactCreated');

  const CONDITION_TYPES = [
    { value: 'contactCreated', label: t('panels.waitComponents.condition.types.contactCreated') },
    { value: 'contactUpdated', label: t('panels.waitComponents.condition.types.contactUpdated') },
    { value: 'label', label: t('panels.waitComponents.condition.types.label') },
    { value: 'customAttribute', label: t('panels.waitComponents.condition.types.customAttribute') },
  ];

  const TIME_UNIT_OPTIONS = [
    { value: 'minutes', label: t('panels.waitComponents.shared.timeUnits.minutes') },
    { value: 'hours', label: t('panels.waitComponents.shared.timeUnits.hours') },
    { value: 'days', label: t('panels.waitComponents.shared.timeUnits.days') },
  ];

  const handleConditionTypeChange = (value: string) => {
    setConditionType(value);
    onChange({
      conditionType: value,
      // Limpar dados específicos quando muda o tipo
      conditionField: undefined,
      conditionOperator: undefined,
      conditionValue: undefined,
      labelId: undefined,
      attributeName: undefined,
      contactFields: undefined,
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

  const getConditionSummary = () => {
    if (!conditionType) return t('panels.waitComponents.condition.configureCondition');

    const typeOption = CONDITION_TYPES.find(t => t.value === conditionType);
    let summary = typeOption?.label || conditionType;

    switch (conditionType) {
      case 'contactCreated':
      case 'contactUpdated':
        if (data.contactFields && data.contactFields.length > 0) {
          summary += ` ${t('panels.waitComponents.condition.withFilters')}`;
        }
        break;
      case 'label':
        if (data.labelId) summary += `: ${data.labelId}`;
        break;
      case 'customAttribute':
        if (data.attributeName) summary += `: ${data.attributeName}`;
        break;
    }

    // Adicionar variável selecionada
    if (data.conditionValue) {
      summary += ` ${t('panels.waitComponents.condition.usingVariable')}: ${data.conditionValue}`;
    }

    return summary;
  };

  const renderConditionConfiguration = () => {
    switch (conditionType) {
      case 'contactCreated':
      case 'contactUpdated':
        return (
          <ContactConfiguration
            triggerType={conditionType as 'contactCreated' | 'contactUpdated'}
            contactFields={data.contactFields || []}
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
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Seletor de Tipo */}
      <Field>
        <FieldLabel>
          {t('panels.waitComponents.condition.typeLabel')}
        </FieldLabel>
        <Select
          items={CONDITION_TYPES}
          value={conditionType || null}
          onValueChange={value => handleConditionTypeChange(String(value ?? ''))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t('panels.waitComponents.condition.selectTypePlaceholder')} />
          </SelectTrigger>
          <SelectPopup alignItemWithTrigger={false}>
            {CONDITION_TYPES.map(option => (
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
      {conditionType && (
        <div className="flex flex-col gap-3">
          <h4 className="font-medium text-sm">
            {t('panels.waitComponents.condition.configurationLabel')} -{' '}
            {CONDITION_TYPES.find(t => t.value === conditionType)?.label}
          </h4>
          {renderConditionConfiguration()}
        </div>
      )}

      {/* Seleção de Variável para Comparação */}
      <Field className="items-stretch">
        <FieldLabel>{t('panels.waitComponents.condition.variableLabel')}</FieldLabel>
        <FieldDescription>{t('panels.waitComponents.condition.variableDescription')}</FieldDescription>
        <VariableSelect
          value={data.conditionValue || ''}
          onValueChange={variable => onChange({ conditionValue: variable })}
          placeholder={t('panels.waitComponents.condition.variablePlaceholder')}
          journeyId={journeyId}
          className="w-full"
        />
      </Field>

      {/* Caso contrário (substituindo o timeout antigo) */}
      <div className="flex flex-col gap-3 rounded-lg border bg-background p-4">
        <Label className="flex items-center gap-2 font-medium text-sm">
          <Checkbox
            checked={data.enableFallback || false}
            onCheckedChange={checked => handleFallbackChange(checked)}
          />
          {t('panels.waitComponents.condition.fallbackLabel')}
        </Label>

        <p className="text-xs text-muted-foreground pl-6">
          {t('panels.waitComponents.condition.fallbackDescription')}
        </p>

        {data.enableFallback && (
          <div className="grid grid-cols-2 gap-3 pl-6">
            <Field>
              <FieldLabel className="text-xs">
                {t('panels.waitComponents.condition.fallbackTimeLabel')}
              </FieldLabel>
              <Input
                type="number"
                min="1"
                value={data.fallbackTime || 1}
                onChange={e => handleFallbackTimeChange(e.target.value)}
                placeholder={t('panels.waitComponents.condition.fallbackTimePlaceholder')}
              />
            </Field>
            <Field>
              <FieldLabel className="text-xs">
                {t('panels.waitComponents.condition.fallbackUnitLabel')}
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
      <div className="rounded-xl border border-warning/24 bg-warning/8 p-4">
        <p className="text-sm text-warning-foreground">
          <strong>{t('panels.waitComponents.condition.summaryLabel')}:</strong>{' '}
          {t('panels.waitComponents.condition.summaryText', { condition: getConditionSummary() })}.
          {data.enableFallback && data.fallbackTime && data.fallbackUnit && (
            <>
              {' '}
              {t('panels.waitComponents.condition.fallbackSummary', {
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
