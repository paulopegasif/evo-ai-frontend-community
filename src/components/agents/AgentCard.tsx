import { MoreHorizontal } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Agent } from '@/types/agents';
import AgentActionsDropdown from './AgentActionsDropdown';
import { getAgentTypeMeta } from './agentTypeMeta';

type AgentCardProps = {
  agent: Agent;
  onEdit: (agent: Agent) => void;
  onDelete: (agent: Agent) => void;
  onExportAsJSON?: (agent: Agent) => void;
  onShare?: (agent: Agent) => void;
};

/** Initial-letter tile with the agent type icon badge. */
export function AgentAvatar({ agent, size = 'default' }: { agent: Pick<Agent, 'name' | 'type'>; size?: 'sm' | 'default' }) {
  const meta = getAgentTypeMeta(agent.type);
  const Icon = meta.icon;
  return (
    <span
      className={
        size === 'sm'
          ? 'relative flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/8 font-semibold text-primary text-xs'
          : 'relative flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/8 font-semibold text-primary text-sm'
      }
    >
      {agent.name?.charAt(0).toUpperCase()}
      <span className="absolute -end-1 -bottom-1 flex size-4.5 items-center justify-center rounded-full border bg-background text-muted-foreground">
        <Icon className="size-2.5" />
      </span>
    </span>
  );
}

export default function AgentCard({ agent, onEdit, onDelete, onExportAsJSON, onShare }: AgentCardProps) {
  const { t } = useLanguage('agents');
  const meta = getAgentTypeMeta(agent.type, t);

  return (
    <Card className="group relative flex flex-col gap-4 p-4 transition-colors hover:border-primary/40">
      <button
        type="button"
        className="absolute inset-0 rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`${t('dropdown.edit')} ${agent.name}`}
        onClick={() => onEdit(agent)}
      />
      <div className="pointer-events-none flex items-start gap-3">
        <AgentAvatar agent={agent} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="truncate font-semibold text-sm">{agent.name}</h3>
          <p className="line-clamp-2 min-h-8 text-muted-foreground text-xs">
            {agent.description || t('fields.noDescription')}
          </p>
        </div>
        <AgentActionsDropdown
          agent={agent}
          trigger={
            <Button
              variant="ghost"
              size="icon-sm"
              className="pointer-events-auto relative -me-1.5 -mt-1"
              aria-label={t('card.actions')}
            >
              <MoreHorizontal />
            </Button>
          }
          onEdit={onEdit}
          onExportAsJSON={onExportAsJSON}
          onShare={onShare}
          onDelete={onDelete}
        />
      </div>
      <div className="pointer-events-none mt-auto flex flex-wrap items-center gap-1.5">
        <Badge variant={meta.badge}>{meta.label}</Badge>
        {agent.model && (
          <Badge variant="outline" className="max-w-full truncate font-mono">
            {agent.model}
          </Badge>
        )}
      </div>
    </Card>
  );
}
