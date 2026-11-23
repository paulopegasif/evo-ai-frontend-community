import { Field, FieldLabel } from '@/components/ui/field';
import OptionSelect from '../ui/OptionSelect';
import { LabelNode } from '@/types/analytics';
import { Label as LabelType } from '@/types/settings';
import { useLanguage } from '@/hooks/useLanguage';

interface LabelConditionEditorProps {
  condition: LabelNode;
  availableLabels: LabelType[];
  loadingLabels: boolean;
  selectedLabelId: string;
  labelConditionType: 'has' | 'not_has';
  onLabelIdChange: (labelId: string) => void;
  onConditionTypeChange: (type: 'has' | 'not_has') => void;
  onUpdate: (condition: LabelNode) => void;
  onLoadLabels: () => void;
}

export default function LabelConditionEditor({
  condition,
  availableLabels,
  loadingLabels,
  selectedLabelId,
  labelConditionType,
  onLabelIdChange,
  onConditionTypeChange,
  onUpdate,
  onLoadLabels,
}: LabelConditionEditorProps) {
  const { t } = useLanguage('segments');
  const handleLabelChange = (labelId: string) => {
    onLabelIdChange(labelId);
    const updatedCondition = {
      ...condition,
      labelId,
    };
    onUpdate(updatedCondition);
  };

  const handleConditionChange = (newCondition: 'has' | 'not_has') => {
    onConditionTypeChange(newCondition);
    const updatedCondition = {
      ...condition,
      condition: newCondition,
    };
    onUpdate(updatedCondition);
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field>
        <FieldLabel htmlFor={`label-cond-${condition.id}`}>{t('labelEditor.label')}</FieldLabel>
        <OptionSelect
          id={`label-cond-${condition.id}`}
          value={selectedLabelId}
          onValueChange={handleLabelChange}
          onOpenChange={open => {
            if (open && availableLabels.length === 0) {
              onLoadLabels();
            }
          }}
          placeholder={loadingLabels ? t('labelEditor.loading') : t('labelEditor.selectLabel')}
          empty={!loadingLabels ? t('labelEditor.noLabels') : undefined}
          options={availableLabels.map(label => ({ value: label.title, label: label.title }))}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={`label-op-${condition.id}`}>{t('labelEditor.condition')}</FieldLabel>
        <OptionSelect
          id={`label-op-${condition.id}`}
          value={labelConditionType}
          onValueChange={v => handleConditionChange(v as 'has' | 'not_has')}
          options={[
            { value: 'has', label: t('labelEditor.has') },
            { value: 'not_has', label: t('labelEditor.notHas') },
          ]}
        />
      </Field>
    </div>
  );
}
