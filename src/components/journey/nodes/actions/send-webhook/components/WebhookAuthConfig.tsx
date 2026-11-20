import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Shield, Eye, EyeOff, Lock } from 'lucide-react';
import { SendWebhookNodeData } from '../SendWebhookNode';
import { VariableInput } from '@/components/journey/environment-manager';
import { useLanguage } from '@/hooks/useLanguage';

interface WebhookAuthConfigProps {
  data: SendWebhookNodeData;
  onChange: (updates: Partial<SendWebhookNodeData>) => void;
  journeyId: string;
}

export function WebhookAuthConfig({ data, onChange, journeyId }: WebhookAuthConfigProps) {
  const { t } = useLanguage('journey');

  const AUTH_TYPES = [
    {
      value: 'none',
      label: t('panels.sendWebhook.auth.types.none.label'),
      description: t('panels.sendWebhook.auth.types.none.description'),
      icon: '🔓',
    },
    {
      value: 'bearer',
      label: t('panels.sendWebhook.auth.types.bearer.label'),
      description: t('panels.sendWebhook.auth.types.bearer.description'),
      icon: '🎫',
    },
    {
      value: 'basic',
      label: t('panels.sendWebhook.auth.types.basic.label'),
      description: t('panels.sendWebhook.auth.types.basic.description'),
      icon: '👤',
    },
    {
      value: 'api_key',
      label: t('panels.sendWebhook.auth.types.apiKey.label'),
      description: t('panels.sendWebhook.auth.types.apiKey.description'),
      icon: '🔑',
    },
  ];
  const [showSensitive, setShowSensitive] = useState({
    token: false,
    password: false,
    apiKey: false,
  });

  const handleAuthTypeChange = (value: 'none' | 'bearer' | 'basic' | 'api_key') => {
    onChange({
      authenticationType: value,
      // Limpar dados de auth anteriores
      authToken: undefined,
      authUsername: undefined,
      authPassword: undefined,
      authApiKey: undefined,
      authApiKeyHeader: undefined,
    });
  };

  const toggleShowSensitive = (field: keyof typeof showSensitive) => {
    setShowSensitive(prev => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const renderAuthFields = () => {
    const authType = data.authenticationType || 'none';

    switch (authType) {
      case 'bearer':
        return (
          <div className="space-y-3">
            <Field>
              <FieldLabel>{t('panels.sendWebhook.auth.bearerToken')}</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  type={showSensitive.token ? 'text' : 'password'}
                  value={data.authToken || ''}
                  onChange={e => onChange({ authToken: e.target.value })}
                  placeholder={t('panels.sendWebhook.auth.bearerPlaceholder')}
                />
                <InputGroupAddon align="inline-end">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => toggleShowSensitive('token')}
                    aria-label={
                      showSensitive.token
                        ? t('panels.sendWebhook.auth.hideValue')
                        : t('panels.sendWebhook.auth.showValue')
                    }
                  >
                    {showSensitive.token ? <EyeOff /> : <Eye />}
                  </Button>
                </InputGroupAddon>
              </InputGroup>
              <FieldDescription>{t('panels.sendWebhook.auth.bearerDescription')}</FieldDescription>
            </Field>
          </div>
        );

      case 'basic':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <Field className="items-stretch">
                <FieldLabel>{t('panels.sendWebhook.auth.username')}</FieldLabel>
                <VariableInput
                  value={data.authUsername || ''}
                  onChange={e => onChange({ authUsername: e.target.value })}
                  placeholder={t('panels.sendWebhook.auth.usernamePlaceholder')}
                  journeyId={journeyId}
                />
              </Field>
              <Field>
                <FieldLabel>{t('panels.sendWebhook.auth.password')}</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    type={showSensitive.password ? 'text' : 'password'}
                    value={data.authPassword || ''}
                    onChange={e => onChange({ authPassword: e.target.value })}
                    placeholder={t('panels.sendWebhook.auth.passwordPlaceholder')}
                  />
                  <InputGroupAddon align="inline-end">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => toggleShowSensitive('password')}
                      aria-label={
                        showSensitive.password
                          ? t('panels.sendWebhook.auth.hideValue')
                          : t('panels.sendWebhook.auth.showValue')
                      }
                    >
                      {showSensitive.password ? <EyeOff /> : <Eye />}
                    </Button>
                  </InputGroupAddon>
                </InputGroup>
              </Field>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('panels.sendWebhook.auth.basicDescription')}
            </p>
          </div>
        );

      case 'api_key':
        return (
          <div className="space-y-3">
            <Field className="items-stretch">
              <FieldLabel>{t('panels.sendWebhook.auth.headerName')}</FieldLabel>
              <VariableInput
                value={data.authApiKeyHeader || ''}
                onChange={e => onChange({ authApiKeyHeader: e.target.value })}
                placeholder={t('panels.sendWebhook.auth.headerNamePlaceholder')}
                journeyId={journeyId}
              />
              <FieldDescription>
                {t('panels.sendWebhook.auth.headerNameDescription')}
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel>{t('panels.sendWebhook.auth.apiKey')}</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  type={showSensitive.apiKey ? 'text' : 'password'}
                  value={data.authApiKey || ''}
                  onChange={e => onChange({ authApiKey: e.target.value })}
                  placeholder={t('panels.sendWebhook.auth.apiKeyPlaceholder')}
                />
                <InputGroupAddon align="inline-end">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => toggleShowSensitive('apiKey')}
                    aria-label={
                      showSensitive.apiKey
                        ? t('panels.sendWebhook.auth.hideValue')
                        : t('panels.sendWebhook.auth.showValue')
                    }
                  >
                    {showSensitive.apiKey ? <EyeOff /> : <Eye />}
                  </Button>
                </InputGroupAddon>
              </InputGroup>
            </Field>
          </div>
        );

      default:
        return (
          <div className="rounded-xl border border-success/24 bg-success/8 p-4 text-center">
            <Shield className="mx-auto mb-2 size-6 text-success" />
            <p className="text-sm text-success-foreground">
              {t('panels.sendWebhook.auth.noAuthMessage')}
            </p>
            <p className="mt-1 text-xs text-success-foreground/80">
              {t('panels.sendWebhook.auth.noAuthDescription')}
            </p>
          </div>
        );
    }
  };

  const getAuthSummary = () => {
    const authType = data.authenticationType || 'none';

    switch (authType) {
      case 'bearer':
        return data.authToken
          ? t('panels.sendWebhook.auth.tokenConfigured')
          : t('panels.sendWebhook.auth.tokenNotConfigured');
      case 'basic':
        return data.authUsername && data.authPassword
          ? t('panels.sendWebhook.auth.basicAuth', { username: data.authUsername })
          : t('panels.sendWebhook.auth.credentialsNotConfigured');
      case 'api_key':
        return data.authApiKeyHeader && data.authApiKey
          ? t('panels.sendWebhook.auth.apiKeyHeader', { header: data.authApiKeyHeader })
          : t('panels.sendWebhook.auth.apiKeyNotConfigured');
      default:
        return t('panels.sendWebhook.auth.noAuth');
    }
  };

  return (
    <div className="space-y-4">
      {/* Tipo de Autenticação */}
      <Field>
        <FieldLabel>{t('panels.sendWebhook.auth.authType')}</FieldLabel>
        <Select
          items={AUTH_TYPES.map(type => ({
            value: type.value,
            label: `${type.icon} ${type.label}`,
          }))}
          value={data.authenticationType || 'none'}
          onValueChange={v =>
            v != null && handleAuthTypeChange(v as 'none' | 'bearer' | 'basic' | 'api_key')
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectPopup alignItemWithTrigger={false}>
            {AUTH_TYPES.map(type => (
              <SelectItem key={type.value} value={type.value}>
                <div className="flex items-center gap-2">
                  <span>{type.icon}</span>
                  <div>
                    <div className="font-medium">{type.label}</div>
                    <div className="text-xs text-muted-foreground">{type.description}</div>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
      </Field>

      {/* Campos de autenticação */}
      {renderAuthFields()}

      {/* Resumo da configuração */}
      <div className="rounded-xl border bg-muted/24 p-4">
        <div className="mb-2 flex items-center gap-2">
          <Lock className="size-4 text-muted-foreground" />
          <p className="font-medium text-foreground text-sm">
            {t('panels.sendWebhook.auth.configTitle')}
          </p>
        </div>
        <p className="text-muted-foreground text-sm">{getAuthSummary()}</p>
        {data.authenticationType !== 'none' && (
          <p className="mt-1 text-muted-foreground text-xs">
            🔒 {t('panels.sendWebhook.auth.sensitiveDataEncrypted')}
          </p>
        )}
      </div>
    </div>
  );
}
