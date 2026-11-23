import { BarChart3, Layers, TrendingUp } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardPanel, CardTitle } from '@/components/ui/card';
import { AreaChartCard, BarChartCard, DonutChartCard } from '@/components/charts';
import type { CustomerDashboardResponse } from '@/types/analytics/dashboard';
import { formatCurrency, formatInteger, formatPercent } from './dashboardUtils';
import { useTranslation } from '@/hooks/useTranslation';
import { TooltipInfo } from '@/components/base/TooltipInfo';

interface DashboardTrendsSectionProps {
  data: CustomerDashboardResponse;
  t: (key: string) => string;
  channelShareData: Array<{ name: string; value: number; color: string }>;
}

const DashboardTrendsSection = ({ data, t, channelShareData }: DashboardTrendsSectionProps) => {
  const { t: tTours } = useTranslation('tours');
  const tx = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  const hasResultsData = data.trends.response_time_daily.length > 0;
  const responseTimeCardDescription = hasResultsData
    ? tx('dashboard.charts.sessionDescription', 'Média diária das sessões por dia')
    : tx('dashboard.charts.emptyState', 'Sem dados no período selecionado');

  const topChannel = data.channels[0];
  const top3Share = data.channels.slice(0, 3).reduce((sum, channel) => sum + channel.percentage, 0);
  const channelsRevenue = data.channels.reduce((sum, channel) => sum + channel.value, 0);

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="font-semibold text-lg">{tx('dashboard.sections.trends', 'Tendências no tempo')}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {tx('dashboard.sections.trendsSubtitle', 'Evolução da operação ao longo do período filtrado')}
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div data-tour="dashboard-trends-conversations" className="h-full">
          <AreaChartCard
            title={t('dashboard.charts.visitorsTrend') || 'Conversas por dia'}
            description={t('dashboard.charts.visitorsDescription') || 'Tendência diária de conversas no período'}
            data={data.trends.conversations_daily}
            icon={TrendingUp}
            color="var(--chart-1)"
            gradientFrom="var(--chart-1)"
            gradientTo="var(--chart-1)"
            valueFormatter={value => formatInteger(value)}
            tooltip={{ title: tTours('dashboard.step9.title'), content: tTours('dashboard.step9.content') }}
          />
        </div>

        <div data-tour="dashboard-trends-response" className="h-full">
          <BarChartCard
            title={t('dashboard.charts.sessionDuration') || 'Tempo de 1ª resposta por dia'}
            description={responseTimeCardDescription}
            data={data.trends.response_time_daily}
            icon={BarChart3}
            color="var(--chart-1)"
            gradientFrom="var(--chart-1)"
            gradientTo="var(--chart-1)"
            valueFormatter={value => `${Math.round(value)}s`}
            highlightMax
            tooltip={{ title: tTours('dashboard.step10.title'), content: tTours('dashboard.step10.content') }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div data-tour="dashboard-channel-participation" className="h-full">
          <DonutChartCard
            title={t('dashboard.charts.channelShare') || 'Participação por canal'}
            description={t('dashboard.charts.channelShareDescription') || 'Distribuição percentual de conversas por canal'}
            data={channelShareData}
            icon={Layers}
            gradientFrom="var(--chart-1)"
            gradientTo="var(--chart-1)"
            centerLabel={topChannel?.name || tx('dashboard.charts.channelsLabel', 'Canais')}
            centerValue={topChannel ? formatPercent(topChannel.percentage) : '—'}
            tooltip={{ title: tTours('dashboard.step11.title'), content: tTours('dashboard.step11.content') }}
          />
        </div>

        <Card data-tour="dashboard-channel-insights">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              {tx('dashboard.channels.insights', 'Insights de canais')}
              <TooltipInfo title={tTours('dashboard.step12.title')} content={tTours('dashboard.step12.content')} />
            </CardTitle>
          </CardHeader>
          <CardPanel className="space-y-3">
            <div className="rounded-lg border bg-muted/40 p-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm text-muted-foreground">{tx('dashboard.channels.topChannel', 'Canal líder')}</div>
                <div className="font-semibold">{topChannel?.name || '-'}</div>
              </div>
              <Badge variant="secondary">{formatPercent(topChannel?.percentage ?? 0)}</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-lg border bg-muted/40 p-3">
                <div className="text-sm text-muted-foreground">{tx('dashboard.channels.concentration', 'Concentração Top 3')}</div>
                <div className="font-semibold text-xl tabular-nums">{formatPercent(top3Share)}</div>
              </div>
              <div className="rounded-lg border bg-muted/40 p-3">
                <div className="text-sm text-muted-foreground">{tx('dashboard.channels.activeCount', 'Canais ativos')}</div>
                <div className="font-semibold text-xl tabular-nums">{data.channels.length}</div>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/40 p-3">
              <div className="text-sm text-muted-foreground">{tx('dashboard.channels.totalValue', 'Valor total por canais')}</div>
              <div className="font-semibold text-xl tabular-nums">{formatCurrency(channelsRevenue)}</div>
            </div>
          </CardPanel>
        </Card>
      </div>
    </section>
  );
};

export default DashboardTrendsSection;
