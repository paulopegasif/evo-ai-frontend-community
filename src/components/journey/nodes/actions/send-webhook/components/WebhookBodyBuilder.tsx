import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, X } from '@/components/icons';
import { WebhookBodyField, WebhookBodyValueType } from '../SendWebhookNode';
import { VariableInput } from '@/components/journey/environment-manager';
import { useLanguage } from '@/hooks/useLanguage';
import { newBodyField, StructuredBodyType } from './webhookBody';

interface WebhookBodyBuilderProps {
  fields: WebhookBodyField[];
  bodyType: StructuredBodyType;
  onChange: (fields: WebhookBodyField[]) => void;
  journeyId: string;
}

const VALUE_TYPES: WebhookBodyValueType[] = ['string', 'number', 'boolean'];

export function WebhookBodyBuilder({
  fields,
  bodyType,
  onChange,
  journeyId,
}: WebhookBodyBuilderProps) {
  const { t } = useLanguage('journey');
  const showTypeColumn = bodyType === 'json';

  const addField = () => onChange([...fields, newBodyField()]);

  const updateField = (id: string, updates: Partial<WebhookBodyField>) =>
    onChange(fields.map(field => (field.id === id ? { ...field, ...updates } : field)));

  const removeField = (id: string) => onChange(fields.filter(field => field.id !== id));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Label>{t('panels.sendWebhook.body.bodyContent')}</Label>
        <Button variant="outline" size="sm" onClick={addField}>
          <Plus />
          {t('panels.sendWebhook.body.builder.addField')}
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {fields.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/24 p-4 text-center">
            <p className="text-sm text-muted-foreground">
              {t('panels.sendWebhook.body.builder.noFields')}
            </p>
          </div>
        ) : (
          fields.map(field => (
            <div key={field.id} className="rounded-xl border bg-muted/24 p-3">
              <div className="grid grid-cols-12 items-end gap-3">
                {/* Key */}
                <Field
                  className={cn(showTypeColumn ? 'col-span-4' : 'col-span-5', 'items-stretch')}
                >
                  <FieldLabel className="text-xs">
                    {t('panels.sendWebhook.body.builder.keyLabel')}
                  </FieldLabel>
                  <VariableInput
                    value={field.key}
                    onChange={e => updateField(field.id, { key: e.target.value })}
                    placeholder={t('panels.sendWebhook.body.builder.keyPlaceholder')}
                    journeyId={journeyId}
                  />
                </Field>

                {/* Value */}
                <Field
                  className={cn(showTypeColumn ? 'col-span-4' : 'col-span-6', 'items-stretch')}
                >
                  <FieldLabel className="text-xs">
                    {t('panels.sendWebhook.body.builder.valueLabel')}
                  </FieldLabel>
                  <VariableInput
                    value={field.value}
                    onChange={e => updateField(field.id, { value: e.target.value })}
                    placeholder={t('panels.sendWebhook.body.builder.valuePlaceholder')}
                    journeyId={journeyId}
                  />
                </Field>

                {/* Type (JSON only) */}
                {showTypeColumn && (
                  <Field className="col-span-3">
                    <FieldLabel className="text-xs">
                      {t('panels.sendWebhook.body.builder.typeLabel')}
                    </FieldLabel>
                    <Select
                      items={VALUE_TYPES.map(type => ({
                        value: type,
                        label: t(`panels.sendWebhook.body.builder.types.${type}`),
                      }))}
                      value={field.type}
                      onValueChange={v =>
                        v != null && updateField(field.id, { type: v as WebhookBodyValueType })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectPopup alignItemWithTrigger={false}>
                        {VALUE_TYPES.map(type => (
                          <SelectItem key={type} value={type}>
                            {t(`panels.sendWebhook.body.builder.types.${type}`)}
                          </SelectItem>
                        ))}
                      </SelectPopup>
                    </Select>
                  </Field>
                )}

                {/* Remove */}
                <div className="col-span-1 flex justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeField(field.id)}
                    aria-label={t('panels.sendWebhook.body.builder.removeField')}
                    className="text-destructive-foreground hover:text-destructive-foreground"
                  >
                    <X />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
