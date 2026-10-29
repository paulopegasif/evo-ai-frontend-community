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
import {
  DASH,
  compactCurrency,
  currencyOrDash,
  formatCurrency,
  formatNumber,
  percentOrDash,
  plural,
  roasOrDash,
} from './format';

interface CampaignsSectionProps {
  campaigns: CampaignPerformance[];
}

type SourceFilter = 'all' | 'meta' | 'other';
type View = 'media' | 'crm';
type SortKey =
  | 'name'
  | 'leads'
  | 'won'
  | 'conversion_rate'
  | 'revenue'
  | 'spend'
  | 'cpl'
  | 'cac'
  | 'roas'
  | 'impressions'
  | 'link_clicks'
  | 'ctr'
  | 'conversations'
  | 'cost_per_conversation'
  | 'meta_leads';

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: 'Ativa', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' },
  PAUSED: { label: 'Pausada', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30' },
  CAMPAIGN_PAUSED: { label: 'Pausada', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30' },
  ARCHIVED: { label: 'Arquivada', className: 'bg-muted text-muted-foreground border-border' },
  DELETED: { label: 'Excluída', className: 'bg-muted text-muted-foreground border-border' },
  IN_PROCESS: { label: 'Em processamento', className: 'bg-muted text-muted-foreground border-border' },
  WITH_ISSUES: { label: 'Com problemas', className: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30' },
};

const StatusBadge = ({ status }: { status: string | null }) => {
  if (!status) return null;
  const meta = STATUS_LABELS[status] ?? { label: status, className: 'bg-muted text-muted-foreground border-border' };
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${meta.className}`}>
      {meta.label}
    </Badge>
  );
};

const count = (value: number | null) => (value == null ? <span className="text-muted-foreground">{DASH}</span> : formatNumber(value));

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
  const [view, setView] = useState<View>('media');
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

  const nameColumn: TableColumn<CampaignPerformance> = {
    key: 'name',
    label: 'Campanha',
    sortable: true,
    render: (c) => (
      <div className="min-w-[220px] max-w-[360px]">
        <div className="font-medium truncate" title={c.name}>
          {c.name}
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          {c.source}
          <StatusBadge status={c.status} />
        </div>
      </div>
    ),
  };

  const mediaColumns: TableColumn<CampaignPerformance>[] = [
    nameColumn,
    { key: 'spend', label: 'Gasto', align: 'right', sortable: true, render: (c) => currencyOrDash(c.spend) },
    { key: 'impressions', label: 'Impressões', align: 'right', sortable: true, render: (c) => count(c.impressions) },
    { key: 'link_clicks', label: 'Cliques', align: 'right', sortable: true, render: (c) => count(c.link_clicks) },
    { key: 'ctr', label: 'CTR', align: 'right', sortable: true, render: (c) => percentOrDash(c.ctr) },
    { key: 'conversations', label: 'Conversas', align: 'right', sortable: true, render: (c) => count(c.conversations) },
    {
      key: 'cost_per_conversation',
      label: 'Custo/conversa',
      align: 'right',
      sortable: true,
      render: (c) => currencyOrDash(c.cost_per_conversation),
    },
    { key: 'meta_leads', label: 'Leads Meta', align: 'right', sortable: true, render: (c) => count(c.meta_leads) },
  ];

  const crmColumns: TableColumn<CampaignPerformance>[] = [
    nameColumn,
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
            Entrega e resultados medidos pela Meta, e os leads do período no CRM pela campanha do primeiro contato
          </CardDescription>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Tabs value={view} onValueChange={(value) => setView(value as View)}>
            <TabsList>
              <TabsTrigger value="media">Mídia (Meta)</TabsTrigger>
              <TabsTrigger value="crm">Resultado (CRM)</TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs value={filter} onValueChange={(value) => setFilter(value as SourceFilter)}>
            <TabsList>
              <TabsTrigger value="all">Todas ({campaigns.length})</TabsTrigger>
              <TabsTrigger value="meta">Meta Ads ({metaCount})</TabsTrigger>
              <TabsTrigger value="other">Outras ({campaigns.length - metaCount})</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
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
            columns={view === 'media' ? mediaColumns : crmColumns}
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
