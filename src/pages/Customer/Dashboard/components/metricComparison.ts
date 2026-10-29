/** Whether a rise is good news (volumes, rates), bad news (costs) or neither (spend). */
export type MetricDirection = 'higher_is_better' | 'lower_is_better' | 'neutral';

export interface MetricComparison {
  /** Formatted value of the compared period. */
  value: string;
  /** Variation in %, or null when there is no base to compare with. */
  delta: number | null;
  direction: MetricDirection;
}

export const deltaToneClass = (delta: number | null, direction: MetricDirection) => {
  if (delta == null || delta === 0 || direction === 'neutral') return 'text-muted-foreground';
  const improved = direction === 'higher_is_better' ? delta > 0 : delta < 0;
  return improved ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400';
};

export const formatDelta = (delta: number | null) => {
  if (delta == null) return '—';
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '';
  return `${sign}${Math.abs(delta).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
};
