import { MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Agent } from '@/types/agents';
import { BaseTable, TableColumn } from '@/components/base';
import AgentActionsDropdown from './AgentActionsDropdown';
import { AgentAvatar } from './AgentCard';
import { getAgentTypeMeta } from './agentTypeMeta';
import { useLanguage } from '@/hooks/useLanguage';

interface AgentsTableProps {
  agents: Agent[];
  selectedAgents: Agent[];
  loading?: boolean;
  onSelectionChange: (agents: Agent[]) => void;
  onEditAgent: (agent: Agent) => void;
  onDeleteAgent: (agent: Agent) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string) => void;
}

export default function AgentsTable({
  agents,
  selectedAgents,
  loading,
  onSelectionChange,
  onEditAgent,
  onDeleteAgent,
  sortBy,
  sortOrder,
  onSort,
}: AgentsTableProps) {
  const { t } = useLanguage('agents');

  const columns: TableColumn<Agent>[] = [
    {
      key: 'name',
      label: t('fields.name'),
      sortable: true,
      render: agent => (
        <button
          type="button"
          className="flex items-center gap-3 rounded-md py-1 text-left outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => onEditAgent(agent)}
        >
          <AgentAvatar agent={agent} size="sm" />
          <span className="font-medium">{agent.name}</span>
        </button>
      ),
    },
    {
      key: 'description',
      label: t('fields.description'),
      render: agent => (
        <div className="max-w-[260px] truncate text-muted-foreground">
          {agent.description || t('fields.noDescription')}
        </div>
      ),
    },
    {
      key: 'type',
      label: t('fields.type'),
      sortable: true,
      render: agent => {
        const meta = getAgentTypeMeta(agent.type);
        return <Badge variant={meta.badge}>{meta.label}</Badge>;
      },
    },
    {
      key: 'model',
      label: t('fields.model'),
      render: agent =>
        agent.model ? (
          <Badge variant="outline" className="font-mono">
            {agent.model}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">{t('fields.notAvailable')}</span>
        ),
    },
    {
      key: 'created_at',
      label: t('fields.createdAt'),
      sortable: true,
      render: agent => (
        <span className="text-muted-foreground">
          {agent.created_at && new Date(agent.created_at).toLocaleDateString('pt-BR')}
        </span>
      ),
    },
    {
      key: 'actions',
      label: t('table.actions'),
      render: agent => (
        <AgentActionsDropdown
          agent={agent}
          trigger={
            <Button variant="ghost" size="icon-sm" aria-label={t('table.actions')}>
              <MoreHorizontal />
            </Button>
          }
          onEdit={onEditAgent}
          onExportAsJSON={() => {
            // TODO: Implement export as JSON functionality
          }}
          onShare={() => {
            // TODO: Implement share agent functionality
          }}
          onDelete={onDeleteAgent}
        />
      ),
    },
  ];

  return (
    <BaseTable<Agent>
      data={agents}
      columns={columns}
      selectable={true}
      selectedItems={selectedAgents}
      onSelectionChange={onSelectionChange}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={onSort}
      loading={loading}
      emptyMessage={t('table.emptyMessage')}
      getRowKey={agent => agent.id}
    />
  );
}
