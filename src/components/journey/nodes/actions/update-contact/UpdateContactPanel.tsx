import { useEffect, useMemo, useState } from 'react';
import { Field, FieldLabel } from '@/components/ui/field';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VariableInput } from '@/components/journey/environment-manager';
import { UserCog } from 'lucide-react';
import { UpdateContactNodeData } from './UpdateContactNode';
import { NodeConfigModal } from '@/components/journey/shared/NodeConfigModal';
import { FlowFeedbackBanner } from '@/components/journey/_ui';
import { useLanguage } from '@/hooks/useLanguage';

interface UpdateContactPanelProps {
  nodeId: string;
  data: UpdateContactNodeData;
  onUpdate: (nodeId: string, newData: UpdateContactNodeData) => void;
  onClose: () => void;
  journeyId: string;
}

export function UpdateContactPanel({
  nodeId,
  data,
  onUpdate,
  onClose,
  journeyId,
}: UpdateContactPanelProps) {
  const { t } = useLanguage('journey');

  const CONTACT_FIELDS = [
    {
      id: 'name',
      label: t('panels.updateContact.fields.name'),
      placeholder: t('panels.updateContact.placeholders.name'),
    },
    {
      id: 'email',
      label: t('panels.updateContact.fields.email'),
      placeholder: t('panels.updateContact.placeholders.email'),
    },
    {
      id: 'phone_number',
      label: t('panels.updateContact.fields.phone_number'),
      placeholder: t('panels.updateContact.placeholders.phone_number'),
    },
    {
      id: 'identifier',
      label: t('panels.updateContact.fields.identifier'),
      placeholder: t('panels.updateContact.placeholders.identifier'),
    },
  ] as const;
  const [originalData] = useState<UpdateContactNodeData>(() => ({ ...data }));
  const [formData, setFormData] = useState<UpdateContactNodeData>({
    ...data,
  });

  useEffect(() => {
    setFormData(data);
  }, [data]);

  const handleSave = () => {
    onUpdate(nodeId, formData);
    onClose();
  };

  const handleFieldChange = (fieldId: string) => {
    const selectedField = CONTACT_FIELDS.find(field => field.id === fieldId);

    setFormData(prev => ({
      ...prev,
      fieldToUpdate: fieldId as UpdateContactNodeData['fieldToUpdate'],
      fieldLabel: selectedField?.label || '',
      newValue: '',
    }));
  };

  const handleValueChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      newValue: value,
    }));
  };

  const isValid = Boolean(
    formData.fieldToUpdate && formData.newValue && formData.newValue.trim() !== '',
  );
  const dirty = useMemo(
    () => JSON.stringify(formData) !== JSON.stringify(originalData),
    [formData, originalData],
  );

  return (
    <NodeConfigModal
      open
      variant="simple"
      title={t('panels.updateContact.title')}
      icon={<UserCog className="h-5 w-5 text-flow-node-control-fg" />}
      onCancel={onClose}
      onSave={handleSave}
      dirty={dirty && isValid}
      saveLabel={t('panels.updateContact.actions.save')}
      cancelLabel={t('panels.updateContact.actions.cancel')}
    >
      <div className="space-y-4">
        {!isValid && (
          <FlowFeedbackBanner variant="warn">
            <p className="font-medium">{t('panels.updateContact.incompleteConfig')}:</p>
            <ul className="text-xs mt-1 list-disc list-inside">
              {!formData.fieldToUpdate && <li>{t('panels.updateContact.selectField')}</li>}
              {!formData.newValue && formData.fieldToUpdate && (
                <li>{t('panels.updateContact.enterValue')}</li>
              )}
            </ul>
          </FlowFeedbackBanner>
        )}

        <Field>
          <FieldLabel>{t('panels.updateContact.fieldToUpdate')}</FieldLabel>
          <Select
            items={CONTACT_FIELDS.map(field => ({ value: field.id, label: field.label }))}
            value={formData.fieldToUpdate || null}
            onValueChange={value => handleFieldChange(String(value ?? ''))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('panels.updateContact.selectFieldPlaceholder')} />
            </SelectTrigger>
            <SelectPopup alignItemWithTrigger={false}>
              {CONTACT_FIELDS.map(field => (
                <SelectItem key={field.id} value={field.id}>
                  <div className="flex items-center gap-2">
                    <UserCog className="size-4 text-flow-node-control-fg" />
                    <div>
                      <div className="font-medium">{field.label}</div>
                      <div className="text-xs text-muted-foreground">{field.placeholder}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </Field>

        {formData.fieldToUpdate && (
          <Field className="items-stretch">
            <FieldLabel>{t('panels.updateContact.newValue')}</FieldLabel>
            <VariableInput
              type={
                formData.fieldToUpdate === 'email'
                  ? 'email'
                  : formData.fieldToUpdate === 'phone_number'
                  ? 'tel'
                  : 'text'
              }
              placeholder={
                CONTACT_FIELDS.find(f => f.id === formData.fieldToUpdate)?.placeholder ||
                t('panels.updateContact.enterNewValuePlaceholder')
              }
              value={formData.newValue || ''}
              onChange={e => handleValueChange(e.target.value)}
              className="w-full"
              journeyId={journeyId}
            />
          </Field>
        )}

        {isValid && (
          <FlowFeedbackBanner variant="info">
            <p className="mb-2">
              <strong>{t('panels.updateContact.preview.title')}:</strong>
            </p>
            <div className="flex items-center gap-2">
              <UserCog className="size-4" />
              <span className="font-medium">{formData.fieldLabel}</span>
              <span>→</span>
              <span className="font-medium">{formData.newValue}</span>
            </div>
            <p className="text-xs mt-2">
              {t('panels.updateContact.preview.description', {
                field: formData.fieldLabel?.toLowerCase(),
              })}
            </p>
          </FlowFeedbackBanner>
        )}

        <FlowFeedbackBanner variant="info">
          <p>
            <strong>{t('panels.updateContact.help.title')}:</strong>{' '}
            {t('panels.updateContact.help.description')}
          </p>
        </FlowFeedbackBanner>
      </div>
    </NodeConfigModal>
  );
}
