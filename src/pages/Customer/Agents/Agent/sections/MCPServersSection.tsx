import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Server, Network, Plus } from 'lucide-react';
import { MCPServerConfig } from '@/types/ai';
import { useState } from 'react';
import CustomMCPServersSection from '@/components/ai_agents/CustomMCPServersSection';
import { MCPCard } from '@/components/integrations/MCPCard';
import { IntegrationDialogs } from '@/components/integrations/IntegrationDialogs';
import { useMCPIntegrations } from '@/hooks/useMCPIntegrations';
import { getAvailableMCPs } from '@/constants/mcpIntegrations';
import { IntegrationTileGridSkeleton } from '@/components/integrations/agentConfig/IntegrationTile';
import {
  isOAuthMCPProvider,
  type OAuthMCPProviderId,
} from '@/components/integrations/agentConfig/oauthMcpProviders';
import SectionHeader from './SectionHeader';

interface MCPServersSectionProps {
  mcpServers: MCPServerConfig[];
  customMCPServerIds: string[];
  onMCPServersChange: (mcpServers: MCPServerConfig[]) => void;
  onCustomMCPServersChange: (serverIds: string[]) => void;
  agentId: string;
}

const MCPServersSection = ({
  mcpServers,
  customMCPServerIds,
  onMCPServersChange,
  onCustomMCPServersChange,
  agentId,
}: MCPServersSectionProps) => {
  const { t } = useLanguage('aiAgents');
  const [showCustomMCPs, setShowCustomMCPs] = useState(false);

  const [openProvider, setOpenProvider] = useState<OAuthMCPProviderId | null>(null);

  // Use custom hook for integrations
  const {
    githubConfig,
    notionConfig,
    stripeConfig,
    linearConfig,
    mondayConfig,
    atlassianConfig,
    asanaConfig,
    hubspotConfig,
    paypalConfig,
    canvaConfig,
    supabaseConfig,
    available,
    isCheckingCredentials,
    reloadAllConfigs,
    isConnected,
  } = useMCPIntegrations(agentId);

  const integrationConfigs = {
    github: githubConfig,
    notion: notionConfig,
    stripe: stripeConfig,
    linear: linearConfig,
    monday: mondayConfig,
    atlassian: atlassianConfig,
    asana: asanaConfig,
    hubspot: hubspotConfig,
    paypal: paypalConfig,
    canva: canvaConfig,
    supabase: supabaseConfig,
  };

  const availableMCPs = getAvailableMCPs(t);

  const isMCPEnabled = (mcpId: string): boolean => {
    return mcpServers.some(mcp => mcp.id === mcpId);
  };

  const toggleMCP = (mcpId: string) => {
    const isEnabled = isMCPEnabled(mcpId);
    if (isEnabled) {
      onMCPServersChange(mcpServers.filter(mcp => mcp.id !== mcpId));
    } else {
      const mcpInfo = availableMCPs.find(mcp => mcp.id === mcpId);
      const newMCP: MCPServerConfig = {
        id: mcpId,
        name: mcpInfo?.name || mcpId,
        type: 'standard',
        environments: {},
        tools: [],
      };
      onMCPServersChange([...mcpServers, newMCP]);
    }
  };

  const getDialogSetter = (mcpId: string): (() => void) | undefined =>
    isOAuthMCPProvider(mcpId) ? () => setOpenProvider(mcpId) : undefined;

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <SectionHeader
          icon={Server}
          title={t('mcpServers.title') || 'Servidores MCP'}
          description={
            t('mcpServers.subtitle') ||
            'Conecte o agente a serviços externos através do Model Context Protocol'
          }
        />

        {isCheckingCredentials ? (
          <IntegrationTileGridSkeleton />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {availableMCPs.map(mcp => {
              const isEnabled = isMCPEnabled(mcp.id);
              // DISPONIBILIDADE (CRM :3000 endpoint) — gates ATIVAR-disabled +
              // "Em breve"; distinct from per-agent "connected" (isConnected).
              const isConfigured = available[mcp.id] ?? false;
              const connected = isConnected(mcp.id);
              const onConfigure = getDialogSetter(mcp.id);
              const isIntegrationMCP = isOAuthMCPProvider(mcp.id);

              return (
                <MCPCard
                  key={mcp.id}
                  mcp={mcp}
                  isEnabled={isEnabled}
                  isConfigured={isConfigured}
                  isConnected={connected}
                  onToggle={!isIntegrationMCP ? () => toggleMCP(mcp.id) : undefined}
                  onConfigure={onConfigure}
                  showComingSoon={!isConfigured}
                />
              );
            })}
          </div>
        )}
      </section>

      <Separator />

      <section className="flex flex-col gap-4">
        <SectionHeader
          icon={Network}
          title={t('customMCPServers.title') || 'MCPs Personalizados'}
          description={
            t('customMCPServers.subtitle') ||
            'Adicione servidores MCP personalizados criados por você'
          }
          action={
            <Button
              variant="outline"
              size="sm"
              aria-expanded={showCustomMCPs}
              onClick={() => setShowCustomMCPs(!showCustomMCPs)}
            >
              <Plus />
              {t('customMCPServers.add') || 'Adicionar Custom MCP'}
            </Button>
          }
        />

        {showCustomMCPs && (
          <CustomMCPServersSection
            customMCPServerIds={customMCPServerIds}
            onCustomMCPServersChange={onCustomMCPServersChange}
            isReadOnly={false}
          />
        )}
      </section>

      <IntegrationDialogs
        agentId={agentId}
        mcpServers={mcpServers}
        onMCPServersChange={onMCPServersChange}
        onConfigReload={reloadAllConfigs}
        configs={integrationConfigs}
        openProvider={openProvider}
        onOpenProviderChange={setOpenProvider}
      />
    </div>
  );
};

export default MCPServersSection;
