import { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardPanel, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import OptionSelect from '@/components/segments/ui/OptionSelect';
import { Plus, X, Settings, Pencil, Check } from '@/components/icons';
import { customAttributesService } from '@/services/customAttributes/customAttributesService';
import { CustomAttributeDefinition, AttributeModel } from '@/types/settings';
import { toast } from 'sonner';

export type CustomAttributesMode = 'form' | 'editable';

export interface CustomAttributesFormProps {
  /** The attribute model type (e.g., 'pipeline_item_attribute', 'contact_attribute') */
  attributeModel: AttributeModel;
  /** Current attributes values */
  attributes: Record<string, unknown> | null | undefined;
  /** Mode of operation: 'form' for always-editable form fields, 'editable' for inline edit mode */
  mode?: CustomAttributesMode;
  /** Callback when attributes change (used in 'form' mode) */
  onAttributesChange?: (attributes: Record<string, unknown>) => void;
  /** Callback to update attributes (used in 'editable' mode, should return a Promise) */
  onUpdateAttributes?: (updatedAttributes: Record<string, unknown>) => Promise<void>;
  /** Optional callback when update succeeds (used in 'editable' mode) */
  onUpdateSuccess?: () => void;
  /** Whether the form is disabled */
  disabled?: boolean;
  /** Optional custom translation namespace (defaults to 'customAttributes' for form mode, 'chat' for editable mode) */
  translationNamespace?: string;
  /** Translation keys for messages (used in 'editable' mode) */
  translationKeys?: {
    loadError?: string;
    updateSuccess?: string;
    updateError?: string;
    noAttributes?: string;
    yes?: string;
    no?: string;
  };
}

/**
 * Generic CustomAttributesForm component that can be used across different contexts.
 * Supports two modes:
 * - 'form': Always-editable form fields with Cards layout, allows adding ad-hoc attributes
 * - 'editable': Inline edit mode with view/edit states, saves immediately via API
 */
export default function CustomAttributesForm({
  attributeModel,
  attributes,
  mode = 'form',
  onAttributesChange,
  onUpdateAttributes,
  onUpdateSuccess,
  disabled = false,
  translationNamespace,
  translationKeys = {},
}: CustomAttributesFormProps) {
  const defaultTranslationNamespace = mode === 'editable' ? 'chat' : 'customAttributes';
  const { t } = useLanguage(translationNamespace || defaultTranslationNamespace);
  // Control labels (aria/tooltips) always come from this component's own namespace.
  const { t: tCa } = useLanguage('customAttributes');
  const fieldId = (key: string) => `custom-attr-${attributeModel}-${key}`;
  const [definedAttributes, setDefinedAttributes] = useState<CustomAttributeDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [newAttributeKey, setNewAttributeKey] = useState('');
  const [newAttributeValue, setNewAttributeValue] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Editable mode state
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const normalizeDateTimeLocalValue = (value: string) => {
    if (!value) return '';
    const exactFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
    if (exactFormat.test(value)) return value;
    const prefixMatch = value.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
    if (prefixMatch) return prefixMatch[1];
    return value;
  };

  // Load defined custom attributes for the specified model
  useEffect(() => {
    const loadDefinedAttributes = async () => {
      setLoading(true);
      try {
        const response = await customAttributesService.getCustomAttributes(attributeModel);
        setDefinedAttributes(response.data);
      } catch (error) {
        if (mode === 'editable') {
          const errorKey = translationKeys.loadError || 'contactSidebar.customAttributes.loadError';
          toast.error(t(errorKey));
        } else {
          console.error('Error loading custom attributes:', error);
        }
      } finally {
        setLoading(false);
      }
    };

    loadDefinedAttributes();
  }, [attributeModel, mode, t, translationKeys.loadError]);

  // Form mode handlers
  const handleAddAttribute = () => {
    if (!onAttributesChange || !newAttributeKey.trim() || !newAttributeValue.trim()) return;
    
    onAttributesChange({
      ...(attributes || {}),
      [newAttributeKey.trim()]: newAttributeValue.trim(),
    });
    setNewAttributeKey('');
    setNewAttributeValue('');
    setShowAddForm(false);
  };

  const handleRemoveAttribute = (key: string) => {
    if (!onAttributesChange) return;
    
    // Create a completely new object without the removed attribute
    const currentAttributes = attributes || {};
    const newAttributes = Object.keys(currentAttributes).reduce((acc, attrKey) => {
      if (attrKey !== key) {
        acc[attrKey] = currentAttributes[attrKey];
      }
      return acc;
    }, {} as Record<string, unknown>);
    
    onAttributesChange(newAttributes);
  };

  const handleUpdateAttribute = (key: string, value: unknown) => {
    if (!onAttributesChange) return;
    
    onAttributesChange({
      ...(attributes || {}),
      [key]: value,
    });
  };

  // Editable mode handlers
  const handleStartEdit = (key: string, currentValue: unknown) => {
    setEditingKey(key);
    const rawValue = currentValue ? String(currentValue) : '';
    const attributeDefinition = definedAttributes.find(attribute => attribute.attribute_key === key);
    const nextValue = attributeDefinition?.attribute_display_type === 'datetime'
      ? normalizeDateTimeLocalValue(rawValue)
      : rawValue;
    setEditValue(nextValue);
  };

  const handleCancelEdit = () => {
    setEditingKey(null);
    setEditValue('');
  };

  const handleSave = async () => {
    if (!onUpdateAttributes || !editingKey) return;

    setSaving(true);
    try {
      const updatedAttributes = {
        ...(attributes || {}),
        [editingKey]: editValue,
      };

      await onUpdateAttributes(updatedAttributes);

      const successKey = translationKeys.updateSuccess || 'contactSidebar.customAttributes.updateSuccess';
      toast.success(t(successKey));
      setEditingKey(null);
      setEditValue('');

      if (onUpdateSuccess) {
        onUpdateSuccess();
      }
    } catch {
      const errorKey = translationKeys.updateError || 'contactSidebar.customAttributes.updateError';
      toast.error(t(errorKey));
    } finally {
      setSaving(false);
    }
  };

  const handleBooleanToggle = async (key: string, currentValue: boolean) => {
    if (!onUpdateAttributes) return;

    setSaving(true);
    try {
      const updatedAttributes = {
        ...(attributes || {}),
        [key]: !currentValue,
      };

      await onUpdateAttributes(updatedAttributes);

      const successKey = translationKeys.updateSuccess || 'contactSidebar.customAttributes.updateSuccess';
      toast.success(t(successKey));

      if (onUpdateSuccess) {
        onUpdateSuccess();
      }
    } catch {
      const errorKey = translationKeys.updateError || 'contactSidebar.customAttributes.updateError';
      toast.error(t(errorKey));
    } finally {
      setSaving(false);
    }
  };

  // Helper function to convert value to string, handling objects
  const valueToString = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') {
      try {
        return JSON.stringify(val, null, 2);
      } catch {
        return String(val);
      }
    }
    return String(val);
  };

  // Render field based on attribute type (form mode)
  const renderFormField = (attribute: CustomAttributeDefinition) => {
    const rawValue = attributes?.[attribute.attribute_key];
    const value = valueToString(rawValue);

    const commonProps = {
      id: fieldId(attribute.attribute_key),
      disabled,
    };

    switch (attribute.attribute_display_type) {
      case 'text':
        return (
          <Input
            value={value}
            onChange={e => handleUpdateAttribute(attribute.attribute_key, e.target.value)}
            placeholder={t('placeholders.text', {
              name: attribute.attribute_display_name.toLowerCase(),
            })}
            {...commonProps}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={e => handleUpdateAttribute(attribute.attribute_key, e.target.value)}
            placeholder={t('placeholders.number', {
              name: attribute.attribute_display_name.toLowerCase(),
            })}
            {...commonProps}
          />
        );

      case 'currency':
        return (
          <Input
            type="number"
            value={value}
            onChange={e => handleUpdateAttribute(attribute.attribute_key, e.target.value)}
            placeholder={t('placeholders.number', {
              name: attribute.attribute_display_name.toLowerCase(),
            })}
            step="0.01"
            min="0"
            {...commonProps}
          />
        );

      case 'percent':
        return (
          <Input
            type="number"
            value={value}
            onChange={e => handleUpdateAttribute(attribute.attribute_key, e.target.value)}
            placeholder={t('placeholders.number', {
              name: attribute.attribute_display_name.toLowerCase(),
            })}
            step="0.01"
            min="0"
            max="100"
            {...commonProps}
          />
        );

      case 'link':
        return (
          <Input
            type="url"
            value={value}
            onChange={e => handleUpdateAttribute(attribute.attribute_key, e.target.value)}
            placeholder={t('placeholders.link')}
            {...commonProps}
          />
        );

      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={e => handleUpdateAttribute(attribute.attribute_key, e.target.value)}
            onClick={event => {
              (event.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
            }}
            className="[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100"
            {...commonProps}
          />
        );

      case 'datetime':
        return (
          <Input
            type="datetime-local"
            value={normalizeDateTimeLocalValue(value)}
            onChange={e => handleUpdateAttribute(attribute.attribute_key, e.target.value)}
            {...commonProps}
          />
        );

      case 'list':
        return (
          <OptionSelect
            id={fieldId(attribute.attribute_key)}
            value={value}
            onValueChange={newValue => handleUpdateAttribute(attribute.attribute_key, newValue)}
            disabled={disabled}
            placeholder={t('placeholders.select', {
              name: attribute.attribute_display_name.toLowerCase(),
            })}
            options={(attribute.attribute_values ?? []).map(option => ({ value: option, label: option }))}
          />
        );

      case 'checkbox':
        return (
          <div className="flex items-center gap-2">
            <Switch
              id={fieldId(attribute.attribute_key)}
              checked={Boolean(rawValue)}
              onCheckedChange={checked => handleUpdateAttribute(attribute.attribute_key, checked)}
              disabled={disabled}
            />
            <span className="text-sm">{rawValue ? t('checkbox.yes') : t('checkbox.no')}</span>
          </div>
        );

      default:
        return (
          <Textarea
            value={value}
            onChange={e => handleUpdateAttribute(attribute.attribute_key, e.target.value)}
            placeholder={t('placeholders.textarea', {
              name: attribute.attribute_display_name.toLowerCase(),
            })}
            rows={3}
            {...commonProps}
          />
        );
    }
  };

  // Render field for editable mode
  const renderEditableField = (attribute: CustomAttributeDefinition) => {
    const key = attribute.attribute_key;
    const rawValue = attributes?.[key];
    const value = rawValue ? String(rawValue) : '';
    const isEditing = editingKey === key;

    if (isEditing) {
      const editActions = (
        <>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={handleSave}
                  loading={saving}
                  aria-label={tCa('actions.save')}
                />
              }
            >
              <Check />
            </TooltipTrigger>
            <TooltipPopup>{tCa('actions.save')}</TooltipPopup>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={handleCancelEdit}
                  disabled={saving}
                  aria-label={tCa('actions.cancel')}
                />
              }
            >
              <X />
            </TooltipTrigger>
            <TooltipPopup>{tCa('actions.cancel')}</TooltipPopup>
          </Tooltip>
        </>
      );

      switch (attribute.attribute_display_type) {
        case 'text':
        case 'number':
        case 'link':
          return (
            <div className="flex items-center gap-2">
              <Input
                type={attribute.attribute_display_type === 'number' ? 'number' : 'text'}
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                size="sm"
                className="flex-1"
                aria-label={attribute.attribute_display_name}
                autoFocus
                disabled={saving}
              />
              {editActions}
            </div>
          );

        case 'date':
        case 'datetime':
          return (
            <div className="flex items-center gap-2">
              <Input
                type={attribute.attribute_display_type === 'datetime' ? 'datetime-local' : 'date'}
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onClick={event => {
                  (event.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
                }}
                size="sm"
                className="flex-1 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100"
                aria-label={attribute.attribute_display_name}
                autoFocus
                disabled={saving}
              />
              {editActions}
            </div>
          );

        case 'list':
          return (
            <div className="flex items-center gap-2">
              <OptionSelect
                value={editValue}
                onValueChange={setEditValue}
                disabled={saving}
                size="sm"
                className="flex-1"
                aria-label={attribute.attribute_display_name}
                options={(attribute.attribute_values ?? []).map(option => ({ value: option, label: option }))}
              />
              {editActions}
            </div>
          );

        default:
          return (
            <div className="flex items-center gap-2">
              <Input
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                size="sm"
                className="flex-1"
                aria-label={attribute.attribute_display_name}
                autoFocus
                disabled={saving}
              />
              {editActions}
            </div>
          );
      }
    }

    // Display mode
    if (attribute.attribute_display_type === 'checkbox') {
      const yesKey = translationKeys.yes || 'contactSidebar.customAttributes.yes';
      const noKey = translationKeys.no || 'contactSidebar.customAttributes.no';
      return (
        <div className="flex items-center justify-between">
          <span className="text-xs text-foreground">
            {rawValue ? t(yesKey) : t(noKey)}
          </span>
          <Switch
            checked={Boolean(rawValue)}
            onCheckedChange={() => handleBooleanToggle(key, Boolean(rawValue))}
            disabled={saving}
            aria-label={attribute.attribute_display_name}
          />
        </div>
      );
    }

    return (
      <div className="group flex items-center justify-between gap-2">
        <span className="text-xs text-foreground truncate flex-1">
          {value || <span className="text-muted-foreground">--</span>}
        </span>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                size="icon-xs"
                variant="ghost"
                onClick={() => handleStartEdit(key, rawValue)}
                disabled={saving}
                aria-label={`${tCa('actions.edit')}: ${attribute.attribute_display_name}`}
                className="opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100"
              />
            }
          >
            <Pencil />
          </TooltipTrigger>
          <TooltipPopup>{tCa('actions.edit')}</TooltipPopup>
        </Tooltip>
      </div>
    );
  };

  const attributeEntries = Object.entries(attributes || {});
  const definedAttributeKeys = definedAttributes.map(attr => attr.attribute_key);
  const adHocAttributes = attributeEntries.filter(([key]) => !definedAttributeKeys.includes(key));

  // Editable mode rendering
  if (mode === 'editable') {
    if (loading) {
      return (
        <div className="flex flex-col gap-3 py-1" aria-busy="true">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex flex-col gap-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      );
    }

    if (definedAttributes.length === 0) {
      const noAttributesKey = translationKeys.noAttributes || 'contactSidebar.customAttributes.noAttributes';
      return (
        <div className="text-xs text-muted-foreground text-center py-4">
          {t(noAttributesKey)}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-3">
        {definedAttributes.map(attribute => (
          <div key={attribute.attribute_key} className="flex flex-col gap-1">
            <Label className="font-normal text-muted-foreground text-xs">
              {attribute.attribute_display_name}
            </Label>
            {renderEditableField(attribute)}
          </div>
        ))}
      </div>
    );
  }

  // Form mode rendering
  return (
    <div className="flex flex-col gap-4">
      {loading && (
        <div className="flex flex-col gap-3" aria-busy="true">
          <span className="sr-only">{t('loading')}</span>
          {[0, 1].map(i => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {/* Defined Custom Attributes */}
      {definedAttributes.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Settings className="size-4" />
            <h4 className="font-medium text-sm">
              {t('sections.defined')}
            </h4>
          </div>
          <div className="space-y-3">
            {definedAttributes.map(attribute => (
              <Card key={attribute.attribute_key}>
                <CardPanel className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <Label htmlFor={fieldId(attribute.attribute_key)}>{attribute.attribute_display_name}</Label>
                    {attribute.attribute_description && (
                      <span className="text-muted-foreground text-xs">{attribute.attribute_description}</span>
                    )}
                  </div>
                  {renderFormField(attribute)}
                </CardPanel>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Ad-hoc Custom Attributes */}
      {adHocAttributes.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Plus className="size-4" />
            <h4 className="font-medium text-sm">
              {t('sections.additional')}
            </h4>
          </div>
          <div className="space-y-3">
            {adHocAttributes.map(([key, value]) => {
              const isObject = typeof value === 'object' && value !== null;
              const displayValue = valueToString(value);

              return (
                <Card key={key}>
                  <CardPanel>
                    <div className="flex items-end gap-3">
                      <div className="flex flex-1 flex-col gap-2">
                        <Label htmlFor={fieldId(key)} className="font-mono">
                          {key}
                        </Label>
                        {isObject ? (
                          <Textarea
                            id={fieldId(key)}
                            value={displayValue}
                            onChange={e => {
                              try {
                                const parsed = JSON.parse(e.target.value);
                                handleUpdateAttribute(key, parsed);
                              } catch {
                                // If invalid JSON, store as string
                                handleUpdateAttribute(key, e.target.value);
                              }
                            }}
                            placeholder={t('fields.attributeValue.placeholder')}
                            disabled={disabled}
                            rows={4}
                            className="font-mono text-xs"
                          />
                        ) : (
                          <Input
                            id={fieldId(key)}
                            value={displayValue}
                            onChange={e => handleUpdateAttribute(key, e.target.value)}
                            placeholder={t('fields.attributeValue.placeholder')}
                            disabled={disabled}
                          />
                        )}
                      </div>
                      {!disabled && (
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveAttribute(key)}
                                aria-label={`${tCa('actions.remove')}: ${key}`}
                                className="text-destructive-foreground hover:bg-destructive/8"
                              />
                            }
                          >
                            <X />
                          </TooltipTrigger>
                          <TooltipPopup>{tCa('actions.remove')}</TooltipPopup>
                        </Tooltip>
                      )}
                    </div>
                  </CardPanel>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Add New Attribute */}
      {!disabled && (
        <div>
          {showAddForm ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t('sections.newAttribute')}</CardTitle>
              </CardHeader>
              <CardPanel className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="attribute-key">{t('fields.attributeKey.label')}</Label>
                  <Input
                    id="attribute-key"
                    value={newAttributeKey}
                    onChange={e => setNewAttributeKey(e.target.value)}
                    placeholder={t('fields.attributeKey.placeholder')}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="attribute-value">{t('fields.attributeValue.label')}</Label>
                  <Input
                    id="attribute-value"
                    value={newAttributeValue}
                    onChange={e => setNewAttributeValue(e.target.value)}
                    placeholder={t('fields.attributeValue.placeholder')}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleAddAttribute}
                    disabled={!newAttributeKey.trim() || !newAttributeValue.trim()}
                  >
                    {t('actions.add')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewAttributeKey('');
                      setNewAttributeValue('');
                    }}
                  >
                    {t('actions.cancel')}
                  </Button>
                </div>
              </CardPanel>
            </Card>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(true)}
              className="border-dashed"
            >
              <Plus />
              {t('actions.addAttribute')}
            </Button>
          )}
        </div>
      )}

      {/* Empty State */}
      {definedAttributes.length === 0 &&
        attributeEntries.length === 0 &&
        !showAddForm &&
        !loading && (
          <Empty className="py-6">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Settings />
              </EmptyMedia>
              <EmptyTitle className="text-base">{t('empty.title')}</EmptyTitle>
              <EmptyDescription>{!disabled ? t('empty.description') : t('empty.descriptionReadOnly')}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
    </div>
  );
}
