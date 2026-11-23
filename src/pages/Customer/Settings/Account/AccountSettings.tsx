import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { type Locale } from '@/i18n/config';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useCurrentUser } from '@/utils/auth';
import { isAdminRole } from '@/constants/roles';
import BaseHeader from '@/components/base/BaseHeader';
import SettingsSection from '@/components/base/SettingsSection';
import { accountService } from '@/services/account/accountService';
import { useAppDataStore } from '@/store/appDataStore';
import type { Account, FormDataOptions } from '@/types/settings';
import { Copy } from '@/components/icons';

import { SettingsTour } from '@/tours';

export default function AccountSettings() {
  const { t, changeLanguage } = useLanguage('accountSettings');
  const { can, isReady: permissionsReady } = usePermissions();
  const currentUser = useCurrentUser();
  const isAdmin = !!currentUser?.role?.key && isAdminRole(currentUser.role.key);
  const normalizeAccountLocale = (locale?: string | null): string => {
    if (!locale) return 'pt-BR';
    const normalized = locale.replace('_', '-');
    if (normalized.toLowerCase() === 'pt-br') return 'pt-BR';
    return normalized;
  };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    locale: 'pt-BR',
    domain: '',
    supportEmail: '',
    autoResolveAfter: 0,
    autoResolveMessage: '',
    autoResolveIgnoreWaiting: false,
    autoResolveLabel: 'none',
    audioTranscriptions: false,
    autoResolveEnabled: false,
    maskContactPii: false,
  });
  const [formDataOptions, setFormDataOptions] = useState<FormDataOptions>({
    inboxes: [],
    agents: [],
    teams: [],
    labels: [],
  });
  const [globalConfig, setGlobalConfig] = useState<{
    gitSha?: string;
    appVersion?: string;
    isOnEvolutionCloud?: boolean;
  }>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Linguagens disponíveis - baseado no LANGUAGES_CONFIG do Evolution
  // Apenas idiomas com enabled: true e que estão em SUPPORTED_LOCALES
  const languages = [
    { code: 'en', name: 'English (en)' },
    { code: 'fr', name: 'Français (fr)' },
    { code: 'it', name: 'Italiano (it)' },
    { code: 'es', name: 'Español (es)' },
    { code: 'pt', name: 'Português (pt)' },
    { code: 'pt-BR', name: 'Português Brasileiro (pt-BR)' },
  ];

  useEffect(() => {
    if (!permissionsReady) {
      return;
    }

    loadAccountData();
  }, [permissionsReady]);

  const loadAccountData = async () => {
    if (!can('accounts', 'read')) {
      toast.error(t('messages.permissionDenied.read'));
      return;
    }
    try {
      setLoading(true);
      const [accountData, formDataRes, configRes] = await Promise.all([
        accountService.getAccount(),
        accountService.getFormData(),
        accountService.getGlobalConfig(),
      ]);

      setAccount(accountData);
      setFormDataOptions(formDataRes);
      setGlobalConfig(configRes);

      // Inicializar o form com dados da conta
      const settings = accountData.settings || {};
      setFormData({
        name: accountData.name || '',
        locale: normalizeAccountLocale(accountData.locale || 'pt-BR'),
        domain: accountData.domain || '',
        supportEmail: accountData.support_email || '',
        autoResolveAfter: settings.auto_resolve_after || 0,
        autoResolveMessage: settings.auto_resolve_message || '',
        autoResolveIgnoreWaiting: settings.auto_resolve_ignore_waiting || false,
        autoResolveLabel: settings.auto_resolve_label || 'none',
        audioTranscriptions: settings.audio_transcriptions || false,
        autoResolveEnabled: !!settings.auto_resolve_after,
        maskContactPii: settings.mask_contact_pii || false,
      });
    } catch (error) {
      console.error('Erro ao carregar dados da conta:', error);
      toast.error(t('messages.error.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: string, value: unknown) => {
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
      newErrors.name = t('validation.nameRequired');
    }

    if (!formData.locale) {
      newErrors.locale = t('validation.localeRequired');
    }

    if (formData.autoResolveEnabled && formData.autoResolveAfter < 10) {
      newErrors.autoResolveAfter = t('validation.minAutoResolveTime');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGeneralSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!can('accounts', 'update')) {
      toast.error(t('messages.permissionDenied.update'));
      return;
    }
    if (!validateForm()) return;

    setSaving(true);
    try {
      const normalizedLocale = normalizeAccountLocale(formData.locale);
      await accountService.updateAccount({
        name: formData.name,
        locale: normalizedLocale,
        domain: formData.domain,
        support_email: formData.supportEmail,
      });

      changeLanguage(normalizedLocale as Locale);

      toast.success(t('messages.success.generalUpdated'));
      await loadAccountData(); // Recarregar dados
    } catch (error: unknown) {
      console.error('Erro ao salvar:', error);
      toast.error((error as Error).message || t('messages.error.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleAutoResolveSubmit = async () => {
    if (!formData.autoResolveEnabled) {
      // Desabilitar auto-resolve
      try {
        setSaving(true);
        await accountService.updateAccount({
          auto_resolve_after: null,
          auto_resolve_message: '',
          auto_resolve_ignore_waiting: false,
          auto_resolve_label: null,
        });
        toast.success(t('messages.success.autoResolveDisabled'));
        await loadAccountData();
      } catch (error: unknown) {
        toast.error((error as Error).message || t('messages.error.autoResolveDisableFailed'));
      } finally {
        setSaving(false);
      }
      return;
    }

    if (formData.autoResolveAfter < 10) {
      toast.error(t('messages.error.minTime'));
      return;
    }

    try {
      setSaving(true);
      await accountService.updateAccount({
        auto_resolve_after: formData.autoResolveAfter,
        auto_resolve_message: formData.autoResolveMessage,
        auto_resolve_ignore_waiting: formData.autoResolveIgnoreWaiting,
        auto_resolve_label: formData.autoResolveLabel === 'none' ? null : formData.autoResolveLabel,
      });
      toast.success(t('messages.success.autoResolveUpdated'));
      await loadAccountData();
    } catch (error: unknown) {
      toast.error((error as Error).message || t('messages.error.autoResolveSaveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleAudioTranscriptionToggle = async (enabled: boolean) => {
    try {
      const updated = await accountService.updateAccount({
        settings: {
          ...(account?.settings ?? {}),
          audio_transcriptions: enabled,
        },
      });
      setAccount(updated);
      setFormData(prev => ({ ...prev, audioTranscriptions: enabled }));
      try {
        await useAppDataStore.getState().fetchAccount(true);
      } catch (cacheError) {
        console.warn('Failed to refresh appDataStore.account cache:', cacheError);
      }
      toast.success(
        enabled
          ? t('messages.success.audioTranscriptionEnabled')
          : t('messages.success.audioTranscriptionDisabled'),
      );
    } catch (error: unknown) {
      toast.error((error as Error).message || t('messages.error.audioTranscriptionFailed'));
    }
  };

  const handleMaskContactPiiToggle = async (enabled: boolean) => {
    try {
      const updated = await accountService.updateAccount({
        settings: {
          ...(account?.settings ?? {}),
          mask_contact_pii: enabled,
        },
      });
      setAccount(updated);
      setFormData(prev => ({ ...prev, maskContactPii: enabled }));
      try {
        await useAppDataStore.getState().fetchAccount(true);
      } catch (cacheError) {
        console.warn('Failed to refresh appDataStore.account cache:', cacheError);
      }
      toast.success(
        enabled
          ? t('messages.success.maskPiiEnabled')
          : t('messages.success.maskPiiDisabled'),
      );
    } catch (error: unknown) {
      toast.error((error as Error).message || t('messages.error.maskPiiFailed'));
    }
  };

  const copyAccountId = () => {
    if (account?.id) {
      navigator.clipboard.writeText(account.id.toString());
      toast.success(t('messages.success.accountIdCopied'));
    }
  };

  const isOnEvolutionCloud = globalConfig.isOnEvolutionCloud;


  const languageItems = languages.map(lang => ({ value: lang.code, label: lang.name }));
  const labelItems = [
    { value: 'none', label: t('fields.applyLabel.none') },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...formDataOptions.labels.map((label: any) => ({ value: label.title as string, label: label.title as string })),
  ];

  if (loading) {
    return (
      <div className="flex h-full flex-col p-4 md:p-6">
        <BaseHeader title={t('title')} subtitle={t('subtitle')} />
        <div className="mx-auto mt-6 flex w-full max-w-5xl flex-col gap-8" aria-busy="true">
          <span className="sr-only">{t('loading')}</span>
          {[0, 1, 2].map(i => (
            <div key={i} className="grid gap-4 md:grid-cols-[17rem_1fr] md:gap-8">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-56" />
              </div>
              <Skeleton className="h-36 rounded-2xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-4 md:p-6">
      <SettingsTour />
      <div data-tour="settings-header">
        <BaseHeader title={t('title')} subtitle={t('subtitle')} />
      </div>

      <div className="mt-6 flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-5xl">
          {/* Configurações Gerais */}
          <div data-tour="settings-general">
            <form onSubmit={handleGeneralSubmit}>
              <SettingsSection
                title={t('sections.general.title')}
                description={t('sections.general.description')}
                footer={
                  <Button type="submit" loading={saving}>
                    {saving ? t('buttons.saving') : t('buttons.save')}
                  </Button>
                }
              >
                <div className="grid gap-5 md:grid-cols-2">
                  <Field invalid={Boolean(errors.name)}>
                    <FieldLabel htmlFor="name">{t('fields.name.label')}</FieldLabel>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={e => handleFieldChange('name', e.target.value)}
                      placeholder={t('fields.name.placeholder')}
                      aria-invalid={errors.name ? true : undefined}
                      disabled={saving}
                    />
                    {errors.name && <FieldError match>{errors.name}</FieldError>}
                  </Field>

                  <Field invalid={Boolean(errors.locale)}>
                    <FieldLabel htmlFor="locale">{t('fields.locale.label')}</FieldLabel>
                    <Select
                      items={languageItems}
                      value={formData.locale}
                      onValueChange={value => value && handleFieldChange('locale', value)}
                    >
                      <SelectTrigger id="locale">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectPopup>
                        {languageItems.map(item => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectPopup>
                    </Select>
                    {errors.locale && <FieldError match>{errors.locale}</FieldError>}
                  </Field>
                </div>

                {account?.features?.custom_reply_domain && (
                  <Field>
                    <FieldLabel htmlFor="domain">{t('fields.domain.label')}</FieldLabel>
                    <Input
                      id="domain"
                      value={formData.domain}
                      onChange={e => handleFieldChange('domain', e.target.value)}
                      placeholder={t('fields.domain.placeholder')}
                      disabled={saving}
                    />
                    <FieldDescription>{t('fields.domain.description')}</FieldDescription>
                  </Field>
                )}

                {account?.features?.custom_reply_email && (
                  <Field>
                    <FieldLabel htmlFor="supportEmail">{t('fields.supportEmail.label')}</FieldLabel>
                    <Input
                      id="supportEmail"
                      type="email"
                      value={formData.supportEmail}
                      onChange={e => handleFieldChange('supportEmail', e.target.value)}
                      placeholder={t('fields.supportEmail.placeholder')}
                      disabled={saving}
                    />
                  </Field>
                )}
              </SettingsSection>
            </form>
          </div>

          {/* Auto-Resolução */}
          <div data-tour="settings-auto-resolve">
            <SettingsSection
              title={t('sections.autoResolve.title')}
              description={t('sections.autoResolve.description')}
              headerActions={
                <Switch
                  aria-label={t('sections.autoResolve.title')}
                  checked={formData.autoResolveEnabled}
                  onCheckedChange={checked => {
                    handleFieldChange('autoResolveEnabled', checked);
                    if (!checked) {
                      handleAutoResolveSubmit();
                    }
                  }}
                />
              }
              footer={
                formData.autoResolveEnabled ? (
                  <Button onClick={handleAutoResolveSubmit} loading={saving}>
                    {saving ? t('buttons.saving') : t('buttons.updateAutoResolve')}
                  </Button>
                ) : undefined
              }
            >
              {formData.autoResolveEnabled && (
                <>
                  <Field invalid={Boolean(errors.autoResolveAfter)}>
                    <FieldLabel htmlFor="autoResolveAfter">{t('fields.autoResolveTime.label')}</FieldLabel>
                    <InputGroup className="max-w-56">
                      <InputGroupInput
                        id="autoResolveAfter"
                        type="number"
                        min="10"
                        max="1438560"
                        value={formData.autoResolveAfter}
                        aria-invalid={errors.autoResolveAfter ? true : undefined}
                        onChange={e => handleFieldChange('autoResolveAfter', parseInt(e.target.value) || 0)}
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupText>{t('fields.autoResolveTime.unit')}</InputGroupText>
                      </InputGroupAddon>
                    </InputGroup>
                    {errors.autoResolveAfter ? (
                      <FieldError match>{errors.autoResolveAfter}</FieldError>
                    ) : (
                      <FieldDescription>{t('fields.autoResolveTime.description')}</FieldDescription>
                    )}
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="autoResolveMessage">{t('fields.autoResolveMessage.label')}</FieldLabel>
                    <Textarea
                      id="autoResolveMessage"
                      value={formData.autoResolveMessage}
                      onChange={e => handleFieldChange('autoResolveMessage', e.target.value)}
                      placeholder={t('fields.autoResolveMessage.placeholder')}
                      rows={3}
                    />
                  </Field>

                  <div className="flex flex-col divide-y rounded-xl border bg-muted/24">
                    <div className="flex items-center justify-between gap-4 px-4 py-3">
                      <Label htmlFor="ignoreWaiting" className="font-normal">
                        {t('fields.ignoreWaiting.label')}
                      </Label>
                      <Switch
                        id="ignoreWaiting"
                        checked={formData.autoResolveIgnoreWaiting}
                        onCheckedChange={checked => handleFieldChange('autoResolveIgnoreWaiting', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4 px-4 py-3">
                      <span className="text-sm">{t('fields.applyLabel.label')}</span>
                      <Select
                        items={labelItems}
                        value={formData.autoResolveLabel}
                        onValueChange={value => value && handleFieldChange('autoResolveLabel', value)}
                      >
                        <SelectTrigger className="w-44" aria-label={t('fields.applyLabel.label')}>
                          <SelectValue placeholder={t('fields.applyLabel.placeholder')} />
                        </SelectTrigger>
                        <SelectPopup>
                          {labelItems.map(item => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectPopup>
                      </Select>
                    </div>
                  </div>
                </>
              )}
            </SettingsSection>
          </div>

          {/* Transcrição de Áudio */}
          {isOnEvolutionCloud && (
            <SettingsSection
              title={t('sections.audioTranscription.title')}
              description={t('sections.audioTranscription.description')}
              headerActions={
                <Switch
                  aria-label={t('sections.audioTranscription.title')}
                  checked={formData.audioTranscriptions}
                  onCheckedChange={handleAudioTranscriptionToggle}
                />
              }
            />
          )}

          {/* Mascaramento de PII dos Contatos — admin tiers only (super_admin / account_owner / administrator). */}
          {isAdmin && (
            <SettingsSection
              title={t('sections.maskContactPii.title')}
              description={t('sections.maskContactPii.description')}
              headerActions={
                <Switch
                  aria-label={t('sections.maskContactPii.title')}
                  checked={formData.maskContactPii}
                  onCheckedChange={handleMaskContactPiiToggle}
                />
              }
            />
          )}

          {/* ID da Conta */}
          <div data-tour="settings-account-id">
            <SettingsSection title={t('sections.accountId.title')} description={t('sections.accountId.description')}>
              <InputGroup>
                <InputGroupInput readOnly value={String(account?.id ?? '')} className="font-mono" aria-label={t('sections.accountId.title')} />
                <InputGroupAddon align="inline-end">
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={copyAccountId}
                          aria-label={t('buttons.copyAccountId')}
                        />
                      }
                    >
                      <Copy />
                    </TooltipTrigger>
                    <TooltipPopup>{t('buttons.copyAccountId')}</TooltipPopup>
                  </Tooltip>
                </InputGroupAddon>
              </InputGroup>
            </SettingsSection>
          </div>

          {/* Informações de Build */}
          <div className="border-t py-4 text-center text-muted-foreground text-xs">
            v{globalConfig.appVersion || '1.0.0'}
          </div>
        </div>
      </div>
    </div>
  );
}
