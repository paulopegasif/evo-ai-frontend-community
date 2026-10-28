import { BarChart3, Megaphone } from 'lucide-react';
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
} from '@evoapi/design-system';
import type { TimelineDataPoint } from '@/types/leadTracking';
import { AXIS_PROPS, SERIES } from './chartConfig';
import { compactCurrency, formatCurrency } from './format';

interface TrendChartsProps {
  timeline: TimelineDataPoint[];
  showSpend: boolean;
}

const volumeConfig = { leads: SERIES.leads, scheduled: SERIES.scheduled, attended: SERIES.attended };
const spendConfig = { spend: SERIES.spend };

// Two charts instead of a dual axis: counts and money never share a scale.
const TrendCharts = ({ timeline, showSpend }: TrendChartsProps) => (
  <div className={`grid grid-cols-1 gap-4 ${showSpend ? 'xl:grid-cols-2' : ''}`}>
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          Leads e agenda por dia
        </CardTitle>
        <CardDescription>Novos leads, consultas marcadas para o dia e comparecimentos</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={volumeConfig} className="h-[260px] w-full">
          <LineChart data={timeline} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeOpacity={0.4} />
            <XAxis dataKey="label" {...AXIS_PROPS} minTickGap={16} />
            <YAxis {...AXIS_PROPS} allowDecimals={false} width={40} />
            <ChartTooltip content={<ChartTooltipContent indicator="line" className="min-w-[11rem]" />} />
            <ChartLegend content={<ChartLegendContent />} />
            {(Object.keys(volumeConfig) as (keyof typeof volumeConfig)[]).map((key) => (
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
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>

    {showSpend && (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" />
            Investimento em anúncios por dia
          </CardTitle>
          <CardDescription>Gasto diário importado da Meta Ads</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={spendConfig} className="h-[260px] w-full">
            <BarChart data={timeline} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeOpacity={0.4} />
              <XAxis dataKey="label" {...AXIS_PROPS} minTickGap={16} />
              <YAxis {...AXIS_PROPS} width={64} tickFormatter={compactCurrency} />
              <ChartTooltip
                cursor={{ fillOpacity: 0.1 }}
                content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />}
              />
              <Bar dataKey="spend" fill="var(--color-spend)" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    )}
  </div>
);

export default TrendCharts;
