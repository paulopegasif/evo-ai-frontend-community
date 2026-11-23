import { useState, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Copy, X } from '@/components/icons';
import {
  VariableInput,
  JourneyVariable,
  VariableMapping,
  type DataMapping,
} from '@/components/journey/environment-manager';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';

interface WebhookConfigurationProps {
  webhookUrl: string;
  expectedHeaders?: Array<{
    name: string;
    value: string;
  }>;
  onWebhookUrlChange: (url: string) => void;
  onExpectedHeadersChange: (headers: Array<{ name: string; value: string }>) => void;
  journeyId?: string;
  variableMappings?: DataMapping[];
  onVariableMappingsChange?: (mappings: DataMapping[]) => void;
  onVariablesChange?: (variables: JourneyVariable[]) => void;
}

export function WebhookConfiguration({
  webhookUrl,
  expectedHeaders = [],
  onWebhookUrlChange,
  onExpectedHeadersChange,
  journeyId,
  variableMappings = [],
  onVariableMappingsChange,
}: WebhookConfigurationProps) {
  const { t } = useLanguage('journey');
  const [generatedUrl, setGeneratedUrl] = useState('');

  // Paths comuns para webhooks
  const webhookPaths = [
    'webhook.headers.authorization',
    'webhook.headers.content-type',
    'webhook.body.contact_id',
    'webhook.body.timestamp',
  ];

  const [localHeaders, setLocalHeaders] = useState(expectedHeaders);
  const isInitialized = useRef(false);

  useEffect(() => {
    // Generate the trigger webhook URL from the REAL journey id. Contexts without a
    // journey (trigger-type Campaigns / automations) pass no journeyId (EVO-1608, ex
    // sentinel 'campaign-trigger' que gerava uma URL .../trigger/campaign-trigger não
    // roteável). Nesses casos NÃO auto-geramos URL — o contexto deve fornecer a sua.
    // Campanha precisa de uma URL de trigger própria.
    if (journeyId && !webhookUrl) {
      const campaignApiUrl = import.meta.env.VITE_CAMPAIGN_API_URL || 'http://localhost:3000';
      const url = `${campaignApiUrl}/api/v1/journeys/trigger/${journeyId}`;
      setGeneratedUrl(url);
      onWebhookUrlChange(url);
    }
  }, [journeyId, webhookUrl, onWebhookUrlChange]);

  useEffect(() => {
    // Only update localHeaders if it's actually different and not from our own updates
    if (!isInitialized.current) {
      setLocalHeaders(expectedHeaders);
      isInitialized.current = true;
    } else if (JSON.stringify(expectedHeaders) !== JSON.stringify(localHeaders)) {
      setLocalHeaders(expectedHeaders);
    }
    // localHeaders is intentionally excluded — it's our own mirror of expectedHeaders;
    // including it would loop. Sync is driven solely by the incoming expectedHeaders prop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expectedHeaders]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);

      toast.success(t('triggerComponents.webhook.urlCopied'));
      // Você pode adicionar uma notificação de sucesso aqui
    } catch (err) {
      console.error('Erro ao copiar para clipboard:', err);
    }
  };

  const addHeader = () => {
    const newHeaders = [...localHeaders, { name: '', value: '' }];
    setLocalHeaders(newHeaders);
    onExpectedHeadersChange(newHeaders);
  };

  const removeHeader = (index: number) => {
    const newHeaders = localHeaders.filter((_, i) => i !== index);
    setLocalHeaders(newHeaders);
    onExpectedHeadersChange(newHeaders);
  };

  const updateHeader = (index: number, field: 'name' | 'value', value: string) => {
    const newHeaders = localHeaders.map((header, i) =>
      i === index ? { ...header, [field]: value } : header,
    );
    setLocalHeaders(newHeaders);
    onExpectedHeadersChange(newHeaders);
  };

  return (
    <>
      <Separator />
      <div className="space-y-4">
        <h3 className="font-medium text-sm text-foreground">
          {t('triggerComponents.webhook.configuration')}
        </h3>

        {/* URL do Webhook */}
        <Field>
          <FieldLabel>{t('triggerComponents.webhook.webhookUrl')}</FieldLabel>
          <div className="flex w-full gap-2">
            <Input
              type="url"
              value={webhookUrl || generatedUrl}
              placeholder={t('triggerComponents.webhook.urlPlaceholder')}
              className="min-w-0 flex-1 font-mono"
              readOnly={true}
            />
            <Button
              onClick={() => copyToClipboard(webhookUrl || generatedUrl)}
              variant="outline"
              size="icon"
              aria-label={t('triggerComponents.webhook.copyUrl')}
            >
              <Copy />
            </Button>
          </div>
          <FieldDescription>
            {t('triggerComponents.webhook.urlDescription')}
          </FieldDescription>
        </Field>

        {/* Método HTTP */}
        <Field>
          <FieldLabel>{t('triggerComponents.webhook.httpMethod')}</FieldLabel>
          <Badge variant="info">POST</Badge>
        </Field>

        {/* Autenticação */}
        <Field>
          <FieldLabel>
            {t('triggerComponents.webhook.authentication')}
          </FieldLabel>
          <div className="w-full rounded-lg border border-info/24 bg-info/8 p-3">
            <p className="text-info-foreground text-xs">
              <strong>{t('triggerComponents.webhook.required')}:</strong>{' '}
              {t('triggerComponents.webhook.authDescription')}
            </p>
          </div>
        </Field>

        {/* Headers Esperados */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm text-foreground">
              {t('triggerComponents.webhook.expectedHeaders')}
            </h4>
            <Button onClick={addHeader} variant="outline" size="sm">
              {t('triggerComponents.webhook.addHeader')}
            </Button>
          </div>

          {localHeaders.length === 0 ? (
            <div className="rounded-xl border bg-muted/24 p-3 text-center">
              <p className="text-xs text-muted-foreground">
                {t('triggerComponents.webhook.noCustomHeaders')}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {localHeaders.map((header, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-xl border bg-muted/24 p-2"
                >
                  <VariableInput
                    placeholder={t('triggerComponents.webhook.headerName')}
                    value={header.name}
                    onChange={e => updateHeader(index, 'name', e.target.value)}
                    className="flex-1"
                    onVariableInsert={variable => {
                      console.log('Variable inserted in header name:', variable);
                    }}
                    journeyId={journeyId}
                  />
                  <VariableInput
                    placeholder={t('triggerComponents.webhook.headerValue')}
                    value={header.value}
                    onChange={e => updateHeader(index, 'value', e.target.value)}
                    className="flex-1"
                    onVariableInsert={variable => {
                      console.log('Variable inserted in header value:', variable);
                    }}
                    journeyId={journeyId}
                  />
                  <Button
                    onClick={() => removeHeader(index)}
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive-foreground hover:text-destructive-foreground"
                    aria-label={t('triggerComponents.webhook.removeHeader')}
                  >
                    <X />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payload de Exemplo */}
        <Field>
          <FieldLabel>
            {t('triggerComponents.webhook.payloadStructure')}
          </FieldLabel>
          <div className="w-full rounded-lg border border-warning/24 bg-warning/8 p-2">
            <p className="text-warning-foreground text-xs">
              <strong>{t('triggerComponents.webhook.flexible')}:</strong>{' '}
              {t('triggerComponents.webhook.dataFieldDescription')}
            </p>
          </div>
          <Textarea
            value={JSON.stringify(
              {
                contact_id: '<contact_id>',
                data: {
                  contact: {
                    id: '<contact_id>',
                    name: t('triggerComponents.webhook.exampleContactName'),
                    email: t('triggerComponents.webhook.exampleEmail'),
                  },
                },
              },
              null,
              2,
            )}
            rows={8}
            className="font-mono text-xs sm:text-xs"
            readOnly
          />
        </Field>

        {/* Descrição da Configuração */}
        <div className="rounded-xl border border-info/24 bg-info/8 p-4">
          <p className="text-sm text-info-foreground">
            {t('triggerComponents.webhook.description')}
            {localHeaders.length > 0 && (
              <span className="block mt-1">
                • {t('triggerComponents.webhook.customHeaders')}:{' '}
                {localHeaders.map(h => h.name).join(', ')}
              </span>
            )}
          </p>
          <div className="mt-3 rounded-lg border bg-background p-3">
            <p className="mb-2 font-medium text-foreground text-xs">
              {t('triggerComponents.webhook.curlExample')}:
            </p>
            <pre className="text-xs text-muted-foreground overflow-x-auto">
              {`curl --location '${
                import.meta.env.VITE_CAMPAIGN_API_URL || 'http://localhost:3000'
              }/api/v1/journeys/trigger/5286fd5c-7ed9-4c0c-ae3e-479e35047fb8' \\
--header 'Content-Type: application/json' \\
--header 'api_access_token: [SEU_API_TOKEN]' \\
--data-raw '{
  "contact_id": "uuid-do-contato",
  "data": {
    "contact": {
      "id": "uuid-do-contato",
      "name": "${t('triggerComponents.webhook.exampleContactName')}",
      "email": "${t('triggerComponents.webhook.exampleEmail')}"
    }
  }
}'`}
            </pre>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-xs">
              {t('triggerComponents.webhook.method')}: POST
            </Badge>
            {localHeaders.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {localHeaders.length} {t('triggerComponents.webhook.headersCount')}
              </Badge>
            )}
          </div>
        </div>

        {/* Mapeamento de Variáveis */}
        {onVariableMappingsChange && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-foreground">
                {t('triggerComponents.webhook.captureWebhookData')}
              </h4>
              <VariableMapping
                mappings={variableMappings}
                onMappingsChange={onVariableMappingsChange}
                paths={webhookPaths}
                journeyId={journeyId}
                className="rounded-xl border bg-muted/24 p-4"
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}
