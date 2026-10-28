import { useMemo, useState } from 'react';
import { Megaphone } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  Badge,
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
  Tabs,
  TabsList,
  TabsTrigger,
} from '@evoapi/design-system';
import { BaseTable, type TableColumn } from '@/components/base';
import type { CampaignPerformance } from '@/types/leadTracking';
import { AXIS_PROPS, SERIES } from './chartConfig';
import { compactCurrency, currencyOrDash, formatCurrency, percentOrDash, plural, roasOrDash } from './format';

interface CampaignsSectionProps {
  campaigns: CampaignPerformance[];
}

type SourceFilter = 'all' | 'meta' | 'other';
type SortKey = 'name' | 'leads' | 'won' | 'conversion_rate' | 'revenue' | 'spend' | 'cpl' | 'cac' | 'roas';

const META_SOURCE = 'Meta Ads';
const CHART_LIMIT = 8;
const chartConfig = { spend: SERIES.spend, revenue: SERIES.revenue };

const isMeta = (c: CampaignPerformance) => c.source === META_SOURCE;

// Nulls ("—") always sort last, whatever the direction.
const compare = (a: CampaignPerformance, b: CampaignPerformance, key: SortKey, order: 'asc' | 'desc') => {
  const av = a[key];
  const bv = b[key];
  if (av == null && bv == null) return 0;
  if (av == null) return 1;
  if (bv == null) return -1;
  const result = typeof av === 'string' ? av.localeCompare(String(bv), 'pt-BR') : (av as number) - (bv as number);
  return order === 'asc' ? result : -result;
};

const truncate = (value: string, size = 28) => (value.length > size ? `${value.slice(0, size - 1)}…` : value);

const CampaignsSection = ({ campaigns }: CampaignsSectionProps) => {
  const [filter, setFilter] = useState<SourceFilter>('all');
  const [sortBy, setSortBy] = useState<SortKey>('spend');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const metaCount = campaigns.filter(isMeta).length;

  const rows = useMemo(() => {
    const filtered = campaigns.filter((c) => filter === 'all' || (filter === 'meta' ? isMeta(c) : !isMeta(c)));
    return [...filtered].sort((a, b) => compare(a, b, sortBy, sortOrder));
  }, [campaigns, filter, sortBy, sortOrder]);

  const chartData = useMemo(
    () =>
      campaigns
        .filter((c) => (c.spend || 0) > 0)
        .sort((a, b) => (b.spend || 0) - (a.spend || 0))
        .slice(0, CHART_LIMIT)
        .map((c) => ({ name: c.name, short: truncate(c.name), spend: c.spend || 0, revenue: c.revenue })),
    [campaigns],
  );

  const handleSort = (column: string) => {
    const key = column as SortKey;
    if (key === sortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder(key === 'name' ? 'asc' : 'desc');
    }
  };

  const columns: TableColumn<CampaignPerformance>[] = [
    {
      key: 'name',
      label: 'Campanha',
      sortable: true,
      render: (c) => (
        <div className="min-w-[220px] max-w-[360px]">
          <div className="font-medium truncate" title={c.name}>
            {c.name}
          </div>
          <div className="text-xs text-muted-foreground">{c.source}</div>
        </div>
      ),
    },
    { key: 'leads', label: 'Leads', align: 'right', sortable: true },
    {
      key: 'won',
      label: 'Vendas',
      align: 'right',
      sortable: true,
      render: (c) => (
        <span title={`${plural(c.scheduled, 'agendou', 'agendaram')} • ${plural(c.attended, 'compareceu', 'compareceram')}`}>
          {c.won}
        </span>
      ),
    },
    {
      key: 'conversion_rate',
      label: 'Conversão',
      align: 'right',
      sortable: true,
      render: (c) =>
        c.conversion_rate == null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
            {percentOrDash(c.conversion_rate)}
          </Badge>
        ),
    },
    { key: 'revenue', label: 'Receita', align: 'right', sortable: true, render: (c) => formatCurrency(c.revenue) },
    { key: 'spend', label: 'Gasto', align: 'right', sortable: true, render: (c) => currencyOrDash(c.spend) },
    { key: 'cpl', label: 'CPL', align: 'right', sortable: true, render: (c) => currencyOrDash(c.cpl) },
    { key: 'cac', label: 'CAC', align: 'right', sortable: true, render: (c) => currencyOrDash(c.cac) },
    { key: 'roas', label: 'ROAS', align: 'right', sortable: true, render: (c) => roasOrDash(c.roas) },
  ];

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" />
            Desempenho de campanhas
          </CardTitle>
          <CardDescription>
            Leads do período por campanha do primeiro contato; gasto importado da Meta Ads
          </CardDescription>
        </div>
        <Tabs value={filter} onValueChange={(value) => setFilter(value as SourceFilter)}>
          <TabsList>
            <TabsTrigger value="all">Todas ({campaigns.length})</TabsTrigger>
            <TabsTrigger value="meta">Meta Ads ({metaCount})</TabsTrigger>
            <TabsTrigger value="other">Outras ({campaigns.length - metaCount})</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="space-y-6">
        {chartData.length > 0 && filter !== 'other' && (
          <div>
            <p className="text-sm font-medium mb-2">Investimento × receita gerada (maiores gastos)</p>
            <ChartContainer config={chartConfig} className="w-full" style={{ height: 48 + chartData.length * 40 }}>
              <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barGap={2}>
                <CartesianGrid horizontal={false} strokeOpacity={0.4} />
                <XAxis type="number" {...AXIS_PROPS} tickFormatter={compactCurrency} />
                <YAxis type="category" dataKey="short" {...AXIS_PROPS} width={190} />
                <ChartTooltip
                  cursor={{ fillOpacity: 0.1 }}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_label, payload) => payload?.[0]?.payload?.name}
                      formatter={(value, name) => (
                        <div className="flex w-full justify-between gap-4">
                          <span className="text-muted-foreground">{chartConfig[name as keyof typeof chartConfig]?.label}</span>
                          <span className="font-medium tabular-nums">{formatCurrency(Number(value))}</span>
                        </div>
                      )}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="spend" fill="var(--color-spend)" radius={[0, 4, 4, 0]} maxBarSize={14} />
                <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[0, 4, 4, 0]} maxBarSize={14} />
              </BarChart>
            </ChartContainer>
          </div>
        )}

        <div className="overflow-x-auto">
          <BaseTable<CampaignPerformance>
            data={rows}
            columns={columns}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
            getRowKey={(c) => c.campaign_key}
            emptyMessage="Nenhuma campanha encontrada no período."
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default CampaignsSection;
