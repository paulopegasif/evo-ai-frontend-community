import { useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardPanel } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowRight, ArrowLeft, Key, Bot, Settings } from 'lucide-react';
import { ApiKey } from '@/types/agents';
import { useLanguage } from '@/hooks/useLanguage';
import { ApiKeysModal } from '@/components/ApiKeysModal';
import ModelSelector from '@/components/ai_agents/ModelSelector';

const CUSTOM_OPENAI_PROVIDER = 'custom_openai_compatible';

interface Step6Props {
  data: {
    api_key_id: string;
    model: string;
  };
  onChange: (data: { api_key_id: string; model: string }) => void;
  onNext: () => void;
  onBack: () => void;
  apiKeys: ApiKey[];
  onApiKeysReload: () => void;
}

const Step6_ApiKeyModel = ({
  data,
  onChange,
  onNext,
  onBack,
  apiKeys,
  onApiKeysReload,
}: Step6Props) => {
  const { t } = useLanguage('aiAgents');
  const [errors, setErrors] = useState<{ api_key_id?: string; model?: string }>({});
  const [showApiKeysModal, setShowApiKeysModal] = useState(false);

  const selectedApiKey = apiKeys.find(key => key.id === data.api_key_id);
  const customProviderSelected = selectedApiKey?.provider === CUSTOM_OPENAI_PROVIDER;

  const handleNext = () => {
    const newErrors: { api_key_id?: string; model?: string } = {};

    if (!data.api_key_id) {
      newErrors.api_key_id = t('validation.apiKeyRequired');
    }

    if (!data.model?.trim()) {
      newErrors.model = t('validation.modelRequired');
    } else if (data.model && !customProviderSelected && !data.model.includes('/')) {
      newErrors.model = 'Use provider/model format.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onNext();
  };

  const handleApiKeysChange = useCallback(() => {
    onApiKeysReload();
  }, [onApiKeysReload]);

  return (
    <>
      <div className="flex flex-col h-full min-h-0 max-w-5xl mx-auto py-2 px-4">
        <div className="flex-1 space-y-3 overflow-y-auto min-h-0">
          {/* API Key */}
          <Card>
            <CardPanel className="pt-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-success/10">
                  <Key className="h-4 w-4 text-success" />
                </div>
                <div className="flex-1">
                  <Label className="text-sm font-semibold">
                    {t('wizard.step6.apiKeyLabel')} <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t('wizard.step6.apiKeyDescription')}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowApiKeysModal(true)}
                  className="gap-1.5 h-8"
                >
                  <Settings className="h-3 w-3" />
                  {t('wizard.step6.manageButton')}
                </Button>
              </div>

              <Select
                items={apiKeys
                  .filter(key => key.is_active)
                  .map(key => ({ value: key.id, label: key.name }))}
                value={data.api_key_id || null}
                onValueChange={value => {
                  if (value === null) return;
                  onChange({ ...data, api_key_id: value });
                  setErrors({ ...errors, api_key_id: undefined });
                }}
              >
                <SelectTrigger
                  size="lg"
                  className="w-full"
                  aria-invalid={!!errors.api_key_id || undefined}
                >
                  <SelectValue placeholder={t('wizard.step6.apiKeyPlaceholder')} />
                </SelectTrigger>
                <SelectPopup>
                  {apiKeys
                    .filter(key => key.is_active)
                    .map(apiKey => (
                      <SelectItem key={apiKey.id} value={apiKey.id} className="cursor-pointer">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{apiKey.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {apiKey.provider}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                </SelectPopup>
              </Select>
              {errors.api_key_id && (
                <p className="text-xs text-destructive-foreground mt-1">{errors.api_key_id}</p>
              )}
            </CardPanel>
          </Card>

          {/* Model */}
          <Card>
            <CardPanel className="pt-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-info/10">
                  <Bot className="h-4 w-4 text-info" />
                </div>
                <div>
                  <Label className="text-sm font-semibold">
                    {t('wizard.step6.modelLabel')} <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {selectedApiKey
                      ? t('wizard.step6.modelDescriptionWithProvider', {
                          provider: selectedApiKey.provider.toUpperCase(),
                        })
                      : t('wizard.step6.modelDescriptionDefault')}
                  </p>
                </div>
              </div>

              <ModelSelector
                value={data.model || ''}
                onChange={model => {
                  onChange({ ...data, model });
                  setErrors({ ...errors, model: undefined });
                }}
                apiKeys={apiKeys}
                apiKeyId={data.api_key_id}
                error={errors.model}
                required
                className="w-full"
                showLabel={false}
                description={
                  selectedApiKey
                    ? t('wizard.step6.modelDescriptionWithProvider', {
                        provider: selectedApiKey.provider.toUpperCase(),
                      })
                    : t('wizard.step6.modelDescriptionDefault')
                }
              />
            </CardPanel>
          </Card>
        </div>

        <div className="flex justify-between flex-shrink-0 pt-2 border-t">
          <Button variant="outline" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t('actions.back')}
          </Button>
          <Button
            onClick={handleNext}
            disabled={
              !data.api_key_id ||
              !data.model?.trim() ||
              (!customProviderSelected && !data.model.includes('/'))
            }
            className="gap-2 px-6"
          >
            {t('actions.continue')}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ApiKeysModal
        open={showApiKeysModal}
        onOpenChange={setShowApiKeysModal}
        onApiKeysChange={handleApiKeysChange}
      />
    </>
  );
};

export default Step6_ApiKeyModel;
