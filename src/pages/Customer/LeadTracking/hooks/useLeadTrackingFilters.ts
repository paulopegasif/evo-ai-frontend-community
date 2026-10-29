import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  COMPARE_OPTIONS,
  PERIOD_OPTIONS,
  parseIsoDate,
  resolveComparison,
  resolvePeriod,
  toIsoDate,
  type CompareMode,
  type DateRange,
  type PeriodPreset,
} from '../periods';

export interface LeadTrackingFilters {
  preset: PeriodPreset;
  compareMode: CompareMode;
  range: DateRange;
  comparison: DateRange | null;
  source: string | null;
  campaign: string | null;
  user: string | null;
}

const DEFAULT_PRESET: PeriodPreset = '30d';

const parseRange = (from: string | null, to: string | null): DateRange | null => {
  const start = parseIsoDate(from);
  const end = parseIsoDate(to);
  if (!start || !end) return null;
  return start <= end ? { from: start, to: end } : { from: end, to: start };
};

const isPreset = (value: string | null): value is PeriodPreset => PERIOD_OPTIONS.some((o) => o.value === value);
const isCompareMode = (value: string | null): value is CompareMode => COMPARE_OPTIONS.some((o) => o.value === value);

/**
 * Period, comparison and filters of the lead tracking dashboard, kept in the URL
 * so a reload or a shared link reopens the same view. Invalid values fall back
 * to the defaults (30 days, no comparison).
 */
export const useLeadTrackingFilters = () => {
  const [params, setParams] = useSearchParams();

  const filters = useMemo<LeadTrackingFilters>(() => {
    const customRange = parseRange(params.get('from'), params.get('to'));
    const rawPreset = params.get('period');
    const preset = isPreset(rawPreset) && (rawPreset !== 'custom' || customRange) ? rawPreset : DEFAULT_PRESET;
    const range = resolvePeriod(preset, customRange);

    const customComparison = parseRange(params.get('cfrom'), params.get('cto'));
    const rawCompare = params.get('compare');
    const compareMode =
      isCompareMode(rawCompare) && (rawCompare !== 'custom' || customComparison) ? rawCompare : 'none';

    return {
      preset,
      compareMode,
      range,
      comparison: resolveComparison(compareMode, range, customComparison),
      source: params.get('source'),
      campaign: params.get('campaign'),
      user: params.get('user'),
    };
  }, [params]);

  const update = useCallback(
    (changes: Record<string, string | null>) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const setPreset = useCallback(
    (preset: PeriodPreset, custom?: DateRange) =>
      update({
        period: preset,
        from: custom ? toIsoDate(custom.from) : null,
        to: custom ? toIsoDate(custom.to) : null,
      }),
    [update],
  );

  const setCompare = useCallback(
    (mode: CompareMode, custom?: DateRange) =>
      update({
        compare: mode === 'none' ? null : mode,
        cfrom: custom ? toIsoDate(custom.from) : null,
        cto: custom ? toIsoDate(custom.to) : null,
      }),
    [update],
  );

  const setFilter = useCallback(
    (key: 'source' | 'campaign' | 'user', value: string | null) => update({ [key]: value }),
    [update],
  );

  const clearFilters = useCallback(() => update({ source: null, campaign: null, user: null }), [update]);

  return { filters, setPreset, setCompare, setFilter, clearFilters };
};
