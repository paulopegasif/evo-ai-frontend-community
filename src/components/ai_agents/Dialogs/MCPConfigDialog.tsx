import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AgentIntegrationDialog } from '@/components/integrations/agentConfig/AgentIntegrationDialog';
import { ToolChecklist } from '@/components/integrations/agentConfig/ToolChecklist';
import { MCPServer, MCPServerConfig } from '@/types/ai';
import { Server } from '@/components/icons';
import { useLanguage } from '@/hooks/useLanguage';
import { Tool } from '@/types';

/** MCP server tools carry an optional id; the name is the fallback key. */
type ServerTool = { id?: string; name: string; description?: string };

interface MCPConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: MCPServerConfig) => void;
  availableServers: MCPServer[];
  initialConfig?: MCPServerConfig | null;
  currentStep?: number;
  totalSteps?: number;
  onSkip?: () => void;
  mcpServers?: MCPServerConfig[];
}

const MCPConfigDialog = ({
  open,
  onOpenChange,
  onSave,
  availableServers,
  initialConfig = null,
  currentStep = 1,
  totalSteps = 1,
  onSkip,
  mcpServers = [],
}: MCPConfigDialogProps) => {
  const { t } = useLanguage('aiAgents');
  const [selectedServer, setSelectedServer] = useState<MCPServer | null>(null);
  const [mcpEnvironments, setMcpEnvironments] = useState<Record<string, unknown>>({});
  const [toolIds, setToolIds] = useState<Record<string, string[]>>({});

  // Inicializar com configuração existente ou limpar
  useEffect(() => {
    if (open) {
      if (initialConfig) {
        // Modo edição - carregar configuração existente
        const server = availableServers.find(s => s.id === initialConfig.id);
        if (server) {
          setSelectedServer(server);
          setMcpEnvironments(initialConfig.environments || {});

          setToolIds(prev => {
            if (!prev[server.id]) {
              // Procurar no array de mcpServers primeiro
              const existingConfig = mcpServers.find(s => s.id === server.id);
              const tools = existingConfig?.tools || initialConfig?.tools || [];
              return {
                ...prev,
                [server.id]: tools.map(t => t.id || t.name),
              };
            }
            return prev;
          });
        }
      } else {
        // Modo criação - limpar tudo sempre
        setSelectedServer(null);
        setMcpEnvironments(prev => (Object.keys(prev).length ? {} : prev));
      }
    } else {
      // Quando fecha o dialog, sempre limpar o estado para evitar persistência
      // (bail out when already empty so unstable props can't loop renders)
      setSelectedServer(null);
      setMcpEnvironments(prev => (Object.keys(prev).length ? {} : prev));
    }
  }, [open, initialConfig, availableServers, currentStep, mcpServers]);

  const handleSelectServer = useCallback(
    (serverId: string) => {
      const server = availableServers.find(s => s.id === serverId);
      if (server) {
        setSelectedServer(server);

        // Inicializar campos de environment com valores vazios
        const initialEnvironments: Record<string, string> = {};
        Object.keys(server.environments || {}).forEach(key => {
          initialEnvironments[key] = '';
        });
        setMcpEnvironments(initialEnvironments);

        // Manter seleções existentes se for o mesmo servidor
        const existingConfig =
          mcpServers.find(s => s.id === serverId) ||
          (initialConfig && initialConfig.id === serverId ? initialConfig : null);

        if (existingConfig) {
          setToolIds(prev => ({
            ...prev,
            [serverId]: (existingConfig.tools || []).map(t => t.id || t.name),
          }));
        }
      }
    },
    [availableServers, initialConfig, mcpServers],
  );

  const handleEnvChange = useCallback((key: string, value: string) => {
    setMcpEnvironments(prev => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const handleToolToggle = useCallback(
    (tool: Tool) => {
      if (!selectedServer) return;
      const serverId = selectedServer.id;
      const toolId = tool.id || tool.name;

      setToolIds(prev => {
        const serverTools = prev[serverId] || [];
        const isSelected = serverTools.includes(toolId);

        return {
          ...prev,
          [serverId]: isSelected
            ? serverTools.filter(id => id !== toolId)
            : [...serverTools, toolId],
        };
      });
    },
    [selectedServer],
  );

  const handleSave = useCallback(() => {
    if (!selectedServer) return;

    const selectedTools = selectedServer.tools.filter((tool: ServerTool) =>
      toolIds[selectedServer.id]?.includes(tool.id || tool.name),
    );

    const config: MCPServerConfig = {
      id: selectedServer.id,
      name: selectedServer.name,
      type: selectedServer.config_type,
      environments: mcpEnvironments,
      tools: selectedTools,
      toolIds: toolIds[selectedServer.id] || [],
    };

    onSave(config);
  }, [selectedServer, mcpEnvironments, toolIds, onSave]);

  const isFormValid =
    selectedServer &&
    Object.entries(selectedServer.environments || {}).every(
      ([key]) => mcpEnvironments[key]?.toString().trim() !== '',
    );

  const serverItems = availableServers.map(server => ({ value: server.id, label: server.name }));
  const selectedIds = selectedServer ? toolIds[selectedServer.id] || [] : [];
  const envEntries = Object.entries(selectedServer?.environments || {});

  return (
    <AgentIntegrationDialog
      open={open}
      onOpenChange={onOpenChange}
      className="sm:max-w-2xl"
      icon={<Server className="text-muted-foreground" />}
      title={
        <span className="flex items-center gap-2">
          {initialConfig ? t('dialogs.mcpConfig.title') : t('tools.mcpServers.add')}
          {totalSteps > 1 && (
            <Badge variant="secondary">
              {currentStep} {t('dialogs.mcpConfig.of')} {totalSteps}
            </Badge>
          )}
        </span>
      }
      description={t('tools.mcpServers.subtitle')}
      footerStart={
        onSkip ? (
          <Button variant="ghost" onClick={onSkip}>
            {t('dialogs.mcpConfig.skip')}
          </Button>
        ) : undefined
      }
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('actions.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!isFormValid}>
            {totalSteps > 1 && currentStep < totalSteps
              ? t('actions.next')
              : initialConfig
                ? t('dialogs.mcpConfig.save')
                : t('tools.mcpServers.add')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Field disabled={!!initialConfig}>
          <FieldLabel>
            {t('dialogs.mcpConfig.serverName')}{' '}
            {!!initialConfig && (
              <span className="font-normal text-muted-foreground">
                {t('dialogs.mcpConfig.notEditable')}
              </span>
            )}
          </FieldLabel>
          <Select
            items={serverItems}
            value={selectedServer?.id || null}
            onValueChange={value => value && handleSelectServer(value as string)}
            disabled={!!initialConfig}
          >
            <SelectTrigger id="server-select">
              <SelectValue placeholder={t('tools.mcpServers.add')} />
            </SelectTrigger>
            <SelectPopup>
              {availableServers.map(server => (
                <SelectItem key={server.id} value={server.id}>
                  <span className="flex items-center gap-2">
                    {server.name}
                    <Badge variant="outline" size="sm">
                      {server.type}
                    </Badge>
                  </span>
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </Field>

        {selectedServer && (
          <>
            <div className="flex items-start gap-3 rounded-xl border bg-muted/40 px-3.5 py-3">
              <Server className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="flex min-w-0 flex-col gap-1.5">
                <h4 className="font-medium text-sm">{selectedServer.name}</h4>
                {selectedServer.description && (
                  <p className="text-muted-foreground text-sm">{selectedServer.description}</p>
                )}
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <Badge variant="outline">{selectedServer.type}</Badge>
                  <span>
                    {selectedServer.tools.length} {t('tools.title')}
                  </span>
                </div>
              </div>
            </div>

            {envEntries.length > 0 && (
              <section className="flex flex-col gap-3">
                <h3 className="flex items-center gap-2 font-medium text-sm">
                  {t('dialogs.mcpConfig.requiredConfig')}
                  <Badge variant="secondary">
                    {envEntries.length} {t('dialogs.mcpConfig.variables')}
                  </Badge>
                </h3>
                {envEntries.map(([key, value]) => (
                  <Field key={key}>
                    <FieldLabel className="font-mono text-xs">
                      {key}
                      <span className="text-destructive-foreground">*</span>
                    </FieldLabel>
                    <Input
                      id={`env-${key}`}
                      value={mcpEnvironments[key]?.toString() || ''}
                      onChange={e => handleEnvChange(key, e.target.value)}
                      placeholder={t('dialogs.mcpConfig.enterValue', { key })}
                      autoComplete="off"
                      type={
                        key.toLowerCase().includes('password') ||
                        key.toLowerCase().includes('token') ||
                        key.toLowerCase().includes('secret')
                          ? 'password'
                          : 'text'
                      }
                    />
                    {typeof value === 'string' && value !== 'required' && (
                      <FieldDescription>{value}</FieldDescription>
                    )}
                  </Field>
                ))}
              </section>
            )}

            {selectedServer.tools && selectedServer.tools.length > 0 && (
              <section className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 font-medium text-sm">
                    {t('dialogs.mcpConfig.availableTools')}
                    <Badge variant="secondary">
                      {selectedIds.length}/{selectedServer.tools.length}
                    </Badge>
                  </h3>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() =>
                        setToolIds(prev => ({
                          ...prev,
                          [selectedServer.id]: (selectedServer.tools as ServerTool[]).map(
                            tool => tool.id || tool.name,
                          ),
                        }))
                      }
                    >
                      {t('tools.systemTools.selectAll')}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => setToolIds(prev => ({ ...prev, [selectedServer.id]: [] }))}
                    >
                      {t('tools.systemTools.deselectAll')}
                    </Button>
                  </div>
                </div>
                <ToolChecklist
                  tools={(selectedServer.tools as ServerTool[]).map(tool => ({
                    key: tool.id || tool.name,
                    name: tool.name,
                    description: tool.description,
                  }))}
                  isSelected={key => selectedIds.includes(key)}
                  onToggle={key => {
                    const tool = (selectedServer.tools as ServerTool[]).find(
                      item => (item.id || item.name) === key,
                    );
                    if (tool) handleToolToggle(tool as unknown as Tool);
                  }}
                />
              </section>
            )}
          </>
        )}
      </div>
    </AgentIntegrationDialog>
  );
};

export default MCPConfigDialog;
