import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import ConfirmDialog from '@/components/base/ConfirmDialog';
import { useLanguage } from '@/hooks/useLanguage';
import type { MCPTool } from '@/types/integrations';
import { AgentIntegrationDialog, ConnectedBanner } from './AgentIntegrationDialog';
import { ToolChecklist } from './ToolChecklist';
import type { OAuthMCPConfig, OAuthMCPProvider } from './oauthMcpProviders';

export interface OAuthMCPConfigDialogProps {
  provider: OAuthMCPProvider;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: OAuthMCPConfig) => void;
  onDisconnect?: () => void;
  initialConfig?: Partial<OAuthMCPConfig>;
  agentId: string;
}

const emptyConfig = (provider: OAuthMCPProvider['id']): OAuthMCPConfig => ({
  provider,
  username: '',
  email: '',
  connected: false,
  tools: [],
});

/**
 * One dialog for every OAuth-backed MCP integration (GitHub, Notion, Stripe...):
 * connect via OAuth, then pick which discovered tools the agent may use.
 * Per-provider differences live in `OAUTH_MCP_PROVIDERS`.
 */
export function OAuthMCPConfigDialog({
  provider,
  open,
  onOpenChange,
  onSave,
  onDisconnect,
  initialConfig,
  agentId,
}: OAuthMCPConfigDialogProps) {
  const { t } = useLanguage(provider.namespace);
  const { t: tShared } = useLanguage('aiAgents');
  const { id, name, service, fallbacks } = provider;
  const k = (key: string) => `edit.integrations.${id}.${key}`;

  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTools, setIsLoadingTools] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [availableTools, setAvailableTools] = useState<MCPTool[]>([]);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [config, setConfig] = useState<OAuthMCPConfig>({
    provider: id,
    username: initialConfig?.username || '',
    email: initialConfig?.email || '',
    connected: initialConfig?.connected || false,
    tools: initialConfig?.tools || [],
  });

  useEffect(() => {
    if (open) {
      loadConfiguration();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, agentId]);

  const loadAvailableTools = async () => {
    setIsLoadingTools(true);
    try {
      const response = await service.discoverTools(agentId);
      setAvailableTools(response.tools || []);
    } catch (error) {
      console.error(`Error loading ${name} tools:`, error);
      toast.error(tShared('edit.integrations.toasts.loadToolsError'));
    } finally {
      setIsLoadingTools(false);
    }
  };

  const loadConfiguration = async () => {
    setIsLoading(true);
    try {
      const loaded = await service.getConfiguration(agentId);
      if (loaded) {
        setConfig({
          provider: id,
          username: loaded.username || '',
          email: loaded.email || '',
          connected: loaded.connected || false,
          tools: loaded.tools || [],
        });
        setSelectedTools(loaded.tools || []);
        if (loaded.connected) {
          loadAvailableTools();
        }
      } else {
        setConfig(emptyConfig(id));
      }
    } catch (error) {
      console.error(`Error loading ${name} configuration:`, error);
      setConfig(emptyConfig(id));
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const response = await service.generateAuthorization(agentId);
      if (response.url) {
        window.location.href = response.url;
      }
    } catch (error) {
      console.error(`Error connecting to ${name}:`, error);
      toast.error(tShared('edit.integrations.toasts.connectError', { name }));
    } finally {
      setIsConnecting(false);
    }
  };

  const handleToolToggle = (toolName: string) => {
    setSelectedTools(prev =>
      prev.includes(toolName) ? prev.filter(tool => tool !== toolName) : [...prev, toolName],
    );
  };

  const allSelected = availableTools.length > 0 && selectedTools.length === availableTools.length;

  const handleSelectAll = () => {
    setSelectedTools(allSelected ? [] : availableTools.map(tool => tool.name));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedConfig = { ...config, tools: selectedTools };
      await service.saveConfiguration(agentId, updatedConfig);
      onSave(updatedConfig);
      toast.success(tShared('edit.integrations.toasts.saveSuccess'));
      onOpenChange(false);
    } catch (error) {
      console.error(`Error saving ${name} configuration:`, error);
      toast.error(tShared('edit.integrations.toasts.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await service.disconnect(agentId);
      onDisconnect?.();
      toast.success(tShared('edit.integrations.toasts.disconnectSuccess', { name }));
      setConfirmDisconnect(false);
      onOpenChange(false);
    } catch (error) {
      console.error(`Error disconnecting ${name}:`, error);
      toast.error(tShared('edit.integrations.toasts.disconnectError', { name }));
    } finally {
      setIsDisconnecting(false);
    }
  };

  const title = t(k('configTitle')) || `Configurar ${fallbacks.title}`;

  return (
    <>
      <AgentIntegrationDialog
        open={open}
        onOpenChange={onOpenChange}
        icon={provider.icon}
        title={title}
        description={
          config.connected
            ? t(k('connectedDescription')) || fallbacks.connectedDescription
            : t(k('connectDescription')) || fallbacks.connectDescription
        }
        loading={isLoading}
        footerStart={
          config.connected && onDisconnect ? (
            <Button variant="destructive-outline" onClick={() => setConfirmDisconnect(true)}>
              {t(k('disconnect')) || 'Desconectar'}
            </Button>
          ) : undefined
        }
        footer={
          config.connected ? (
            <Button onClick={handleSave} loading={isSaving}>
              {t(k('saveConfig')) || 'SALVAR CONFIGURAÇÕES'}
            </Button>
          ) : (
            <Button onClick={handleConnect} loading={isConnecting} className="w-full sm:w-auto">
              {provider.connectButtonIcon && !isConnecting && (
                <span className="[&_img]:size-4 [&_svg]:size-4">{provider.icon}</span>
              )}
              {isConnecting
                ? t(k('connecting')) || 'Conectando...'
                : t(k('connectButton')) || `Conectar com ${fallbacks.title}`}
            </Button>
          )
        }
      >
        {!config.connected ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-muted/40 px-6 py-8 text-center">
            <div className="flex size-14 items-center justify-center rounded-full border bg-card shadow-xs/5 [&_img]:size-7 [&_svg]:size-7">
              {provider.icon}
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="font-semibold text-base">
                {t(k('connectTitle')) || `Conectar com ${fallbacks.title}`}
              </h3>
              <p className="max-w-sm text-muted-foreground text-sm">
                {t(k('connectDescription')) || fallbacks.connectDescription}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <ConnectedBanner
              label={t(k('connected')) || 'Conectado'}
              detail={
                config.username ? (
                  <>
                    {t(k('connectedAs')) || 'Conectado como'}: <strong>{config.username}</strong>
                  </>
                ) : undefined
              }
              secondary={config.email || undefined}
            />

            <section className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-0.5">
                  <h4 className="flex items-center gap-2 font-medium text-sm">
                    {t(k('toolsTitle')) || 'Ferramentas Disponíveis'}
                    {availableTools.length > 0 && (
                      <Badge variant="secondary">
                        {selectedTools.length}/{availableTools.length}
                      </Badge>
                    )}
                  </h4>
                  <p className="text-muted-foreground text-xs">
                    {t(k('toolsDescription')) ||
                      `Selecione quais ferramentas do ${name} o agente poderá usar`}
                  </p>
                </div>
                {availableTools.length > 0 && (
                  <Label className="shrink-0 cursor-pointer text-xs">
                    <Checkbox checked={allSelected} onCheckedChange={handleSelectAll} />
                    {t(k('selectAll')) || 'Selecionar todas'}
                  </Label>
                )}
              </div>

              <ToolChecklist
                loading={isLoadingTools}
                tools={availableTools.map(tool => ({
                  key: tool.name,
                  name: tool.name,
                  description: tool.description,
                }))}
                isSelected={key => selectedTools.includes(key)}
                onToggle={handleToolToggle}
                emptyLabel={t(k('noTools')) || 'Nenhuma ferramenta disponível'}
              />
            </section>
          </div>
        )}
      </AgentIntegrationDialog>

      <ConfirmDialog
        open={confirmDisconnect}
        onOpenChange={setConfirmDisconnect}
        title={tShared('edit.integrations.disconnectConfirm.title', { name })}
        description={tShared('edit.integrations.disconnectConfirm.description', { name })}
        cancelLabel={tShared('edit.integrations.disconnectConfirm.cancel')}
        confirmLabel={t(k('disconnect')) || 'Desconectar'}
        onConfirm={handleDisconnect}
        loading={isDisconnecting}
      />
    </>
  );
}

export default OAuthMCPConfigDialog;
