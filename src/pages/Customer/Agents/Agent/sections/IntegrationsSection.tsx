import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Check, ExternalLink, Library, Plug, Settings } from 'lucide-react';
import {
  IntegrationTile,
  IntegrationTileGridSkeleton,
} from '@/components/integrations/agentConfig/IntegrationTile';
import SectionHeader from './SectionHeader';
import ElevenLabsConfigDialog from '@/components/integrations/ElevenLabsConfigDialog';
import GoogleCalendarConfigDialog from '@/components/integrations/GoogleCalendarConfigDialog';
import GoogleSheetsConfigDialog from '@/components/integrations/GoogleSheetsConfigDialog';
import KnowledgeNexusConfigDialog, {
  type KnowledgeNexusConfig,
} from '@/components/integrations/KnowledgeNexusConfigDialog';
import { useIntegrations } from '@/hooks/useIntegrations';
import { agentIntegrationsService } from '@/services/agents/agentIntegrationsService';
import { toast } from 'sonner';
import BrandIcon from '@/components/BrandIcon';

interface Integration {
  id: string;
  name: string;
  description: string;
}

interface IntegrationsSectionProps {
  integrations?: Record<string, unknown>;
  onIntegrationsChange?: (integrations: Record<string, unknown>) => void;
  agentId: string;
}

