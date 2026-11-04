import { useCallback, useEffect, useState } from 'react';
import { Download, Search, Users } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '@evoapi/design-system';
import { toast } from 'sonner';
import { BaseTable, type TableColumn } from '@/components/base';
import BasePagination from '@/components/base/BasePagination';
import { leadTrackingService } from '@/services/dashboard/leadTrackingService';
import type { LeadListResponse, LeadListSort, LeadRow, LeadStep, LeadTrackingParams } from '@/types/leadTracking';
import { DASH, currencyOrDash, formatCurrency } from './format';
import { COST_BASIS_LABELS, formatDate, statusLabel } from './labels';
import LeadJourneySheet from './LeadJourneySheet';

interface LeadsTabProps {
  params: LeadTrackingParams;
  /** Appointments module: evaluation column and scheduled/attended steps. */
  appointments?: boolean;
}

const SORTABLE: LeadListSort[] = ['entered_at', 'estimated_cost', 'revenue'];

const STEPS: { key: LeadStep | 'all'; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'not_scheduled', label: 'Sem agendamento' },
  { key: 'scheduled', label: 'Agendaram' },
  { key: 'attended', label: 'Compareceram' },
  { key: 'won', label: 'Compraram' },
];

const outcome = (lead: LeadRow) => {
  if (lead.won) return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30" variant="outline">Venda</Badge>;
  if (lead.attended) return <Badge variant="outline">Compareceu</Badge>;
  if (lead.scheduled) return <Badge variant="outline">Agendou</Badge>;
  return <span className="text-muted-foreground text-xs">{DASH}</span>;
};

const LeadsTab = ({ params, appointments = true }: LeadsTabProps) => {
  const steps = appointments ? STEPS : STEPS.filter((s) => s.key === 'all' || s.key === 'won');
  const [data, setData] = useState<LeadListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [sort, setSort] = useState<LeadListSort>('entered_at');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [selected, setSelected] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [step, setStep] = useState<LeadStep | 'all'>('all');
  const paramsKey = JSON.stringify(params);
  const filters = { q: query || undefined, step: step === 'all' ? undefined : step };

  useEffect(() => {
    const timer = setTimeout(() => setQuery(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => setPage(1), [paramsKey, query, step]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    leadTrackingService
      .getLeadList({ ...params, ...filters, page, per_page: perPage, sort, order })
      .then((response) => !cancelled && setData(response))
      .catch(() => !cancelled && toast.error('Erro ao carregar a lista de leads.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // paramsKey stands for `params`, a new object on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey, query, step, page, perPage, sort, order]);

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
      const blob = await leadTrackingService.downloadLeadListCsv({ ...params, ...filters, sort, order });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Erro ao exportar os leads.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, query, step, sort, order]);

  const allColumns: TableColumn<LeadRow>[] = [
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
    {
      key: 'entered_at',
      label: 'Entrada',
      sortable: true,
      render: (lead) => <span className="whitespace-nowrap">{formatDate(lead.entered_at)}</span>,
    },
    {
      key: 'campaign_name',
      label: 'Origem',
      render: (lead) => (
        <div className="max-w-[220px]">
          <span className="block text-sm truncate" title={lead.campaign_name ?? lead.source}>
            {lead.campaign_name ?? lead.source}
          </span>
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
    {
      key: 'stage_name',
      label: 'Etapa',
      render: (lead) => (
        <span className="block max-w-[150px] truncate" title={lead.stage_name ?? undefined}>
          {lead.stage_name ?? DASH}
        </span>
      ),
    },
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
  const columns = appointments ? allColumns : allColumns.filter((c) => c.key !== 'evaluation_at');

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Leads do período
          </CardTitle>
          <CardDescription>
            Cada lead com origem, custo estimado, etapa{appointments ? ', avaliação' : ''} e receita. Clique no nome para ver
            a jornada completa.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center gap-2">
          <div className="relative md:w-80 shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar por nome, telefone ou campanha"
              className="pl-8 h-9"
              aria-label="Buscar leads"
            />
          </div>
          <div className="flex items-center gap-1 overflow-x-auto" role="tablist" aria-label="Situação no funil">
            {steps.map(({ key, label }) => {
              const count = data?.meta.step_counts?.[key];
              const active = step === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setStep(key)}
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-md px-2.5 h-8 text-xs font-medium border transition-colors ${
                    active
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  {label}
                  {count != null && <span className={active ? 'opacity-80' : 'opacity-60'}>{count}</span>}
                </button>
              );
            })}
          </div>
        </div>
        <BaseTable
          data={data?.leads ?? []}
          columns={columns}
          loading={loading && !data}
          sortBy={sort}
          sortOrder={order}
          onSort={onSort}
          getRowKey={(lead) => lead.id}
          emptyTitle={query || step !== 'all' ? 'Nenhum lead encontrado' : 'Nenhum lead no período'}
          emptyDescription={query || step !== 'all' ? 'Tente outro termo ou situação.' : 'Ajuste o período ou os filtros.'}
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
