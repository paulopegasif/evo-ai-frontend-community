import { Field, FieldLabel } from '@/components/ui/field';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/hooks/useLanguage';

interface TriggerTypeSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function TriggerTypeSelector({ value, onChange }: TriggerTypeSelectorProps) {
  const { t } = useLanguage('journey');

  const typeItems = [
    'manual',
    'event',
    'segment',
    'webhook',
    'contactCreated',
    'contactUpdated',
    'label',
    'customAttribute',
    'pipelineStageChanged',
  ].map(type => ({ value: type, label: t(`triggerComponents.types.${type}`) }));

  return (
    <Field>
      <FieldLabel>{t('triggerComponents.triggerType')}</FieldLabel>
      <Select items={typeItems} value={value || null} onValueChange={v => onChange(String(v ?? ''))}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={t('triggerComponents.selectType')} />
        </SelectTrigger>
        <SelectPopup alignItemWithTrigger={false}>
          {typeItems.map(item => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
    </Field>
  );
}