const IntegrationsSection = ({
  integrations = {},
  onIntegrationsChange,
  agentId,
}: IntegrationsSectionProps) => {
  const { t } = useLanguage('aiAgents');
  const [showElevenLabsConfig, setShowElevenLabsConfig] = useState(false);
  const [showGoogleCalendarConfig, setShowGoogleCalendarConfig] = useState(false);
  const [showGoogleSheetsConfig, setShowGoogleSheetsConfig] = useState(false);
  const [showKnowledgeNexusConfig, setShowKnowledgeNexusConfig] = useState(false);

  // Use custom hook for integrations status.
  // `available` is the DISPONIBILIDADE signal (CRM :3000 endpoint) used to gate
  // "Em breve"/ATIVAR-disabled; `isConnected` is the per-agent "connected" state.
  const { available, isCheckingIntegrations, isConnected, reloadConfigs } =
    useIntegrations(agentId);

  // Persist an integration immediately via the backend Upsert endpoint, then
  // update local state. This is necessary because `agent.config.integrations`
  // is ignored by the backend's persistence layer for OAuth/native integrations
  // — the canonical store is the `agent_integrations` table behind
  // POST /agents/:id/integrations.
  const persistIntegration = async (
    provider: string,
    config: Record<string, unknown>
  ): Promise<boolean> => {
    if (!agentId) {
      toast.error(t('messages.saveError') || 'Agent must be saved first');
      return false;
    }
    try {
      await agentIntegrationsService.upsertIntegration(agentId, provider, {
        ...config,
        connected: true,
      });
      if (onIntegrationsChange) {
        onIntegrationsChange({ ...integrations, [provider]: { ...config, connected: true } });
      }
      await reloadConfigs();
      toast.success(t('edit.integrations.activated') || 'Integration activated');
      return true;
    } catch (error) {
      console.error(`Error upserting integration ${provider}:`, error);
      toast.error(t('edit.integrations.activationError') || 'Failed to activate integration');
      return false;
    }
  };

  const removeIntegration = async (provider: string): Promise<boolean> => {
    if (!agentId) return false;
    try {
      await agentIntegrationsService.deleteIntegration(agentId, provider);
      if (onIntegrationsChange) {
        const next = { ...integrations };
        delete next[provider];
        onIntegrationsChange(next);
      }
      await reloadConfigs();
      toast.success(t('edit.integrations.deactivated') || 'Integration deactivated');
      return true;
    } catch (error) {
      console.error(`Error deleting integration ${provider}:`, error);
      toast.error(t('edit.integrations.deactivationError') || 'Failed to deactivate integration');
      return false;
    }
  };

  // Integrações que sempre estão disponíveis porque o usuário fornece sua
  // própria credencial (API key). Não dependem de OAuth global configurado
  // pelo administrador. Google Calendar / Sheets usam OAuth global e portanto
  // só ficam disponíveis quando o mapa `available` (endpoint de disponibilidade
  // do CRM) indica que o admin configurou as chaves correspondentes.
  // Google Calendar / Sheets connect via per-agent OAuth (their own config
  // dialogs), not a globally-configured client credential — so they are always
  // available, like ElevenLabs (API key). Keeping them out of this list left them
  // stuck on "NÃO DISPONÍVEL" despite the render logic already wiring their dialogs.
  const ALWAYS_AVAILABLE_INTEGRATIONS = ['elevenlabs', 'knowledge-nexus', 'google-calendar', 'google-sheets'];

  const availableIntegrations: Integration[] = [
    {
      id: 'elevenlabs',
      name: 'ElevenLabs',
      description:
        t('edit.integrations.elevenlabs.description') ||
        'Com ElevenLabs você da a capacidade do seu agente responder seus clientes em áudio, tornando ainda mais humanizado.',
    },
    {
      id: 'google-calendar',
      name: 'Google Calendar',
      description:
        t('edit.integrations.googleCalendar.description') ||
        'Permite agendar eventos, verificar disponibilidade e gerenciar calendários.',
    },
    {
      id: 'google-sheets',
      name: 'Google Sheets',
      description:
        t('edit.integrations.googleSheets.description') ||
        'Permite criar, ler, atualizar e gerenciar planilhas do Google Sheets.',
    },
    {
      id: 'knowledge-nexus',
      name: 'Knowledge Nexus',
      description:
        t('edit.integrations.knowledgeNexus.description') ||
        'Permite que o agente consulte a base de conhecimento do EvoNexus (busca híbrida) antes de responder.',
    },
    // {
    //   id: 'gmail',
    //   name: 'Gmail',
    //   description: t('edit.integrations.gmail.description') || 'Conecte o agente ao Gmail para ler, enviar e gerenciar emails automaticamente.',
    // },
    // {
    //   id: 'google-drive',
    //   name: 'Google Drive',
    //   description: t('edit.integrations.googleDrive.description') || 'Permite que o agente acesse, busque e gerencie arquivos no Google Drive.',
    // }
  ];

  const openConfig = (id: string) => {
    if (id === 'elevenlabs') setShowElevenLabsConfig(true);
    else if (id === 'google-calendar') setShowGoogleCalendarConfig(true);
    else if (id === 'google-sheets') setShowGoogleSheetsConfig(true);
    else if (id === 'knowledge-nexus') setShowKnowledgeNexusConfig(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        icon={Plug}
        title={t('edit.integrations.title') || 'Integrações'}
        description={
          t('edit.integrations.subtitle') ||
          'Conecte o seu agente a outros aplicativos, isso permite que ele obtenha informações mais precisas ou agende reuniões para você.'
        }
      />

      {isCheckingIntegrations ? (
        <IntegrationTileGridSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {availableIntegrations.map(integration => {
            // ElevenLabs / Knowledge Nexus use an API key and Google Calendar / Sheets
            // use per-agent OAuth, so they never depend on global credentials.
            const isAlwaysAvailable = ALWAYS_AVAILABLE_INTEGRATIONS.includes(integration.id);
            const hasCredentials = isAlwaysAvailable || (available[integration.id] ?? false);
            const connected = isConnected(integration.id);

            const status = connected ? (
              <Badge variant="success">
                <Check />
                {t('edit.integrations.active') || 'Ativo'}
              </Badge>
            ) : !isAlwaysAvailable ? (
              <Badge variant="info">{t('edit.integrations.comingSoon') || 'Em breve'}</Badge>
            ) : null;

            const action = connected ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => openConfig(integration.id)}
              >
                <Settings />
                {t('edit.integrations.configure') || 'CONFIGURAR'}
              </Button>
            ) : hasCredentials ? (
              <Button size="sm" className="w-full" onClick={() => openConfig(integration.id)}>
                <ExternalLink />
                {t('edit.integrations.activate') || 'ATIVAR'}
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="w-full" disabled>
                <AlertCircle />
                {t('edit.integrations.notAvailable') || 'NÃO DISPONÍVEL'}
              </Button>
            );

            return (
              <IntegrationTile
                key={integration.id}
                icon={
                  integration.id === 'knowledge-nexus' ? (
                    <Library className="text-primary" />
                  ) : (
                    <BrandIcon
                      id={integration.id}
                      size={24}
                      color={integration.id === 'elevenlabs' ? 'currentColor' : undefined}
                    />
                  )
                }
                name={integration.name}
                description={integration.description}
                status={status}
                actions={action}
                muted={!hasCredentials}
              />
            );
          })}
        </div>
      )}

      {/* Dialog de configuração ElevenLabs */}
      <ElevenLabsConfigDialog
        open={showElevenLabsConfig}
        onOpenChange={setShowElevenLabsConfig}
        initialConfig={
          integrations.elevenlabs as
            | Partial<{
                apiKey: string;
                respondInAudio: 'when_client_asks' | 'always' | 'never';
                voice: string;
                stability: number;
                similarity: number;
              }>
            | undefined
        }
        onSave={async config => {
          await persistIntegration('elevenlabs', config as unknown as Record<string, unknown>);
        }}
        onDeactivate={
          integrations.elevenlabs
            ? async () => {
                await removeIntegration('elevenlabs');
              }
            : undefined
        }
      />

      {/* Dialog de configuração Google Calendar */}
      <GoogleCalendarConfigDialog
        open={showGoogleCalendarConfig}
        onOpenChange={setShowGoogleCalendarConfig}
        agentId={agentId}
        initialConfig={
          integrations['google-calendar'] as Parameters<
            typeof GoogleCalendarConfigDialog
          >[0]['initialConfig']
        }
        onSave={config => {
          if (onIntegrationsChange) {
            onIntegrationsChange({
              ...integrations,
              'google-calendar': config,
            });
          }
          // Reload configs to update status
          reloadConfigs();
        }}
        onDisconnect={
          integrations['google-calendar']
            ? () => {
                if (onIntegrationsChange) {
                  const newIntegrations = { ...integrations };
                  delete newIntegrations['google-calendar'];
                  onIntegrationsChange(newIntegrations);
                }
                // Reload configs to update status
                reloadConfigs();
              }
            : undefined
        }
      />

      {/* Dialog de configuração Google Sheets */}
      <GoogleSheetsConfigDialog
        open={showGoogleSheetsConfig}
        onOpenChange={setShowGoogleSheetsConfig}
        agentId={agentId}
        initialConfig={
          integrations['google-sheets'] as Parameters<
            typeof GoogleSheetsConfigDialog
          >[0]['initialConfig']
        }
        onSave={config => {
          if (onIntegrationsChange) {
            onIntegrationsChange({
              ...integrations,
              'google-sheets': config,
            });
          }
          // Reload configs to update status
          reloadConfigs();
        }}
        onDisconnect={
          integrations['google-sheets']
            ? () => {
                if (onIntegrationsChange) {
                  const newIntegrations = { ...integrations };
                  delete newIntegrations['google-sheets'];
                  onIntegrationsChange(newIntegrations);
                }
                // Reload configs to update status
                reloadConfigs();
              }
            : undefined
        }
      />

      {/* Dialog de configuração Knowledge Nexus */}
      <KnowledgeNexusConfigDialog
        open={showKnowledgeNexusConfig}
        onOpenChange={setShowKnowledgeNexusConfig}
        initialConfig={
          integrations['knowledge-nexus'] as Partial<KnowledgeNexusConfig> | undefined
        }
        onSave={async config => {
          await persistIntegration(
            'knowledge-nexus',
            config as unknown as Record<string, unknown>
          );
        }}
        onDeactivate={
          integrations['knowledge-nexus']
            ? async () => {
                await removeIntegration('knowledge-nexus');
              }
            : undefined
        }
      />
    </div>
  );
};

export default IntegrationsSection;
