import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Check } from '@/components/icons';
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
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Label as UILabel } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/types/settings';
import { usePermissions } from '@/contexts/PermissionsContext';

interface LabelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label?: Label;
  isNew: boolean;
  loading: boolean;
  initialTitle?: string;
  onSubmit: (data: {
    title: string;
    description?: string;
    color: string;
    show_on_sidebar?: boolean;
  }) => void;
}

const DEFAULT_COLORS = [
  '#1f93ff', '#ff4757', '#2ed573', '#ffa502', '#5352ed',
  '#ff6b81', '#70a1ff', '#7bed9f', '#ff9f43', '#a4b0be',
  '#57606f', '#2f3542', '#ff3838', '#00d8ff', '#6c5ce7'
];

const getRandomColor = () => {
  return DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)];
};

export default function LabelModal({
  open,
  onOpenChange,
  label,
  isNew,
  loading,
  initialTitle,
  onSubmit,
}: LabelModalProps) {
  const { t } = useLanguage('labels');
  const { can } = usePermissions();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    color: '#1f93ff',
    show_on_sidebar: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      if (label && !isNew) {
        setFormData({
          title: label.title,
          description: label.description || '',
          color: label.color,
          show_on_sidebar: label.show_on_sidebar,
        });
      } else {
        setFormData({
          title: initialTitle || '',
          description: '',
          color: getRandomColor(),
          show_on_sidebar: true,
        });
      }
      setErrors({});
    }
  }, [open, label, isNew]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = t('modal.validation.nameRequired');
    } else if (formData.title.length < 2) {
      newErrors.title = t('modal.validation.nameMinLength');
    }

    if (!formData.color.trim()) {
      newErrors.color = t('modal.validation.colorRequired');
    } else if (!/^#[0-9A-F]{6}$/i.test(formData.color)) {
      newErrors.color = t('modal.validation.colorInvalid');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Verificar permissões antes de validar o formulário
    const requiredPermission = isNew ? 'create' : 'update';
    if (!can('labels', requiredPermission)) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    onSubmit({
      title: formData.title.toLowerCase().trim(),
      description: formData.description.trim() || undefined,
      color: formData.color,
      show_on_sidebar: formData.show_on_sidebar,
    });
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const canSave = can('labels', isNew ? 'create' : 'update');
  const preview = formData.title.trim().toLowerCase() || t('modal.placeholders.name');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
          <DialogHeader>
            <DialogTitle>{isNew ? t('modal.title.create') : t('modal.title.edit')}</DialogTitle>
            <DialogDescription>
              {isNew ? t('modal.description.create') : t('modal.description.edit')}
            </DialogDescription>
          </DialogHeader>

          <DialogPanel className="flex flex-col gap-5">
            {/* Live preview of the label chip */}
            <div className="flex items-center justify-center rounded-xl border bg-muted/24 py-4">
              <span
                className="inline-flex max-w-full items-center gap-1.5 truncate rounded-md border px-2 py-0.5 font-medium text-sm"
                style={{ borderColor: `${formData.color}55`, backgroundColor: `${formData.color}14` }}
              >
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: formData.color }} />
                {preview}
              </span>
            </div>

            <Field invalid={Boolean(errors.title)}>
              <FieldLabel htmlFor="title">
                {t('modal.labels.name')} <span className="text-destructive-foreground">*</span>
              </FieldLabel>
              <Input
                id="title"
                value={formData.title}
                onChange={e => handleInputChange('title', e.target.value)}
                placeholder={t('modal.placeholders.name')}
                aria-invalid={errors.title ? true : undefined}
                style={{ textTransform: 'lowercase' }}
              />
              {errors.title && <FieldError match>{errors.title}</FieldError>}
            </Field>

            <Field>
              <FieldLabel htmlFor="description">{t('modal.labels.description')}</FieldLabel>
              <Textarea
                id="description"
                value={formData.description}
                onChange={e => handleInputChange('description', e.target.value)}
                placeholder={t('modal.placeholders.description')}
                rows={3}
              />
            </Field>

            <Field invalid={Boolean(errors.color)}>
              <FieldLabel htmlFor="color">
                {t('modal.labels.color')} <span className="text-destructive-foreground">*</span>
              </FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <span className="size-4 rounded-sm border" style={{ backgroundColor: formData.color }} />
                </InputGroupAddon>
                <InputGroupInput
                  id="color"
                  type="text"
                  value={formData.color}
                  onChange={e => handleInputChange('color', e.target.value)}
                  placeholder={t('modal.placeholders.color')}
                  aria-invalid={errors.color ? true : undefined}
                  className="font-mono"
                />
              </InputGroup>
              {errors.color && <FieldError match>{errors.color}</FieldError>}
              <div className="flex flex-wrap gap-1.5 pt-1" role="listbox" aria-label={t('modal.labels.color')}>
                {DEFAULT_COLORS.map(color => {
                  const active = formData.color.toLowerCase() === color;
                  return (
                    <button
                      key={color}
                      type="button"
                      role="option"
                      aria-selected={active}
                      aria-label={color}
                      className={`flex size-6 items-center justify-center rounded-md outline-none ring-offset-2 ring-offset-background transition-shadow focus-visible:ring-2 focus-visible:ring-ring ${
                        active ? 'ring-2 ring-foreground/40' : ''
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => handleInputChange('color', color)}
                    >
                      {active && <Check className="size-3.5 text-white" />}
                    </button>
                  );
                })}
              </div>
            </Field>

            <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/24 px-4 py-3">
              <div className="flex flex-col gap-0.5">
                <UILabel htmlFor="show_on_sidebar">{t('modal.labels.showOnSidebar')}</UILabel>
                <p className="text-muted-foreground text-xs">{t('modal.hints.showOnSidebar')}</p>
              </div>
              <Switch
                id="show_on_sidebar"
                checked={formData.show_on_sidebar}
                onCheckedChange={checked => handleInputChange('show_on_sidebar', checked)}
              />
            </div>
          </DialogPanel>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="ghost" />} disabled={loading}>
              {t('modal.buttons.cancel')}
            </DialogClose>
            <Button type="submit" disabled={!canSave} loading={loading}>
              {loading ? t('modal.buttons.saving') : isNew ? t('modal.buttons.create') : t('modal.buttons.update')}
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}
