import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Plus, X } from 'lucide-react';
import { VariableInput, VariableMapping, type DataMapping } from '@/components/journey/environment-manager';
import { useLanguage } from '@/hooks/useLanguage';

interface ContactField {
  field: string;
  operator: string;
  value?: unknown;
}

interface ContactConfigurationProps {
  triggerType: 'contactCreated' | 'contactUpdated';
  contactFields: ContactField[];
  onContactFieldsChange: (fields: ContactField[]) => void;
  variableMappings?: DataMapping[];
  onVariableMappingsChange?: (mappings: DataMapping[]) => void;
  journeyId?: string;
}

// Moved to component to use translations

export function ContactConfiguration({
  triggerType,
  contactFields,
  onContactFieldsChange,
  variableMappings = [],
  onVariableMappingsChange,
  journeyId,
}: ContactConfigurationProps) {
  const { t } = useLanguage('journey');
  const [fields, setFields] = useState<ContactField[]>(contactFields);

  const CONTACT_FIELD_OPTIONS = [
    { value: 'name', label: t('triggerComponents.contact.fields.name') },
    { value: 'email', label: t('triggerComponents.contact.fields.email') },
    { value: 'phone', label: t('triggerComponents.contact.fields.phone') },
    { value: 'meio', label: t('triggerComponents.contact.fields.meio') },
    { value: 'sobrenome', label: t('triggerComponents.contact.fields.sobrenome') },
    { value: 'localizacao', label: t('triggerComponents.contact.fields.localizacao') },
    { value: 'codigo_do_pais', label: t('triggerComponents.contact.fields.codigo_do_pais') },
    { value: 'identificador', label: t('triggerComponents.contact.fields.identificador') },
    { value: 'tipo_do_contato', label: t('triggerComponents.contact.fields.tipo_do_contato') },
    { value: 'bloqueado', label: t('triggerComponents.contact.fields.bloqueado') },
    { value: 'ultima_atividade', label: t('triggerComponents.contact.fields.ultima_atividade') },
    { value: 'criado', label: t('triggerComponents.contact.fields.criado') },
    { value: 'atualizado', label: t('triggerComponents.contact.fields.atualizado') },
  ];

  const OPERATOR_OPTIONS = [
    { value: 'equals', label: t('triggerComponents.operators.equals') },
    { value: 'not_equals', label: t('triggerComponents.operators.not_equals') },
    { value: 'contains', label: t('triggerComponents.operators.contains') },
    { value: 'not_contains', label: t('triggerComponents.operators.not_contains') },
    { value: 'starts_with', label: t('triggerComponents.operators.starts_with') },
    { value: 'ends_with', label: t('triggerComponents.operators.ends_with') },
    { value: 'is_empty', label: t('triggerComponents.operators.is_empty') },
    { value: 'is_not_empty', label: t('triggerComponents.operators.is_not_empty') },
  ];

  // Gerar caminhos disponíveis dinamicamente baseado nos campos configurados
  const generateContactPaths = () => {
    const basePaths = [
      'contact.id',
      'contact.name',
      'contact.email',
      'contact.phone',
      'contact.created_at',
      'contact.updated_at',
    ];

    // Adicionar campos configurados
    const fieldPaths = fields
      .filter(field => field.field && field.field.trim())
      .map(field => `contact.${field.field}`);

    // Remover duplicatas
    const allPaths = [...basePaths, ...fieldPaths];
    return [...new Set(allPaths)];
  };

  useEffect(() => {
    setFields(contactFields);
  }, [contactFields]);

  const addField = () => {
    const newField: ContactField = {
      field: '',
      operator: 'equals',
      value: '',
    };
    const updatedFields = [...fields, newField];
    setFields(updatedFields);
    onContactFieldsChange(updatedFields);
  };

  const removeField = (index: number) => {
    const updatedFields = fields.filter((_, i) => i !== index);
    setFields(updatedFields);
    onContactFieldsChange(updatedFields);
  };

  const updateField = (index: number, updates: Partial<ContactField>) => {
    const updatedFields = fields.map((field, i) =>
      i === index ? { ...field, ...updates } : field,
    );
    setFields(updatedFields);
    onContactFieldsChange(updatedFields);
  };

  const needsValue = (operator: string) => {
    return !['is_empty', 'is_not_empty'].includes(operator);
  };

  return (
    <>
      <Separator />
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm text-foreground">
            {triggerType === 'contactCreated'
              ? t('triggerComponents.contact.filtersForCreated')
              : t('triggerComponents.contact.fieldsToMonitor')}
          </h3>
          <Button onClick={addField} variant="outline" size="sm">
            <Plus />
            {t('triggerComponents.contact.addField')}
          </Button>
        </div>

        {fields.length === 0 ? (
          <div className="rounded-xl border bg-muted/24 p-4 text-center">
            <p className="text-sm text-muted-foreground">
              {triggerType === 'contactCreated'
                ? t('triggerComponents.contact.noFiltersConfigured')
                : t('triggerComponents.contact.noSpecificFieldsMonitored')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div
                key={index}
                className="space-y-3 rounded-xl border bg-muted/24 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {t('triggerComponents.contact.fieldNumber', { number: index + 1 })}
                  </span>
                  <Button
                    onClick={() => removeField(index)}
                    variant="ghost"
                    size="icon-xs"
                    className="text-destructive-foreground hover:text-destructive-foreground"
                    aria-label={t('triggerComponents.contact.removeField')}
                  >
                    <X />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Campo */}
                  <Field>
                    <FieldLabel className="text-xs">
                      {t('triggerComponents.contact.field')}
                    </FieldLabel>
                    <Select
                      items={CONTACT_FIELD_OPTIONS}
                      value={field.field || null}
                      onValueChange={value => updateField(index, { field: String(value ?? '') })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('triggerComponents.contact.selectField')} />
                      </SelectTrigger>
                      <SelectPopup alignItemWithTrigger={false}>
                        {CONTACT_FIELD_OPTIONS.map(option => (
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

                  {/* Operador */}
                  <Field>
                    <FieldLabel className="text-xs">
                      {t('triggerComponents.contact.condition')}
                    </FieldLabel>
                    <Select
                      items={OPERATOR_OPTIONS}
                      value={field.operator || null}
                      onValueChange={value => updateField(index, { operator: String(value ?? '') })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('triggerComponents.contact.selectCondition')} />
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
                  {needsValue(field.operator) && (
                    <Field className="items-stretch">
                      <FieldLabel className="text-xs">
                        {t('triggerComponents.contact.value')}
                      </FieldLabel>
                      <VariableInput
                        value={typeof field.value === 'string' ? field.value : ''}
                        onChange={e => updateField(index, { value: e.target.value })}
                        placeholder={t('triggerComponents.contact.enterValue')}
                        className="w-full"
                        journeyId={journeyId}
                        onVariableInsert={variable => {
                          console.log('Variable inserted in contact field value:', variable);
                        }}
                      />
                      <FieldDescription>
                        {t('triggerComponents.contact.useVariablesHint')}
                      </FieldDescription>
                    </Field>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Descrição da Configuração */}
        <div className="rounded-xl border border-info/24 bg-info/8 p-4">
          <p className="text-sm text-info-foreground">
            {triggerType === 'contactCreated' ? (
              <>
                {t('triggerComponents.contact.createdDescription')}{' '}
                {fields.length > 0 && t('triggerComponents.contact.withFiltersConfigured')}.
              </>
            ) : (
              <>
                {t('triggerComponents.contact.updatedDescription')}{' '}
                {fields.length > 0
                  ? t('triggerComponents.contact.withConfiguredFieldsChanged')
                  : ''}
                .
              </>
            )}
          </p>
          {fields.length > 0 && (
            <div className="mt-2">
              <p className="mb-1 font-medium text-info-foreground text-xs">
                {t('triggerComponents.contact.configuredConditions')}:
              </p>
              <ul className="list-inside list-disc space-y-1 text-info-foreground text-xs">
                {fields.map((field, index) => {
                  const fieldLabel =
                    CONTACT_FIELD_OPTIONS.find(f => f.value === field.field)?.label || field.field;
                  const operatorLabel =
                    OPERATOR_OPTIONS.find(o => o.value === field.operator)?.label || field.operator;
                  return (
                    <li key={index}>
                      {fieldLabel} {operatorLabel.toLowerCase()}{' '}
                      {needsValue(field.operator) && Boolean(field.value) && `"${String(field.value)}"`}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Mapeamento de Variáveis */}
        {onVariableMappingsChange && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-foreground">
                {t('triggerComponents.contact.captureContactData')}
              </h4>
              <VariableMapping
                mappings={variableMappings}
                onMappingsChange={onVariableMappingsChange}
                paths={generateContactPaths()}
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
