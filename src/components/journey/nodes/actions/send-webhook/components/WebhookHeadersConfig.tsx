import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import { Plus, X, Eye, EyeOff } from 'lucide-react';
import { SendWebhookNodeData, WebhookHeader } from '../SendWebhookNode';
import { VariableInput } from '@/components/journey/environment-manager';
import { useLanguage } from '@/hooks/useLanguage';

interface WebhookHeadersConfigProps {
  data: SendWebhookNodeData;
  onChange: (updates: Partial<SendWebhookNodeData>) => void;
  journeyId: string;
}

const COMMON_HEADERS = [
  { key: 'Content-Type', value: 'application/json' },
  { key: 'Accept', value: 'application/json' },
  { key: 'User-Agent', value: 'EvoAI-Journey/1.0' },
  { key: 'X-API-Version', value: 'v1' },
  { key: 'X-Source', value: 'journey' },
];

export function WebhookHeadersConfig({ data, onChange, journeyId }: WebhookHeadersConfigProps) {
  const { t } = useLanguage('journey');
  const [showSensitiveHeaders, setShowSensitiveHeaders] = useState<Record<number, boolean>>({});

  const headers = data.headers || [];

  const addHeader = (preset?: { key: string; value: string }) => {
    const newHeader: WebhookHeader = preset || { key: '', value: '' };
    const updatedHeaders = [...headers, newHeader];
    onChange({ headers: updatedHeaders });
  };

  const updateHeader = (index: number, updates: Partial<WebhookHeader>) => {
    const updatedHeaders = headers.map((header, i) =>
      i === index ? { ...header, ...updates } : header,
    );
    onChange({ headers: updatedHeaders });
  };

  const removeHeader = (index: number) => {
    const updatedHeaders = headers.filter((_, i) => i !== index);
    onChange({ headers: updatedHeaders });
  };

  const toggleShowSensitive = (index: number) => {
    setShowSensitiveHeaders(prev => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const isSensitiveHeader = (key: string) => {
    const sensitiveKeys = ['authorization', 'x-api-key', 'api-key', 'token', 'secret', 'password'];
    return sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label>{t('panels.sendWebhook.headers.httpHeaders')}</Label>
        <div className="flex flex-wrap gap-2">
          {/* Botões para headers comuns */}
          {COMMON_HEADERS.slice(0, 2).map((preset, index) => (
            <Button key={index} variant="outline" size="sm" onClick={() => addHeader(preset)}>
              + {preset.key}
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={() => addHeader()}>
            <Plus />
            {t('panels.sendWebhook.headers.addHeader')}
          </Button>
        </div>
      </div>

      {/* Lista de headers */}
      <div className="flex flex-col gap-3">
        {headers.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/24 p-4 text-center">
            <p className="text-sm text-muted-foreground">
              {t('panels.sendWebhook.headers.noHeadersConfigured')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('panels.sendWebhook.headers.headersOptional')}
            </p>
          </div>
        ) : (
          headers.map((header, index) => {
            const isSensitive = isSensitiveHeader(header.key);
            const shouldHide = isSensitive && !showSensitiveHeaders[index];

            return (
              <div key={index} className="rounded-xl border bg-muted/24 p-3">
                <div className="grid grid-cols-12 items-end gap-3">
                  {/* Key */}
                  <Field className="col-span-4 items-stretch">
                    <FieldLabel className="text-xs">
                      {t('panels.sendWebhook.headers.headerName')}
                    </FieldLabel>
                    <VariableInput
                      value={header.key}
                      onChange={e => updateHeader(index, { key: e.target.value })}
                      placeholder={t('panels.sendWebhook.headers.headerNamePlaceholder')}
                      journeyId={journeyId}
                    />
                  </Field>

                  {/* Value */}
                  <Field className="col-span-7 items-stretch">
                    <FieldLabel className="text-xs">
                      {t('panels.sendWebhook.headers.headerValue')}
                    </FieldLabel>
                    <div className="flex w-full items-center gap-1">
                      <div className="min-w-0 flex-1">
                        <VariableInput
                          type={shouldHide ? 'password' : 'text'}
                          value={header.value}
                          onChange={e => updateHeader(index, { value: e.target.value })}
                          placeholder={t('panels.sendWebhook.headers.headerValuePlaceholder')}
                          journeyId={journeyId}
                        />
                      </div>
                      {isSensitive && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => toggleShowSensitive(index)}
                          aria-label={
                            shouldHide
                              ? t('panels.sendWebhook.auth.showValue')
                              : t('panels.sendWebhook.auth.hideValue')
                          }
                        >
                          {shouldHide ? <Eye /> : <EyeOff />}
                        </Button>
                      )}
                    </div>
                  </Field>

                  {/* Remove button */}
                  <div className="col-span-1 flex justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeHeader(index)}
                      aria-label={t('panels.sendWebhook.headers.removeHeader')}
                      className="text-destructive-foreground hover:text-destructive-foreground"
                    >
                      <X />
                    </Button>
                  </div>
                </div>
                {isSensitive && (
                  <p className="mt-2 text-warning-foreground text-xs">
                    ⚠️ {t('panels.sendWebhook.headers.sensitiveHeaderDetected')}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Headers comuns sugeridos */}
      {headers.length === 0 && (
        <div className="rounded-xl border border-info/24 bg-info/8 p-4">
          <p className="mb-2 font-medium text-info-foreground text-sm">
            {t('panels.sendWebhook.headers.suggestedHeaders')}
          </p>
          <div className="flex flex-wrap gap-2">
            {COMMON_HEADERS.map((preset, index) => (
              <Button key={index} variant="outline" size="sm" onClick={() => addHeader(preset)}>
                {preset.key}: {preset.value}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Resumo */}
      {headers.length > 0 && (
        <div className="rounded-xl border bg-muted/24 p-4">
          <p className="text-foreground text-sm">
            <strong>{t('panels.sendWebhook.headers.summaryTitle')}</strong>{' '}
            {t('panels.sendWebhook.headers.headersConfigured', {
              count: headers.length,
              plural: headers.length !== 1 ? 's' : '',
            })}
          </p>
          {headers.some(h => isSensitiveHeader(h.key)) && (
            <p className="mt-1 text-warning-foreground text-xs">
              ⚠️ {t('panels.sendWebhook.headers.containsSensitive')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
