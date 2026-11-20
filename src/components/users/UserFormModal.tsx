import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import usersService from '@/services/users/usersService';
import useRoles from '@/hooks/useRoles';
import type { User, UserFormData, UserUpdateData } from '@/types/users';
import { useLanguage } from '@/hooks/useLanguage';


interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSuccess: () => void;
}

export default function UserFormModal({ isOpen, onClose, user, onSuccess }: UserFormModalProps) {
  const { t } = useLanguage('users');

  // Buscar system roles (todos os tipos) + roles customizadas type:'account'.
  // Atendentes podem receber tanto as roles base (agent/account_owner) quanto
  // roles customizadas type:'account' (ex.: "Converse"). O backend passou a
  // retornar essas roles account em account_user_roles (RBAC split).
  const { roles: systemRoles, error: rolesError } = useRoles();
  const { roles: accountRoles } = useRoles({ type: 'account' });

  // Deduplicar roles por chave para evitar que apareçam duplicados ou que a seleção marque múltiplos
  const uniqueRoles = useMemo(() => {
    // Definimos os papéis básicos que devem estar sempre disponíveis
    const baseRoles = [
      { id: 'role-agent', key: 'agent', name: 'Agent', type: 'user' },
      { id: 'role-account-owner', key: 'account_owner', name: 'Account Owner', type: 'user' },
    ];

    // Roles atribuíveis a atendentes: type 'user' (compat legado), 'account'
    // (atendentes customizados) ou sem type definido.
    const assignableRoleTypes = ['user', 'account', null, undefined];
    const filteredSystemRoles = [...systemRoles, ...accountRoles].filter(
      role => !!role.key && (assignableRoleTypes.includes(role.type as any) || !role.type)
    );

    // Combinamos e removemos duplicatas por key (dando preferência ao que vem
    // do sistema/account se existir).
    return Array.from(
      new Map(
        [...baseRoles, ...filteredSystemRoles].map(role => [role.key, role])
      ).values()
    );
  }, [systemRoles, accountRoles]);

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    role: 'agent',
    availability: 'online',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role?.key || 'agent',
        availability: user.availability || 'online',
      });
    } else {
      setFormData({
        name: '',
        email: '',
        role: 'agent',
        availability: 'online',
        password: '',
        confirmPassword: '',
      });
    }
    setErrors({});
  }, [user]);

  const handleFieldChange = (field: keyof UserFormData, value: string) => {
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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('form.validation.nameRequired');
    }

    if (!formData.role) {
      newErrors.role = t('form.validation.roleRequired');
    }

    if (!formData.email.trim()) {
      newErrors.email = t('form.validation.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('form.validation.emailInvalid');
    }

    if (!user) {
      // Validações apenas para criação
      if (!formData.password) {
        newErrors.password = t('form.validation.passwordRequired');
      } else if (formData.password.length < 6) {
        newErrors.password = t('form.validation.passwordMinLength');
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = t('form.validation.passwordMismatch');
      }
    } else if (formData.password) {
      // Validações para atualização (senha opcional)
      if (formData.password.length < 6) {
        newErrors.password = t('form.validation.passwordMinLength');
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = t('form.validation.passwordMismatch');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (user) {
        // Atualizar usuário
        const updateData: UserUpdateData = {
          name: formData.name,
          role: formData.role,
          availability: formData.availability,
        };

        await usersService.updateUser(user.id, updateData);
        toast.success(t('form.messages.updateSuccess'));
      } else {
        // Criar novo usuário
        const createData: UserFormData = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          availability: formData.availability,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        };

        await usersService.createUser(createData);
        toast.success(t('form.messages.createSuccess'));
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar usuário:', error);

      // Parse structured validation errors from the API (EVO-1063)
      const details = error?.response?.data?.error?.details;
      if (Array.isArray(details)) {
        const fieldErrors: Record<string, string> = {};
        details.forEach((d: { field: string; full_messages?: string[] }) => {
          if (d.field && d.full_messages?.length) {
            fieldErrors[d.field] = d.full_messages.join('. ');
          }
        });

        if (Object.keys(fieldErrors).length > 0) {
          setErrors(prev => ({ ...prev, ...fieldErrors }));
          return;
        }
      }

      toast.error(t('form.messages.saveError'));
    } finally {
      setLoading(false);
    }
  };

  const roleItems = uniqueRoles.map(role => ({ value: role.key as string, label: role.name as string }));
  const availabilityItems = [
    { value: 'online', label: t('form.fields.availability.online') },
    { value: 'busy', label: t('form.fields.availability.busy') },
    { value: 'offline', label: t('form.fields.availability.offline') },
  ];

  const textField = (
    field: 'name' | 'email' | 'password' | 'confirmPassword',
    label: string,
    placeholder: string,
    opts: { type?: string; disabled?: boolean; description?: string } = {},
  ) => (
    <Field invalid={Boolean(errors[field])}>
      <FieldLabel htmlFor={field}>{label}</FieldLabel>
      <Input
        id={field}
        type={opts.type}
        value={formData[field] ?? ''}
        onChange={e => handleFieldChange(field, e.target.value)}
        placeholder={placeholder}
        aria-invalid={errors[field] ? true : undefined}
        disabled={loading || opts.disabled}
      />
      {errors[field] ? (
        <FieldError match>{errors[field]}</FieldError>
      ) : (
        opts.description && <FieldDescription>{opts.description}</FieldDescription>
      )}
    </Field>
  );

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogPopup className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
          <DialogHeader>
            <DialogTitle>{user ? t('form.title.edit') : t('form.title.create')}</DialogTitle>
          </DialogHeader>

          <DialogPanel className="flex flex-col gap-5">
            {textField('name', t('form.fields.name.label'), t('form.fields.name.placeholder'))}
            {textField('email', t('form.fields.email.label'), t('form.fields.email.placeholder'), {
              type: 'email',
              disabled: !!user,
              description: user ? t('form.fields.email.cannotChange') : undefined,
            })}

            <div className="grid gap-5 sm:grid-cols-2">
              <Field invalid={Boolean(errors.role)}>
                <FieldLabel htmlFor="role">{t('form.fields.role.label')}</FieldLabel>
                <Select
                  items={roleItems}
                  value={formData.role}
                  onValueChange={value => value && handleFieldChange('role', value as string)}
                  disabled={loading}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder={t('form.fields.role.placeholder')} />
                  </SelectTrigger>
                  <SelectPopup>
                    {uniqueRoles.length === 0 && (
                      <div className="px-2 py-4 text-center text-muted-foreground text-sm">
                        {rolesError ? rolesError : t('form.messages.loading')}
                      </div>
                    )}
                    {uniqueRoles.map(role => (
                      <SelectItem key={role.id} value={role.key}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
                {errors.role && <FieldError match>{errors.role}</FieldError>}
              </Field>

              <Field>
                <FieldLabel htmlFor="availability">{t('form.fields.availability.label')}</FieldLabel>
                <Select
                  items={availabilityItems}
                  value={formData.availability}
                  onValueChange={value => value && handleFieldChange('availability', value as string)}
                  disabled={loading}
                >
                  <SelectTrigger id="availability">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopup>
                    {availabilityItems.map(item => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              </Field>
            </div>

            {(!user || formData.password) && (
              <div className="grid gap-5 sm:grid-cols-2">
                {textField(
                  'password',
                  user ? t('form.fields.password.labelOptional') : t('form.fields.password.label'),
                  t('form.fields.password.placeholder'),
                  { type: 'password' },
                )}
                {textField(
                  'confirmPassword',
                  user ? t('form.fields.confirmPassword.labelOptional') : t('form.fields.confirmPassword.label'),
                  t('form.fields.confirmPassword.placeholder'),
                  { type: 'password' },
                )}
              </div>
            )}
          </DialogPanel>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              {t('form.actions.cancel')}
            </Button>
            <Button type="submit" loading={loading}>
              {loading ? t('form.actions.saving') : user ? t('form.actions.save') : t('form.actions.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}
