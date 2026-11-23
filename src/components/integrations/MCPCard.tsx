import { Check, Plus, Settings, Server } from '@/components/icons';
import { useLanguage } from '@/hooks/useLanguage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import BrandIcon, { getBrandIcon } from '@/components/BrandIcon';
import { IntegrationTile } from '@/components/integrations/agentConfig/IntegrationTile';

interface AvailableMCP {
  id: string;
  name: string;
  description: string;
}

interface MCPCardProps {
  mcp: AvailableMCP;
  isEnabled: boolean;
  isConfigured: boolean;
  isConnected: boolean;
  onToggle?: () => void;
  onConfigure?: () => void;
  showComingSoon?: boolean;
}

const MONOCHROME = new Set(['github', 'notion']);

export function MCPCard({
  mcp,
  isEnabled,
  isConfigured,
  isConnected,
  onToggle,
  onConfigure,
  showComingSoon = false,
}: MCPCardProps) {
  const { t } = useLanguage('aiAgents');

  const renderActions = () => {
    if (!isConfigured) {
      return (
        <Button variant="outline" size="sm" className="w-full" disabled>
          <Plus />
          {t('edit.integrations.activate') || 'ATIVAR INTEGRAÇÃO'}
        </Button>
      );
    }

    if (isConnected) {
      return onConfigure ? (
        <Button variant="outline" size="sm" className="w-full" onClick={onConfigure}>
          <Settings />
          {t('edit.integrations.configure') || 'CONFIGURAR'}
        </Button>
      ) : null;
    }

    if (onConfigure) {
      return (
        <Button size="sm" className="w-full" onClick={onConfigure}>
          <Plus />
          {t('edit.integrations.activate') || 'ATIVAR INTEGRAÇÃO'}
        </Button>
      );
    }

    if (onToggle) {
      return (
        <Button
          variant={isEnabled ? 'outline' : 'default'}
          size="sm"
          className="w-full"
          onClick={onToggle}
        >
          {isEnabled ? <Check /> : <Plus />}
          {isEnabled ? t('mcpServers.enabled') || 'ATIVO' : t('mcpServers.enable') || 'ATIVAR'}
        </Button>
      );
    }

    return null;
  };

  const status = isConnected ? (
    <Badge variant="success">
      <Check />
      {t('edit.integrations.active') || 'ATIVO'}
    </Badge>
  ) : showComingSoon ? (
    <Badge variant="info">{t('mcpServers.comingSoon') || 'Em breve'}</Badge>
  ) : null;

  return (
    <IntegrationTile
      icon={
        getBrandIcon(mcp.id) ? (
          <BrandIcon
            id={mcp.id}
            size={24}
            color={MONOCHROME.has(mcp.id) ? 'currentColor' : undefined}
          />
        ) : (
          <Server className="text-muted-foreground" />
        )
      }
      name={mcp.name}
      description={mcp.description}
      status={status}
      actions={renderActions()}
      muted={!isConfigured}
    />
  );
}
