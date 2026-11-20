import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

import { Team, TeamFormData } from '@/types/users';
import { useLanguage } from '@/hooks/useLanguage';

interface TeamFormProps {
  team?: Team;
  isNew?: boolean;
  loading?: boolean;
  onSubmit: (data: TeamFormData) => void;
  onCancel?: () => void;
}

interface FormData {
  name: string;
  description: string;
  allow_auto_assign: boolean;
}

const initialFormData: FormData = {
  name: '',
  description: '',
  allow_auto_assign: true,
};

export default function TeamForm({
  team,
  isNew = false,
  loading = false,
  onSubmit,
  onCancel,
}: TeamFormProps) {
  const { t } = useLanguage('teams');
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<FormData>>({});

  // Load team data when editing
  useEffect(() => {
    if (team && !isNew) {
      setFormData({
        name: team.name || '',
        description: team.description || '',
        allow_auto_assign: team.allow_auto_assign ?? true,
      });
    }
  }, [team, isNew]);

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('form.name.required');
    } else if (formData.name.length < 2) {
      newErrors.name = t('form.name.minLength');
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = t('form.description.maxLength');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const teamData: TeamFormData = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      allow_auto_assign: formData.allow_auto_assign,
    };

    onSubmit(teamData);
  };

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Field invalid={Boolean(errors.name)}>
        <FieldLabel htmlFor="name">{t('form.name.label')}</FieldLabel>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          placeholder={t('form.name.placeholder')}
          aria-invalid={errors.name ? true : undefined}
          disabled={loading}
        />
        {errors.name && <FieldError match>{errors.name}</FieldError>}
      </Field>

      <Field invalid={Boolean(errors.description)}>
        <FieldLabel htmlFor="description">{t('form.description.label')}</FieldLabel>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder={t('form.description.placeholder')}
          aria-invalid={errors.description ? true : undefined}
          rows={3}
          disabled={loading}
        />
        {errors.description ? (
          <FieldError match>{errors.description}</FieldError>
        ) : (
          <FieldDescription className="self-end tabular-nums">
            {t('form.description.counter', { current: formData.description.length })}
          </FieldDescription>
        )}
      </Field>

      <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/24 px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <Label htmlFor="allow_auto_assign">{t('form.autoAssign.label')}</Label>
          <p className="text-muted-foreground text-xs">{t('form.autoAssign.description')}</p>
        </div>
        <Switch
          id="allow_auto_assign"
          checked={formData.allow_auto_assign}
          onCheckedChange={(checked) => handleInputChange('allow_auto_assign', checked)}
          disabled={loading}
        />
      </div>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
            {t('form.actions.cancel')}
          </Button>
        )}
        <Button type="submit" disabled={!formData.name.trim()} loading={loading}>
          {loading ? t('form.actions.saving') : isNew ? t('form.actions.create') : t('form.actions.save')}
        </Button>
      </div>
    </form>
  );
}
