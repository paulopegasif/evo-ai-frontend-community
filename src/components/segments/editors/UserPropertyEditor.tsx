import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import OptionSelect from '../ui/OptionSelect';
import { UserPropertyNode } from '@/types/analytics';
import { useLanguage } from '@/hooks/useLanguage';

interface UserPropertyEditorProps {
  condition: UserPropertyNode;
  operatorType: string;
  operatorValue: string;
  onOperatorTypeChange: (type: string) => void;
  onOperatorValueChange: (value: string) => void;
  onUpdate: (condition: UserPropertyNode) => void;
}

const getUserProperties = (t: (key: string) => string) => [
  { value: 'contact.name', label: t('userPropertyEditor.properties.name') },
  { value: 'contact.email', label: t('userPropertyEditor.properties.email') },
  { value: 'contact.phone_number', label: t('userPropertyEditor.properties.phone') },
  { value: 'contact.inbox', label: t('userPropertyEditor.properties.inbox') },
  { value: 'contact.last_name', label: t('userPropertyEditor.properties.lastName') },
  { value: 'contact.location', label: t('userPropertyEditor.properties.location') },
  { value: 'contact.country_code', label: t('userPropertyEditor.properties.countryCode') },
  { value: 'contact.identifier', label: t('userPropertyEditor.properties.identifier') },
  { value: 'contact.contact_type', label: t('userPropertyEditor.properties.contactType') },
  { value: 'contact.blocked', label: t('userPropertyEditor.properties.blocked') },
  { value: 'contact.last_activity_at', label: t('userPropertyEditor.properties.lastActivity') },
  { value: 'contact.created_at', label: t('userPropertyEditor.properties.created') },
  { value: 'contact.updated_at', label: t('userPropertyEditor.properties.updated') },
];

const getOperators = (t: (key: string) => string) => [
  { value: 'Equals', label: t('operators.equals') },
  { value: 'NotEquals', label: t('operators.notEquals') },
  { value: 'Contains', label: t('operators.contains') },
  { value: 'NotContains', label: t('operators.notContains') },
  { value: 'Exists', label: t('operators.exists') },
  { value: 'NotExists', label: t('operators.notExists') },
];

export default function UserPropertyEditor({
  condition,
  operatorType,
  operatorValue,
  onOperatorTypeChange,
  onOperatorValueChange,
  onUpdate,
}: UserPropertyEditorProps) {
  const { t } = useLanguage('segments');
  const userProperties = getUserProperties(t);
  const operators = getOperators(t);
  const handlePropertyPathChange = (newPath: string) => {
    const updatedCondition = {
      ...condition,
      path: newPath,
    };
    onUpdate(updatedCondition);
  };

  const showValue = operatorType !== 'Exists' && operatorType !== 'NotExists';

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field>
        <FieldLabel htmlFor={`up-path-${condition.id}`}>{t('userPropertyEditor.propertyPath')}</FieldLabel>
        <OptionSelect
          id={`up-path-${condition.id}`}
          value={condition.path || ''}
          onValueChange={handlePropertyPathChange}
          placeholder={t('userPropertyEditor.selectProperty')}
          groups={[
            { key: 'basic', label: t('userPropertyEditor.categories.basicInfo') },
            { key: 'meta', label: t('userPropertyEditor.categories.metadata') },
          ]}
          options={userProperties.map((prop, i) => ({
            value: prop.value,
            label: prop.label,
            group: i < 6 ? 'basic' : 'meta',
          }))}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={`up-op-${condition.id}`}>{t('userPropertyEditor.operator')}</FieldLabel>
        <OptionSelect id={`up-op-${condition.id}`} value={operatorType} onValueChange={onOperatorTypeChange} options={operators} />
      </Field>

      {showValue && (
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor={`up-val-${condition.id}`}>{t('userPropertyEditor.value')}</FieldLabel>
          <Input
            id={`up-val-${condition.id}`}
            value={operatorValue}
            onChange={e => onOperatorValueChange(e.target.value)}
            placeholder={t('userPropertyEditor.valuePlaceholder')}
          />
        </Field>
      )}
    </div>
  );
}
