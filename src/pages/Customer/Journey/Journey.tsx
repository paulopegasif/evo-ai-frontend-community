import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Route, Copy, Trash2, Edit3, GitBranch } from 'lucide-react';
import BaseHeader from '../../../components/base/BaseHeader';
import BaseTable, { TableColumn, TableAction } from '../../../components/base/BaseTable';
import ConfirmDialog from '../../../components/base/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { journeyService } from '../../../services';
import type { Journey } from '@/types/automation';
import type { Node, Edge } from '@xyflow/react';
import { validateJourney } from '@/utils/journeyFlowValidation';
import JourneyModal from '@/components/journey/JourneyModal';
import { toast } from 'sonner';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useLanguage } from '@/hooks/useLanguage';

export default function JourneyPage() {
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingJourney, setEditingJourney] = useState<Journey | null>(null);
  const [selectedJourneys, setSelectedJourneys] = useState<Journey[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [journeyToDelete, setJourneyToDelete] = useState<Journey | null>(null);

  const navigate = useNavigate();
  const { can, isReady: permissionsReady } = usePermissions();
  const { t } = useLanguage('journey');

  const fetchJourneys = async () => {
    if (!can('journeys', 'read')) {
      toast.error(t('messages.noPermissionRead'));
      return;
    }

    try {
      setLoading(true);
      const response = await journeyService.getJourneys();
      setJourneys(response.data || []);
    } catch (error) {
      console.error('Erro ao carregar jornadas:', error);
      toast.error(t('messages.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!permissionsReady) {
      return;
    }

    fetchJourneys();
  }, [permissionsReady]);

  const handleToggleJourney = async (journey: Journey) => {
    if (!journey.id) return;

    // EVO-1744: `toggleJourney` is a bodyless server-flip, so classify the
    // direction by the CURRENT `isActive` before calling. Only activation runs
    // validation; deactivation is always allowed. Errors block (hybrid D1);
    // warnings are surfaced but don't block.
    const isActivating = !journey.isActive;
    if (isActivating) {
      const result = validateJourney(
        (journey.flowData?.nodes ?? []) as unknown as Node[],
        (journey.flowData?.edges ?? []) as unknown as Edge[],
      );
      if (!result.isActivatable) {
        toast.error(
          t('messages.activationBlocked', {
            issues: result.errors
              .map((i) => t(i.messageKey, i.params))
              .join(' · '),
          }),
        );
        return;
      }
      if (result.warnings.length > 0) {
        toast.warning(
          t('messages.activationWarnings', {
            issues: result.warnings
              .map((i) => t(i.messageKey, i.params))
              .join(' · '),
          }),
        );
      }
    }

    try {
      await journeyService.toggleJourney(journey.id);
      await fetchJourneys();

      toast.success(
        journey.isActive ? t('messages.deactivateSuccess') : t('messages.activateSuccess'),
      );
    } catch (error) {
      console.error('Erro ao atualizar jornada:', error);
      toast.error(t('messages.toggleError'));
    }
  };

  const handleDeleteClick = (journey: Journey) => {
    if (!can('journeys', 'delete')) {
      toast.error(t('messages.noPermissionDelete'));
      return;
    }
    setJourneyToDelete(journey);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!journeyToDelete?.id) return;

    setDeleting(true);
    try {
      await journeyService.deleteJourney(journeyToDelete.id);
      await fetchJourneys();

      toast.success(t('messages.deleteSuccess'));
    } catch (error) {
      console.error('Erro ao excluir jornada:', error);
      toast.error(t('messages.deleteError'));
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setJourneyToDelete(null);
    }
  };

  const handleDuplicateJourney = async (journey: Journey) => {
    if (!journey.id) return;

    try {
      await journeyService.duplicateJourney(journey.id);
      await fetchJourneys();

      toast.success(t('messages.duplicateSuccess'));
    } catch (error) {
      console.error('Erro ao duplicar jornada:', error);
      toast.error(t('messages.duplicateError'));
    }
  };

  const handleCreateJourney = () => {
    if (!can('journeys', 'create')) {
      toast.error(t('messages.noPermissionCreate'));
      return;
    }
    setEditingJourney(null);
    setModalOpen(true);
  };

  const handleEditJourney = (journey: Journey) => {
    if (!can('journeys', 'update')) {
      toast.error(t('messages.noPermissionEdit'));
      return;
    }
    setEditingJourney(journey);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingJourney(null);
  };

  const handleJourneySaved = () => {
    handleModalClose();
    fetchJourneys();
  };

  const filteredJourneys = journeys.filter(
    journey =>
      journey.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      journey.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const columns: TableColumn<Journey>[] = [
    {
      key: 'name',
      label: t('table.columns.name'),
      sortable: true,
      render: journey => (
        <div>
          <div className="font-medium">{journey.name}</div>
          {journey.description && (
            <div className="mt-0.5 line-clamp-1 text-muted-foreground text-xs">{journey.description}</div>
          )}
        </div>
      ),
    },
    {
      key: 'triggers',
      label: t('table.columns.triggers'),
      render: journey => (
        <div className="flex items-center gap-1 flex-wrap">
          {journey.flowTriggers?.slice(0, 2).map((trigger: any) => (
            <Badge key={trigger.id} variant="outline">
              {trigger.type}
            </Badge>
          ))}
          {journey.flowTriggers && journey.flowTriggers.length > 2 && (
            <Badge variant="secondary">
              +{journey.flowTriggers.length - 2}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'isActive',
      label: t('table.columns.status'),
      render: journey => (
        <label className="flex cursor-pointer items-center gap-2">
          <Switch checked={journey.isActive} onCheckedChange={() => handleToggleJourney(journey)} />
          <span className="text-muted-foreground text-sm">
            {journey.isActive ? t('table.status.active') : t('table.status.inactive')}
          </span>
        </label>
      ),
    },
    {
      key: 'createdAt',
      label: t('table.columns.createdAt'),
      sortable: true,
      render: journey => (
        <span className="text-muted-foreground text-sm">
          {journey.createdAt
            ? new Date(journey.createdAt).toLocaleDateString('pt-BR')
            : t('table.invalidDate')}
        </span>
      ),
    },
  ];

  const handleOpenFlow = (journey: Journey) => {
    navigate(`/journey/${journey.id}/flow`);
  };

  const actions: TableAction<Journey>[] = [
    {
      label: t('actions.edit'),
      icon: <Edit3 />,
      onClick: handleEditJourney,
      show: () => permissionsReady && can('journeys', 'update'),
    },
    {
      label: t('actions.openFlow'),
      icon: <GitBranch />,
      onClick: handleOpenFlow,
      show: () => permissionsReady && can('journeys', 'update'),
    },
    {
      label: t('actions.duplicate'),
      icon: <Copy />,
      onClick: handleDuplicateJourney,
      show: () => permissionsReady && can('journeys', 'create'),
    },
    {
      label: t('actions.delete'),
      icon: <Trash2 />,
      onClick: handleDeleteClick,
      variant: 'destructive',
      show: () => permissionsReady && can('journeys', 'delete'),
    },
  ];

  return (
    <div className="flex h-full flex-col gap-6 p-4 md:p-6">
      <BaseHeader
        title={t('title')}
        subtitle={t('subtitle')}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t('header.searchPlaceholder')}
        primaryAction={permissionsReady && can('journeys', 'create') ? {
          label: t('header.newJourney'),
          icon: <Plus />,
          onClick: handleCreateJourney,
        } : undefined}
        selectedCount={selectedJourneys.length}
        onClearSelection={() => setSelectedJourneys([])}
        totalCount={journeys.length}
      />

      <div>
        <BaseTable
          data={filteredJourneys}
          columns={columns}
          actions={actions}
          loading={loading}
          getRowKey={journey => journey.id?.toString() || ''}
          emptyMessage={t('empty.notFound')}
          emptyTitle={t('empty.title')}
          emptyDescription={t('empty.description')}
          emptyAction={permissionsReady && can('journeys', 'create') ? {
            label: t('actions.createJourney'),
            onClick: handleCreateJourney,
          } : undefined}
          emptyIcon={Route}
          selectable
          selectedItems={selectedJourneys}
          onSelectionChange={setSelectedJourneys}
        />
      </div>

      <JourneyModal
        open={modalOpen}
        onClose={handleModalClose}
        journey={editingJourney}
        onSave={handleJourneySaved}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('dialog.delete.title')}
        description={t('dialog.delete.description', { name: journeyToDelete?.name })}
        cancelLabel={t('dialog.delete.cancel')}
        confirmLabel={t('dialog.delete.confirm')}
        onConfirm={handleDeleteConfirm}
        loading={deleting}
      />
    </div>
  );
}
