import { useState, useEffect } from 'react';
import { AlertCircle, Play } from '@/components/icons';
import BrandIcon from '@/components/BrandIcon';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ConfirmDialog from '@/components/base/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Spinner } from '@/components/ui/spinner';
import { AgentIntegrationDialog } from './agentConfig/AgentIntegrationDialog';
import { useLanguage } from '@/hooks/useLanguage';

interface ElevenLabsConfig {
  apiKey: string;
  respondInAudio: 'when_client_asks' | 'always' | 'never';
  voice: string;
  stability: number;
  similarity: number;
}

interface ElevenLabsConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: ElevenLabsConfig) => void;
  onDeactivate?: () => void;
  initialConfig?: Partial<ElevenLabsConfig>;
}

interface Voice {
  voice_id: string;
  name: string;
}

const ElevenLabsConfigDialog = ({
  open,
  onOpenChange,
  onSave,
  onDeactivate,
  initialConfig,
}: ElevenLabsConfigDialogProps) => {
  const { t } = useLanguage('aiAgents');
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  const [config, setConfig] = useState<ElevenLabsConfig>({
    apiKey: initialConfig?.apiKey || '',
    respondInAudio: initialConfig?.respondInAudio || 'when_client_asks',
    voice: initialConfig?.voice || '',
    stability: initialConfig?.stability ?? 80,
    similarity: initialConfig?.similarity ?? 50,
  });

  const [availableVoices, setAvailableVoices] = useState<Voice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [voicesError, setVoicesError] = useState(false);

  useEffect(() => {
    if (initialConfig) {
      setConfig({
        apiKey: initialConfig.apiKey || '',
        respondInAudio: initialConfig.respondInAudio || 'when_client_asks',
        voice: initialConfig.voice || '',
        stability: initialConfig.stability ?? 80,
        similarity: initialConfig.similarity ?? 50,
      });
    }
  }, [initialConfig]);

  // Fetch voices from ElevenLabs API when apiKey changes
  useEffect(() => {
    const fetchVoices = async () => {
      if (!config.apiKey || config.apiKey.length < 10) {
        setAvailableVoices([]);
        return;
      }

      setLoadingVoices(true);
      setVoicesError(false);

      try {
        const response = await fetch('https://api.elevenlabs.io/v1/voices', {
          method: 'GET',
          headers: {
            'xi-api-key': config.apiKey,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch voices');
        }

        const data = await response.json();
        const voices = data.voices.map((voice: any) => ({
          voice_id: voice.voice_id,
          name: voice.name,
        }));

        setAvailableVoices(voices);

        // Se não há voz selecionada e temos vozes disponíveis, seleciona a primeira
        if (!config.voice && voices.length > 0) {
          setConfig(prev => ({ ...prev, voice: voices[0].voice_id }));
        }
      } catch (error) {
        console.error('Error fetching ElevenLabs voices:', error);
        setVoicesError(true);
        setAvailableVoices([]);
      } finally {
        setLoadingVoices(false);
      }
    };

    fetchVoices();
  }, [config.apiKey]);

  const handleSave = () => {
    onSave(config);
    onOpenChange(false);
  };

  const handleDeactivate = () => {
    if (onDeactivate) {
      onDeactivate();
    }
    onOpenChange(false);
  };

  const set = <K extends keyof ElevenLabsConfig>(key: K, value: ElevenLabsConfig[K]) =>
    setConfig(prev => ({ ...prev, [key]: value }));

  const respondItems = [
    {
      value: 'when_client_asks',
      label:
        t('edit.integrations.elevenlabs.whenClientAsksInAudio') ||
        'Quando a pergunta do cliente for em áudio',
    },
    {
      value: 'always',
      label: t('edit.integrations.elevenlabs.alwaysRespondInAudio') || 'Responder sempre em áudio',
    },
  ];
  const voiceItems = availableVoices.map(voice => ({ value: voice.voice_id, label: voice.name }));
  const showVoiceSettings = Boolean(config.apiKey) && !voicesError;

  return (
    <>
      <AgentIntegrationDialog
        open={open}
        onOpenChange={onOpenChange}
        icon={<BrandIcon id="elevenlabs" size={20} color="currentColor" />}
        title={t('edit.integrations.elevenlabs.configTitle') || 'Configurar integração'}
        footerStart={
          onDeactivate ? (
            <Button variant="destructive-outline" onClick={() => setConfirmDeactivate(true)}>
              {t('edit.integrations.elevenlabs.deactivate') || 'Desativar integração'}
            </Button>
          ) : undefined
        }
        footer={
          <Button onClick={handleSave} disabled={!config.apiKey}>
            {t('edit.integrations.elevenlabs.applyConfig') || 'APLICAR CONFIGURAÇÕES'}
          </Button>
        }
      >
        <div className="flex flex-col gap-5">
          <Field>
            <FieldLabel>{t('edit.integrations.elevenlabs.apiKey') || 'API Key'}</FieldLabel>
            <Input
              id="apiKey"
              type="password"
              autoComplete="off"
              placeholder={
                t('edit.integrations.elevenlabs.apiKeyPlaceholder') ||
                'Insira sua API Key do ElevenLabs'
              }
              value={config.apiKey}
              onChange={e => set('apiKey', e.target.value)}
            />
          </Field>

          {config.apiKey && voicesError && (
            <Alert variant="error">
              <AlertCircle />
              <AlertDescription>
                {t('edit.integrations.elevenlabs.errorLoadingVoices') || 'Erro ao carregar vozes'} -
                Verifique se a API Key está correta.
              </AlertDescription>
            </Alert>
          )}

          {showVoiceSettings && (
            <>
              <Field>
                <FieldLabel>
                  {t('edit.integrations.elevenlabs.whenToRespond') || 'Quando responder em áudio:'}
                </FieldLabel>
                <Select
                  items={respondItems}
                  value={config.respondInAudio}
                  onValueChange={value =>
                    value && set('respondInAudio', value as ElevenLabsConfig['respondInAudio'])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopup>
                    {respondItems.map(item => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
                <FieldDescription>
                  {t('edit.integrations.elevenlabs.whenToRespondDescription') ||
                    'Defina em quais momentos o agente vai mandar em áudio a resposta.'}
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel>
                  {t('edit.integrations.elevenlabs.voiceSelection') || 'Qual voz deseja usar:'}
                </FieldLabel>
                <div className="flex w-full gap-2">
                  <Select
                    items={voiceItems}
                    value={config.voice || null}
                    onValueChange={value => set('voice', (value as string) || '')}
                    disabled={loadingVoices || availableVoices.length === 0}
                  >
                    <SelectTrigger className="flex-1">
                      {loadingVoices ? (
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Spinner className="size-4" />
                          {t('edit.integrations.elevenlabs.loadingVoices') || 'Carregando vozes...'}
                        </span>
                      ) : (
                        <SelectValue
                          placeholder={
                            t('edit.integrations.elevenlabs.selectVoice') || 'Selecione uma voz'
                          }
                        />
                      )}
                    </SelectTrigger>
                    <SelectPopup>
                      {voiceItems.map(item => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectPopup>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Preview"
                    onClick={() => {
                      // TODO: Implementar preview da voz
                      console.log('Preview voice:', config.voice);
                    }}
                    disabled={!config.voice || loadingVoices}
                  >
                    <Play />
                  </Button>
                </div>
                <FieldDescription>
                  {t('edit.integrations.elevenlabs.voiceSelectionDescription') ||
                    'Escolha a voz que deseja usar nas respostas do agente.'}
                </FieldDescription>
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field>
                  <div className="flex w-full items-center justify-between">
                    <FieldLabel>
                      {t('edit.integrations.elevenlabs.stability') || 'Estabilidade:'}
                    </FieldLabel>
                    <span className="font-medium text-sm tabular-nums">{config.stability}%</span>
                  </div>
                  <Slider
                    value={config.stability}
                    onValueChange={value =>
                      set('stability', Array.isArray(value) ? value[0] : (value as number))
                    }
                    min={0}
                    max={100}
                    step={1}
                  />
                </Field>
                <Field>
                  <div className="flex w-full items-center justify-between">
                    <FieldLabel>
                      {t('edit.integrations.elevenlabs.similarity') || 'Similaridade:'}
                    </FieldLabel>
                    <span className="font-medium text-sm tabular-nums">{config.similarity}%</span>
                  </div>
                  <Slider
                    value={config.similarity}
                    onValueChange={value =>
                      set('similarity', Array.isArray(value) ? value[0] : (value as number))
                    }
                    min={0}
                    max={100}
                    step={1}
                  />
                </Field>
              </div>
            </>
          )}
        </div>
      </AgentIntegrationDialog>
      <ConfirmDialog
        open={confirmDeactivate}
        onOpenChange={setConfirmDeactivate}
        title={t('edit.integrations.disconnectConfirm.title', { name: 'ElevenLabs' })}
        description={t('edit.integrations.disconnectConfirm.description', { name: 'ElevenLabs' })}
        cancelLabel={t('edit.integrations.disconnectConfirm.cancel')}
        confirmLabel={t('edit.integrations.elevenlabs.deactivate') || 'Desativar integração'}
        onConfirm={() => {
          setConfirmDeactivate(false);
          handleDeactivate();
        }}
      />
    </>
  );
};

export default ElevenLabsConfigDialog;
