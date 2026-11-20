import { useLanguage } from '@/hooks/useLanguage';
import { Badge, Card, CardContent } from '@/components/ui/compat';
import { Server, Wrench } from 'lucide-react';
import { MCPServer } from '@/types/ai';

interface MCPServerCardProps {
  server: MCPServer;
  onClick: (server: MCPServer) => void;
}

export default function MCPServerCard({ server, onClick }: MCPServerCardProps) {
  const { t } = useLanguage('mcpServers');

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'official':
        return 'bg-success/10 text-success-foreground border-success/30';
      case 'community':
        return 'bg-orange-500/10 text-orange-600 border-orange-500/30';
      case 'oauth':
        return 'bg-info/10 text-info-foreground border-info/30';
      case 'webhook':
        return 'bg-success/10 text-success-foreground border-success/30';
      case 'basic_auth':
        return 'bg-orange-500/10 text-orange-600 border-orange-500/30';
      case 'credentials':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/30';
      default:
        return 'bg-gray-500/10 text-muted-foreground border-gray-500/30';
    }
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer">
      <CardContent className="p-4">
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
                  <Badge variant="outline" className={`text-xs ${getTypeColor(server.type)}`}>
                    {server.type}
                  </Badge>
                  <Badge variant="outline" className={`text-xs ${getTypeColor(server.config_type)}`}>
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

      </CardContent>
    </Card>
  );
}
