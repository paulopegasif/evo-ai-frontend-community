import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Plus, Globe, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Macro, MACRO_ACTION_TYPES } from '@/types/automation';
import { macrosService } from '@/services/macros';
import MacroActionRow from './MacroActionRow';
import RadioCardGroup from '@/components/base/RadioCard';

interface MacroFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  macro?: Macro | null;
  onSuccess: () => void;
}

interface FormData {
  name: string;
  visibility: 'personal' | 'global';
  actions: Array<{
    action_name: string;
    action_params: any[];
  }>;
}

const initialFormData: FormData = {
  name: '',
  visibility: 'personal',
  actions: [
    {
      action_name: 'assign_team',
      action_params: [],
    },
  ],
};

export default function MacroFormModal({ isOpen, onClose, macro, onSuccess }: MacroFormModalProps) {
  const { t } = useLanguage('macros');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formDataOptions, setFormDataOptions] = useState<{
    inboxes: any[];
    agents: any[];
    teams: any[];
    labels: any[];
    campaigns: any[];
  }>({
    inboxes: [],
    agents: [],
    teams: [],
    labels: [],
    campaigns: [],
  });

  const isEditing = !!macro;

  // Carregar dados do formulário
  useEffect(() => {
    if (isOpen) {
      loadFormData();
    }
  }, [isOpen]);

  // Carregar dados da macro para edição
  useEffect(() => {
    if (isOpen) {
      if (macro) {
        setFormData({
          name: macro.name,
          visibility: macro.visibility,
          actions: macro.actions,
        });
      } else {
        setFormData(initialFormData);
      }
      setErrors({});
    }
  }, [isOpen, macro]);

  const loadFormData = async () => {
    try {
      const data = await macrosService.getFormData();
      setFormDataOptions(data);
    } catch (error) {
      console.error('Erro ao carregar dados do formulário:', error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('modal.validation.nameRequired');
    }

    if (formData.actions.length === 0) {
      newErrors.actions = t('modal.validation.actionsRequired');
    }

    // Validar ações
    formData.actions.forEach((action, index) => {
      if (!action.action_name) {
        newErrors[`action_${index}_name`] = t('modal.validation.actionTypeRequired');
      }

      // Validar parâmetros para ações que precisam
      const actionType = MACRO_ACTION_TYPES.find(type => type.key === action.action_name);
      if (actionType && actionType.inputType && actionType.inputType !== null) {
        // Para multi_select, verificar se tem pelo menos um item selecionado
        if (actionType.inputType === 'multi_select') {
          if (!action.action_params || action.action_params.length === 0) {
            newErrors[`action_${index}_params`] = t('modal.validation.selectAtLeastOne');
          }
        }
        // Para outros tipos com input, verificar se o primeiro parâmetro existe
        else if (
          !action.action_params ||
          action.action_params.length === 0 ||
          (!action.action_params[0] && action.action_params[0] !== 0)
        ) {
          newErrors[`action_${index}_params`] = t('modal.validation.fieldRequired');
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      if (isEditing) {
        await macrosService.updateMacro(macro.id, formData);
        toast.success(t('messages.updateSuccess'));
      } else {
        await macrosService.createMacro(formData);
        toast.success(t('messages.createSuccess'));
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving macro:', error);
      toast.error(isEditing ? t('messages.updateError') : t('messages.createError'));
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Limpar erro do campo
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const addAction = () => {
    setFormData(prev => ({
      ...prev,
      actions: [
        ...prev.actions,
        {
          action_name: 'assign_team',
          action_params: [],
        },
      ],
    }));
  };

  const removeAction = (index: number) => {
    if (formData.actions.length <= 1) return;

    setFormData(prev => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index),
    }));
  };

  const updateAction = (index: number, updatedAction: any) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.map((action, i) => (i === index ? updatedAction : action)),
    }));

    // Limpar erros relacionados à ação
    const newErrors = { ...errors };
    delete newErrors[`action_${index}_name`];
    delete newErrors[`action_${index}_params`];
    setErrors(newErrors);
  };

  // const getActionTypeLabel = (actionType: string) => {
  //   const actionTypeObj = MACRO_ACTION_TYPES.find(type => type.key === actionType);
  //   return actionTypeObj?.name || actionType;
  // };

  const visibilityOptions = [
    {
      value: 'personal' as const,
      icon: Lock,
      title: t('modal.form.visibilityPersonal'),
      description: t('modal.form.visibilityPersonalDesc'),
    },
    {
      value: 'global' as const,
      icon: Globe,
      title: t('modal.form.visibilityGlobal'),
      description: t('modal.form.visibilityGlobalDesc'),
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogPopup className="sm:max-w-4xl">
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
          <DialogHeader>
            <DialogTitle>{isEditing ? t('modal.title.edit') : t('modal.title.create')}</DialogTitle>
          </DialogHeader>

          <DialogPanel className="flex flex-col gap-6">
            <Field invalid={Boolean(errors.name)}>
              <FieldLabel htmlFor="name">
                {t('modal.form.name')} <span className="text-destructive-foreground">*</span>
              </FieldLabel>
              <Input
                id="name"
                value={formData.name}
                onChange={e => handleFieldChange('name', e.target.value)}
                placeholder={t('modal.form.namePlaceholder')}
                aria-invalid={errors.name ? true : undefined}
                disabled={loading}
              />
              {errors.name && <FieldError match>{errors.name}</FieldError>}
            </Field>

            <div className="flex flex-col gap-2">
              <span className="font-medium text-sm" id="macro-visibility-label">
                {t('modal.form.visibility')}
              </span>
              <RadioCardGroup
                aria-labelledby="macro-visibility-label"
                value={formData.visibility}
                onValueChange={value => handleFieldChange('visibility', value)}
                disabled={loading}
                options={visibilityOptions.map(opt => {
                  const Icon = opt.icon;
                  return { value: opt.value, title: opt.title, description: opt.description, icon: <Icon /> };
                })}
              />
            </div>

            <div className="flex flex-col gap-4 border-t pt-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-base">{t('modal.form.actionsTitle')}</h3>
                  <p className="text-muted-foreground text-sm">{t('modal.form.actionsSubtitle')}</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addAction} disabled={loading}>
                  <Plus />
                  {t('modal.form.addAction')}
                </Button>
              </div>

              {errors.actions && (
                <p className="text-destructive-foreground text-sm" role="alert">
                  {errors.actions}
                </p>
              )}

              <div className="flex flex-col gap-3">
                {formData.actions.map((action, index) => (
                  <MacroActionRow
                    key={index}
                    action={action}
                    index={index}
                    options={formDataOptions}
                    onUpdate={updateAction}
                    onRemove={removeAction}
                    canRemove={formData.actions.length > 1}
                    errors={errors}
                    disabled={loading}
                  />
                ))}
              </div>
            </div>
          </DialogPanel>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              {t('modal.buttons.cancel')}
            </Button>
            <Button type="submit" loading={loading}>
              {loading ? t('modal.buttons.saving') : isEditing ? t('modal.buttons.update') : t('modal.buttons.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}
