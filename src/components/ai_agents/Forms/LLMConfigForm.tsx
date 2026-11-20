import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Bot, Key, MessageSquare, Settings } from 'lucide-react';
import { ApiKey } from '@/types/agents';
import { ApiKeysModal } from '@/components/ApiKeysModal';
import { useLanguage } from '@/hooks/useLanguage';
import AdvancedBotConfig, { AdvancedBotConfigData } from './AdvancedBotConfig';
import ModelSelector, { availableModels } from '@/components/ai_agents/ModelSelector';

type AgentPageMode = 'create' | 'edit' | 'view';

export interface LLMConfigData {
  model: string;
  api_key_id: string;
  instruction: string;
  output_key: string;
  // Configurações avançadas do bot
  advanced_config: AdvancedBotConfigData;
}

export interface A2AConfigData {
  agent_card_url: string;
  output_key: string;
}

interface LLMConfigFormProps {
  mode: AgentPageMode;
  data: LLMConfigData;
  onChange: (data: LLMConfigData) => void;
  onValidationChange: (isValid: boolean, errors: string[]) => void;
  apiKeys: ApiKey[];
  onApiKeysReload?: () => void;
  hideInstructions?: boolean;
}

const CUSTOM_OPENAI_PROVIDER = 'custom_openai_compatible';

// Função para sanitizar nome do agente (igual ao evo-ai-frontend)
const sanitizeAgentName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
};

