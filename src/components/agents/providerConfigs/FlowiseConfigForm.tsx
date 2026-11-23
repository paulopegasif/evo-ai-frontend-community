import { Input } from '@/components/ui/input';
import SecretInput from '@/components/integrations/shared/SecretInput';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/hooks/useLanguage';

export interface FlowiseConfig {
  apiUrl?: string;
  apiKey?: string;
}

interface FlowiseConfigFormProps {
  config: FlowiseConfig;
  onChange: (config: FlowiseConfig) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}

export const FlowiseConfigForm = ({
  config,
  onChange,
  errors = {},
  disabled = false,
}: FlowiseConfigFormProps) => {
  const { t } = useLanguage('aiAgents');

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="flowise_apiUrl">
          {t('edit.configuration.sections.externalIntegration.forms.flowise.apiUrl')}
        </Label>
        <Input
          id="flowise_apiUrl"
          value={config.apiUrl || ''}
          onChange={e => onChange({ ...config, apiUrl: e.target.value })}
          placeholder="https://flowise.example.com/api/v1/prediction/{chatflowId}"
          disabled={disabled}
        />
        {errors.apiUrl && <p className="text-xs text-destructive-foreground">{errors.apiUrl}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="flowise_apiKey">
          {t('edit.configuration.sections.externalIntegration.forms.flowise.apiKey')}
        </Label>
        <SecretInput
          id="flowise_apiKey"
          value={config.apiKey || ''}
          onChange={e => onChange({ ...config, apiKey: e.target.value })}
          placeholder="sk-..."
          disabled={disabled}
        />
      </div>
    </>
  );
};
