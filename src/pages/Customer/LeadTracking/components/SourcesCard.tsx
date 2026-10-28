import { useMemo } from 'react';
import { PieChart as PieChartIcon } from 'lucide-react';
import { Cell, Pie, PieChart } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@evoapi/design-system';
import type { LeadSourcePerformance } from '@/types/leadTracking';
import { CATEGORICAL, OTHER_COLOR } from './chartConfig';
import { percentOrDash, plural } from './format';

interface SourcesCardProps {
  sources: LeadSourcePerformance[];
}

interface SourceSlice {
  key: string;
  name: string;
  leads: number;
  won: number;
  share: number | null;
  conversion: number | null;
  color: string;
}

const MAX_SLICES = CATEGORICAL.length;

const SourcesCard = ({ sources }: SourcesCardProps) => {
  const total = sources.reduce((sum, s) => sum + s.leads, 0);

  // Sources arrive sorted by volume; past the palette size they fold into "Outras".
  const slices = useMemo<SourceSlice[]>(() => {
    const toSlice = (s: LeadSourcePerformance, idx: number): SourceSlice => ({
      key: `source-${idx}`,
      name: s.name,
      leads: s.leads,
      won: s.won,
      share: s.share_percentage,
      conversion: s.conversion_rate,
      color: CATEGORICAL[idx],
    });

    if (sources.length <= MAX_SLICES) return sources.map(toSlice);

    const head = sources.slice(0, MAX_SLICES - 1).map(toSlice);
    const rest = sources.slice(MAX_SLICES - 1);
    const leads = rest.reduce((sum, s) => sum + s.leads, 0);
    const won = rest.reduce((sum, s) => sum + s.won, 0);
    return [
      ...head,
      {
        key: 'source-other',
        name: `Outras (${rest.length})`,
        leads,
        won,
        share: total ? Math.round((leads / total) * 1000) / 10 : null,
        conversion: leads ? Math.round((won / leads) * 1000) / 10 : null,
        color: OTHER_COLOR,
      },
    ];
  }, [sources, total]);

  const config = useMemo<ChartConfig>(
    () => Object.fromEntries(slices.map((s) => [s.key, { label: s.name, color: s.color }])),
    [slices],
  );

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <PieChartIcon className="h-4 w-4 text-primary" />
          Origem dos leads
        </CardTitle>
        <CardDescription>Canal do primeiro contato e quanto cada um converte</CardDescription>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
            Nenhum lead no período.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-4 items-center">
            <ChartContainer config={config} className="mx-auto aspect-square h-[180px]">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="key" hideLabel />} />
                <Pie
                  data={slices}
                  dataKey="leads"
                  nameKey="key"
                  innerRadius={52}
                  outerRadius={80}
                  stroke="var(--card)"
                  strokeWidth={2}
                >
                  {slices.map((s) => (
                    <Cell key={s.key} fill={s.color} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>

            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground">
                  <th className="text-left font-normal pb-1.5">Origem</th>
                  <th className="text-right font-normal pb-1.5">Leads</th>
                  <th className="text-right font-normal pb-1.5">Conversão</th>
                </tr>
              </thead>
              <tbody>
                {slices.map((s) => (
                  <tr key={s.key} className="border-t border-border/60">
                    <td className="py-1.5 pr-2">
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="truncate">{s.name}</span>
                      </span>
                    </td>
                    <td className="py-1.5 text-right tabular-nums whitespace-nowrap">
                      {s.leads} <span className="text-muted-foreground">({percentOrDash(s.share)})</span>
                    </td>
                    <td className="py-1.5 text-right tabular-nums" title={plural(s.won, 'venda', 'vendas')}>
                      {percentOrDash(s.conversion)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SourcesCard;
