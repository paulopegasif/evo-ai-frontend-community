import { useEffect, useRef, useState } from 'react';
import { CalendarRange, Info } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '@evoapi/design-system';
import { endOfYear, startOfYear } from 'date-fns';
import { leadTrackingService } from '@/services/dashboard/leadTrackingService';
import type { LeadTrackingParams, TimelineDataPoint } from '@/types/leadTracking';
import { AXIS_PROPS, COMPARED_OPACITY } from './chartConfig';
import { compactCurrency, compactNumber, formatCurrency, formatNumber } from './format';
import { parseIsoDate, toApiRange } from '../periods';

type Metric = 'spend' | 'conversations' | 'leads' | 'revenue';

const METRICS: { value: Metric; label: string; money: boolean; ads: boolean }[] = [
  { value: 'spend', label: 'Investimento', money: true, ads: true },
  { value: 'conversations', label: 'Conversas na Meta', money: false, ads: true },
  { value: 'leads', label: 'Novos leads no CRM', money: false, ads: false },
  { value: 'revenue', label: 'Receita', money: true, ads: false },
];

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const YEARS_BACK = 3;

interface YearOverYearCardProps {
  /** Active filters (source, campaign, professional, timezone); the period is ignored. */
  filters: Omit<LeadTrackingParams, 'since' | 'until' | 'granularity'>;
  adsHistoryFrom: string | null;
}

const fetchYear = (year: number, filters: YearOverYearCardProps['filters']) => {
  const today = new Date();
  const from = startOfYear(new Date(year, 0, 1));
  const to = year === today.getFullYear() ? today : endOfYear(from);
  return leadTrackingService
    .getLeadTrackingData({ ...filters, ...toApiRange({ from, to }), granularity: 'month' })
    .then((data) => data.timeline);
};

/** Month by month of two chosen years; loads only once the card scrolls into view. */
const YearOverYearCard = ({ filters, adsHistoryFrom }: YearOverYearCardProps) => {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: YEARS_BACK + 1 }, (_, i) => currentYear - i);
  const [metric, setMetric] = useState<Metric>('spend');
  const [yearA, setYearA] = useState(currentYear - 1);
  const [yearB, setYearB] = useState(currentYear);
  const [timelines, setTimelines] = useState<Record<number, TimelineDataPoint[]>>({});
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    const node = ref.current;
    if (!node || visible) return;
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && setVisible(true), { rootMargin: '200px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([yearA, yearB].map((year) => fetchYear(year, filters).then((timeline) => [year, timeline] as const)))
      .then((entries) => !cancelled && setTimelines(Object.fromEntries(entries)))
      .catch((err) => console.error(err))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // filtersKey stands for `filters`, a new object on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, yearA, yearB, filtersKey]);

  const selected = METRICS.find((m) => m.value === metric)!;
  const now = new Date();
  const valueFor = (year: number, month: number) => {
    // Months still ahead stay empty instead of showing zero.
    if (year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth())) return null;
    const point = timelines[year]?.find((p) => parseIsoDate(p.start_date)?.getMonth() === month);
    return point ? point[metric] : 0;
  };
  const rows = MONTHS.map((label, month) => ({ label, a: valueFor(yearA, month), b: valueFor(yearB, month) }));
  const config = {
    a: { label: String(yearA), color: 'var(--chart-3)' },
    b: { label: String(yearB), color: 'var(--chart-1)' },
  };

  const historyStart = parseIsoDate(adsHistoryFrom);
  const oldestYearStart = new Date(Math.min(yearA, yearB), 0, 1);
  const incompleteHistory = selected.ads && (!historyStart || historyStart > oldestYearStart);
  const format = selected.money ? formatCurrency : (v: number) => formatNumber(v);

  return (
    <div ref={ref}>
      <Card>
        <CardHeader className="pb-3 flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-primary" />
              Evolução mensal ano × ano
            </CardTitle>
            <CardDescription>Mesmo mês em anos diferentes, com os filtros ativos (ignora o período escolhido)</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={metric} onValueChange={(value) => setMetric(value as Metric)}>
              <SelectTrigger className="h-9 w-[190px]" aria-label="Métrica">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METRICS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {[
              { value: yearA, set: setYearA, label: 'Ano de comparação' },
              { value: yearB, set: setYearB, label: 'Ano principal' },
            ].map(({ value, set, label }) => (
              <Select key={label} value={String(value)} onValueChange={(v) => set(Number(v))}>
                <SelectTrigger className="h-9 w-[96px]" aria-label={label}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {incompleteHistory && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 shrink-0" />
              {historyStart
                ? `O histórico da Meta Ads está completo a partir de ${historyStart.toLocaleDateString('pt-BR')}; meses anteriores podem aparecer zerados.`
                : 'O histórico da Meta Ads ainda está sendo importado; meses antigos podem aparecer zerados.'}
            </p>
          )}
          {loading && !Object.keys(timelines).length ? (
            <Skeleton className="h-[280px] w-full" />
          ) : (
            <ChartContainer config={config} className="h-[280px] w-full">
              <BarChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barGap={2}>
                <CartesianGrid vertical={false} strokeOpacity={0.4} />
                <XAxis dataKey="label" {...AXIS_PROPS} />
                <YAxis {...AXIS_PROPS} width={80} tickFormatter={selected.money ? compactCurrency : compactNumber} />
                <ChartTooltip
                  cursor={{ fillOpacity: 0.1 }}
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => (
                        <div className="flex w-full justify-between gap-4">
                          <span className="text-muted-foreground">{config[name as 'a' | 'b']?.label}</span>
                          <span className="font-medium tabular-nums">{format(Number(value))}</span>
                        </div>
                      )}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="a" fill="var(--color-a)" fillOpacity={COMPARED_OPACITY + 0.3} radius={[4, 4, 0, 0]} maxBarSize={22} />
                <Bar dataKey="b" fill="var(--color-b)" radius={[4, 4, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default YearOverYearCard;
