import type { ChartConfig } from '@evoapi/design-system';

/**
 * One color per entity across the whole page, in the brand's categorical order
 * (`--chart-1..5`, see src/brand/theme.css). A chart that hides a series never
 * repaints the others.
 */
export const SERIES = {
  leads: { label: 'Novos leads', color: 'var(--chart-1)' },
  attended: { label: 'Compareceram', color: 'var(--chart-2)' },
  spend: { label: 'Investimento', color: 'var(--chart-3)' },
  scheduled: { label: 'Consultas', color: 'var(--chart-4)' },
  revenue: { label: 'Receita', color: 'var(--chart-5)' },
} satisfies ChartConfig;

/** Ordered categorical colors for nominal groups (sources); a 6th+ group folds into "Outras". */
export const CATEGORICAL = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

export const OTHER_COLOR = 'var(--muted-foreground)';

export const AXIS_PROPS = {
  tickLine: false,
  axisLine: false,
  fontSize: 11,
  tickMargin: 8,
} as const;
