import type { BadgeProps } from '@/components/ui/badge';
import type { PipelineItem } from '@/types/analytics';

type BadgeVariant = NonNullable<BadgeProps['variant']>;

/** Chatwoot priority (urgent/high/medium/low) collapsed into 3 buckets. */
export const priorityBucket = (priority?: string | null): '' | 'alta' | 'media' | 'baixa' => {
  const p = (priority ?? '').toLowerCase();
  if (p === 'urgent' || p === 'high') return 'alta';
  if (p === 'medium') return 'media';
  if (p === 'low') return 'baixa';
  return '';
};

export const PRIORITY_VARIANT: Record<'alta' | 'media' | 'baixa', BadgeVariant> = {
  alta: 'error',
  media: 'warning',
  baixa: 'secondary',
};

export const STATUS_VARIANT: Record<string, BadgeVariant> = {
  open: 'success',
  pending: 'warning',
  resolved: 'secondary',
  snoozed: 'info',
};

/** Dot colors for the filter selects (semantic tokens, theme-aware). */
export const STATUS_DOT: Record<string, string> = {
  open: 'bg-success',
  pending: 'bg-warning',
  resolved: 'bg-muted-foreground/48',
  snoozed: 'bg-info',
};

export const PRIORITY_DOT: Record<'alta' | 'media' | 'baixa', string> = {
  alta: 'bg-destructive',
  media: 'bg-warning',
  baixa: 'bg-muted-foreground/48',
};

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

/** Per-column total: item.value === services_info.total_value server-side. */
export const calculateStageTotal = (items: PipelineItem[] = []) =>
  items.reduce((total, item) => total + (item.value ?? item.services_info?.total_value ?? 0), 0);
