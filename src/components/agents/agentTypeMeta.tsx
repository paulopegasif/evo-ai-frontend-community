import { ArrowRight, Bot, ExternalLink, GitBranch, ListChecks, Plug, RefreshCw, Workflow } from '@/components/icons';
import type { LucideIcon } from '@/components/icons';
import type { BadgeProps } from '@/components/ui/badge';

export interface AgentTypeMeta {
  label: string;
  icon: LucideIcon;
  badge: NonNullable<BadgeProps['variant']>;
}

const TYPES: Record<string, Omit<AgentTypeMeta, 'label'>> = {
  llm: { icon: Bot, badge: 'success' },
  external: { icon: Plug, badge: 'info' },
  a2a: { icon: ExternalLink, badge: 'info' },
  sequential: { icon: ArrowRight, badge: 'warning' },
  parallel: { icon: GitBranch, badge: 'secondary' },
  loop: { icon: RefreshCw, badge: 'secondary' },
  workflow: { icon: Workflow, badge: 'secondary' },
  task: { icon: ListChecks, badge: 'secondary' },
};

/**
 * Label, icon and badge variant for an agent type (shared by list, cards and editor).
 * Pass the `agents` namespace `t` to get the translated label (`typeLabels.<type>`).
 */
export function getAgentTypeMeta(type?: string, t?: (key: string) => string): AgentTypeMeta {
  const known = TYPES[type || ''];
  if (!known) return { label: type || 'N/A', icon: Bot, badge: 'outline' };
  return { ...known, label: t ? t(`typeLabels.${type}`) : type || '' };
}
