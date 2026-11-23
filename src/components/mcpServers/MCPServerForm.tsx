import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Server, Settings, Wrench } from 'lucide-react';
import { MCPServer, MCPServerFormData } from '@/types/ai';

interface MCPServerFormProps {
  server: MCPServer;
  mode: 'create' | 'edit' | 'view';
  loading: boolean;
  onSubmit: (data: MCPServerFormData) => void;
  onCancel: () => void;
  onChange: (data: ServerData) => void;
}

interface ServerData {
  name: string;
  description: string;
  config_type: string;
  type: string;
  environments: Record<string, unknown>;
  config_json: Record<string, unknown>;
  tools: Array<{
    config: Record<string, unknown>;
    description: string;
    name: string;
    tags: string[];
  }>;
}

const initialFormData: ServerData = {
  name: '',
  description: '',
  config_type: 'sse',
  type: 'community',
  environments: {},
  config_json: {},
  tools: [],
};

export default function MCPServerForm({
  server,
  mode = 'create',
  loading = false,
  onSubmit,
  onCancel,
  onChange,
}: MCPServerFormProps) {
  const { t } = useLanguage('mcpServers');
  const [formData, setFormData] = useState<ServerData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const configTypeOptions = [
    { value: 'sse', label: t('form.configTypes.sse') },
    { value: 'studio', label: t('form.configTypes.studio') },
  ];

  const serverTypeOptions = [
    { value: 'official', label: t('form.types.official') },
    { value: 'community', label: t('form.types.community') },
  ];

  // Initialize form data when server changes
  useEffect(() => {
    if (server && mode !== 'create') {
      const newFormData = {
        name: server.name || '',
        description: server.description || '',
        config_type: server.config_type || 'sse',
        type: server.type || 'community',
        environments: server.environments || {},
        config_json: server.config_json || {},
        tools: server.tools || [],
      };
      setFormData(newFormData);
    } else {
      setFormData(initialFormData);
    }
  }, [server, mode]);

  const handleInputChange = useCallback(
    (field: keyof ServerData, value: string | number) => {
      onChange({ ...formData, [field]: value });
    },
    [formData, onChange],
  );

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('form.validation.nameRequired');
    }

    if (!formData.config_type) {
      newErrors.config_type = t('form.validation.configTypeRequired');
    }

    if (!formData.type) {
      newErrors.type = t('form.validation.typeRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const submitData: MCPServerFormData = {
      name: formData.name.trim(),
      description: formData.description.trim() || '',
      config_type: formData.config_type,
      type: formData.type,
      environments: formData.environments,
      config_json: formData.config_json,
      tools: formData.tools,
    };

    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Server className="h-5 w-5" />
          {t('form.sections.basicInfo')}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field invalid={!!errors.name}>
            <FieldLabel htmlFor="name">
              {t('form.labels.name')} <span className="text-destructive-foreground">*</span>
            </FieldLabel>
            <Input
              id="name"
              value={formData.name}
              onChange={e => handleInputChange('name', e.target.value)}
              placeholder={t('form.placeholders.name')}
              disabled={loading}
              aria-invalid={errors.name ? true : undefined}
            />
            {errors.name && <FieldError match>{errors.name}</FieldError>}
          </Field>

          <Field invalid={!!errors.type}>
            <FieldLabel htmlFor="type">
              {t('form.labels.type')} <span className="text-destructive-foreground">*</span>
            </FieldLabel>
            <Select
              items={serverTypeOptions}
              value={formData.type || null}
              onValueChange={value => handleInputChange('type', value == null ? '' : String(value))}
              disabled={loading}
            >
              <SelectTrigger id="type" aria-invalid={errors.type ? true : undefined}>
                <SelectValue />
              </SelectTrigger>
              <SelectPopup alignItemWithTrigger={false}>
                {serverTypeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
            {errors.type && <FieldError match>{errors.type}</FieldError>}
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="description">{t('form.labels.description')}</FieldLabel>
          <Textarea
            id="description"
            value={formData.description}
            onChange={e => handleInputChange('description', e.target.value)}
            placeholder={t('form.placeholders.description')}
            disabled={loading}
            rows={3}
          />
        </Field>
      </div>

      <Separator />

      {/* Configuration */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Settings className="h-5 w-5" />
          {t('form.sections.configuration')}
        </h3>

        <Field invalid={!!errors.config_type}>
          <FieldLabel htmlFor="config_type">
            {t('form.labels.configType')} <span className="text-destructive-foreground">*</span>
          </FieldLabel>
          <Select
            items={configTypeOptions}
            value={formData.config_type || null}
            onValueChange={value => handleInputChange('config_type', value == null ? '' : String(value))}
            disabled={loading}
          >
            <SelectTrigger id="config_type" aria-invalid={errors.config_type ? true : undefined}>
              <SelectValue />
            </SelectTrigger>
            <SelectPopup alignItemWithTrigger={false}>
              {configTypeOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
          {errors.config_type && <FieldError match>{errors.config_type}</FieldError>}
        </Field>
      </div>

      <Separator />

      {/* Tools Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          {t('form.sections.tools')}
        </h3>
        <div className="rounded-lg border border-dashed bg-muted/24 p-4">
          <div className="text-center">
            <Wrench className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {formData.tools.length > 0
                ? t('form.toolsInfo.configured', { count: formData.tools.length })
                : t('form.toolsInfo.noTools')}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{t('form.toolsInfo.autoLoad')}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="flex-1"
          >
            {t('form.buttons.cancel')}
          </Button>
        )}
        <Button type="submit" disabled={loading} className="flex-1">
          {loading
            ? t('form.buttons.saving')
            : mode === 'create'
            ? t('form.buttons.create')
            : t('form.buttons.update')}
        </Button>
      </div>
    </form>
  );
}
