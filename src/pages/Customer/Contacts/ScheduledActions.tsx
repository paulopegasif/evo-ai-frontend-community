import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { ScheduledActionsTour } from '@/tours';
import { useLanguage } from '@/hooks/useLanguage';
import { usePermissions } from '@/contexts/PermissionsContext';
import { scheduledActionsService } from '@/services/scheduledActions/scheduledActionsService';
import { ScheduledAction } from '@/types/automation';
import { ScheduleActionModal } from '@/components/scheduledActions/ScheduleActionModal';
import ScheduledActionsHeader from '@/components/scheduledActions/ScheduledActionsHeader';
import ScheduledActionsTable from '@/components/scheduledActions/ScheduledActionsTable';
import EmptyState from '@/components/base/EmptyState';
import { ConfirmDialog } from '@/components/base';
import { CalendarClock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ScheduledActionsState {
  actions: ScheduledAction[];
  selectedActionIds: string[];
  meta: {
    count: number;
    total_count: number;
    current_page: number;
    per_page: number;
    total_pages: number;
  };
  loading: {
    list: boolean;
  };
  searchQuery: string;
  statusFilter: string | null;
}

const INITIAL_STATE: ScheduledActionsState = {
  actions: [],
  selectedActionIds: [],
  meta: {
    count: 0,
    total_count: 0,
    current_page: 1,
    per_page: 20,
    total_pages: 0,
  },
  loading: {
    list: false,
  },
  searchQuery: '',
  statusFilter: null,
};

export default function ScheduledActions() {
  const { t } = useLanguage('contacts');
  const navigate = useNavigate();
  const { can, isReady: permissionsReady } = usePermissions();
  const [state, setState] = useState<ScheduledActionsState>(INITIAL_STATE);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<ScheduledAction | null>(null);
  const [, setUpdateTrigger] = useState(0); // Force re-render for countdown updates
  const hasLoaded = useRef(false);

  // Load scheduled actions
  const loadActions = useCallback(
    async (params?: { page?: number; per_page?: number; status?: string; search?: string }) => {

      setState(prev => ({ ...prev, loading: { ...prev.loading, list: true } }));

      try {
        const queryParams: Record<string, any> = {
          page: params?.page || state.meta.current_page,
          per_page: params?.per_page || state.meta.per_page,
        };

        if (params?.status || state.statusFilter) {
          queryParams.status = params?.status || state.statusFilter;
        }

        if (params?.search || state.searchQuery) {
          queryParams.search = params?.search || state.searchQuery;
        }

        const response = await scheduledActionsService.list(queryParams);
        
        // API returns an array of ScheduledAction[]
        const actionsArray = Array.isArray(response) ? response : [];
        
        setState(prev => ({
          ...prev,
          actions: actionsArray,
          meta: {
            ...prev.meta,
            current_page: params?.page || prev.meta.current_page,
            per_page: params?.per_page || prev.meta.per_page,
            total_count: actionsArray.length,
            count: actionsArray.length,
            total_pages: Math.ceil(actionsArray.length / (params?.per_page || prev.meta.per_page)),
          },
          loading: { ...prev.loading, list: false },
        }));
      } catch (error: any) {
        console.error('Error loading scheduled actions:', error);
        toast.error(error.response?.data?.error || t('scheduledActions.errors.loadFailed'));
        setState(prev => ({ ...prev, loading: { ...prev.loading, list: false } }));
      }
    },
    [state.meta.current_page, state.meta.per_page, state.statusFilter, state.searchQuery, t],
  );

  // Initial load
  useEffect(() => {
    if (!permissionsReady) return;

    if (!hasLoaded.current) {
      if (!can('contacts', 'read')) {
        toast.error('Você não tem permissão para visualizar ações agendadas');
        return;
      }
      hasLoaded.current = true;
      loadActions();
    }
  }, [permissionsReady, can, loadActions]);

  // Set up interval to update countdown every second
  useEffect(() => {
    const hasScheduledActions = state.actions.some(
      action => action.status === 'scheduled' && !action.overdue
    );

    if (!hasScheduledActions) return;

    const interval = setInterval(() => {
      setUpdateTrigger(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [state.actions]);

  // Handlers
  const handleSearchChange = (query: string) => {
    setState(prev => ({
      ...prev,
      searchQuery: query,
      meta: { ...prev.meta, current_page: 1 },
    }));

    // Debounce search
    const timeoutId = setTimeout(() => {
      loadActions({ page: 1, search: query.trim() || undefined });
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  const handleCreate = () => {
    setEditingAction(null);
    setModalOpen(true);
  };

  const handleEdit = (action: ScheduledAction) => {
    setEditingAction(action);
    setModalOpen(true);
  };

  // Cancelling is irreversible: both single and bulk cancel go through a confirmation.
  const [cancelTarget, setCancelTarget] = useState<string | 'bulk' | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      if (cancelTarget === 'bulk') await performBulkCancel();
      else await performCancel(cancelTarget);
    } finally {
      setCancelling(false);
      setCancelTarget(null);
    }
  };

  const handleCancel = (actionId: string) => setCancelTarget(actionId);

  const performCancel = async (actionId: string) => {
    try {
      await scheduledActionsService.cancel(actionId);
      toast.success(t('scheduledActions.messages.cancelled'));
      await loadActions();
      setState(prev => ({
        ...prev,
        selectedActionIds: prev.selectedActionIds.filter(id => id !== actionId),
      }));
    } catch (error: any) {
      console.error('Error cancelling action:', error);
      toast.error(error.response?.data?.error || t('scheduledActions.errors.cancelFailed'));
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingAction(null);
    loadActions();
  };

  const handleSelectionChange = (actions: ScheduledAction[]) => {
    setState(prev => ({
      ...prev,
      selectedActionIds: actions.map(a => a.id),
    }));
  };

  const handleClearSelection = () => {
    setState(prev => ({
      ...prev,
      selectedActionIds: [],
    }));
  };

  const handleBulkCancel = () => {
    if (state.selectedActionIds.length === 0) return;
    setCancelTarget('bulk');
  };

  const performBulkCancel = async () => {
    if (state.selectedActionIds.length === 0) return;

    try {
      await Promise.all(
        state.selectedActionIds.map(id => scheduledActionsService.cancel(id))
      );
      toast.success(t('scheduledActions.messages.bulkCancelled', { count: state.selectedActionIds.length }));
      await loadActions();
      handleClearSelection();
    } catch (error: any) {
      console.error('Error cancelling actions:', error);
      toast.error(error.response?.data?.error || t('scheduledActions.errors.bulkCancelFailed'));
    }
  };

  const handleContactClick = (contactId: string) => {
    navigate(`/contacts/${contactId}`);
  };

  const getFilteredActions = () => {
    return state.actions;
  };

  const filteredActions = getFilteredActions();

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:gap-6 md:p-6" data-tour="scheduled-actions-page">
      <ScheduledActionsTour />
      <div data-tour="scheduled-actions-header">
        <ScheduledActionsHeader
          totalCount={state.meta.total_count}
          selectedCount={state.selectedActionIds.length}
          searchValue={state.searchQuery}
          onSearchChange={handleSearchChange}
          onNewAction={handleCreate}
          onBulkCancel={handleBulkCancel}
          onClearSelection={handleClearSelection}
        />
      </div>

      <div data-tour="scheduled-actions-content" className="min-h-0 flex-1">
        {!state.loading.list && filteredActions.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title={t('scheduledActions.empty')}
            description={t('scheduledActions.emptyDescription')}
            action={
              can('contacts', 'create')
                ? {
                    label: t('scheduledActions.newAction'),
                    onClick: handleCreate,
                  }
                : undefined
            }
          />
        ) : (
          <>
            {/* BaseTable renders skeleton rows while the first page loads. */}
            <ScheduledActionsTable
              actions={filteredActions}
              selectedActions={state.actions.filter(a => state.selectedActionIds.includes(a.id))}
              loading={state.loading.list}
              onSelectionChange={handleSelectionChange}
              onEdit={handleEdit}
              onCancel={handleCancel}
              onContactClick={handleContactClick}
            />

            {state.meta.total_pages > 1 && (
              <p className="mt-4 text-center text-muted-foreground text-sm tabular-nums">
                {t('scheduledActions.pagination', {
                  page: state.meta.current_page,
                  totalPages: state.meta.total_pages,
                  total: state.meta.total_count,
                })}
              </p>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={cancelTarget !== null}
        onOpenChange={open => !open && !cancelling && setCancelTarget(null)}
        title={
          cancelTarget === 'bulk'
            ? t('scheduledActions.cancelConfirm.titleBulk', { count: state.selectedActionIds.length })
            : t('scheduledActions.cancelConfirm.title')
        }
        description={t('scheduledActions.cancelConfirm.description')}
        cancelLabel={t('scheduledActions.cancelConfirm.keep')}
        confirmLabel={t('scheduledActions.cancelConfirm.confirm')}
        onConfirm={confirmCancel}
        loading={cancelling}
        variant="destructive"
      />

      {modalOpen && (
        <ScheduleActionModal
          open={modalOpen}
          onClose={handleModalClose}
          contactId={editingAction?.contact_id}
          action={editingAction}
        />
      )}
    </div>
  );
}
