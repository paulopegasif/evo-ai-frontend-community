import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Code, Copy, Check, Table, FileText } from 'lucide-react';
import { SendWebhookNodeData } from '../SendWebhookNode';
import { VariableTextarea } from '@/components/journey/environment-manager';
import { useLanguage } from '@/hooks/useLanguage';
import { WebhookBodyBuilder } from './WebhookBodyBuilder';
import {
  getEffectiveBodyMode,
  isStructuredBodyType,
  serializeBody,
  tryParseToFields,
  StructuredBodyType,
} from './webhookBody';

interface WebhookBodyConfigProps {
  data: SendWebhookNodeData;
  onChange: (updates: Partial<SendWebhookNodeData>) => void;
  journeyId: string;
}

const JSON_TEMPLATES = {
  contact: `{
  "contact": {
    "id": "{{contact.id}}",
    "name": "{{contact.name}}",
    "email": "{{contact.email}}",
    "phone": "{{contact.phone}}",
    "created_at": "{{contact.created_at}}"
  },
  "journey": {
    "id": "{{journey.id}}",
    "name": "{{journey.name}}",
    "step": "{{current_step}}"
  },
  "timestamp": "{{now}}"
}`,
  event: `{
  "event": "journey_webhook",
  "contact_id": "{{contact.id}}",
  "journey_id": "{{journey.id}}",
  "data": {
    "contact_name": "{{contact.name}}",
    "contact_email": "{{contact.email}}"
  },
  "metadata": {
    "source": "journey",
    "timestamp": "{{now}}"
  }
}`,
  custom: `{
  "message": "Contact reached webhook step",
  "contact": "{{contact.name}}",
  "email": "{{contact.email}}",
  "custom_field": "your_value_here"
}`,
};

