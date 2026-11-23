import { useLanguage } from '@/hooks/useLanguage';
import {
  Eye,
  Edit,
  Trash2,
  CopyPlus,
  Copy,
  Power,
  Star,
  Lock,
  CheckCircle2,
  GitBranch,
} from '@/components/icons';
import { toast } from 'sonner';
import { Pipeline } from '@/types/analytics';
import { BaseTable, TableColumn, TableAction } from '@/components/base';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/contexts/PermissionsContext';

interface PipelinesTableProps {
  pipelines: Pipeline[];
  loading: boolean;
  onView: (pipeline: Pipeline) => void;
  onEdit: (pipeline: Pipeline) => void;
  onDelete: (pipeline: Pipeline) => void;
  onDuplicate: (pipeline: Pipeline) => void;
  onToggleStatus: (pipeline: Pipeline) => void;
  onSetAsDefault: (pipeline: Pipeline) => void;
  onCreate?: () => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (column: string) => void;
}

const TYPE_LABEL_KEY: Record<Pipeline['pipeline_type'], string> = {
  sales: 'pipelinesTable.types.sales',
  support: 'pipelinesTable.types.support',
  marketing: 'pipelinesTable.types.marketing',
  custom: 'pipelinesTable.types.custom',
};

// "Ganhos" = leads that reached a stage explicitly typed as completed
// (stage_type === 'completed'). NO last-stage fallback — the last stage may be a
// "cancelled/lost" stage, so only real completed stages count. Returns both the
// lead count and the summed value of those stages.
function wonSummary(pipeline: Pipeline): { count: number; value: number } {
  const completed = (pipeline.stages || []).filter(
    s => (s.stage_type || '').toLowerCase() === 'completed',
  );
  return completed.reduce(
    (acc, s) => ({
      count: acc.count + (s.item_count ?? s.items?.length ?? 0),
      value: acc.value + (s.total_value ?? 0),
    }),
    { count: 0, value: 0 },
  );
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    value,
  );

export default function PipelinesTable({
  pipelines,
  loading,
  onView,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleStatus,
  onSetAsDefault,
  onCreate,
  sortBy,
  sortOrder,
  onSort,
}: PipelinesTableProps) {
  const { t } = useLanguage('pipelines');
  const { can, isReady } = usePermissions();

  const columns: TableColumn<Pipeline>[] = [
    {
      key: 'name',
      label: t('pipelinesTable.columns.name'),
      sortable: true,
      render: pipeline => (
        <button
          type="button"
          className="-mx-1 flex min-w-0 items-center gap-3 rounded-lg px-1 py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => onView(pipeline)}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
            <GitBranch className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-1.5">
              {pipeline.visibility === 'private' && (
                <Lock className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              )}
              <span className="truncate font-medium text-foreground hover:underline">{pipeline.name}</span>
              {pipeline.is_default && (
                <Badge variant="warning">
                  <Star className="fill-current" />
                  {t('pipelinesTable.default')}
                </Badge>
              )}
            </span>
            {pipeline.description && (
              <span className="mt-0.5 block max-w-md truncate text-muted-foreground text-xs">{pipeline.description}</span>
            )}
          </span>
        </button>
      ),
    },
    {
      key: 'won',
      label: t('pipelinesTable.columns.won'),
      align: 'center',
      render: pipeline => {
        const won = wonSummary(pipeline);
        return (
          <div className="flex flex-col items-center leading-tight">
            <span className="flex items-center gap-1.5 font-medium text-foreground tabular-nums">
              <CheckCircle2 className="size-3.5 text-success-foreground" />
              {won.count}
            </span>
            {won.value > 0 && (
              <span className="text-muted-foreground text-xs tabular-nums">R$ {formatCurrency(won.value)}</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'items',
      label: t('pipelinesTable.columns.items'),
      align: 'center',
      render: pipeline => <span className="font-medium tabular-nums">{pipeline.item_count || 0}</span>,
    },
    {
      key: 'stages',
      label: t('pipelinesTable.columns.stages'),
      align: 'center',
      className: 'hidden md:table-cell',
      render: pipeline => <span className="tabular-nums">{pipeline.stages?.length ?? 0}</span>,
    },
    {
      key: 'value',
      label: t('pipelinesTable.columns.totalValue'),
      align: 'right',
      render: pipeline => {
        const total = pipeline.services_info?.total_value || 0;
        return (
          <span className={cn('whitespace-nowrap font-medium tabular-nums', total > 0 ? 'text-foreground' : 'text-muted-foreground')}>
            R$ {formatCurrency(total)}
          </span>
        );
      },
    },
    {
      key: 'type',
      label: t('pipelinesTable.columns.type'),
      className: 'hidden lg:table-cell',
      render: pipeline => <Badge variant="outline">{t(TYPE_LABEL_KEY[pipeline.pipeline_type])}</Badge>,
    },
    {
      key: 'status',
      label: t('pipelinesTable.columns.status'),
      render: pipeline => (
        <Badge variant={pipeline.is_active ? 'success' : 'secondary'}>
          {pipeline.is_active ? t('pipelinesTable.status.active') : t('pipelinesTable.status.inactive')}
        </Badge>
      ),
    },
  ];

  // Write actions are RBAC-gated (EVO-2030/EVO-2033): only rendered when the
  // matching pipelines permission is granted. View/Copy ID stay ungated.
  const canUpdate = isReady && can('pipelines', 'update');
  const canCreate = isReady && can('pipelines', 'create');
  const canDelete = isReady && can('pipelines', 'delete');

  const actions: TableAction<Pipeline>[] = [
    { label: t('pipelinesTable.actions.view'), icon: <Eye />, onClick: onView },
    {
      label: t('pipelinesTable.actions.edit'),
      icon: <Edit />,
      onClick: onEdit,
      show: () => canUpdate,
    },
    {
      label: t('pipelinesTable.actions.duplicate'),
      icon: <CopyPlus />,
      onClick: onDuplicate,
      show: () => canCreate,
    },
    {
      label: t('pipelinesTable.actions.copyId'),
      icon: <Copy />,
      onClick: async pipeline => {
        await navigator.clipboard.writeText(String(pipeline.id));
        toast.success(t('pipelinesTable.actions.idCopied'));
      },
    },
    {
      label: t('pipelinesTable.actions.setAsDefault'),
      icon: <Star />,
      onClick: onSetAsDefault,
      show: pipeline => canUpdate && !pipeline.is_default,
    },
    {
      label: t('pipelinesTable.actions.deactivate'),
      icon: <Power />,
      onClick: onToggleStatus,
      show: pipeline => canUpdate && pipeline.is_active,
    },
    {
      label: t('pipelinesTable.actions.activate'),
      icon: <Power />,
      onClick: onToggleStatus,
      show: pipeline => canUpdate && !pipeline.is_active,
    },
    {
      label: t('pipelinesTable.actions.delete'),
      icon: <Trash2 />,
      onClick: onDelete,
      variant: 'destructive',
      show: () => canDelete,
    },
  ];

  return (
    <BaseTable<Pipeline>
      data={pipelines}
      columns={columns}
      actions={actions}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={onSort}
      loading={loading}
      emptyMessage={t('empty.noPipelines')}
      emptyIcon={GitBranch}
      emptyTitle={t('empty.noPipelines')}
      emptyDescription={t('empty.noPipelinesDescription')}
      emptyAction={onCreate ? { label: t('empty.createPipeline'), onClick: onCreate } : undefined}
      getRowKey={pipeline => String(pipeline.id)}
    />
  );
}
