import { Stethoscope, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@evoapi/design-system';
import { BaseTable, type TableColumn } from '@/components/base';
import type { CategoryPerformance, ProfessionalPerformance } from '@/types/leadTracking';
import { AXIS_PROPS, SERIES } from './chartConfig';
import { DASH, compactCurrency, formatCurrency, percentOrDash, plural } from './format';

interface AgendaSectionProps {
  categories: CategoryPerformance[];
  professionals: ProfessionalPerformance[];
}

const revenueConfig = { revenue: SERIES.revenue };

const professionalColumns: TableColumn<ProfessionalPerformance>[] = [
  { key: 'name', label: 'Profissional', render: (p) => <span className="font-medium">{p.name}</span> },
  { key: 'total', label: 'Consultas', align: 'right' },
  { key: 'attended', label: 'Realizadas', align: 'right' },
  { key: 'no_show', label: 'Faltas', align: 'right' },
  { key: 'pending', label: 'A realizar', align: 'right' },
  {
    key: 'show_rate',
    label: 'Comparecimento',
    align: 'right',
    render: (p) =>
      p.show_rate == null ? (
        <span className="text-muted-foreground" title="Sem consultas finalizadas no período">
          {DASH}
        </span>
      ) : (
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
          {percentOrDash(p.show_rate)}
        </Badge>
      ),
  },
  { key: 'revenue', label: 'Faturamento', align: 'right', render: (p) => <span className="font-medium">{formatCurrency(p.revenue)}</span> },
];

const AgendaSection = ({ categories, professionals }: AgendaSectionProps) => {
  const revenueRows = categories.filter((c) => c.revenue > 0);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
      <Card className="xl:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-primary" />
            Desempenho por procedimento
          </CardTitle>
          <CardDescription>Faturamento das consultas realizadas e volume agendado no período</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {categories.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma consulta no período.</p>
          ) : (
            <>
              {revenueRows.length > 0 && (
                <ChartContainer config={revenueConfig} className="w-full" style={{ height: 24 + revenueRows.length * 36 }}>
                  <BarChart data={revenueRows} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid horizontal={false} strokeOpacity={0.4} />
                    <XAxis type="number" {...AXIS_PROPS} tickFormatter={compactCurrency} />
                    <YAxis type="category" dataKey="name" {...AXIS_PROPS} width={170} />
                    <ChartTooltip
                      cursor={{ fillOpacity: 0.1 }}
                      content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />}
                    />
                    <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[0, 4, 4, 0]} maxBarSize={18} />
                  </BarChart>
                </ChartContainer>
              )}

              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground">
                    <th className="text-left font-normal pb-1.5">Procedimento</th>
                    <th className="text-right font-normal pb-1.5">Consultas</th>
                    <th className="text-right font-normal pb-1.5">Faturamento</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => (
                    <tr key={c.name} className="border-t border-border/60">
                      <td className="py-1.5 pr-2">
                        <span className="block truncate">{c.name}</span>
                      </td>
                      <td className="py-1.5 text-right tabular-nums whitespace-nowrap" title={plural(c.attended, 'realizada', 'realizadas')}>
                        {c.count} <span className="text-muted-foreground">({percentOrDash(c.share_percentage)})</span>
                      </td>
                      <td className="py-1.5 text-right tabular-nums whitespace-nowrap">
                        {formatCurrency(c.revenue)} <span className="text-muted-foreground">({percentOrDash(c.revenue_share)})</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="xl:col-span-3">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Desempenho por profissional
          </CardTitle>
          <CardDescription>
            Comparecimento = realizadas ÷ (realizadas + faltas); consultas futuras não entram na taxa
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <BaseTable<ProfessionalPerformance>
            data={professionals}
            columns={professionalColumns}
            getRowKey={(p) => p.user_id}
            emptyMessage="Nenhum atendimento registrado no período."
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default AgendaSection;
