import { useMemo, useState } from 'react';
import { Trophy } from 'lucide-react';
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@evoapi/design-system';
import { BaseTable, type TableColumn } from '@/components/base';
import type { AdPerformance } from '@/types/leadTracking';
import { currencyOrDash, formatCurrency, formatNumber, roasOrDash } from './format';

type SortKey = 'leads' | 'scheduled' | 'attended' | 'won' | 'revenue' | 'spend' | 'cpl' | 'cac' | 'roas';

const AdsRankingCard = ({ ads, showAgenda = true }: { ads: AdPerformance[]; showAgenda?: boolean }) => {
  const [sortBy, setSortBy] = useState<SortKey>('revenue');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  const rows = useMemo(() => {
    const present = ads.filter((a) => a[sortBy] != null);
    const missing = ads.filter((a) => a[sortBy] == null);
    present.sort((a, b) => ((a[sortBy] as number) - (b[sortBy] as number)) * (order === 'desc' ? -1 : 1));
    return [...present, ...missing];
  }, [ads, sortBy, order]);

  const onSort = (column: string) => {
    if (column === sortBy) setOrder(order === 'desc' ? 'asc' : 'desc');
    else {
      setSortBy(column as SortKey);
      setOrder('desc');
    }
  };

  const columns: TableColumn<AdPerformance>[] = [
    {
      key: 'name',
      label: 'Anúncio',
      render: (ad) => (
        <div className="max-w-[280px]">
          <span className="font-medium text-sm">{ad.name}</span>
          {ad.unavailable && (
            <Badge variant="outline" className="ml-2 text-[10px]">
              removido/outra conta
            </Badge>
          )}
          <span className="block text-xs text-muted-foreground truncate">{ad.campaign_name ?? ad.ad_id}</span>
        </div>
      ),
    },
    { key: 'spend', label: 'Gasto', sortable: true, align: 'right', render: (ad) => formatCurrency(ad.spend) },
    { key: 'leads', label: 'Leads', sortable: true, align: 'right', render: (ad) => formatNumber(ad.leads) },
    ...(showAgenda
      ? ([
          { key: 'scheduled', label: 'Agendaram', sortable: true, align: 'right' },
          { key: 'attended', label: 'Compareceram', sortable: true, align: 'right' },
        ] as const)
      : []),
    { key: 'won', label: 'Vendas', sortable: true, align: 'right' },
    { key: 'revenue', label: 'Receita', sortable: true, align: 'right', render: (ad) => formatCurrency(ad.revenue) },
    { key: 'cpl', label: 'CPL', sortable: true, align: 'right', render: (ad) => currencyOrDash(ad.cpl) },
    { key: 'cac', label: 'CAC', sortable: true, align: 'right', render: (ad) => currencyOrDash(ad.cac) },
    { key: 'roas', label: 'ROAS', sortable: true, align: 'right', render: (ad) => roasOrDash(ad.roas) },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          Ranking de anúncios
        </CardTitle>
        <CardDescription>Ordenado por receita gerada no CRM; clique no cabeçalho para mudar a ordem</CardDescription>
      </CardHeader>
      <CardContent>
        <BaseTable
          data={rows}
          columns={columns}
          sortBy={sortBy}
          sortOrder={order}
          onSort={onSort}
          getRowKey={(ad) => ad.ad_id}
          emptyTitle="Nenhum anúncio no período"
        />
      </CardContent>
    </Card>
  );
};

export default AdsRankingCard;
