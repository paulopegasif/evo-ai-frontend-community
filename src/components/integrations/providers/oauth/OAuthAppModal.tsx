import { useState, useEffect, useId } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogClose } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { OAuthApplication } from '@/types/integrations';
import { AgentIntegrationDialog } from '../../agentConfig/AgentIntegrationDialog';
import IntegrationNotice from '../../shared/IntegrationNotice';

interface OAuthAppModalProps {
  app?: OAuthApplication;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isNew?: boolean;
  loading?: boolean;
}

const DEFAULT_SCOPES = [
  'read:conversations',
  'write:conversations',
  'read:contacts',
  'write:contacts',
  'read:messages',
  'write:messages'
];

export default function OAuthAppModal({
  app,
  open,
  onOpenChange,
  onSubmit,
  loading: submitting = false
}: OAuthAppModalProps) {
  const { t } = useLanguage('integrations');
  const formId = useId();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    redirect_uri: '',
    scopes: DEFAULT_SCOPES.join(' ')
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (app) {
      setFormData({
        name: app.name || '',
        redirect_uri: app.redirect_uri || '',
        scopes: (Array.isArray(app.scopes) ? app.scopes.join(' ') : app.scopes) || DEFAULT_SCOPES.join(' ')
      });
    } else {
      setFormData({
        name: '',
        redirect_uri: '',
        scopes: DEFAULT_SCOPES.join(' ')
      });
    }
    setErrors({});
  }, [app, open]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('oauth.modal.fields.name.required');
    }

    if (!formData.redirect_uri.trim()) {
      newErrors.redirect_uri = t('oauth.modal.fields.redirectUri.required');
    } else if (!isValidUrl(formData.redirect_uri)) {
      newErrors.redirect_uri = t('oauth.modal.fields.redirectUri.invalid');
    }

    if (!formData.scopes.trim()) {
      newErrors.scopes = t('oauth.modal.fields.scopes.required');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (string: string) => {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      await onSubmit({
        name: formData.name,
        redirect_uri: formData.redirect_uri,
        scopes: formData.scopes.trim()
      });
    } catch {
      // Error is handled by parent component
    } finally {
      setLoading(false);
    }
  };

  const handleScopePreset = (preset: 'read' | 'write' | 'admin') => {
    const presets = {
      read: [
        'read:conversations',
        'read:contacts',
        'read:messages',
        'read:reports'
      ],
      write: [
        'read:conversations',
        'write:conversations',
        'read:contacts',
        'write:contacts',
        'read:messages',
        'write:messages'
      ],
      admin: [
        'read:conversations',
        'write:conversations',
        'read:contacts',
        'write:contacts',
        'read:messages',
        'write:messages',
        'read:reports',
        'write:reports',
        'read:agents',
        'write:agents',
        'read:teams',
        'write:teams'
      ]
    };

    setFormData(prev => ({
      ...prev,
      scopes: presets[preset].join(' ')
    }));
    if (errors.scopes) setErrors(prev => ({ ...prev, scopes: '' }));
  };

  const saving = loading || submitting;
  const updateField = (field: 'name' | 'redirect_uri' | 'scopes', value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };
  const presetButtons = [
    { id: 'read', label: t('oauth.modal.presets.readOnly') },
    { id: 'write', label: t('oauth.modal.presets.readWrite') },
    { id: 'admin', label: t('oauth.modal.presets.admin') },
  ] as const;

  return (
    <AgentIntegrationDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={<Key className="text-muted-foreground" />}
      title={app ? t('oauth.modal.updateTitle') : t('oauth.modal.title')}
      footer={
        <>
          <DialogClose render={<Button type="button" variant="ghost" />} disabled={saving}>
            {t('oauth.modal.actions.cancel')}
          </DialogClose>
          <Button type="submit" form={formId} loading={saving}>
            {saving
              ? t('oauth.modal.actions.saving')
              : app
                ? t('oauth.modal.actions.update')
                : t('oauth.modal.actions.create')}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        <section className="flex flex-col gap-4">
          <h3 className="font-medium text-sm">{t('oauth.modal.basicInfo')}</h3>

          <Field invalid={Boolean(errors.name)}>
            <FieldLabel htmlFor="oauth-app-name">
              {t('oauth.modal.fields.name.label')} <span className="text-destructive-foreground">*</span>
            </FieldLabel>
            <Input
              id="oauth-app-name"
              placeholder={t('oauth.modal.fields.name.placeholder')}
              value={formData.name}
              onChange={e => updateField('name', e.target.value)}
              aria-invalid={errors.name ? true : undefined}
              autoFocus={!app}
            />
            {errors.name && <FieldError match>{errors.name}</FieldError>}
          </Field>

          <Field invalid={Boolean(errors.redirect_uri)}>
            <FieldLabel htmlFor="oauth-app-redirect-uri">
              {t('oauth.modal.fields.redirectUri.label')} <span className="text-destructive-foreground">*</span>
            </FieldLabel>
            <Input
              id="oauth-app-redirect-uri"
              type="url"
              inputMode="url"
              placeholder={t('oauth.modal.fields.redirectUri.placeholder')}
              value={formData.redirect_uri}
              onChange={e => updateField('redirect_uri', e.target.value)}
              aria-invalid={errors.redirect_uri ? true : undefined}
            />
            {errors.redirect_uri ? (
              <FieldError match>{errors.redirect_uri}</FieldError>
            ) : (
              <FieldDescription>{t('oauth.modal.fields.redirectUri.hint')}</FieldDescription>
            )}
          </Field>
        </section>

        <section className="flex flex-col gap-4">
          <h3 className="font-medium text-sm">{t('oauth.modal.scopes')}</h3>

          <Field invalid={Boolean(errors.scopes)}>
            <FieldLabel htmlFor="oauth-app-scopes">
              {t('oauth.modal.fields.scopes.label')} <span className="text-destructive-foreground">*</span>
            </FieldLabel>
            <Textarea
              id="oauth-app-scopes"
              placeholder={t('oauth.modal.fields.scopes.placeholder')}
              value={formData.scopes}
              onChange={e => updateField('scopes', e.target.value)}
              rows={3}
              className="font-mono"
              aria-invalid={errors.scopes ? true : undefined}
            />
            {errors.scopes ? (
              <FieldError match>{errors.scopes}</FieldError>
            ) : (
              <FieldDescription>{t('oauth.modal.fields.scopes.hint')}</FieldDescription>
            )}
          </Field>

          <div className="flex flex-col gap-2">
            <span className="font-medium text-sm">{t('oauth.modal.presets.title')}</span>
            <div className="flex flex-wrap gap-2">
              {presetButtons.map(preset => (
                <Button
                  key={preset.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleScopePreset(preset.id)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
        </section>

        <IntegrationNotice variant="warning" title={t('oauth.modal.security.title')}>
          {t('oauth.modal.security.description')}
        </IntegrationNotice>
      </form>
    </AgentIntegrationDialog>
  );
}
