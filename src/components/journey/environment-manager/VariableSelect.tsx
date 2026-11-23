import { forwardRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useJourneyVariables } from '@/hooks/useJourneyVariables';
import { useLanguage } from '@/hooks/useLanguage';
import { customAttributesService } from '@/services/customAttributes/customAttributesService';
import type { CustomAttributeDefinition } from '@/types/settings';
import { getSystemVariables } from './EnvironmentManager';

export interface VariableSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  onCreateNew?: () => void;
  placeholder?: string;
  className?: string;
  showCreateOption?: boolean;
  showSystemVariables?: boolean;
  showContactAttributes?: boolean;
  disabled?: boolean;
  journeyId?: string; // Para buscar variáveis da jornada
  triggerTestId?: string; // Stable hook for the trigger (locale-independent tests)
}

const VariableSelect = forwardRef<HTMLButtonElement, VariableSelectProps>(
  (
    {
      value,
      onValueChange,
      onCreateNew,
      placeholder,
      className,
      showCreateOption = true,
      showSystemVariables = false,
      showContactAttributes = false,
      disabled = false,
      journeyId,
      triggerTestId,
      ...props
    },
    ref,
  ) => {
    const { t } = useLanguage('journey');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [contactAttributes, setContactAttributes] = useState<CustomAttributeDefinition[]>([]);
    const [newVariableName, setNewVariableName] = useState('');
    const [newVariableType, setNewVariableType] = useState<'text' | 'number' | 'boolean' | 'date'>(
      'text',
    );
    const [newVariableDescription, setNewVariableDescription] = useState('');
    const [newVariableDefaultValue, setNewVariableDefaultValue] = useState('');
    const { variables, addVariable } = useJourneyVariables(journeyId);

    const SYSTEM_VARIABLES = getSystemVariables(t);

    // Fetch contact custom attribute definitions so they can be branched on as
    // condition fields. On error, leave the list empty — the section simply
    // does not render and the rest of the picker keeps working.
    useEffect(() => {
      if (!showContactAttributes) return;

      let active = true;
      customAttributesService
        .getCustomAttributes('contact_attribute')
        .then(res => {
          if (active) setContactAttributes(res.data);
        })
        .catch(error => {
          console.error('Error fetching contact custom attributes:', error);
        });

      return () => {
        active = false;
      };
    }, [showContactAttributes]);

    const handleValueChange = (selectedValue: string) => {
      if (selectedValue === '__new__') {
        if (onCreateNew) {
          onCreateNew();
        } else {
          setShowCreateModal(true);
        }
      } else {
        onValueChange?.(selectedValue);
      }
    };

    const handleCreateVariable = async () => {
      const trimmedName = newVariableName.trim();

      if (!trimmedName) {
        alert(t('environmentManager.form.fields.name.required'));
        return;
      }

      // Validar nome (sem espaços, apenas letras, números e underscore)
      if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(trimmedName)) {
        alert(t('environmentManager.form.fields.name.invalid'));
        return;
      }

      // Verificar se já existe
      if (variables.some(v => v.name === trimmedName)) {
        alert(t('environmentManager.form.fields.name.exists'));
        return;
      }

      const newVariable = {
        name: trimmedName,
        type: newVariableType,
        description: newVariableDescription.trim() || undefined,
        defaultValue: newVariableDefaultValue.trim() || undefined,
      };

      try {
        await addVariable(newVariable);
        onValueChange?.(`{{${trimmedName}}}`);

        // Reset form
        setNewVariableName('');
        setNewVariableType('text');
        setNewVariableDescription('');
        setNewVariableDefaultValue('');
        setShowCreateModal(false);
      } catch (error) {
        console.error('Erro ao criar variável:', error);
        alert(t('environmentManager.form.messages.createError'));
      }
    };

    const sortedContactAttributes = contactAttributes
      .slice()
      .sort((a, b) =>
        (a.attribute_display_name || a.attribute_key || '').localeCompare(
          b.attribute_display_name || b.attribute_key || '',
        ),
      );

    // Base UI renders the selected label from `items`, so list every option here.
    const selectItems: { value: string; label: string }[] = [
      ...(showCreateOption
        ? [{ value: '__new__', label: t('environmentManager.customVariables.actions.new') }]
        : []),
      ...(showSystemVariables
        ? SYSTEM_VARIABLES.map(variable => ({ value: variable.value, label: variable.label }))
        : []),
      ...(showContactAttributes
        ? sortedContactAttributes.map(attribute => ({
            value: `{{contact.customAttributes.${attribute.attribute_key}}}`,
            label: attribute.attribute_display_name,
          }))
        : []),
      ...variables.map(variable => ({ value: `{{${variable.name}}}`, label: variable.name })),
    ];

    const variableTypeItems: { value: 'text' | 'number' | 'boolean' | 'date'; label: string }[] = [
      { value: 'text', label: `📝 ${t('environmentManager.form.fields.type.text')}` },
      { value: 'number', label: `🔢 ${t('environmentManager.form.fields.type.number')}` },
      { value: 'boolean', label: `☑️ ${t('environmentManager.form.fields.type.boolean')}` },
      { value: 'date', label: `📅 ${t('environmentManager.form.fields.type.date')}` },
    ];

    return (
      <>
        <Select
          key={`select-${JSON.stringify(variables.map(v => v.id))}`}
          items={selectItems}
          value={value || null}
          onValueChange={next => handleValueChange(next == null ? '' : String(next))}
          disabled={disabled}
          {...props}
        >
          <SelectTrigger
            ref={ref}
            data-testid={triggerTestId}
            className={cn('w-full', className)}
          >
            <SelectValue
              placeholder={placeholder || t('environmentManager.form.fields.name.placeholder')}
            />
          </SelectTrigger>
          <SelectPopup alignItemWithTrigger={false} className="max-h-[400px]">
            {/* Opção de criar nova variável */}
            {showCreateOption && (
              <>
                <SelectItem value="__new__">
                  <div className="flex items-center gap-2">
                    <Plus />
                    <span className="font-medium">
                      {t('environmentManager.customVariables.actions.new')}
                    </span>
                  </div>
                </SelectItem>

                {(variables.length > 0 || showSystemVariables) && <SelectSeparator />}
              </>
            )}

            {/* Variáveis do Sistema */}
            {showSystemVariables && (
              <>
                <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                  {t('environmentManager.tabs.system')}
                </div>
                {[
                  t('environmentManager.categories.contact'),
                  t('environmentManager.categories.event'),
                  t('environmentManager.categories.webhook'),
                  t('environmentManager.categories.journey'),
                  t('environmentManager.categories.conversation'),
                ].map(category => {
                  const categoryVars = SYSTEM_VARIABLES.filter(v => v.category === category);
                  if (categoryVars.length === 0) return null;

                  return (
                    <div key={category}>
                      <div className="px-2 py-1 text-xs text-muted-foreground">{category}</div>
                      {categoryVars.map(variable => (
                        <SelectItem
                          key={variable.value}
                          value={variable.value}
                         
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium">{variable.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </div>
                  );
                })}

                {variables.length > 0 && <SelectSeparator />}
              </>
            )}

            {/* Atributos do Contato */}
            {showContactAttributes && contactAttributes.length > 0 && (
              <>
                {/* Only add a leading separator when the system block above did
                    not already render its trailing one (which it does iff there
                    are custom journey variables) — avoids a double separator. */}
                {showSystemVariables && variables.length === 0 && (
                  <SelectSeparator />
                )}
                <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                  {t('environmentManager.categories.contactAttributes')}
                </div>
                {sortedContactAttributes.map(attribute => (
                  <SelectItem
                    key={attribute.id}
                    value={`{{contact.customAttributes.${attribute.attribute_key}}}`}
                   
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{attribute.attribute_display_name}</span>
                    </div>
                  </SelectItem>
                ))}

                {variables.length > 0 && <SelectSeparator />}
              </>
            )}

            {/* Variáveis Personalizadas */}
            {variables.length > 0 && (
              <>
                <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                  {t('environmentManager.tabs.custom', { count: variables.length })}
                </div>
                {variables.map(variable => (
                  <SelectItem
                    key={variable.id}
                    value={`{{${variable.name}}}`}
                   
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{variable.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </>
            )}

            {/* Estado vazio */}
            {variables.length === 0 && !showSystemVariables && !showCreateOption && (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                {t('environmentManager.customVariables.empty.title')}
              </div>
            )}
          </SelectPopup>
        </Select>

        {/* Modal de Criação de Variável */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogPopup className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                  <Plus className="size-4 text-primary" aria-hidden="true" />
                </div>
                {t('environmentManager.form.create.title')}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {t('environmentManager.description')}
              </DialogDescription>
            </DialogHeader>

            <DialogPanel className="flex flex-col gap-4">
              <Field>
                <FieldLabel>{t('environmentManager.form.fields.name.label')}</FieldLabel>
                <Input
                  value={newVariableName}
                  onChange={e => setNewVariableName(e.target.value)}
                  placeholder={t('environmentManager.form.fields.name.placeholder')}
                />
                <FieldDescription>{t('environmentManager.form.fields.name.help')}</FieldDescription>
              </Field>

              <Field>
                <FieldLabel>{t('environmentManager.form.fields.type.label')}</FieldLabel>
                <Select
                  items={variableTypeItems}
                  value={newVariableType}
                  onValueChange={next =>
                    next != null && setNewVariableType(next as 'text' | 'number' | 'boolean' | 'date')
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopup alignItemWithTrigger={false}>
                    {variableTypeItems.map(item => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              </Field>

              <Field>
                <FieldLabel>{t('environmentManager.form.fields.description.label')}</FieldLabel>
                <Input
                  value={newVariableDescription}
                  onChange={e => setNewVariableDescription(e.target.value)}
                  placeholder={t('environmentManager.form.fields.description.placeholder')}
                />
              </Field>

              <Field>
                <FieldLabel>{t('environmentManager.form.fields.defaultValue.label')}</FieldLabel>
                <Input
                  value={newVariableDefaultValue}
                  onChange={e => setNewVariableDefaultValue(e.target.value)}
                  placeholder={t('environmentManager.form.fields.defaultValue.placeholder')}
                />
              </Field>
            </DialogPanel>

            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                {t('environmentManager.form.actions.cancel')}
              </DialogClose>
              <Button onClick={handleCreateVariable} disabled={!newVariableName.trim()}>
                {t('environmentManager.form.create.button')}
              </Button>
            </DialogFooter>
          </DialogPopup>
        </Dialog>
      </>
    );
  },
);

VariableSelect.displayName = 'VariableSelect';

export { VariableSelect };
