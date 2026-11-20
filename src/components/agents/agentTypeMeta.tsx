import { ArrowRight, Bot, ExternalLink, GitBranch, ListChecks, Plug, RefreshCw, Workflow } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { BadgeProps } from '@/components/ui/badge';

export interface AgentTypeMeta {
  label: string;
  icon: LucideIcon;
  badge: NonNullable<BadgeProps['variant']>;
}

const TYPES: Record<string, AgentTypeMeta> = {
  llm: { label: 'Nativo', icon: Bot, badge: 'success' },
  external: { label: 'Externo', icon: Plug, badge: 'info' },
  a2a: { label: 'A2A', icon: ExternalLink, badge: 'info' },
  sequential: { label: 'Agente Sequencial', icon: ArrowRight, badge: 'warning' },
  parallel: { label: 'Agente Paralelo', icon: GitBranch, badge: 'secondary' },
  loop: { label: 'Agente Loop', icon: RefreshCw, badge: 'secondary' },
  workflow: { label: 'Workflow', icon: Workflow, badge: 'secondary' },
  task: { label: 'Task', icon: ListChecks, badge: 'secondary' },
};

/** Label, icon and badge variant for an agent type (shared by list, cards and editor). */
export function getAgentTypeMeta(type?: string): AgentTypeMeta {
  return TYPES[type || ''] || { label: type || 'N/A', icon: Bot, badge: 'outline' };
}