export function WebhookBodyConfig({ data, onChange, journeyId }: WebhookBodyConfigProps) {
  const { t } = useLanguage('journey');
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);
  const [showNestedHint, setShowNestedHint] = useState(false);

  const BODY_TYPES = [
    {
      value: 'json',
      label: t('panels.sendWebhook.body.types.json.label'),
      description: t('panels.sendWebhook.body.types.json.description'),
    },
    {
      value: 'form',
      label: t('panels.sendWebhook.body.types.form.label'),
      description: t('panels.sendWebhook.body.types.form.description'),
    },
    {
      value: 'text',
      label: t('panels.sendWebhook.body.types.text.label'),
      description: t('panels.sendWebhook.body.types.text.description'),
    },
    {
      value: 'xml',
      label: t('panels.sendWebhook.body.types.xml.label'),
      description: t('panels.sendWebhook.body.types.xml.description'),
    },
  ];

  const bodyType = data.bodyType || 'json';
  const structuredCapable = isStructuredBodyType(bodyType);
  const mode = getEffectiveBodyMode(data);

  const handleBodyTypeChange = (value: 'json' | 'form' | 'text' | 'xml') => {
    setShowNestedHint(false);

    // When staying in structured mode across json⇄form, re-serialize the existing
    // rows into the new wire format so `body` keeps matching the builder.
    if (mode === 'structured' && isStructuredBodyType(value)) {
      onChange({ bodyType: value, body: serializeBody(data.bodyStructured || [], value) });
    } else {
      onChange({ bodyType: value });
    }

    // Auto-definir Content-Type header se não existir
    const currentHeaders = data.headers || [];
    const hasContentType = currentHeaders.some(h => h.key.toLowerCase() === 'content-type');

    if (!hasContentType) {
      const contentTypeMap = {
        json: 'application/json',
        form: 'application/x-www-form-urlencoded',
        text: 'text/plain',
        xml: 'application/xml',
      };

      const newHeaders = [
        ...currentHeaders,
        {
          key: 'Content-Type',
          value: contentTypeMap[value],
        },
      ];

      onChange({ headers: newHeaders });
    }
  };

  const handleBodyChange = (value: string) => {
    onChange({ body: value });
  };

  const handleStructuredChange = (fields: SendWebhookNodeData['bodyStructured']) => {
    const next = fields || [];
    onChange({ bodyStructured: next, body: serializeBody(next, bodyType as StructuredBodyType) });
  };

  const switchToStructured = () => {
    const parsed = tryParseToFields(data.body || '', bodyType as StructuredBodyType);
    if (parsed === null) {
      // Nested/invalid body cannot be flattened — keep raw, surface the hint.
      setShowNestedHint(true);
      return;
    }
    setShowNestedHint(false);
    onChange({
      bodyMode: 'structured',
      bodyStructured: parsed,
      body: serializeBody(parsed, bodyType as StructuredBodyType),
    });
  };

  const switchToRaw = () => {
    setShowNestedHint(false);
    // `body` already holds the serialized structured output — pass it through untouched.
    onChange({ bodyMode: 'raw' });
  };

  const copyTemplate = async (template: string, templateName: string) => {
    handleBodyChange(template);
    setCopiedTemplate(templateName);
    setTimeout(() => setCopiedTemplate(null), 2000);
  };

  const shouldShowBody = () => {
    const method = data.method || 'POST';
    return ['POST', 'PUT', 'PATCH'].includes(method);
  };

  if (!shouldShowBody()) {
    return (
      <div className="rounded-xl border bg-muted/24 p-4 text-center">
        <Code className="mx-auto mb-2 size-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {t('panels.sendWebhook.body.methodNotSupported', { method: data.method || 'GET' })}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Tipo do Body */}
      <Field>
        <FieldLabel>{t('panels.sendWebhook.body.contentType')}</FieldLabel>
        <Select
          items={BODY_TYPES.map(type => ({ value: type.value, label: type.label }))}
          value={data.bodyType || 'json'}
          onValueChange={v =>
            v != null && handleBodyTypeChange(v as 'json' | 'form' | 'text' | 'xml')
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectPopup alignItemWithTrigger={false}>
            {BODY_TYPES.map(type => (
              <SelectItem key={type.value} value={type.value}>
                <div>
                  <div className="font-medium">{type.label}</div>
                  <div className="text-xs text-muted-foreground">{type.description}</div>
                </div>
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
      </Field>

      {/* Toggle Estruturado / Bruto (apenas json/form) */}
      {structuredCapable && (
        <div className="flex items-center gap-2">
          <Button
            variant={mode === 'structured' ? 'default' : 'outline'}
            size="sm"
            onClick={switchToStructured}
          >
            <Table />
            {t('panels.sendWebhook.body.modeStructured')}
          </Button>
          <Button variant={mode === 'raw' ? 'default' : 'outline'} size="sm" onClick={switchToRaw}>
            <FileText />
            {t('panels.sendWebhook.body.modeRaw')}
          </Button>
        </div>
      )}

      {showNestedHint && (
        <div className="rounded-xl border border-warning/24 bg-warning/8 p-3">
          <p className="text-warning-foreground text-xs">
            ⚠️ {t('panels.sendWebhook.body.nestedRawOnlyHint')}
          </p>
        </div>
      )}

      {/* Modo Estruturado */}
      {structuredCapable && mode === 'structured' ? (
        <WebhookBodyBuilder
          fields={data.bodyStructured || []}
          bodyType={bodyType as StructuredBodyType}
          onChange={handleStructuredChange}
          journeyId={journeyId}
        />
      ) : (
        <>
          {/* Templates para JSON (apenas modo bruto) */}
          {bodyType === 'json' && (
            <Field>
              <FieldLabel>{t('panels.sendWebhook.body.jsonTemplates')}</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {Object.entries(JSON_TEMPLATES).map(([name, template]) => (
                  <Button
                    key={name}
                    variant="outline"
                    size="sm"
                    onClick={() => copyTemplate(template, name)}
                  >
                    {copiedTemplate === name ? <Check /> : <Copy />}
                    {name === 'contact'
                      ? t('panels.sendWebhook.body.templateContact')
                      : name === 'event'
                        ? t('panels.sendWebhook.body.templateEvent')
                        : t('panels.sendWebhook.body.templateCustom')}
                  </Button>
                ))}
              </div>
            </Field>
          )}

          {/* Editor do Body (bruto) */}
          <Field className="items-stretch">
            <FieldLabel>{t('panels.sendWebhook.body.bodyContent')}</FieldLabel>
            <VariableTextarea
              value={data.body || ''}
              onChange={e => handleBodyChange(e.target.value)}
              placeholder={
                bodyType === 'json'
                  ? t('panels.sendWebhook.body.jsonPlaceholder')
                  : bodyType === 'form'
                    ? t('panels.sendWebhook.body.formPlaceholder')
                    : bodyType === 'xml'
                      ? t('panels.sendWebhook.body.xmlPlaceholder')
                      : t('panels.sendWebhook.body.textPlaceholder')
              }
              className="font-mono"
              style={{ minHeight: '120px' }}
              journeyId={journeyId}
            />
            <FieldDescription>{t('panels.sendWebhook.body.useVariables')}</FieldDescription>
          </Field>
        </>
      )}

      {/* Variáveis disponíveis */}
      <div className="rounded-xl border border-info/24 bg-info/8 p-4">
        <p className="mb-2 font-medium text-info-foreground text-sm">
          {t('panels.sendWebhook.body.availableVariables')}
        </p>
        <div className="grid grid-cols-2 gap-2 text-foreground text-xs">
          <div>
            <strong>{t('panels.sendWebhook.body.contact')}</strong>
            <div className="font-mono text-info-foreground">
              {'{{contact.id}}'}
              <br />
              {'{{contact.name}}'}
              <br />
              {'{{contact.email}}'}
              <br />
              {'{{contact.phone}}'}
            </div>
          </div>
          <div>
            <strong>{t('panels.sendWebhook.body.system')}</strong>
            <div className="font-mono text-info-foreground">
              {'{{journey.id}}'}
              <br />
              {'{{journey.name}}'}
              <br />
              {'{{now}}'}
              <br />
              {'{{timestamp}}'}
            </div>
          </div>
        </div>
      </div>

      {/* Preview do body */}
      {data.body && (
        <div className="rounded-xl border bg-muted/24 p-4">
          <p className="mb-2 text-foreground text-sm">
            <strong>{t('panels.sendWebhook.body.bodyPreview')}</strong>
          </p>
          <pre className="max-h-32 overflow-y-auto whitespace-pre-wrap break-words font-mono text-muted-foreground text-xs">
            {data.body}
          </pre>
        </div>
      )}
    </div>
  );
}
