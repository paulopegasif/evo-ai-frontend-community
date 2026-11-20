import { Link2, Pencil, TestTube, Trash2, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ResourceCard } from '@/components/agents/resourceCard';
import { useLanguage } from '@/hooks/useLanguage';
import { CustomMcpServer } from '@/types/ai';

interface CustomMCPServerCardProps {
  server: CustomMcpServer;
  onEdit: (server: CustomMcpServer) => void;
  onDelete: (server: CustomMcpServer) => void;
  onTest: (server: CustomMcpServer) => void;
  onClick: (server: CustomMcpServer) => void;
  isTestLoading?: boolean;
}

export default function CustomMCPServerCard({
  server,
  onEdit,
  onDelete,
  onTest,
  onClick,
  isTestLoading = false,
}: CustomMCPServerCardProps) {
  const { t } = useLanguage('customMcpServers');
  const name = server.name || t('card.noName');

  return (
    <ResourceCard
      icon={TestTube}
      title={name}
      openLabel={`${t('actions.view')}: ${name}`}
      onOpen={() => onClick(server)}
      badges={
        <>
          <Badge variant="info" size="sm">
            {t('card.custom')}
          </Badge>
          <Badge variant="outline" size="sm" className="tabular-nums">
            <Wrench />
            {server.tools?.length || 0} {t('card.tools')}
          </Badge>
        </>
      }
      description={server.description || t('card.noDescription')}
      location={{ icon: Link2, value: server.url }}
      tags={server.tags}
      meta={
        <>
          {t('card.timeout', { timeout: server.timeout })} ·{' '}
          {t('card.retries', { count: server.retry_count })} ·{' '}
          {t('card.createdAt', { date: new Date(server.created_at).toLocaleDateString('pt-BR') })}
        </>
      }
      actions={
        <>
          <Button variant="outline" size="xs" onClick={() => onTest(server)} loading={isTestLoading}>
            {!isTestLoading && <TestTube />}
            {t('actions.test')}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onEdit(server)}
            aria-label={t('actions.edit')}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-destructive-foreground hover:text-destructive-foreground"
            onClick={() => onDelete(server)}
            aria-label={t('actions.delete')}
          >
            <Trash2 />
          </Button>
        </>
      }
    />
  );
}
