import { useEffect, useMemo, useState } from 'react';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectGroup,
  SelectGroupLabel,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Settings, Hash, Calendar } from '@/components/icons';
import { SetVariableNodeData } from './SetVariableNode';
import { NodeConfigModal } from '@/components/journey/shared/NodeConfigModal';
import { FlowFeedbackBanner } from '@/components/journey/_ui';
import { VariableInput, VariableSelect } from '@/components/journey/environment-manager';
import { useLanguage } from '@/hooks/useLanguage';

const OPERATION_GROUPS = [
  { key: 'custom', icon: Settings },
  { key: 'numeric', icon: Hash },
  { key: 'datetime', icon: Calendar },
  { key: 'functions', icon: Hash },
] as const;

interface SetVariablePanelProps {
  nodeId: string;
  data: SetVariableNodeData;
  onUpdate: (nodeId: string, newData: SetVariableNodeData) => void;
  onClose: () => void;
  journeyId: string;
}

export function SetVariablePanel({
  nodeId,
  data,
  onUpdate,
  onClose,
  journeyId,
}: SetVariablePanelProps) {
  const { t } = useLanguage('journey');

  const OPERATIONS = [
    {
      value: 'set',
      label: t('panels.setVariable.operations.set.label'),
      icon: '✏️',
      description: t('panels.setVariable.operations.set.description'),
      needsValue: true,
      category: 'custom',
    },
    {
      value: 'clear',
      label: t('panels.setVariable.operations.clear.label'),
      icon: '🧹',
      description: t('panels.setVariable.operations.clear.description'),
      needsValue: false,
      category: 'custom',
    },
    {
      value: 'increase',
      label: t('panels.setVariable.operations.increment.label'),
      icon: '➕',
      description: t('panels.setVariable.operations.increment.description'),
      needsValue: true,
      category: 'numeric',
    },
    {
      value: 'decrease',
      label: t('panels.setVariable.operations.decrement.label'),
      icon: '➖',
      description: t('panels.setVariable.operations.decrement.description'),
      needsValue: true,
      category: 'numeric',
    },
    {
      value: 'now',
      label: t('panels.setVariable.operations.now.label'),
      icon: '🕐',
      description: t('panels.setVariable.operations.now.description'),
      needsValue: false,
      category: 'datetime',
    },
    {
      value: 'yesterday',
      label: t('panels.setVariable.operations.yesterday.label'),
      icon: '📅',
      description: t('panels.setVariable.operations.yesterday.description'),
      needsValue: false,
      category: 'datetime',
    },
    {
      value: 'tomorrow',
      label: t('panels.setVariable.operations.tomorrow.label'),
      icon: '📆',
      description: t('panels.setVariable.operations.tomorrow.description'),
      needsValue: false,
      category: 'datetime',
    },
    {
      value: 'time_of_day',
      label: t('panels.setVariable.operations.timeOfDay.label'),
      icon: '🌅',
      description: t('panels.setVariable.operations.timeOfDay.description'),
      needsValue: false,
      category: 'datetime',
    },
    {
      value: 'random_id',
      label: t('panels.setVariable.operations.randomId.label'),
      icon: '🎲',
      description: t('panels.setVariable.operations.randomId.description'),
      needsValue: false,
      category: 'functions',
      needsCategory: true,
    },
  ];

  const ID_CATEGORIES = [
    { value: 'uuid', label: t('panels.setVariable.idCategories.uuid'), description: '' },
    { value: 'numeric', label: t('panels.setVariable.idCategories.numeric'), description: '' },
    {
      value: 'alphanumeric',
      label: t('panels.setVariable.idCategories.alphanumeric'),
      description: '',
    },
    { value: 'timestamp', label: t('panels.setVariable.idCategories.timestamp'), description: '' },
  ];

  const initialFormData: SetVariableNodeData = {
    variableName: '',
    operation: 'set',
    value: '',
    category: '',
    ...data,
  };
  const [originalData] = useState<SetVariableNodeData>(() => initialFormData);
  const [formData, setFormData] = useState<SetVariableNodeData>(initialFormData);

  useEffect(() => {
    setFormData({
      variableName: '',
      operation: 'set',
      value: '',
      category: '',
      ...data,
    });
  }, [data]);

  const handleSave = () => {
    onUpdate(nodeId, formData);
    onClose();
  };

  const selectedOperation = OPERATIONS.find(op => op.value === formData.operation);
  const isValid = Boolean(
    formData.variableName &&
    (!selectedOperation?.needsValue || formData.value) &&
    (!selectedOperation?.needsCategory || formData.category),
  );
  const dirty = useMemo(
    () => JSON.stringify(formData) !== JSON.stringify(originalData),
    [formData, originalData],
  );

  const renderValueInput = () => {
    if (!selectedOperation?.needsValue) return null;

    switch (formData.operation) {
      case 'increase':
      case 'decrease':
        return (
          <VariableInput
            type="number"
            min="1"
            value={formData.value || '1'}
            onChange={e => setFormData(prev => ({ ...prev, value: e.target.value }))}
            placeholder={t('panels.setVariable.placeholders.numericAmount')}
            journeyId={journeyId}
            onVariableInsert={variable => {
              console.log('Variable inserted in numeric operation:', variable);
            }}
          />
        );

      default:
        return (
          <VariableInput
            value={formData.value || ''}
            onChange={e => setFormData(prev => ({ ...prev, value: e.target.value }))}
            placeholder={t('panels.setVariable.placeholders.customValue')}
            journeyId={journeyId}
            onVariableInsert={variable => {
              console.log('Variable inserted in custom value:', variable);
            }}
          />
        );
    }
  };

  const getOperationsByCategory = () => {
    const categories: Record<string, typeof OPERATIONS> = {
      custom: [],
      numeric: [],
      datetime: [],
      functions: [],
    };

    OPERATIONS.forEach(op => {
      if (categories[op.category]) {
        categories[op.category].push(op);
      }
    });

    return categories;
  };

  const categories = getOperationsByCategory();

  return (
    <NodeConfigModal
      open
      variant="simple"
      title={t('panels.setVariable.title')}
      icon={<Settings className="h-5 w-5 text-flow-node-control-fg" />}
      onCancel={onClose}
      onSave={handleSave}
      dirty={dirty && isValid}
      saveLabel={t('panels.setVariable.buttons.save')}
      cancelLabel={t('panels.setVariable.buttons.cancel')}
    >
      <div className="space-y-4">
        {!isValid && (
          <FlowFeedbackBanner variant="warn">
            <p className="font-medium">{t('panels.setVariable.incompleteConfig')}:</p>
            <ul className="text-xs mt-1 list-disc list-inside">
              {!formData.variableName && <li>{t('panels.setVariable.enterVariableName')}</li>}
              {selectedOperation?.needsValue && !formData.value && (
                <li>{t('panels.setVariable.configureValue')}</li>
              )}
              {selectedOperation?.needsCategory && !formData.category && (
                <li>{t('panels.setVariable.selectCategory')}</li>
              )}
            </ul>
          </FlowFeedbackBanner>
        )}

        <Field className="items-stretch">
          <FieldLabel>{t('panels.setVariable.variable')}</FieldLabel>
          <VariableSelect
            value={formData.variableName || ''}
            onValueChange={value => setFormData(prev => ({ ...prev, variableName: value }))}
            journeyId={journeyId}
            placeholder={t('panels.setVariable.placeholders.variableName')}
            showCreateOption={true}
            showSystemVariables={false}
          />
          {formData.variableName && (
            <FieldDescription>
              {t('panels.setVariable.variable')}: {formData.variableName}
            </FieldDescription>
          )}
        </Field>

        <Field>
          <FieldLabel>{t('panels.setVariable.operation')}</FieldLabel>
          <Select
            items={OPERATIONS.map(op => ({ value: op.value, label: `${op.icon} ${op.label}` }))}
            value={formData.operation || 'set'}
            onValueChange={value =>
              setFormData(prev => ({
                ...prev,
                operation: String(value ?? '') as SetVariableNodeData['operation'],
              }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('panels.setVariable.placeholders.selectOperation')} />
            </SelectTrigger>
            <SelectPopup alignItemWithTrigger={false} className="max-h-[400px]">
              {OPERATION_GROUPS.map(group => (
                <SelectGroup key={group.key}>
                  <SelectGroupLabel className="flex items-center gap-2">
                    <group.icon className="size-3" />
                    {t(`panels.setVariable.operationCategories.${group.key}`)}
                  </SelectGroupLabel>
                  {categories[group.key].map(operation => (
                    <SelectItem key={operation.value} value={operation.value}>
                      <div className="flex items-center gap-2">
                        <span>{operation.icon}</span>
                        <div className="flex flex-col">
                          <span className="font-medium">{operation.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {operation.description}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectPopup>
          </Select>

          {selectedOperation && (
            <FieldDescription>{selectedOperation.description}</FieldDescription>
          )}
        </Field>

        {selectedOperation?.needsValue && (
          <Field className="items-stretch">
            <FieldLabel>
              {formData.operation === 'increase' || formData.operation === 'decrease'
                ? t('panels.setVariable.amount')
                : t('panels.setVariable.value')}
            </FieldLabel>
            {renderValueInput()}
            <FieldDescription>{t('panels.setVariable.helperTexts.customValue')}</FieldDescription>
          </Field>
        )}

        {selectedOperation?.needsCategory && (
          <Field>
            <FieldLabel>{t('panels.setVariable.idCategory')}</FieldLabel>
            <Select
              items={ID_CATEGORIES.map(category => ({
                value: category.value,
                label: category.label,
              }))}
              value={formData.category || null}
              onValueChange={value =>
                setFormData(prev => ({ ...prev, category: String(value ?? '') }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('panels.setVariable.placeholders.selectIdCategory')} />
              </SelectTrigger>
              <SelectPopup alignItemWithTrigger={false}>
                {ID_CATEGORIES.map(category => (
                  <SelectItem key={category.value} value={category.value}>
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{category.label}</span>
                      {category.description && (
                        <span className="text-xs text-muted-foreground">
                          {category.description}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          </Field>
        )}

        {isValid && (
          <FlowFeedbackBanner variant="info">
            <p className="mb-2">
              <strong>{t('panels.setVariable.preview.variableConfigured')}:</strong>
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">{selectedOperation?.icon}</span>
              <span className="font-medium">
                {formData.variableName?.replace(/[{}]/g, '') || formData.variableName}
              </span>
              <span>←</span>
              <span className="font-medium">
                {selectedOperation?.label}
                {formData.value && ` (${formData.value})`}
                {formData.category &&
                  ` - ${ID_CATEGORIES.find(c => c.value === formData.category)?.label}`}
              </span>
            </div>
            <p className="text-xs">{selectedOperation?.description}</p>
          </FlowFeedbackBanner>
        )}
      </div>
    </NodeConfigModal>
  );
}
