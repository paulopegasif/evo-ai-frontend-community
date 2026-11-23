import { useLanguage } from '@/hooks/useLanguage';
import { Badge } from '@/components/ui/badge';
import { Server, Eye, Wrench } from 'lucide-react';
import { MCPServer } from '@/types/ai';
import { BaseTable, TableColumn, TableAction } from '@/components/base';

interface MCPServersTableProps {
  servers: MCPServer[];
  selectedServers: MCPServer[];
  loading?: boolean;
  onSelectionChange: (servers: MCPServer[]) => void;
  onServerClick: (server: MCPServer) => void;
}

export default function MCPServersTable({
  servers,
  selectedServers,
  loading,
  onSelectionChange,
  onServerClick,
}: MCPServersTableProps) {
  const { t } = useLanguage('mcpServers');
  const serversList = servers || [];

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

  const columns: TableColumn<MCPServer>[] = [
    {
      key: 'server',
      label: t('table.columns.server'),
      sortable: true,
      render: server => (
        <div
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 py-2"
          onClick={() => onServerClick(server)}
        >
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Server className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm truncate mb-1">{server.name || t('table.noName')}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant={getTypeBadge(server.type).variant} className={getTypeBadge(server.type).className}>
                {server.type}
              </Badge>
              <Badge variant={getTypeBadge(server.config_type).variant} className={getTypeBadge(server.config_type).className}>
                {server.config_type?.toUpperCase() || 'N/A'}
              </Badge>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'description',
      label: t('table.columns.description'),
      sortable: false,
      render: server => (
        <div className="max-w-[300px]">
          <p className="text-sm text-muted-foreground truncate">
            {server.description || t('table.noDescription')}
          </p>
        </div>
      ),
    },
    {
      key: 'tools',
      label: t('table.columns.tools'),
      sortable: false,
      render: server => (
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-success" />
          <span className="text-sm text-muted-foreground">
            {server.tools?.length || 0}
          </span>
        </div>
      ),
    }
  ];

  const actions: TableAction<MCPServer>[] = [
    {
      label: t('table.actions.viewDetails'),
      icon: <Eye className="h-4 w-4" />,
      onClick: onServerClick,
    },
  ];

  return (
    <BaseTable<MCPServer>
      data={serversList}
      columns={columns}
      actions={actions}
      selectable
      selectedItems={selectedServers}
      onSelectionChange={onSelectionChange}
      loading={loading}
      emptyMessage={t('table.empty.message')}
      emptyIcon={Server}
      emptyTitle={t('table.empty.title')}
      emptyDescription={t('table.empty.description')}
      emptyAction={undefined}
      getRowKey={server => String(server.id)}
    />
  );
}
