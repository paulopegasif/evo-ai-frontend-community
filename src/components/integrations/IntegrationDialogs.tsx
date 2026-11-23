import { MCPServerConfig } from '@/types/ai';
import { OAuthMCPConfigDialog } from '@/components/integrations/agentConfig/OAuthMCPConfigDialog';
import {
  OAUTH_MCP_PROVIDERS,
  OAUTH_MCP_PROVIDER_IDS,
  type OAuthMCPConfig,
  type OAuthMCPProviderId,
} from '@/components/integrations/agentConfig/oauthMcpProviders';

interface IntegrationDialogsProps {
  agentId: string;
  mcpServers: MCPServerConfig[];
  onMCPServersChange: (servers: MCPServerConfig[]) => void;
  onConfigReload: () => void;
  /** Persisted per-agent config of each OAuth MCP provider. */
  configs: Partial<Record<OAuthMCPProviderId, Partial<OAuthMCPConfig> | null>>;
  /** Provider whose config dialog is open, or null. */
  openProvider: OAuthMCPProviderId | null;
  onOpenProviderChange: (provider: OAuthMCPProviderId | null) => void;
}

const isMCPEnabled = (mcpServers: MCPServerConfig[], mcpId: string): boolean => {
  return mcpServers.some(mcp => mcp.id === mcpId);
};

const addMCPToServers = (
  mcpServers: MCPServerConfig[],
  mcpId: string,
  mcpName: string,
): MCPServerConfig[] => {
  if (isMCPEnabled(mcpServers, mcpId)) {
    return mcpServers;
  }
  const newMCP: MCPServerConfig = {
    id: mcpId,
    name: mcpName,
    type: 'standard',
    environments: {},
    tools: [],
  };
  return [...mcpServers, newMCP];
};

const removeMCPFromServers = (mcpServers: MCPServerConfig[], mcpId: string): MCPServerConfig[] => {
  return mcpServers.filter(mcp => mcp.id !== mcpId);
};

export function IntegrationDialogs({
  agentId,
  mcpServers,
  onMCPServersChange,
  onConfigReload,
  configs,
  openProvider,
  onOpenProviderChange,
}: IntegrationDialogsProps) {
  return (
    <>
      {OAUTH_MCP_PROVIDER_IDS.map(id => {
        const provider = OAUTH_MCP_PROVIDERS[id];
        return (
          <OAuthMCPConfigDialog
            key={id}
            provider={provider}
            open={openProvider === id}
            onOpenChange={open => onOpenProviderChange(open ? id : null)}
            agentId={agentId}
            initialConfig={configs[id] || undefined}
            onSave={() => {
              if (provider.syncsMcpServers) {
                onMCPServersChange(addMCPToServers(mcpServers, id, provider.name));
              }
              onConfigReload();
            }}
            onDisconnect={() => {
              if (provider.syncsMcpServers) {
                onMCPServersChange(removeMCPFromServers(mcpServers, id));
              }
              onConfigReload();
            }}
          />
        );
      })}
    </>
  );
}
