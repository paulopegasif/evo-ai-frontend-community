import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { customAttributesService } from '@/services/customAttributes/customAttributesService';
import { CustomAttributeDefinition } from '@/types/settings';
import { VariableInput, VariableMapping, type DataMapping } from '@/components/journey/environment-manager';
import { useLanguage } from '@/hooks/useLanguage';

interface CustomAttributeConfigurationProps {
  attributeName: string;
  operator: string;
  value: string;
  onAttributeNameChange: (name: string, displayName?: string) => void;
  onOperatorChange: (operator: string) => void;
  onValueChange: (value: string) => void;
  journeyId?: string;
  variableMappings?: DataMapping[];
  onVariableMappingsChange?: (mappings: DataMapping[]) => void;
}

// Moved to component to use translations

export function CustomAttributeConfiguration({
  attributeName,
  operator,
  value,
  onAttributeNameChange,
  onOperatorChange,
  onValueChange,
  journeyId,
  variableMappings = [],
  onVariableMappingsChange,
}: CustomAttributeConfigurationProps) {
  const { t } = useLanguage('journey');
  const [availableAttributes, setAvailableAttributes] = useState<CustomAttributeDefinition[]>([]);
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const OPERATOR_OPTIONS = [
    { value: 'equals', label: t('triggerComponents.operators.equals') },
    { value: 'not_equals', label: t('triggerComponents.operators.not_equals') },
    { value: 'contains', label: t('triggerComponents.operators.contains') },
    { value: 'not_contains', label: t('triggerComponents.operators.not_contains') },
    { value: 'starts_with', label: t('triggerComponents.operators.starts_with') },
    { value: 'ends_with', label: t('triggerComponents.operators.ends_with') },
    { value: 'exists', label: t('triggerComponents.operators.exists') },
    { value: 'not_exists', label: t('triggerComponents.operators.not_exists') },
    { value: 'greater_than', label: t('triggerComponents.operators.greater_than') },
    { value: 'less_than', label: t('triggerComponents.operators.less_than') },
    { value: 'is_empty', label: t('triggerComponents.operators.is_empty') },
    { value: 'is_not_empty', label: t('triggerComponents.operators.is_not_empty') },
  ];

  // Gerar caminhos disponíveis dinamicamente baseado no atributo selecionado
  const generateCustomAttributePaths = () => {
    const basePaths = [
      'attribute.name',
      'attribute.value',
      'attribute.previous_value',
      'attribute.timestamp',
    ];

    // Se tiver atributo selecionado, adicionar caminhos específicos
    if (attributeName && attributeName.trim()) {
      const specificPaths = [`attribute.${attributeName}`, `attribute.${attributeName}_previous`];
      return [...basePaths, ...specificPaths];
    }

    return basePaths;
  };

  useEffect(() => {
    setAvailableAttributes([]);
    setError(null);

    const loadAttributes = async () => {
      if (loadingAttributes) return;

      setLoadingAttributes(true);
      setError(null);

      try {
        const response = await customAttributesService.getCustomAttributes();
        setAvailableAttributes(response.data);
      } catch (error) {
        console.error('Error loading custom attributes:', error);
        setError(t('triggerComponents.customAttribute.loadError'));
      } finally {
        setLoadingAttributes(false);
      }
    };

    loadAttributes();
    // loadingAttributes is a guard flag, not an input — including it would re-run the fetch on every toggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  const selectedAttribute = availableAttributes.find(a => a.attribute_key === attributeName);
  const attributeItems = availableAttributes.map(attribute => ({
    value: attribute.attribute_key,
    label: attribute.attribute_display_name,
  }));

  const needsValue = (operator: string) => {
    return !['exists', 'not_exists', 'is_empty', 'is_not_empty'].includes(operator);
  };

  const getAttributeTypeLabel = (type: string) => {
    switch (type) {
      case 'string':
        return t('triggerComponents.customAttribute.types.string');
      case 'number':
        return t('triggerComponents.customAttribute.types.number');
      case 'boolean':
        return t('triggerComponents.customAttribute.types.boolean');
      case 'date':
        return t('triggerComponents.customAttribute.types.date');
      case 'datetime':
        return t('triggerComponents.customAttribute.types.datetime', { defaultValue: 'DateTime' });
      default:
        return type;
    }
  };

  return (
    <>
      <Separator />
      <div className="space-y-4">
        <h3 className="font-medium text-sm text-foreground">
          {t('triggerComponents.customAttribute.configuration')}
        </h3>

        {/* Seleção do Atributo */}
        <Field>
          <FieldLabel>
            {t('triggerComponents.customAttribute.customAttribute')}
          </FieldLabel>
          {error ? (
            <Alert variant="error">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <Select
              items={attributeItems}
              value={attributeName || null}
              onValueChange={value => {
                const selectedAttributeName = String(value ?? '');
                const selectedAttribute = availableAttributes.find(
                  a => a.attribute_key === selectedAttributeName,
                );
                onAttributeNameChange(
                  selectedAttributeName,
                  selectedAttribute?.attribute_display_name,
                );
              }}
              disabled={loadingAttributes}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    loadingAttributes
                      ? t('triggerComponents.customAttribute.loadingAttributes')
                      : t('triggerComponents.customAttribute.selectAttribute')
                  }
                />
              </SelectTrigger>
              <SelectPopup alignItemWithTrigger={false}>
                {loadingAttributes ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    {t('triggerComponents.customAttribute.loading')}
                  </div>
                ) : availableAttributes.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    {t('triggerComponents.customAttribute.noAttributesFound')}
                  </div>
                ) : (
                  availableAttributes.map(attribute => (
                    <SelectItem
                      key={attribute.id}
                      value={attribute.attribute_key}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{attribute.attribute_display_name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {getAttributeTypeLabel(attribute.attribute_display_type)}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t('triggerComponents.customAttribute.technicalName')}:{' '}
                          {attribute.attribute_key}
                          {attribute.attribute_model &&
                            ` • ${t('triggerComponents.customAttribute.model')}: ${
                              attribute.attribute_model
                            }`}
                        </div>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectPopup>
            </Select>
          )}
        </Field>

        {/* Operador */}
        <Field>
          <FieldLabel>
            {t('triggerComponents.customAttribute.condition')}
          </FieldLabel>
          <Select
            items={OPERATOR_OPTIONS}
            value={operator || null}
            onValueChange={v => onOperatorChange(String(v ?? ''))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('triggerComponents.customAttribute.selectCondition')} />
            </SelectTrigger>
            <SelectPopup alignItemWithTrigger={false}>
              {OPERATOR_OPTIONS.map(option => (
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

        {/* Valor */}
        {needsValue(operator) && (
          <Field className="items-stretch">
            <FieldLabel>
              {t('triggerComponents.customAttribute.value')}
            </FieldLabel>
            <VariableInput
              value={value}
              onChange={e => onValueChange(e.target.value)}
              placeholder={t('triggerComponents.customAttribute.enterValue')}
              className="w-full"
              type={
                selectedAttribute?.attribute_display_type === 'number'
                  ? 'number'
                  : selectedAttribute?.attribute_display_type === 'datetime'
                  ? 'datetime-local'
                  : selectedAttribute?.attribute_display_type === 'date'
                  ? 'date'
                  : 'text'
              }
              journeyId={journeyId}
              onVariableInsert={variable => {
                console.log('Variable inserted in custom attribute value:', variable);
              }}
            />
            <FieldDescription>
              {t('triggerComponents.customAttribute.useVariablesHint')}
            </FieldDescription>
          </Field>
        )}

        {/* Informações do Atributo Selecionado */}
        {selectedAttribute && (
          <div className="rounded-xl border bg-muted/24 p-4">
            <h4 className="text-sm font-medium text-foreground mb-2">
              {t('triggerComponents.customAttribute.selectedAttribute')}
            </h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>{t('triggerComponents.customAttribute.name')}:</span>
                <span className="font-medium">{selectedAttribute.attribute_display_name}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('triggerComponents.customAttribute.type')}:</span>
                <Badge variant="secondary" className="text-xs">
                  {getAttributeTypeLabel(selectedAttribute.attribute_display_type)}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>{t('triggerComponents.customAttribute.technicalName')}:</span>
                <span className="font-mono text-xs">{selectedAttribute.attribute_key}</span>
              </div>
              {selectedAttribute.attribute_model && (
                <div className="flex justify-between">
                  <span>{t('triggerComponents.customAttribute.model')}:</span>
                  <span className="font-medium">{selectedAttribute.attribute_model}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>{t('triggerComponents.customAttribute.createdAt')}:</span>
                <span className="font-medium">
                  {new Date(selectedAttribute.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Descrição da Configuração */}
        <div className="rounded-xl border border-info/24 bg-info/8 p-4">
          <p className="text-sm text-info-foreground">
            {t('triggerComponents.customAttribute.description')}
            {selectedAttribute && (
              <span className="block mt-1 font-medium">
                {t('triggerComponents.customAttribute.attribute')}:{' '}
                {selectedAttribute.attribute_display_name}{' '}
                {operator &&
                  `• ${t('triggerComponents.customAttribute.condition')}: ${
                    OPERATOR_OPTIONS.find(o => o.value === operator)?.label
                  }`}{' '}
                {needsValue(operator) &&
                  value &&
                  `• ${t('triggerComponents.customAttribute.value')}: "${value}"`}
              </span>
            )}
          </p>
        </div>

        {/* Mapeamento de Variáveis */}
        {onVariableMappingsChange && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-foreground">
                {t('triggerComponents.customAttribute.captureAttributeData')}
              </h4>
              <VariableMapping
                mappings={variableMappings}
                onMappingsChange={onVariableMappingsChange}
                paths={generateCustomAttributePaths()}
                journeyId={journeyId}
                className="rounded-xl border bg-muted/24 p-4"
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}
