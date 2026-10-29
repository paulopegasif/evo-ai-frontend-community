import {
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  format,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
  subYears,
} from 'date-fns';
import type { TimelineGranularity } from '@/types/leadTracking';

export type PeriodPreset = '7d' | '30d' | '90d' | 'month' | 'last_month' | 'year' | 'custom';
export type CompareMode = 'none' | 'previous' | 'year' | 'custom';

/** Calendar days in the viewer's timezone, both ends included. */
export interface DateRange {
  from: Date;
  to: Date;
}

export const PERIOD_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
  { value: 'month', label: 'Este mês' },
  { value: 'last_month', label: 'Mês passado' },
  { value: 'year', label: 'Este ano' },
  { value: 'custom', label: 'Personalizado' },
];

export const COMPARE_OPTIONS: { value: CompareMode; label: string }[] = [
  { value: 'none', label: 'Sem comparação' },
  { value: 'previous', label: 'Período anterior' },
  { value: 'year', label: 'Mesmo período do ano anterior' },
  { value: 'custom', label: 'Personalizado' },
];

// "7 dias" is today and the 6 days before it.
const LAST_DAYS: Partial<Record<PeriodPreset, number>> = { '7d': 7, '30d': 30, '90d': 90 };

export const resolvePeriod = (preset: PeriodPreset, custom: DateRange | null, now = new Date()): DateRange => {
  const today = startOfDay(now);
  const days = LAST_DAYS[preset];
  if (days) return { from: subDays(today, days - 1), to: today };

  switch (preset) {
    case 'month':
      return { from: startOfMonth(today), to: today };
    case 'last_month': {
      const lastMonth = subMonths(today, 1);
      return { from: startOfMonth(lastMonth), to: startOfDay(endOfMonth(lastMonth)) };
    }
    case 'year':
      return { from: startOfYear(today), to: today };
    default:
      return custom ?? { from: subDays(today, 29), to: today };
  }
};

/** Period compared with `range`; subYears maps 29/02 to 28/02. */
export const resolveComparison = (mode: CompareMode, range: DateRange, custom: DateRange | null): DateRange | null => {
  switch (mode) {
    case 'previous': {
      const to = subDays(range.from, 1);
      return { from: subDays(to, rangeDays(range) - 1), to };
    }
    case 'year':
      return { from: subYears(range.from, 1), to: subYears(range.to, 1) };
    case 'custom':
      return custom;
    default:
      return null;
  }
};

export const rangeDays = (range: DateRange) => differenceInCalendarDays(range.to, range.from) + 1;

export const toApiRange = (range: DateRange) => ({
  since: Math.floor(startOfDay(range.from).getTime() / 1000),
  until: Math.floor(endOfDay(range.to).getTime() / 1000),
});

export const formatRange = (range: DateRange) =>
  `${format(range.from, 'dd/MM/yyyy')} – ${format(range.to, 'dd/MM/yyyy')}`;

export const toIsoDate = (date: Date) => format(date, 'yyyy-MM-dd');

export const parseIsoDate = (value: string | null): Date | null => {
  if (!value) return null;
  const date = parseISO(value);
  return isValid(date) ? startOfDay(date) : null;
};

/**
 * Variation in % against the compared value; null when there is nothing to
 * compare with or the base is zero.
 */
export const variation = (current: number | null | undefined, previous: number | null | undefined) => {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
};

/** Same rule as the API's automatic granularity, so both periods share one bucket size. */
export const granularityFor = (range: DateRange): TimelineGranularity => {
  const days = rangeDays(range);
  if (days <= 62) return 'day';
  if (days <= 366) return 'week';
  return 'month';
};
