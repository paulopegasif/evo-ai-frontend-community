import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SendWebhookNodeData } from '../SendWebhookNode';
import { VariableInput } from '@/components/journey/environment-manager';
import { useLanguage } from '@/hooks/useLanguage';

interface WebhookBasicConfigProps {
  data: SendWebhookNodeData;
  onChange: (updates: Partial<SendWebhookNodeData>) => void;
  journeyId: string;
}

export function WebhookBasicConfig({ data, onChange, journeyId }: WebhookBasicConfigProps) {
  const { t } = useLanguage('journey');

  const HTTP_METHODS = [
    {
      value: 'GET',
      label: t('panels.sendWebhook.basic.methods.get.label'),
      description: t('panels.sendWebhook.basic.methods.get.description'),
    },
    {
      value: 'POST',
      label: t('panels.sendWebhook.basic.methods.post.label'),
      description: t('panels.sendWebhook.basic.methods.post.description'),
    },
    {
      value: 'PUT',
      label: t('panels.sendWebhook.basic.methods.put.label'),
      description: t('panels.sendWebhook.basic.methods.put.description'),
    },
    {
      value: 'PATCH',
      label: t('panels.sendWebhook.basic.methods.patch.label'),
      description: t('panels.sendWebhook.basic.methods.patch.description'),
    },
    {
      value: 'DELETE',
      label: t('panels.sendWebhook.basic.methods.delete.label'),
      description: t('panels.sendWebhook.basic.methods.delete.description'),
    },
  ];
  const handleUrlChange = (value: string) => {
    onChange({ webhookUrl: value });
  };

  const handleMethodChange = (value: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE') => {
    onChange({ method: value });
  };

  const handleTimeoutChange = (value: string) => {
    const timeout = parseInt(value) || 30;
    onChange({ timeout: Math.max(1, Math.min(300, timeout)) }); // Entre 1 e 300 segundos
  };

  const handleRetryChange = (value: string) => {
    const retryAttempts = parseInt(value) || 0;
    onChange({ retryAttempts: Math.max(0, Math.min(5, retryAttempts)) }); // Entre 0 e 5 tentativas
  };

  return (
    <div className="space-y-4">
      {/* URL do Webhook */}
      <Field className="items-stretch">
        <FieldLabel>{t('panels.sendWebhook.basic.endpointUrl')}</FieldLabel>
        <VariableInput
          type="url"
          value={data.webhookUrl || ''}
          onChange={e => handleUrlChange(e.target.value)}
          placeholder={t('panels.sendWebhook.basic.urlPlaceholder')}
          className="w-full"
          journeyId={journeyId}
        />
        <FieldDescription>{t('panels.sendWebhook.basic.urlDescription')}</FieldDescription>
      </Field>

      {/* Método HTTP */}
      <Field>
        <FieldLabel>{t('panels.sendWebhook.basic.httpMethod')}</FieldLabel>
        <Select
          items={HTTP_METHODS.map(method => ({ value: method.value, label: method.label }))}
          value={data.method || 'POST'}
          onValueChange={v =>
            v != null && handleMethodChange(v as NonNullable<SendWebhookNodeData['method']>)
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectPopup alignItemWithTrigger={false}>
            {HTTP_METHODS.map(method => (
              <SelectItem key={method.value} value={method.value}>
                <div>
                  <div className="font-medium">{method.label}</div>
                  <div className="text-xs text-muted-foreground">{method.description}</div>
                </div>
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
      </Field>

      {/* Configurações avançadas */}
      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel>{t('panels.sendWebhook.basic.timeout')}</FieldLabel>
          <Input
            type="number"
            min="1"
            max="300"
            value={data.timeout || 30}
            onChange={e => handleTimeoutChange(e.target.value)}
          />
          <FieldDescription>{t('panels.sendWebhook.basic.timeoutDescription')}</FieldDescription>
        </Field>

        <Field>
          <FieldLabel>{t('panels.sendWebhook.basic.retryAttempts')}</FieldLabel>
          <Input
            type="number"
            min="0"
            max="5"
            value={data.retryAttempts || 0}
            onChange={e => handleRetryChange(e.target.value)}
          />
          <FieldDescription>{t('panels.sendWebhook.basic.retryDescription')}</FieldDescription>
        </Field>
      </div>

      {/* Preview da configuração */}
      {data.webhookUrl && (
        <div className="rounded-xl border bg-muted/24 p-4">
          <p className="text-sm text-foreground">
            <strong>{t('panels.sendWebhook.basic.summaryTitle')}</strong>{' '}
            {t('panels.sendWebhook.basic.summaryRequest', { method: data.method || 'POST' })}{' '}
            <span className="font-mono text-xs break-all">{data.webhookUrl}</span>
            {data.timeout !== 30 && (
              <span className="block mt-1">
                {t('panels.sendWebhook.basic.summaryTimeout', { timeout: data.timeout })}
              </span>
            )}
            {data.retryAttempts && data.retryAttempts > 0 && (
              <span className="block mt-1">
                {t('panels.sendWebhook.basic.summaryRetries', { retries: data.retryAttempts })}
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
