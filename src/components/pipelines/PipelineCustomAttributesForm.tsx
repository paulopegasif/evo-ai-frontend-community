import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X, Settings } from 'lucide-react';
import { customAttributesService } from '@/services/customAttributes/customAttributesService';
import {
  PipelineAttributeDefinition,
  AttributeModel,
  PipelineAttributeContext,
  CustomAttributeDefinition,
  AttributeDisplayType,
  ATTRIBUTE_TYPE_OPTIONS,
} from '@/types/settings';
import { LocalAttributeDefinition, LocalAttributeDefinitionPayload } from '@/types/pipelines/localAttributeDefinition';

export interface PipelineCustomAttributesFormProps {
  /** The attribute model type (e.g., 'pipeline_attribute', 'pipeline_stage_attribute', 'pipeline_item_attribute') */
  attributeModel: AttributeModel;
  /** Current attributes values */
  attributes: Record<string, unknown> | null | undefined;
  /** Callback when attributes change */
  onAttributesChange: (attributes: Record<string, unknown>) => void;
  /** Whether the form is disabled */
  disabled?: boolean;
  /** Pipeline hierarchy context (for filtering shared attributes) */
  pipelineContext: PipelineAttributeContext;
  /** Custom fields from pipeline (contains attributes array) */
  pipelineCustomFields?: Record<string, unknown> & {
    attributes?: string[];
    attribute_definitions?: Record<string, LocalAttributeDefinitionPayload>;
  };
  /** Custom fields from stage (contains attributes array) */
  stageCustomFields?: Record<string, unknown> & {
    attributes?: string[];
    attribute_definitions?: Record<string, LocalAttributeDefinitionPayload>;
  };
}

/**
 * Pipeline-specific CustomAttributesForm component with hierarchy support.
 * Handles attribute filtering and editing permissions based on pipeline hierarchy.
 */
