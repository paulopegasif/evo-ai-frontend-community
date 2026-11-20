import React, { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import OptionSelect from '@/components/segments/ui/OptionSelect';
import { Trash2, Upload, X } from 'lucide-react';
import { MACRO_ACTION_TYPES } from '@/types/automation';

interface ActionRowProps {
  action: {
    action_name: string;
    action_params: any[];
  };
  index: number;
  options: {
    inboxes: any[];
    agents: any[];
    teams: any[];
    labels: any[];
    campaigns: any[];
  };
  onUpdate: (index: number, action: any) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
  errors: Record<string, string>;
  disabled: boolean;
}

export default function MacroActionRow({
  action,
  index,
  options,
  onUpdate,
  onRemove,
  canRemove,
  errors,
  disabled,
}: ActionRowProps) {
  const { t } = useLanguage('macros');
  const [uploadingFile, setUploadingFile] = useState(false);

  const selectedActionConfig = MACRO_ACTION_TYPES.find(a => a.key === action.action_name);

  const handleFieldChange = (field: string, value: any) => {
    const updated = { ...action, [field]: value };

    // Reset params quando mudar a ação
    if (field === 'action_name') {
      updated.action_params = [];
    }

    onUpdate(index, updated);
  };

  const handleParamsChange = (params: any[]) => {
    onUpdate(index, { ...action, action_params: params });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      // TODO: Implementar upload real
      // const blobId = await macroService.uploadAttachment(file);
      const blobId = `blob_${Date.now()}`; // Mock para desenvolvimento

      handleParamsChange([blobId]);
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
    } finally {
      setUploadingFile(false);
    }
  };

  const renderActionInput = () => {
    if (!selectedActionConfig) return null;

    const { inputType, options: actionOptions } = selectedActionConfig;

    switch (inputType) {
      case 'select':
        let selectOptions: any[] = [];

        // Determinar opções baseadas na ação
        switch (action.action_name) {
          case 'assign_agent':
            selectOptions = options.agents;
            break;
          case 'assign_team':
            selectOptions = options.teams;
            break;
          case 'change_priority':
          case 'change_status':
            selectOptions = actionOptions || [];
            break;
          default:
            selectOptions = actionOptions || [];
        }

        return (
          <OptionSelect
            id={`macro-action-config-${index}`}
            value={action.action_params[0]?.toString() || ''}
            onValueChange={value => handleParamsChange([parseInt(value) || value])}
            disabled={disabled}
            placeholder={t('actionRow.selectPlaceholder')}
            empty={t('actionRow.loadingOptions')}
            options={selectOptions.map(option => ({
              value: (option.value || option.id).toString(),
              label: option.label || option.name || option.title,
            }))}
          />
        );

      case 'multi_select':
        let multiSelectOptions: any[] = [];

        switch (action.action_name) {
          case 'add_label':
          case 'remove_label':
            multiSelectOptions = options.labels;
            break;
          default:
            multiSelectOptions = actionOptions || [];
        }

        return (
          <div className="flex flex-col gap-2">
            <OptionSelect
              id={`macro-action-config-${index}`}
              value=""
              onValueChange={value => {
                const numValue = parseInt(value) || value;
                if (value && !action.action_params.includes(numValue)) {
                  handleParamsChange([...action.action_params, numValue]);
                }
              }}
              disabled={disabled}
              placeholder={t('actionRow.multiSelectPlaceholder')}
              empty={t('actionRow.loadingOptions')}
              options={multiSelectOptions.map(option => ({
                value: (option.value || option.id).toString(),
                label: option.label || option.name || option.title,
              }))}
            />

            {/* Valores selecionados */}
            {action.action_params.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {action.action_params.map(paramValue => {
                  const option = multiSelectOptions.find(
                    o => (o.value || o.id).toString() === paramValue.toString(),
                  );
                  const label = option?.label || option?.name || option?.title || paramValue;
                  return (
                    <Badge key={paramValue} variant="secondary" className="gap-1 pe-0.5">
                      {label}
                      <button
                        type="button"
                        className="flex size-4 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-64"
                        onClick={() => handleParamsChange(action.action_params.filter(p => p !== paramValue))}
                        disabled={disabled}
                        aria-label={t('actionRow.removeValue', { value: String(label) })}
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        );

      case 'textarea':
        return (
          <Textarea
            value={action.action_params[0] || ''}
            onChange={e => handleParamsChange([e.target.value])}
            placeholder={t('actionRow.textareaPlaceholder')}
            id={`macro-action-config-${index}`}
            disabled={disabled}
            rows={3}
          />
        );

      case 'text':
        return (
          <Input
            type="text"
            value={action.action_params[0] || ''}
            onChange={e => handleParamsChange([e.target.value])}
            placeholder={
              action.action_name === 'snooze_conversation'
                ? t('actionRow.hoursPlaceholder')
                : t('actionRow.textPlaceholder')
            }
            id={`macro-action-config-${index}`}
            disabled={disabled}
          />
        );

      case 'email':
        return (
          <Input
            type="email"
            value={action.action_params[0] || ''}
            onChange={e => handleParamsChange([e.target.value])}
            placeholder={t('actionRow.emailPlaceholder')}
            id={`macro-action-config-${index}`}
            disabled={disabled}
          />
        );

      case 'url':
        return (
          <Input
            type="url"
            value={action.action_params[0] || ''}
            onChange={e => handleParamsChange([e.target.value])}
            placeholder={t('actionRow.urlPlaceholder')}
            id={`macro-action-config-${index}`}
            disabled={disabled}
          />
        );

      case 'file':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || uploadingFile}
                onClick={() => document.getElementById(`file-${index}`)?.click()}
              >
                <Upload />
                {uploadingFile ? t('actionRow.fileUploading') : t('actionRow.fileSelectButton')}
              </Button>

              <input
                id={`file-${index}`}
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                disabled={disabled}
              />
            </div>

            {action.action_params.length > 0 && (
              <div className="text-muted-foreground text-sm">
                {t('actionRow.fileSelected', { filename: action.action_params[0] })}
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="text-muted-foreground text-sm italic">{t('actionRow.noConfig')}</div>
        );
    }
  };

  const nameError = errors[`action_${index}_name`];
  const paramsError = errors[`action_${index}_params`];

  return (
    <div className="rounded-xl border bg-muted/24 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {/* Ação */}
        <Field invalid={Boolean(nameError)} className="flex-1">
          <FieldLabel htmlFor={`macro-action-${index}`}>{t('modal.form.actionLabel')}</FieldLabel>
          <OptionSelect
            id={`macro-action-${index}`}
            value={action.action_name}
            onValueChange={value => handleFieldChange('action_name', value)}
            disabled={disabled}
            aria-invalid={Boolean(nameError)}
            placeholder={t('actionRow.selectPlaceholder')}
            options={MACRO_ACTION_TYPES.map(actionConfig => ({
              value: actionConfig.key,
              label: actionConfig.name,
              content: (
                <div className="flex flex-col">
                  <span className="font-medium">{actionConfig.name}</span>
                  <span className="text-muted-foreground text-xs">{actionConfig.description}</span>
                </div>
              ),
            }))}
          />
          {nameError && <FieldError match>{nameError}</FieldError>}
        </Field>

        {/* Configuração da ação */}
        {selectedActionConfig && selectedActionConfig.inputType && (
          <Field invalid={Boolean(paramsError)} className="flex-1">
            <FieldLabel htmlFor={`macro-action-config-${index}`}>{t('modal.form.configLabel')}</FieldLabel>
            {renderActionInput()}
            {paramsError && <FieldError match>{paramsError}</FieldError>}
          </Field>
        )}

        {/* Botão de remover */}
        {canRemove && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemove(index)}
                  disabled={disabled}
                  aria-label={t('actionRow.removeAction')}
                  className="self-end sm:mt-6 sm:self-start"
                />
              }
            >
              <Trash2 />
            </TooltipTrigger>
            <TooltipPopup>{t('actionRow.removeAction')}</TooltipPopup>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
