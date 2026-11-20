import { useLanguage } from '@/hooks/useLanguage';
import { Badge } from '@/components/ui/badge';
import { Card, CardPanel } from '@/components/ui/card';
import { Server, Wrench } from 'lucide-react';
import { MCPServer } from '@/types/ai';

interface MCPServerCardProps {
  server: MCPServer;
  onClick: (server: MCPServer) => void;
}

export default function MCPServerCard({ server, onClick }: MCPServerCardProps) {
  const { t } = useLanguage('mcpServers');

  const getTypeBadge = (
    type: string,
  ): { variant: 'success' | 'warning' | 'info' | 'outline'; className?: string } => {
    switch (type) {
      case 'official':
      case 'webhook':
        return { variant: 'success' };
      case 'community':
      case 'basic_auth':
        return { variant: 'warning' };
      case 'oauth':
        return { variant: 'info' };
      case 'credentials':
        // categorical accent, no status token for it
        return { variant: 'outline', className: 'border-purple-500/30 bg-purple-500/8 text-purple-600 dark:text-purple-400' };
      default:
        return { variant: 'outline', className: 'text-muted-foreground' };
    }
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer">
      <CardPanel className="p-4">
        <div onClick={() => onClick(server)}>
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Server className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-sm truncate mb-1">{server.name}</h3>
                <div className="flex items-center gap-2">
                  <Badge variant={getTypeBadge(server.type).variant} className={getTypeBadge(server.type).className}>
                    {server.type}
                  </Badge>
                  <Badge variant={getTypeBadge(server.config_type).variant} className={getTypeBadge(server.config_type).className}>
                    {server.config_type?.toUpperCase() || 'N/A'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mb-3">
            <p className="text-sm text-muted-foreground line-clamp-2">
              {server.description || t('card.noDescription')}
            </p>
          </div>

          {/* Tools Count */}
          <div className="flex items-center gap-2 mb-4">
            <Wrench className="h-4 w-4 text-success" />
            <span className="text-sm text-muted-foreground">
              {t('card.toolsCount', { count: server.tools?.length || 0 })}
            </span>
          </div>
        </div>

      </CardPanel>
    </Card>
  );
}