const LLMConfigForm = ({
  mode,
  data,
  onChange,
  onValidationChange,
  apiKeys,
  onApiKeysReload,
  hideInstructions = false,
}: LLMConfigFormProps) => {
  const { t } = useLanguage('aiAgents');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showApiKeysModal, setShowApiKeysModal] = useState(false);
  const selectedApiKey = apiKeys.find(key => key.id === data.api_key_id);
  const customProviderSelected = selectedApiKey?.provider === CUSTOM_OPENAI_PROVIDER;

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!data.model?.trim()) {
      newErrors.model = t('validation.modelRequired');
    } else if (data.model && !customProviderSelected && !data.model.includes('/')) {
      newErrors.model = 'Use provider/model format.';
    }

    if (!data.api_key_id) {
      newErrors.api_key_id = t('validation.apiKeyRequired');
    }

    if (data.instruction && data.instruction.length < 10) {
      newErrors.instruction = t('validation.instructionMinLength', { min: 10 });
    }

    return newErrors;
  }, [data.model, data.api_key_id, data.instruction, t, customProviderSelected]);

  useEffect(() => {
    const newErrors = validateForm();
    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    const errorMessages = Object.values(newErrors);

    // Usar setTimeout para evitar loops
    const timer = setTimeout(() => {
      onValidationChange(isValid, errorMessages);
    }, 0);

    return () => clearTimeout(timer);
  }, [validateForm, onValidationChange]);

  const handleInputChange = useCallback(
    (field: keyof LLMConfigData, value: string | number) => {
      onChange({ ...data, [field]: value });
    },
    [data, onChange],
  );

  const handleModelChange = useCallback(
    (model: string) => {
      onChange({
        ...data,
        model,
      });
    },
    [data, onChange],
  );

  const handleAdvancedConfigChange = useCallback(
    (advancedConfig: AdvancedBotConfigData) => {
      onChange({ ...data, advanced_config: advancedConfig });
    },
    [data, onChange],
  );

  const isReadOnly = mode === 'view';

  // Limpar modelo se não for compatível com a chave API selecionada
  useEffect(() => {
    if (!data.model || !data.api_key_id) return;

    const selectedApiKey = apiKeys.find(key => key.id === data.api_key_id);
    if (!selectedApiKey) return;
    if (selectedApiKey.provider === CUSTOM_OPENAI_PROVIDER) return;

    // Verificar se o modelo atual é compatível com o provider da chave API
    // O ModelSelector já faz essa validação, mas mantemos aqui para garantir consistência
    const providerModels = availableModels.filter(
      model => model.provider === selectedApiKey.provider,
    );
    const modelIsKnownForProvider = providerModels.some(model => model.value === data.model);
    const modelIsKnown = availableModels.some(model => model.value === data.model);

    if (modelIsKnown && !modelIsKnownForProvider) {
      onChange({ ...data, model: '' });
    }
  }, [data.api_key_id, data.model, apiKeys, onChange, data]);

  const handleApiKeysChange = useCallback(() => {
    if (onApiKeysReload) {
      onApiKeysReload();
    }
  }, [onApiKeysReload]);

  return (
    <>
      <div className="space-y-6">
        {/* Card da Chave API */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Key className="h-5 w-5 text-success" />
              </div>
              <div>
                <CardTitle>{t('llmConfig.apiKey')}</CardTitle>
                <CardDescription>{t('llmConfig.apiKeyDescription')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardPanel className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="apiKey">
                  {t('llmConfig.apiKey')} <span className="text-destructive">*</span>
                </Label>
                {!isReadOnly && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowApiKeysModal(true)}
                    className="h-8 px-3"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    {t('llmConfig.manageApiKeys')}
                  </Button>
                )}
              </div>
              {isReadOnly && selectedApiKey ? (
                <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium">{selectedApiKey.name}</p>
                      <p className="text-sm text-muted-foreground">{selectedApiKey.provider}</p>
                    </div>
                  </div>
                  <Badge variant={selectedApiKey.is_active ? 'default' : 'secondary'}>
                    {selectedApiKey.is_active
                      ? t('llmConfig.activeApiKey')
                      : t('llmConfig.inactiveApiKey')}
                  </Badge>
                </div>
              ) : (
                <>
                  <Select
                    items={apiKeys
                      .filter(key => key.is_active)
                      .map(key => ({ value: key.id, label: key.name }))}
                    value={data.api_key_id || null}
                    onValueChange={value => value && handleInputChange('api_key_id', value)}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger
                      className="w-80"
                      aria-invalid={!!errors.api_key_id || undefined}
                      id="apiKey"
                    >
                      <SelectValue placeholder={t('llmConfig.selectApiKey')} />
                    </SelectTrigger>
                    <SelectPopup>
                      {apiKeys
                        .filter(key => key.is_active)
                        .map(apiKey => (
                          <SelectItem key={apiKey.id} value={apiKey.id} className="cursor-pointer">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{apiKey.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {apiKey.provider}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectPopup>
                  </Select>
                </>
              )}
              {errors.api_key_id && (
                <p className="text-xs text-destructive-foreground">{errors.api_key_id}</p>
              )}
            </div>
          </CardPanel>
        </Card>

        {/* Card do Modelo */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <Bot className="h-5 w-5 text-info" />
              </div>
              <div>
                <CardTitle className="pb-2">{t('llmConfig.model')}</CardTitle>
                <CardDescription>
                  {selectedApiKey
                    ? t('llmConfig.modelFilteredDescription', {
                        provider: selectedApiKey.provider.toUpperCase(),
                      })
                    : t('llmConfig.modelAllDescription')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardPanel className="space-y-4">
            <ModelSelector
              value={data.model || ''}
              onChange={handleModelChange}
              apiKeys={apiKeys}
              apiKeyId={data.api_key_id}
              isReadOnly={isReadOnly}
              error={errors.model}
              required
            />
          </CardPanel>
        </Card>

        {/* Card das Instruções - Oculto se hideInstructions for true */}
        {!hideInstructions && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>{t('llmConfig.instruction')}</CardTitle>
                  <CardDescription>{t('llmConfig.instructionDescription')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardPanel className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="instruction">{t('llmConfig.instruction')}</Label>
                <Textarea
                  id="instruction"
                  value={data.instruction || ''}
                  onChange={e => handleInputChange('instruction', e.target.value)}
                  placeholder={t('llmConfig.instructionPlaceholder')}
                  rows={6}
                  disabled={isReadOnly}
                  aria-invalid={!!errors.instruction || undefined}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{t('llmConfig.instructionHelp')}</span>
                  <span>{data.instruction?.length || 0}/2000</span>
                </div>
                {errors.instruction && (
                  <p className="text-xs text-destructive-foreground">{errors.instruction}</p>
                )}
              </div>
            </CardPanel>
          </Card>
        )}

        {/* Card da Chave de Saída */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Settings className="h-5 w-5 text-success-foreground" />
              </div>
              <div>
                <CardTitle>{t('llmConfig.advancedSettings')}</CardTitle>
                <CardDescription>{t('llmConfig.advancedDescription')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardPanel className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="output-key" className="text-sm font-medium">
                {t('llmConfig.outputKey')}
              </Label>
              <Input
                id="output-key"
                value={data.output_key || ''}
                onChange={e => handleInputChange('output_key', sanitizeAgentName(e.target.value))}
                placeholder={t('llmConfig.outputKeyPlaceholder')}
                disabled={isReadOnly}
                aria-invalid={!!errors.output_key || undefined}
              />
              {errors.output_key && (
                <p className="text-xs text-destructive-foreground">{errors.output_key}</p>
              )}
              <p className="text-xs text-muted-foreground">{t('llmConfig.outputKeyDescription')}</p>
            </div>
          </CardPanel>
        </Card>

        {/* Configurações Avançadas do Bot */}
        <AdvancedBotConfig
          data={data.advanced_config}
          onChange={handleAdvancedConfigChange}
          isReadOnly={isReadOnly}
        />
      </div>

      {/* Modal de Gerenciamento de Chaves API */}
      <ApiKeysModal
        open={showApiKeysModal}
        onOpenChange={setShowApiKeysModal}
        onApiKeysChange={handleApiKeysChange}
      />
    </>
  );
};

export default LLMConfigForm;