export default function PipelineCustomAttributesForm({
  attributeModel,
  attributes,
  onAttributesChange,
  disabled = false,
  pipelineContext,
  pipelineCustomFields,
  stageCustomFields,
}: PipelineCustomAttributesFormProps) {
  const { t } = useLanguage('customAttributes');
  const { t: tp } = useLanguage('pipelines');
  const [definedAttributes, setDefinedAttributes] = useState<PipelineAttributeDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [newAttributeKey, setNewAttributeKey] = useState('');
  const [newAttributeValue, setNewAttributeValue] = useState('');
  const [newAttributeType, setNewAttributeType] = useState<AttributeDisplayType>('text');
  const [newAttributeListValues, setNewAttributeListValues] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [createError, setCreateError] = useState('');
  const hasLoadedRef = useRef(false);
  const loadContextRef = useRef<string>('');

  // Determine current context level
  const getCurrentContextLevel = (): 'pipeline' | 'stage' | 'item' => {
    if (pipelineContext.itemId) return 'item';
    if (pipelineContext.stageId) return 'stage';
    return 'pipeline';
  };

  // Get attribute origin label for display
  const getAttributeOrigin = (attribute: PipelineAttributeDefinition): 'pipeline' | 'stage' | 'item' | null => {
    const attrModel = attribute.attribute_model;
    if (attrModel === 'pipeline_attribute') return 'pipeline';
    if (attrModel === 'pipeline_stage_attribute') return 'stage';
    if (attrModel === 'pipeline_item_attribute') return 'item';
    return null;
  };

  // Filter attributes based on hierarchy rules
  // Simplified: Pipeline/Stage create attributes for items, Item creates for itself
  const filterAttributesByHierarchy = (allAttributes: PipelineAttributeDefinition[]): PipelineAttributeDefinition[] => {
    const contextLevel = getCurrentContextLevel();

    return allAttributes.filter(attr => {
      const attrModel = attr.attribute_model;

      // Pipeline level: show only pipeline attributes (they are for items)
      if (contextLevel === 'pipeline') {
        return attrModel === 'pipeline_attribute';
      }

      // Stage level: show pipeline attributes (shared with items) and stage attributes (for items)
      if (contextLevel === 'stage') {
        return attrModel === 'pipeline_attribute' || attrModel === 'pipeline_stage_attribute';
      }

      // Item level: show all attributes (pipeline, stage, and item attributes)
      if (contextLevel === 'item') {
        return attrModel === 'pipeline_attribute' ||
          attrModel === 'pipeline_stage_attribute' ||
          attrModel === 'pipeline_item_attribute';
      }

      return false;
    });
  };

  // Check if an attribute value can be edited in current context
  // Only items can edit attribute values
  const canEditAttributeValue = (): boolean => {
    const contextLevel = getCurrentContextLevel();
    return contextLevel === 'item';
  };

  // Load defined custom attributes for the specified model
  // Load only once per unique context (pipeline/stage/item combination)
  useEffect(() => {
    // Create a unique context key based on pipeline hierarchy (not attribute values)
    const contextKey = `${attributeModel}-${pipelineContext.pipelineId || ''}-${pipelineContext.stageId || ''}-${pipelineContext.itemId || ''}`;

    // Skip if already loaded for this context
    if (hasLoadedRef.current && loadContextRef.current === contextKey) {
      return;
    }

    const loadDefinedAttributes = async () => {
      setLoading(true);
      try {
        // Load all attributes for the model and related models
        const modelsToLoad: AttributeModel[] = [attributeModel];

        // Also load parent models based on context
        if (pipelineContext.itemId || pipelineContext.stageId) {
          modelsToLoad.push('pipeline_attribute');
        }
        if (pipelineContext.itemId) {
          modelsToLoad.push('pipeline_stage_attribute');
        }

        const allResponses = await Promise.all(
          modelsToLoad.map(model => customAttributesService.getCustomAttributes(model))
        );

        // Combine all attributes
        const allAttributes = allResponses.flatMap(response => response.data);

        // Filter based on hierarchy
        let filteredAttributes = filterAttributesByHierarchy(allAttributes);

        // If we have pipeline or stage custom_fields with attributes, include those attribute keys
        // This ensures that attributes defined at pipeline/stage level are shown in the item form
        if (pipelineContext.itemId) {
          const pipelineAttributeKeys = (pipelineCustomFields?.attributes as string[]) || [];
          const stageAttributeKeys = (stageCustomFields?.attributes as string[]) || [];
          const pipelineDefinitions =
            (pipelineCustomFields?.attribute_definitions as Record<string, LocalAttributeDefinitionPayload>) ||
            {};
          const stageDefinitions =
            (stageCustomFields?.attribute_definitions as Record<string, LocalAttributeDefinitionPayload>) ||
            {};
          const mergedDefinitions = { ...pipelineDefinitions, ...stageDefinitions };

          // Get all unique attribute keys from pipeline and stage
          const allAttributeKeys = new Set([
            ...pipelineAttributeKeys,
            ...stageAttributeKeys,
          ]);

          // Find attributes that match these keys
          const matchingAttributes = allAttributes.filter(attr =>
            allAttributeKeys.has(attr.attribute_key)
          );

          // Create placeholder definitions for keys that don't have definitions yet
          const missingKeys = Array.from(allAttributeKeys).filter(key =>
            !allAttributes.some(attr => attr.attribute_key === key)
          );

          const placeholderAttributes: PipelineAttributeDefinition[] = missingKeys.map(key => ({
            id: `placeholder-${key}`,
            attribute_key: key,
            attribute_display_name: mergedDefinitions[key]?.attribute_display_name || key,
            attribute_display_type: mergedDefinitions[key]?.attribute_display_type || 'text',
            attribute_values: mergedDefinitions[key]?.attribute_values,
            attribute_model: stageDefinitions[key] ? 'pipeline_stage_attribute' : 'pipeline_attribute',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));

          // Combine matching attributes with placeholders
          const combinedAttributes = [
            ...matchingAttributes,
            ...placeholderAttributes,
          ];

          // Merge with filtered attributes, avoiding duplicates
          const existingKeys = new Set(filteredAttributes.map(attr => attr.attribute_key));
          const newAttributes = combinedAttributes.filter(attr => !existingKeys.has(attr.attribute_key));
          filteredAttributes = [...filteredAttributes, ...newAttributes];
        }

        setDefinedAttributes(filteredAttributes);
        hasLoadedRef.current = true;
        loadContextRef.current = contextKey;
      } catch (error) {
        console.error('Error loading custom attributes:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDefinedAttributes();
    // Only depend on the context identifiers, not on custom_fields values
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attributeModel, pipelineContext.pipelineId, pipelineContext.stageId, pipelineContext.itemId]);

  // Form mode handlers
  const resetAddForm = () => {
    setShowAddForm(false);
    setNewAttributeKey('');
    setNewAttributeValue('');
    setNewAttributeType('text');
    setNewAttributeListValues('');
    setCreateError('');
  };

  const handleAddAttribute = () => {
    if (!newAttributeKey.trim()) return;

    const contextLevel = getCurrentContextLevel();
    const newAttributes = { ...(attributes || {}) };
    const trimmedKey = newAttributeKey.trim();
    setCreateError('');
    const invalidKeyMessage = t('modal.fields.attributeKey.errors.invalid');
    const duplicateKeyMessage = t('modal.fields.attributeKey.errors.duplicate', {
      defaultValue: 'Attribute key already exists',
    });

    if (contextLevel === 'item') {
      if (!/^[a-z0-9_]+$/.test(trimmedKey)) {
        setCreateError(invalidKeyMessage);
        return;
      }
      if (Object.keys(newAttributes).includes(trimmedKey) || definedAttributes.some(attribute => attribute.attribute_key === trimmedKey)) {
        setCreateError(duplicateKeyMessage);
        return;
      }
      if (!newAttributeValue.trim()) {
        return;
      }
      newAttributes[trimmedKey] = newAttributeValue.trim();
      onAttributesChange(newAttributes);
      resetAddForm();
      return;
    }

    const displayName = trimmedKey;
    const generatedKey = customAttributesService.generateAttributeKey(displayName);
    if (!generatedKey) {
      setCreateError(invalidKeyMessage);
      return;
    }
    if (Object.keys(newAttributes).includes(generatedKey)) {
      setCreateError(duplicateKeyMessage);
      return;
    }
    if (definedAttributes.some(attribute => attribute.attribute_key === generatedKey)) {
      setCreateError(duplicateKeyMessage);
      return;
    }

    let listValues: string[] | undefined;
    if (newAttributeType === 'list') {
      listValues = newAttributeListValues
        .split(',')
        .map(value => value.trim())
        .filter(Boolean);
      if (!listValues.length) {
        setCreateError(t('modal.fields.listValues.errors.required'));
        return;
      }
    }

    newAttributes[generatedKey] = {
      __local_definition: true,
      attribute_display_name: displayName,
      attribute_display_type: newAttributeType,
      attribute_values: listValues,
    } satisfies LocalAttributeDefinition;

    onAttributesChange(newAttributes);
    resetAddForm();
  };

  const handleRemoveAttribute = (key: string) => {
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
    onAttributesChange({
      ...(attributes || {}),
      [key]: value,
    });
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

  const normalizeDateTimeLocalValue = (value: string) => {
    if (!value) return '';
    const exactFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
    if (exactFormat.test(value)) return value;
    const prefixMatch = value.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
    if (prefixMatch) return prefixMatch[1];
    return value;
  };

  const getAttributeTypeLabel = (type: AttributeDisplayType | string): string => {
    const option = ATTRIBUTE_TYPE_OPTIONS.find(current => current.value === type);
    return option?.defaultLabel || (option?.labelKey ? t(option.labelKey) : String(type));
  };

  const getTypeOptionLabel = (option: (typeof ATTRIBUTE_TYPE_OPTIONS)[number]): string => {
    if (option.defaultLabel) return option.defaultLabel;
    if (option.labelKey) return t(option.labelKey);
    return String(option.value);
  };

  const getTypeOptionDescription = (option: (typeof ATTRIBUTE_TYPE_OPTIONS)[number]): string => {
    if (option.defaultDescription) return option.defaultDescription;
    if (option.descriptionKey) return t(option.descriptionKey);
    return '';
  };

  // Render field based on attribute type
  const renderFormField = (attribute: CustomAttributeDefinition) => {
    const rawValue = attributes?.[attribute.attribute_key];
    const value = valueToString(rawValue);
    const canEdit = canEditAttributeValue();

    const commonProps = {
      disabled: disabled || !canEdit,
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
          <Select
            items={(attribute.attribute_values ?? []).map(option => ({ value: option, label: option }))}
            value={value || null}
            onValueChange={newValue => newValue != null && handleUpdateAttribute(attribute.attribute_key, newValue)}
            disabled={disabled || !canEdit}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={t('placeholders.select', {
                  name: attribute.attribute_display_name.toLowerCase(),
                })}
              />
            </SelectTrigger>
            <SelectPopup>
              {attribute.attribute_values?.map(option => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center gap-2">
            <Switch
              checked={Boolean(rawValue)}
              onCheckedChange={checked => handleUpdateAttribute(attribute.attribute_key, checked)}
              disabled={disabled || !canEdit}
            />
            <Label className="text-sm">{rawValue ? t('checkbox.yes') : t('checkbox.no')}</Label>
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

  const attributeEntries = Object.entries(attributes || {});
  const definedAttributeKeys = definedAttributes.map(attr => attr.attribute_key);
  const adHocAttributes = attributeEntries.filter(([key]) => !definedAttributeKeys.includes(key));
  const contextLevel = getCurrentContextLevel();

  return (
    <div className="space-y-4">
      {loading && (
        <div className="flex flex-col gap-2" aria-busy="true" aria-label={t('loading')}>
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-lg border p-3">
              <Skeleton className="h-3.5 w-36" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Defined Custom Attributes */}
      {definedAttributes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Settings className="size-4" />
            <Label className="font-medium text-muted-foreground text-sm">
              {t('sections.defined')}
            </Label>
          </div>
          <div className="space-y-2">
            {definedAttributes.map(attribute => {
              const canEdit = canEditAttributeValue();
              const isShared = contextLevel !== 'item';
              const attributeOrigin = getAttributeOrigin(attribute);
              const isGlobalAttribute = !attribute.id.startsWith('placeholder-');
              const typeLabel = getAttributeTypeLabel(attribute.attribute_display_type);

              return (
                <div key={attribute.attribute_key} className="rounded-lg border p-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Label className="text-sm font-medium">
                          {attribute.attribute_display_name}
                        </Label>
                        <Badge variant={isGlobalAttribute ? 'success' : 'secondary'} size="sm">
                          {isGlobalAttribute ? 'Global' : 'Local'}
                        </Badge>
                        <Badge variant="outline" size="sm">
                          {typeLabel}
                        </Badge>
                        {/* Show origin tag in item context */}
                        {contextLevel === 'item' && attributeOrigin && (
                          <Badge variant="secondary" size="sm">
                            {attributeOrigin === 'pipeline' && t('fields.attributeScope.attributeOrigin.pipeline')}
                            {attributeOrigin === 'stage' && t('fields.attributeScope.attributeOrigin.stage')}
                            {attributeOrigin === 'item' && t('fields.attributeScope.attributeOrigin.item')}
                          </Badge>
                        )}
                        {isShared && (
                          <Badge variant="info" size="sm">
                            {attribute.attribute_scope === 'stages'
                              ? t('fields.attributeScope.sharedMessage.labelStages')
                              : t('fields.attributeScope.sharedMessage.label')}
                          </Badge>
                        )}
                        {attribute.attribute_description && (
                          <span className="text-xs text-muted-foreground">
                            - {attribute.attribute_description}
                          </span>
                        )}
                      </div>
                      {isShared && !canEdit && (
                        <p className="text-xs text-muted-foreground italic">
                          {attribute.attribute_scope === 'stages'
                            ? t('fields.attributeScope.sharedMessage.descriptionStages')
                            : t('fields.attributeScope.sharedMessage.descriptionCards')}
                        </p>
                      )}
                      {/* Only render input field if it can be edited (not shared attributes in pipeline/stage) */}
                      {canEdit && renderFormField(attribute)}
                    </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ad-hoc Custom Attributes */}
      {adHocAttributes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Plus className="size-4" />
            <Label className="font-medium text-muted-foreground text-sm">
              {t('sections.additional')}
            </Label>
          </div>
          <div className="space-y-2">
            {adHocAttributes.map(([key, value]) => {
              const localDefinition =
                value && typeof value === 'object' && '__local_definition' in (value as Record<string, unknown>)
                  ? (value as LocalAttributeDefinition)
                  : null;
              const displayName = localDefinition?.attribute_display_name || key;
              const localType = localDefinition?.attribute_display_type;
              const isObject = typeof value === 'object' && value !== null;
              const displayValue = valueToString(value);
              const canEdit = canEditAttributeValue();

              return (
                <div key={key} className="rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Label className="text-sm font-medium">{displayName}</Label>
                          <Badge variant="secondary" size="sm">
                            Local
                          </Badge>
                          {localType && (
                            <Badge variant="outline" size="sm">
                              {getAttributeTypeLabel(localType)}
                            </Badge>
                          )}
                        </div>
                        {canEdit ? (
                          <>
                            {isObject ? (
                              <Textarea
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
                                value={displayValue}
                                onChange={e => handleUpdateAttribute(key, e.target.value)}
                                placeholder={t('fields.attributeValue.placeholder')}
                                disabled={disabled}
                              />
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">
                            {t(`fields.attributeScope.sharedMessage.${contextLevel}`)}
                          </p>
                        )}
                      </div>
                      {!disabled && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleRemoveAttribute(key)}
                          className="text-muted-foreground hover:text-destructive-foreground"
                          aria-label={tp('attributes.remove', { name: displayName })}
                        >
                          <X />
                        </Button>
                      )}
                    </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add New Attribute */}
      {!disabled && (
        <div>
          {showAddForm ? (
            <div className="space-y-4 rounded-xl border bg-muted/48 p-4 dark:bg-muted/24">
                <div className="space-y-2">
                  <Label htmlFor="attribute-key">
                    {contextLevel === 'item'
                      ? t('fields.attributeKey.label')
                      : t('modal.fields.displayName.label')}
                  </Label>
                  <Input
                    id="attribute-key"
                    value={newAttributeKey}
                    onChange={e => setNewAttributeKey(e.target.value)}
                    placeholder={
                      contextLevel === 'item'
                        ? t('fields.attributeKey.placeholder')
                        : t('modal.fields.displayName.placeholder')
                    }
                  />
                </div>
                {(() => {
                  const contextLevel = getCurrentContextLevel();

                  // At item level, show value input
                  if (contextLevel === 'item') {
                    return (
                      <div className="space-y-2">
                        <Label htmlFor="attribute-value">{t('fields.attributeValue.label')} *</Label>
                        <Input
                          id="attribute-value"
                          value={newAttributeValue}
                          onChange={e => setNewAttributeValue(e.target.value)}
                          placeholder={t('fields.attributeValue.placeholder')}
                        />
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="attribute-type">{t('modal.fields.displayType.label')}</Label>
                        <Select
                          items={ATTRIBUTE_TYPE_OPTIONS.map(option => ({ value: option.value, label: getTypeOptionLabel(option) }))}
                          value={newAttributeType}
                          onValueChange={value => value != null && setNewAttributeType(value as AttributeDisplayType)}
                        >
                          <SelectTrigger id="attribute-type" className="w-full">
                            <SelectValue placeholder={t('modal.fields.displayType.label')} />
                          </SelectTrigger>
                          <SelectPopup>
                            {ATTRIBUTE_TYPE_OPTIONS.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                <div>
                                  <div className="font-medium">{getTypeOptionLabel(option)}</div>
                                  <div className="text-xs text-muted-foreground">{getTypeOptionDescription(option)}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectPopup>
                        </Select>
                      </div>
                      {newAttributeType === 'list' && (
                        <div className="space-y-2">
                          <Label htmlFor="attribute-list-values">{t('modal.fields.listValues.label')}</Label>
                          <Textarea
                            id="attribute-list-values"
                            value={newAttributeListValues}
                            onChange={e => setNewAttributeListValues(e.target.value)}
                            placeholder={t('modal.fields.listValues.placeholder')}
                            rows={3}
                          />
                        </div>
                      )}
                    </div>
                  );
                })()}
                {createError && <p className="text-destructive-foreground text-xs">{createError}</p>}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddAttribute}
                    disabled={(() => {
                      if (!newAttributeKey.trim()) return true;
                      const contextLevel = getCurrentContextLevel();
                      return contextLevel === 'item' && !newAttributeValue.trim();
                    })()}
                  >
                    {t('actions.add')}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={resetAddForm}>
                    {t('actions.cancel')}
                  </Button>
                </div>
            </div>
          ) : (
            <Button
              type="button"
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
          <Empty className="gap-4 rounded-xl border border-dashed p-6 md:p-6">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Settings />
              </EmptyMedia>
              <EmptyTitle className="text-base">{t('empty.title')}</EmptyTitle>
              <EmptyDescription>
                {!disabled ? t('empty.description') : t('empty.descriptionReadOnly')}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
    </div>
  );
}
