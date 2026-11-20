import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WaitNodeData } from '../WaitNode';
import { VariableInput } from '@/components/journey/environment-manager';
import { useLanguage } from '@/hooks/useLanguage';

interface WaitTimeConfigProps {
  data: WaitNodeData;
  onChange: (updates: Partial<WaitNodeData>) => void;
  journeyId: string;
}

export function WaitTimeConfig({ data, onChange, journeyId }: WaitTimeConfigProps) {
  const { t } = useLanguage('journey');

  const TIME_UNIT_OPTIONS = [
    { value: 'minutes', label: t('panels.waitComponents.shared.timeUnits.minutes') },
    { value: 'hours', label: t('panels.waitComponents.shared.timeUnits.hours') },
    { value: 'days', label: t('panels.waitComponents.shared.timeUnits.days') },
  ];
  const handleDurationChange = (value: string) => {
    const duration = parseInt(value) || 1;
    onChange({ duration });
  };

  const handleTimeUnitChange = (value: 'minutes' | 'hours' | 'days') => {
    onChange({ timeUnit: value });
  };

  const getTimeUnitLabel = (unit: string, duration: number) => {
    if (duration === 1) {
      switch (unit) {
        case 'minutes':
          return t('panels.waitComponents.shared.timeUnitsSingular.minute');
        case 'hours':
          return t('panels.waitComponents.shared.timeUnitsSingular.hour');
        case 'days':
          return t('panels.waitComponents.shared.timeUnitsSingular.day');
        default:
          return unit;
      }
    } else {
      switch (unit) {
        case 'minutes':
          return t('panels.waitComponents.shared.timeUnits.minutes');
        case 'hours':
          return t('panels.waitComponents.shared.timeUnits.hours');
        case 'days':
          return t('panels.waitComponents.shared.timeUnits.days');
        default:
          return unit;
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Duração */}
      <Field className="items-stretch">
        <FieldLabel>
          {t('panels.waitComponents.time.durationLabel')}
        </FieldLabel>
        <VariableInput
          type="number"
          min="1"
          value={data.duration?.toString() || '1'}
          onChange={e => handleDurationChange(e.target.value)}
          placeholder={t('panels.waitComponents.time.durationPlaceholder')}
          className="w-full"
          journeyId={journeyId}
          onVariableInsert={variable => {
            console.log('Variable inserted in wait duration:', variable);
          }}
        />
        <FieldDescription>{t('panels.waitComponents.time.variableHint')}</FieldDescription>
      </Field>

      {/* Unidade de Tempo */}
      <Field>
        <FieldLabel>
          {t('panels.waitComponents.time.timeUnitLabel')}
        </FieldLabel>
        <Select
          items={TIME_UNIT_OPTIONS}
          value={data.timeUnit || 'minutes'}
          onValueChange={value =>
            value != null && handleTimeUnitChange(value as 'minutes' | 'hours' | 'days')
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t('panels.waitComponents.time.timeUnitPlaceholder')} />
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

      {/* Preview */}
      <div className="rounded-xl border border-info/24 bg-info/8 p-4">
        <p className="text-sm text-info-foreground">
          <strong>{t('panels.waitComponents.time.summaryLabel')}:</strong>{' '}
          {t('panels.waitComponents.time.summaryText', {
            duration: data.duration || 1,
            timeUnit: getTimeUnitLabel(data.timeUnit || 'minutes', data.duration || 1),
          })}
        </p>
      </div>
    </div>
  );
}
