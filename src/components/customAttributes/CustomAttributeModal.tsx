import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Badge } from '@/components/ui/badge';
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
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import OptionSelect from '@/components/segments/ui/OptionSelect';
import { X, Plus } from 'lucide-react';
import {
  CustomAttributeDefinition,
  CustomAttributeFormData,
  AttributeModel,
  AttributeDisplayType,
  PipelineType,
  ATTRIBUTE_MODEL_OPTIONS,
  ATTRIBUTE_TYPE_OPTIONS,
  PIPELINE_TYPE_OPTIONS,
  pipelineTypeToAttributeModel,
  attributeModelToPipelineType,
} from '@/types/settings';
import { customAttributesService } from '@/services/customAttributes/customAttributesService';

interface CustomAttributeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attribute?: CustomAttributeDefinition;
  isNew: boolean;
  loading: boolean;
  onSubmit: (data: CustomAttributeFormData) => void;
  defaultAttributeModel?: AttributeModel;
}

export default function CustomAttributeModal({
  open,
  onOpenChange,
  attribute,
  isNew,
  loading,
  onSubmit,
  defaultAttributeModel = 'conversation_attribute',
}: CustomAttributeModalProps) {
  const { t } = useLanguage('customAttributes');
  const [formData, setFormData] = useState<CustomAttributeFormData>({
    attribute_display_name: '',
    attribute_description: '',
    attribute_display_type: AttributeDisplayType.TEXT,
    attribute_key: '',
    attribute_model: defaultAttributeModel,
    pipeline_type: undefined,
    regex_pattern: '',
    regex_cue: '',
    attribute_values: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [regexEnabled, setRegexEnabled] = useState(false);
  const [listValue, setListValue] = useState('');

  // Auto-generate attribute key from display name
  const handleDisplayNameChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      attribute_display_name: value,
      attribute_key: customAttributesService.generateAttributeKey(value),
    }));

    if (errors.attribute_display_name) {
      setErrors(prev => ({ ...prev, attribute_display_name: '' }));
    }
  };

  useEffect(() => {
    if (open) {
      if (attribute && !isNew) {
        const pipelineType = attributeModelToPipelineType(attribute.attribute_model);
        setFormData({
          attribute_display_name: attribute.attribute_display_name,
          attribute_description: attribute.attribute_description || '',
          attribute_display_type: attribute.attribute_display_type,
          attribute_key: attribute.attribute_key,
          attribute_model: pipelineType ? 'pipeline_attribute' : attribute.attribute_model,
          pipeline_type: pipelineType || undefined,
          regex_pattern: attribute.regex_pattern || '',
          regex_cue: attribute.regex_cue || '',
          attribute_values: attribute.attribute_values || [],
        });
        setRegexEnabled(!!attribute.regex_pattern);
      } else {
        setFormData({
          attribute_display_name: '',
          attribute_description: '',
          attribute_display_type: AttributeDisplayType.TEXT,
          attribute_key: '',
          attribute_model: defaultAttributeModel,
          pipeline_type: undefined,
          regex_pattern: '',
          regex_cue: '',
          attribute_values: [],
        });
        setRegexEnabled(false);
      }
      setErrors({});
      setListValue('');
    }
  }, [open, attribute, isNew, defaultAttributeModel]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.attribute_display_name.trim()) {
      newErrors.attribute_display_name = t('modal.fields.displayName.errors.required');
    } else if (formData.attribute_display_name.length < 2) {
      newErrors.attribute_display_name = t('modal.fields.displayName.errors.minLength');
    }

    if (!formData.attribute_description?.trim()) {
      newErrors.attribute_description = t('modal.fields.description.errors.required');
    }

    if (!formData.attribute_key.trim()) {
      newErrors.attribute_key = t('modal.fields.attributeKey.errors.required');
    } else if (!/^[a-z0-9_]+$/.test(formData.attribute_key)) {
      newErrors.attribute_key = t('modal.fields.attributeKey.errors.invalid');
    }

    // Validate pipeline_type when attribute_model is pipeline_attribute
    if (formData.attribute_model === 'pipeline_attribute' && !formData.pipeline_type) {
      newErrors.pipeline_type = t('modal.fields.pipelineType.errors.required');
    }

    if (
      formData.attribute_display_type === AttributeDisplayType.LIST &&
      (!formData.attribute_values || formData.attribute_values.length === 0)
    ) {
      newErrors.attribute_values = t('modal.fields.listValues.errors.required');
    }

    if (
      regexEnabled &&
      formData.regex_pattern &&
      !customAttributesService.validateRegexPattern(formData.regex_pattern)
    ) {
      newErrors.regex_pattern = t('modal.fields.regexPattern.errors.invalid');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Convert pipeline_type to the correct attribute_model
    let finalAttributeModel = formData.attribute_model;
    if (formData.attribute_model === 'pipeline_attribute' && formData.pipeline_type) {
      finalAttributeModel = pipelineTypeToAttributeModel(formData.pipeline_type);
    }

    // Create submit data without pipeline_type (it's only for UI selection)
    const { pipeline_type, ...formDataWithoutPipelineType } = formData;
    const submitData: CustomAttributeFormData = {
      ...formDataWithoutPipelineType,
      attribute_model: finalAttributeModel,
      regex_pattern: regexEnabled ? formData.regex_pattern : undefined,
      regex_cue: regexEnabled ? formData.regex_cue : undefined,
    };

    onSubmit(submitData);
  };

  const handleInputChange = (field: keyof CustomAttributeFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // List management
  const addListValue = () => {
    if (!listValue.trim()) return;

    const newValues = [...(formData.attribute_values || []), listValue.trim()];
    setFormData(prev => ({ ...prev, attribute_values: newValues }));
    setListValue('');

    if (errors.attribute_values) {
      setErrors(prev => ({ ...prev, attribute_values: '' }));
    }
  };

  const removeListValue = (index: number) => {
    const newValues = formData.attribute_values?.filter((_, i) => i !== index) || [];
    setFormData(prev => ({ ...prev, attribute_values: newValues }));
  };

  const handleListValueKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addListValue();
    }
  };

  const isListType = formData.attribute_display_type === AttributeDisplayType.LIST;
  const isTextType = formData.attribute_display_type === AttributeDisplayType.TEXT;

  const required = <span className="text-destructive-foreground">*</span>;
  const richOption = (value: string, label: string, description?: string) => ({
    value,
    label,
    content: (
      <div>
        <div className="font-medium">{label}</div>
        {description && <div className="text-muted-foreground text-xs">{description}</div>}
      </div>
    ),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isNew ? t('modal.title.new') : t('modal.title.edit')}</DialogTitle>
          <DialogDescription>{isNew ? t('modal.description.new') : t('modal.description.edit')}</DialogDescription>
        </DialogHeader>

        <DialogPanel>
          <form id="custom-attribute-form" onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
            <Field>
              <FieldLabel htmlFor="attribute_model">
                {t('modal.fields.attributeModel.label')} {required}
              </FieldLabel>
              <OptionSelect
                id="attribute_model"
                value={formData.attribute_model}
                onValueChange={value => {
                  handleInputChange('attribute_model', value as AttributeModel);
                  // Reset pipeline_type when changing attribute_model
                  if (value !== 'pipeline_attribute') {
                    handleInputChange('pipeline_type', undefined);
                  }
                }}
                disabled={!isNew} // Can't change model when editing
                options={ATTRIBUTE_MODEL_OPTIONS.map(o => richOption(o.value, o.label, o.description))}
              />
            </Field>

            {formData.attribute_model === 'pipeline_attribute' && (
              <Field invalid={!!errors.pipeline_type}>
                <FieldLabel htmlFor="pipeline_type">
                  {t('modal.fields.pipelineType.label')} {required}
                </FieldLabel>
                <OptionSelect
                  id="pipeline_type"
                  value={formData.pipeline_type || ''}
                  onValueChange={value => handleInputChange('pipeline_type', value as PipelineType)}
                  disabled={!isNew} // Can't change type when editing
                  placeholder={t('modal.fields.pipelineType.placeholder')}
                  aria-invalid={!!errors.pipeline_type}
                  options={PIPELINE_TYPE_OPTIONS.map(o => richOption(o.value, o.label, o.description))}
                />
                {errors.pipeline_type && <FieldError match>{errors.pipeline_type}</FieldError>}
                <FieldDescription>{t('modal.fields.pipelineType.hint')}</FieldDescription>
              </Field>
            )}

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field invalid={!!errors.attribute_display_name}>
                <FieldLabel htmlFor="attribute_display_name">
                  {t('modal.fields.displayName.label')} {required}
                </FieldLabel>
                <Input
                  id="attribute_display_name"
                  value={formData.attribute_display_name}
                  onChange={e => handleDisplayNameChange(e.target.value)}
                  placeholder={t('modal.fields.displayName.placeholder')}
                  aria-invalid={!!errors.attribute_display_name}
                />
                {errors.attribute_display_name && <FieldError match>{errors.attribute_display_name}</FieldError>}
              </Field>

              <Field invalid={!!errors.attribute_key}>
                <FieldLabel htmlFor="attribute_key">
                  {t('modal.fields.attributeKey.label')} {required}
                </FieldLabel>
                <Input
                  id="attribute_key"
                  value={formData.attribute_key}
                  onChange={e => handleInputChange('attribute_key', e.target.value)}
                  placeholder={t('modal.fields.attributeKey.placeholder')}
                  className="font-mono"
                  aria-invalid={!!errors.attribute_key}
                  disabled={!isNew} // Can't change key when editing
                />
                {errors.attribute_key && <FieldError match>{errors.attribute_key}</FieldError>}
                <FieldDescription>{t('modal.fields.attributeKey.hint')}</FieldDescription>
              </Field>
            </div>

            <Field invalid={!!errors.attribute_description}>
              <FieldLabel htmlFor="attribute_description">
                {t('modal.fields.description.label')} {required}
              </FieldLabel>
              <Textarea
                id="attribute_description"
                value={formData.attribute_description}
                onChange={e => handleInputChange('attribute_description', e.target.value)}
                placeholder={t('modal.fields.description.placeholder')}
                className="resize-none"
                aria-invalid={!!errors.attribute_description}
                rows={3}
              />
              {errors.attribute_description && <FieldError match>{errors.attribute_description}</FieldError>}
            </Field>

            <Field>
              <FieldLabel htmlFor="attribute_display_type">
                {t('modal.fields.displayType.label')} {required}
              </FieldLabel>
              <OptionSelect
                id="attribute_display_type"
                value={formData.attribute_display_type}
                onValueChange={value => handleInputChange('attribute_display_type', value as AttributeDisplayType)}
                options={ATTRIBUTE_TYPE_OPTIONS.map(o =>
                  richOption(
                    o.value,
                    t(o.labelKey, { defaultValue: o.defaultLabel }),
                    t(o.descriptionKey, { defaultValue: o.defaultDescription }),
                  ),
                )}
              />
            </Field>

            {isListType && (
              <Field invalid={!!errors.attribute_values}>
                <FieldLabel htmlFor="attribute_list_value">
                  {t('modal.fields.listValues.label')} {required}
                </FieldLabel>
                <div className="flex w-full gap-2">
                  <Input
                    id="attribute_list_value"
                    value={listValue}
                    onChange={e => setListValue(e.target.value)}
                    onKeyDown={handleListValueKeyPress}
                    placeholder={t('modal.fields.listValues.placeholder')}
                    aria-invalid={!!errors.attribute_values}
                  />
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={addListValue}
                          aria-label={t('modal.fields.listValues.add')}
                        />
                      }
                    >
                      <Plus />
                    </TooltipTrigger>
                    <TooltipPopup>{t('modal.fields.listValues.add')}</TooltipPopup>
                  </Tooltip>
                </div>
                {errors.attribute_values && <FieldError match>{errors.attribute_values}</FieldError>}

                {formData.attribute_values && formData.attribute_values.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {formData.attribute_values.map((value, index) => (
                      <Badge key={index} variant="secondary" className="gap-1 pe-0.5">
                        {value}
                        <button
                          type="button"
                          onClick={() => removeListValue(index)}
                          aria-label={t('modal.fields.listValues.remove', { value })}
                          className="flex size-4 items-center justify-center rounded-sm outline-none hover:bg-destructive/16 hover:text-destructive-foreground focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </Field>
            )}

            {isTextType && (
              <div className="flex flex-col gap-4 rounded-xl border p-4">
                <div className="flex items-center justify-between gap-4">
                  <Field className="gap-1">
                    <FieldLabel htmlFor="regex_enabled">{t('modal.fields.regexEnabled.label')}</FieldLabel>
                    <FieldDescription>{t('modal.fields.regexEnabled.description')}</FieldDescription>
                  </Field>
                  <Switch id="regex_enabled" checked={regexEnabled} onCheckedChange={setRegexEnabled} />
                </div>

                {regexEnabled && (
                  <div className="grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-2">
                    <Field invalid={!!errors.regex_pattern}>
                      <FieldLabel htmlFor="regex_pattern">{t('modal.fields.regexPattern.label')}</FieldLabel>
                      <Input
                        id="regex_pattern"
                        value={formData.regex_pattern}
                        onChange={e => handleInputChange('regex_pattern', e.target.value)}
                        placeholder={t('modal.fields.regexPattern.placeholder')}
                        className="font-mono"
                        aria-invalid={!!errors.regex_pattern}
                      />
                      {errors.regex_pattern && <FieldError match>{errors.regex_pattern}</FieldError>}
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="regex_cue">{t('modal.fields.regexCue.label')}</FieldLabel>
                      <Input
                        id="regex_cue"
                        value={formData.regex_cue}
                        onChange={e => handleInputChange('regex_cue', e.target.value)}
                        placeholder={t('modal.fields.regexCue.placeholder')}
                      />
                      <FieldDescription>{t('modal.fields.regexCue.hint')}</FieldDescription>
                    </Field>
                  </div>
                )}
              </div>
            )}
          </form>
        </DialogPanel>

        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />} disabled={loading}>
            {t('actions.cancel')}
          </DialogClose>
          <Button type="submit" form="custom-attribute-form" loading={loading}>
            {loading ? t('actions.saving') : isNew ? t('actions.create') : t('actions.update')}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
