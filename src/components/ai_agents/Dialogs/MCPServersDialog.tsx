import { useState, useEffect, useRef } from 'react';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, Server, CheckCircle } from '@/components/icons';
import { MCPServer, MCPServerConfig } from '@/types/ai';
import { useLanguage } from '@/hooks/useLanguage';

interface MCPServersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (servers: MCPServerConfig[], availableServers: MCPServer[]) => void;
  initialServers: MCPServer[];
  initialSelectedIds?: string[];
}

const MCPServersDialog = ({
  open,
  onOpenChange,
  onSave,
  initialServers,
  initialSelectedIds = [],
}: MCPServersDialogProps) => {
  const { t } = useLanguage('aiAgents');
  const [MCPServers, setMCPServers] = useState<MCPServer[]>([]);
  const [selectedServerIds, setSelectedServerIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const initialSelectionSetRef = useRef(false);

  // Initialize selected servers when dialog opens - very simple and stable
  useEffect(() => {
    if (open && !initialSelectionSetRef.current) {
      setSelectedServerIds([...initialSelectedIds]);
      initialSelectionSetRef.current = true;
    }
  }, [open, initialSelectedIds]);

  // Cleanup when dialog closes - separate effect for clarity
  useEffect(() => {
    if (!open) {
      setSelectedServerIds([]);
      setSearchTerm('');
      initialSelectionSetRef.current = false;
      return;
    }

    if (initialServers) {
      setMCPServers(initialServers);
    }
  }, [open, initialServers]);

  const toggleServer = (serverId: string) => {
    if (selectedServerIds.includes(serverId)) {
      setSelectedServerIds(selectedServerIds.filter(id => id !== serverId));
    } else {
      setSelectedServerIds([...selectedServerIds, serverId]);
    }
  };

  const handleSave = () => {
    const selectedServers: MCPServerConfig[] = selectedServerIds.map(serverId => {
      const server = MCPServers.find(s => s.id === serverId);
      return {
        id: serverId,
        name: server?.name || serverId,
        type: server?.config_type || 'unknown',
        environments: server?.environments || {},
        tools: server?.tools || [],
      };
    });

    onSave(selectedServers, MCPServers);
    onOpenChange(false);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'oauth':
        return 'bg-info/10 text-info-foreground border-info/30';
      case 'webhook':
        return 'bg-success/10 text-success-foreground border-success/30';
      case 'basic_auth':
        return 'bg-warning/10 text-warning-foreground border-warning/30';
      case 'credentials':
        return 'bg-primary/10 text-primary border-primary/30';
      default:
        return 'bg-muted/10 text-muted-foreground border-border';
    }
  };

  const filteredServers = MCPServers.filter(server => {
    if (!searchTerm) return true;
    return (
      server.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      server.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      server.config_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      server.tools.some(
        tool =>
          tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tool.description?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-5 w-5 text-success" />
            {t('dialogs.mcpServers.title')}
          </DialogTitle>
          <DialogDescription>{t('tools.mcpServers.subtitle')}</DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <div className="space-y-4">
            {/* Busca */}
            <InputGroup>
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput
                placeholder={t('dialogs.mcpServers.searchPlaceholder')}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </InputGroup>

            {/* Lista de servidores */}
            <div className="rounded-lg border p-4">
              {filteredServers.length > 0 ? (
                <div className="space-y-3">
                  {filteredServers.map(server => (
                    <div
                      key={server.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedServerIds.includes(server.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => toggleServer(server.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Server className="h-5 w-5 text-warning-foreground" />
                            <span className="font-medium text-lg">{server.name}</span>
                            <Badge
                              variant="outline"
                              className={`text-xs ${getTypeColor(server.type)}`}
                            >
                              {server.type}
                            </Badge>
                            {selectedServerIds.includes(server.id) && (
                              <CheckCircle className="h-4 w-4 text-primary" />
                            )}
                          </div>

                          {server.description && (
                            <p className="text-sm text-muted-foreground mb-3">
                              {server.description}
                            </p>
                          )}

                          {/* Ferramentas disponíveis */}
                          <div className="mb-3">
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              {t('dialogs.mcpServers.availableTools')} ({server.tools.length}):
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {server.tools.slice(0, 6).map((tool: any) => (
                                <Badge key={tool.id} variant="secondary" className="text-xs">
                                  {tool.name}
                                </Badge>
                              ))}
                              {server.tools.length > 6 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{server.tools.length - 6} {t('dialogs.customMcp.more')}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Variáveis de ambiente necessárias */}
                          {server.environments && Object.keys(server.environments).length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">
                                {t('dialogs.mcpConfig.requiredConfig')}:
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {Object.keys(server.environments).map(env => (
                                  <Badge
                                    key={env}
                                    variant="outline"
                                    className="text-xs text-warning-foreground"
                                  >
                                    {env}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedServerIds.includes(server.id)}
                            onChange={() => toggleServer(server.id)}
                            className="h-4 w-4 text-primary -z-10"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 text-center">
                  <Server className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {searchTerm ? t('messages.noResults') : t('tools.mcpServers.noServers')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </DialogPanel>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('actions.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={selectedServerIds.length === 0}>
            {t('dialogs.mcpServers.continue')}{' '}
            {selectedServerIds.length > 0 && `(${selectedServerIds.length})`}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
};

export default MCPServersDialog;
