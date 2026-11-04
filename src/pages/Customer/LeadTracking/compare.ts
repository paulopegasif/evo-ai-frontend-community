import type { MetricComparison, MetricDirection } from '@/pages/Customer/Dashboard/components/metricComparison';
import type { LeadTrackingKPIs } from '@/types/leadTracking';
import { variation } from './periods';

type NumericKpi = {
  [K in keyof LeadTrackingKPIs]: LeadTrackingKPIs[K] extends number | null ? K : never;
}[keyof LeadTrackingKPIs];

/**
 * Builds the comparison line of a KPI card, or undefined when no period is
 * being compared.
 */
export const makeKpiComparer =
  (current: LeadTrackingKPIs | undefined, previous: LeadTrackingKPIs | undefined) =>
  (
    key: NumericKpi,
    format: (value: number | null) => string,
    direction: MetricDirection = 'higher_is_better',
  ): MetricComparison | undefined => {
    if (!current || !previous) return undefined;
    return { value: format(previous[key]), delta: variation(current[key], previous[key]), direction };
  };

export type KpiComparer = ReturnType<typeof makeKpiComparer>;
