import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowRight, ArrowLeft } from '@/components/icons';
import { useLanguage } from '@/hooks/useLanguage';
import { KeyValueEditor } from '@/components/ai_agents/shared';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

export interface Step2Data {
  method: string;
  endpoint: string;
  headers: Record<string, unknown>;
}

interface Step2Props {
  data: Step2Data;
  onChange: (data: Step2Data) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function Step2_Endpoint({ data, onChange, onNext, onBack }: Step2Props) {
  const { t } = useLanguage('customTools');
  const [error, setError] = useState('');

  const handleNext = () => {
    if (!data.endpoint || !data.endpoint.trim()) {
      setError(t('form.validation.endpointRequired'));
      return;
    }
    try {
      new URL(data.endpoint);
    } catch {
      setError(t('form.validation.endpointInvalid'));
      return;
    }
    setError('');
    onNext();
  };

  return (
    <div className="flex flex-col h-full min-h-0 max-w-4xl mx-auto py-2 px-4">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="w-full max-w-2xl mx-auto space-y-4">
          <div className="grid grid-cols-[140px_1fr] gap-3">
            <div>
              <Label className="text-sm mb-1.5 block font-semibold">
                {t('form.fields.method.label')} <span className="text-destructive">*</span>
              </Label>
              <Select
                value={data.method}
                onValueChange={value => value && onChange({ ...data, method: value })}
              >
                <SelectTrigger size="lg">
                  <SelectValue placeholder={t('form.fields.method.placeholder')} />
                </SelectTrigger>
                <SelectPopup>
                  {HTTP_METHODS.map(method => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </div>

            <div>
              <Label className="text-sm mb-1.5 block font-semibold">
                {t('form.fields.endpoint.label')} <span className="text-destructive">*</span>
              </Label>
              <Input
                size="lg"
                placeholder={t('form.fields.endpoint.placeholder')}
                value={data.endpoint}
                onChange={e => onChange({ ...data, endpoint: e.target.value })}
                aria-invalid={!!error || undefined}
              />
              {error && <p className="text-sm text-destructive-foreground mt-2">{error}</p>}
            </div>
          </div>

          <div className="pt-2">
            <KeyValueEditor
              id="headers"
              label={t('form.fields.headers.labelKv')}
              value={data.headers}
              onChange={next => onChange({ ...data, headers: next })}
              hint={t('form.fields.headers.hint')}
              keyPlaceholder={t('form.fields.headers.keyPlaceholder')}
              valuePlaceholder={t('form.fields.headers.valuePlaceholder')}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between flex-shrink-0 pt-2 border-t">
        <Button variant="outline" className="px-6 gap-2" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          {t('wizard.actions.back')}
        </Button>
        <Button className="px-6 gap-2" onClick={handleNext} disabled={!data.endpoint}>
          {t('wizard.actions.continue')}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
