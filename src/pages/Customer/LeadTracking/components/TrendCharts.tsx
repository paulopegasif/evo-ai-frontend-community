import { BarChart3, Megaphone, MessageCircle } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
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
  type ChartConfig,
} from '@evoapi/design-system';
import type { TimelineDataPoint, TimelineGranularity } from '@/types/leadTracking';
import { AXIS_PROPS, COMPARED_OPACITY, SERIES } from './chartConfig';
import { compactCurrency, compactNumber, formatCurrency } from './format';

interface TrendChartsProps {
  timeline: TimelineDataPoint[];
  /** Compared period, aligned with `timeline` by position. */
  previousTimeline?: TimelineDataPoint[];
  granularity: TimelineGranularity;
  showSpend: boolean;
}

const UNIT: Record<TimelineGranularity, string> = { day: 'dia', week: 'semana', month: 'mês' };

type Row = TimelineDataPoint & {
  prev_leads?: number;
  prev_spend?: number;
  prev_conversations?: number;
  prev_label?: string;
};

const withPrevious = (key: keyof typeof SERIES, label: string): ChartConfig => ({
  [`prev_${key}`]: { label, color: SERIES[key].color },
});

// Two charts instead of a dual axis: counts and money never share a scale.
const TrendCharts = ({ timeline, previousTimeline, granularity, showSpend }: TrendChartsProps) => {
  const comparing = Boolean(previousTimeline);
  const rows: Row[] = timeline.map((point, index) => {
    const previous = previousTimeline?.[index];
    return previous
      ? {
          ...point,
          prev_leads: previous.leads,
          prev_spend: previous.spend,
          prev_conversations: previous.conversations,
          prev_label: previous.label,
        }
      : point;
  });

  const volumeConfig: ChartConfig = {
    leads: SERIES.leads,
    scheduled: SERIES.scheduled,
    attended: SERIES.attended,
    ...(comparing ? withPrevious('leads', 'Novos leads (comparação)') : {}),
  };
  const spendConfig: ChartConfig = {
    spend: SERIES.spend,
    ...(comparing ? withPrevious('spend', 'Investimento (comparação)') : {}),
  };
  const conversationsConfig: ChartConfig = {
    conversations: SERIES.conversations,
    ...(comparing ? withPrevious('conversations', 'Conversas (comparação)') : {}),
  };
  const unit = UNIT[granularity];
  // Tooltips name the compared bucket too, since its dates differ.
  const labelWithPrevious = (_label: unknown, payload: { payload?: Row }[]) => {
    const row = payload?.[0]?.payload;
    if (!row) return null;
    return row.prev_label ? `${row.label} vs. ${row.prev_label}` : row.label;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Leads e agenda por {unit}
          </CardTitle>
          <CardDescription>Novos leads, consultas marcadas e comparecimentos</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={volumeConfig} className="h-[260px] w-full">
            <LineChart data={rows} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeOpacity={0.4} />
              <XAxis dataKey="label" {...AXIS_PROPS} minTickGap={16} />
              <YAxis {...AXIS_PROPS} allowDecimals={false} width={40} />
              <ChartTooltip
                content={<ChartTooltipContent indicator="line" className="min-w-[13rem]" labelFormatter={labelWithPrevious} />}
              />
              <ChartLegend content={<ChartLegendContent />} />
              {(['leads', 'scheduled', 'attended'] as const).map((key) => (
                <Line
                  key={key}
                  dataKey={key}
                  type="linear"
                  stroke={`var(--color-${key})`}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
              {comparing && (
                <Line
                  dataKey="prev_leads"
                  type="linear"
                  stroke="var(--color-prev_leads)"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  strokeOpacity={COMPARED_OPACITY + 0.2}
                  dot={false}
                />
              )}
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {showSpend && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-primary" />
                Investimento por {unit}
              </CardTitle>
              <CardDescription>Gasto importado da Meta Ads</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={spendConfig} className="h-[260px] w-full">
                <BarChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barGap={2}>
                  <CartesianGrid vertical={false} strokeOpacity={0.4} />
                  <XAxis dataKey="label" {...AXIS_PROPS} minTickGap={16} />
                  <YAxis {...AXIS_PROPS} width={80} tickFormatter={compactCurrency} />
                  <ChartTooltip
                    cursor={{ fillOpacity: 0.1 }}
                    content={
                      <ChartTooltipContent
                        labelFormatter={labelWithPrevious}
                        formatter={(value, name) => (
                          <div className="flex w-full justify-between gap-4">
                            <span className="text-muted-foreground">{spendConfig[String(name)]?.label}</span>
                            <span className="font-medium tabular-nums">{formatCurrency(Number(value))}</span>
                          </div>
                        )}
                      />
                    }
                  />
                  {comparing && <ChartLegend content={<ChartLegendContent />} />}
                  <Bar dataKey="spend" fill="var(--color-spend)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  {comparing && (
                    <Bar
                      dataKey="prev_spend"
                      fill="var(--color-prev_spend)"
                      fillOpacity={COMPARED_OPACITY}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={28}
                    />
                  )}
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-primary" />
                Conversas iniciadas por {unit}
              </CardTitle>
              <CardDescription>Resultado medido pela Meta nos anúncios de mensagem</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={conversationsConfig} className="h-[260px] w-full">
                <LineChart data={rows} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeOpacity={0.4} />
                  <XAxis dataKey="label" {...AXIS_PROPS} minTickGap={16} />
                  <YAxis {...AXIS_PROPS} allowDecimals={false} width={48} tickFormatter={compactNumber} />
                  <ChartTooltip
                    content={<ChartTooltipContent indicator="line" className="min-w-[13rem]" labelFormatter={labelWithPrevious} />}
                  />
                  {comparing && <ChartLegend content={<ChartLegendContent />} />}
                  <Line
                    dataKey="conversations"
                    type="linear"
                    stroke="var(--color-conversations)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  {comparing && (
                    <Line
                      dataKey="prev_conversations"
                      type="linear"
                      stroke="var(--color-prev_conversations)"
                      strokeWidth={2}
                      strokeDasharray="5 4"
                      strokeOpacity={COMPARED_OPACITY + 0.2}
                      dot={false}
                    />
                  )}
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default TrendCharts;
