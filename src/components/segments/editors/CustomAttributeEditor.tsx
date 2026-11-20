import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import OptionSelect from '../ui/OptionSelect';
import { CustomAttributeNode } from '@/types/analytics';
import { CustomAttributeDefinition } from '@/types/settings';
import { useLanguage } from '@/hooks/useLanguage';

interface CustomAttributeEditorProps {
  condition: CustomAttributeNode;
  availableCustomAttributes: CustomAttributeDefinition[];
  loadingCustomAttributes: boolean;
  customAttributeName: string;
  customAttributeOperatorType: string;
  customAttributeValue: string;
  onAttributeNameChange: (name: string) => void;
  onOperatorTypeChange: (type: string) => void;
  onValueChange: (value: string) => void;
  onUpdate: (condition: CustomAttributeNode) => void;
  onLoadCustomAttributes: () => void;
}

const getOperators = (t: (key: string) => string) => [
  { value: 'Equals', label: t('operators.equals') },
  { value: 'NotEquals', label: t('operators.notEquals') },
  { value: 'Contains', label: t('operators.contains') },
  { value: 'NotContains', label: t('operators.notContains') },
  { value: 'Exists', label: t('operators.exists') },
  { value: 'NotExists', label: t('operators.notExists') },
];

export default function CustomAttributeEditor({
  condition,
  availableCustomAttributes,
  loadingCustomAttributes,
  customAttributeName,
  customAttributeOperatorType,
  customAttributeValue,
  onAttributeNameChange,
  onOperatorTypeChange,
  onValueChange,
  onUpdate,
  onLoadCustomAttributes,
}: CustomAttributeEditorProps) {
  const { t } = useLanguage('segments');
  const operators = getOperators(t);
  const handleAttributeNameChange = (name: string) => {
    onAttributeNameChange(name);
    const updatedCondition = {
      ...condition,
      attributeName: name,
    };
    onUpdate(updatedCondition);
  };

  const handleOperatorTypeChange = (type: string) => {
    onOperatorTypeChange(type);
    const updatedCondition = {
      ...condition,
      operator: {
        type,
        value: customAttributeValue,
      },
    };
    onUpdate(updatedCondition);
  };

  const handleValueChange = (value: string) => {
    onValueChange(value);
    const updatedCondition = {
      ...condition,
      operator: {
        type: customAttributeOperatorType,
        value,
      },
    };
    onUpdate(updatedCondition);
  };

  const showValue = customAttributeOperatorType !== 'Exists' && customAttributeOperatorType !== 'NotExists';

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field>
        <FieldLabel htmlFor={`ca-attr-${condition.id}`}>{t('customAttributeEditor.attribute')}</FieldLabel>
        <OptionSelect
          id={`ca-attr-${condition.id}`}
          value={customAttributeName}
          onValueChange={handleAttributeNameChange}
          onOpenChange={open => {
            if (open && availableCustomAttributes.length === 0) {
              onLoadCustomAttributes();
            }
          }}
          placeholder={
            loadingCustomAttributes ? t('customAttributeEditor.loading') : t('customAttributeEditor.selectAttribute')
          }
          empty={!loadingCustomAttributes ? t('customAttributeEditor.noAttributes') : undefined}
          options={availableCustomAttributes.map(attr => ({
            value: attr.attribute_key,
            label: attr.attribute_display_name,
          }))}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={`ca-op-${condition.id}`}>{t('customAttributeEditor.operator')}</FieldLabel>
        <OptionSelect
          id={`ca-op-${condition.id}`}
          value={customAttributeOperatorType}
          onValueChange={handleOperatorTypeChange}
          options={operators}
        />
      </Field>

      {showValue && (
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor={`ca-val-${condition.id}`}>{t('customAttributeEditor.value')}</FieldLabel>
          <Input
            id={`ca-val-${condition.id}`}
            value={customAttributeValue}
            onChange={e => handleValueChange(e.target.value)}
            placeholder={t('customAttributeEditor.valuePlaceholder')}
          />
        </Field>
      )}
    </div>
  );
}
