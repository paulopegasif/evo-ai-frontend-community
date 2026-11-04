import { useCallback, useEffect, useState } from 'react';
import { Download, Users } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@evoapi/design-system';
import { toast } from 'sonner';
import { BaseTable, type TableColumn } from '@/components/base';
import BasePagination from '@/components/base/BasePagination';
import { leadTrackingService } from '@/services/dashboard/leadTrackingService';
import type { LeadListResponse, LeadListSort, LeadRow, LeadTrackingParams } from '@/types/leadTracking';
import { DASH, currencyOrDash, formatCurrency } from './format';
import { COST_BASIS_LABELS, formatDate, statusLabel } from './labels';
import LeadJourneySheet from './LeadJourneySheet';

interface LeadsTabProps {
  params: LeadTrackingParams;
}

const SORTABLE: LeadListSort[] = ['entered_at', 'estimated_cost', 'revenue'];

const outcome = (lead: LeadRow) => {
  if (lead.won) return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30" variant="outline">Venda</Badge>;
  if (lead.attended) return <Badge variant="outline">Compareceu</Badge>;
  if (lead.scheduled) return <Badge variant="outline">Agendou</Badge>;
  return <span className="text-muted-foreground text-xs">{DASH}</span>;
};

const LeadsTab = ({ params }: LeadsTabProps) => {
  const [data, setData] = useState<LeadListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [sort, setSort] = useState<LeadListSort>('entered_at');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [selected, setSelected] = useState<string | null>(null);
  const paramsKey = JSON.stringify(params);

  useEffect(() => setPage(1), [paramsKey]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    leadTrackingService
      .getLeadList({ ...params, page, per_page: perPage, sort, order })
      .then((response) => !cancelled && setData(response))
      .catch(() => !cancelled && toast.error('Erro ao carregar a lista de leads.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // paramsKey stands for `params`, a new object on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey, page, perPage, sort, order]);

  const onSort = (column: string) => {
    if (!SORTABLE.includes(column as LeadListSort)) return;
    if (column === sort) setOrder(order === 'desc' ? 'asc' : 'desc');
    else {
      setSort(column as LeadListSort);
      setOrder('desc');
    }
  };

  const exportCsv = useCallback(async () => {
    try {
      const blob = await leadTrackingService.downloadLeadListCsv({ ...params, sort, order });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Erro ao exportar os leads.');
    }
  }, [params, sort, order]);

  const columns: TableColumn<LeadRow>[] = [
    {
      key: 'name',
      label: 'Lead',
      render: (lead) => (
        <button type="button" className="text-left" onClick={() => setSelected(lead.id)}>
          <span className="font-medium text-primary hover:underline">{lead.name}</span>
          <span className="block text-xs text-muted-foreground">{lead.phone_number ?? 'Sem telefone'}</span>
        </button>
      ),
    },
    { key: 'entered_at', label: 'Entrada', sortable: true, render: (lead) => formatDate(lead.entered_at, true) },
    {
      key: 'campaign_name',
      label: 'Origem',
      render: (lead) => (
        <div className="max-w-[240px]">
          <span className="text-sm">{lead.campaign_name ?? lead.source}</span>
          <span className="block text-xs text-muted-foreground truncate">
            {[lead.source !== lead.campaign_name ? lead.source : null, lead.adset_name, lead.ad_name].filter(Boolean).join(' · ')}
          </span>
        </div>
      ),
    },
    {
      key: 'estimated_cost',
      label: 'Custo',
      sortable: true,
      align: 'right',
      render: (lead) => (
        <span title={lead.cost_basis ? `Estimado pelo ${COST_BASIS_LABELS[lead.cost_basis]}` : undefined}>
          {currencyOrDash(lead.estimated_cost)}
        </span>
      ),
    },
    { key: 'stage_name', label: 'Etapa', render: (lead) => lead.stage_name ?? DASH },
    {
      key: 'evaluation_at',
      label: 'Avaliação',
      render: (lead) =>
        lead.evaluation_at ? (
          <div>
            <span className="text-sm">{formatDate(lead.evaluation_at, !lead.evaluation_all_day)}</span>
            <span className="block text-xs text-muted-foreground">{statusLabel(lead.evaluation_status)}</span>
          </div>
        ) : (
          DASH
        ),
    },
    { key: 'outcome', label: 'Resultado', render: outcome },
    { key: 'revenue', label: 'Receita', sortable: true, align: 'right', render: (lead) => formatCurrency(lead.revenue) },
  ];

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Leads do período
          </CardTitle>
          <CardDescription>
            Cada lead com origem, custo estimado, etapa, avaliação e receita. Clique no nome para ver a jornada completa.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <BaseTable
          data={data?.leads ?? []}
          columns={columns}
          loading={loading && !data}
          sortBy={sort}
          sortOrder={order}
          onSort={onSort}
          getRowKey={(lead) => lead.id}
          emptyTitle="Nenhum lead no período"
          emptyDescription="Ajuste o período ou os filtros."
        />
        {data && data.meta.total_count > 0 && (
          <BasePagination
            currentPage={data.meta.page}
            totalPages={data.meta.total_pages}
            totalItems={data.meta.total_count}
            itemsPerPage={perPage}
            onPageChange={setPage}
            onItemsPerPageChange={(value) => {
              setPerPage(value);
              setPage(1);
            }}
            itemsPerPageOptions={[25, 50, 100, 200]}
          />
        )}
      </CardContent>
      <LeadJourneySheet contactId={selected} onClose={() => setSelected(null)} />
    </Card>
  );
};

export default LeadsTab;
