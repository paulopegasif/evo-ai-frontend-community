import { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';
import { Monitor } from 'lucide-react';
import EmptyState from '@/components/base/EmptyState';
import ListSkeleton from '@/components/base/ListSkeleton';
import ConfirmDialog from '@/components/base/ConfirmDialog';

import { integrationsService } from '@/services/integrations';
import { DashboardApp } from '@/types/integrations';
import type { PaginationMeta } from '@/types/core';
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination';

import DashboardAppsHeader from './DashboardAppsHeader';
import DashboardAppsTable from './DashboardAppsTable';
import DashboardAppsPagination from './DashboardAppsPagination';
import DashboardAppModal from './DashboardAppModal';

interface DashboardAppsState {
  apps: DashboardApp[];
  selectedAppIds: string[];
  meta: {
    pagination: PaginationMeta;
  };
  loading: {
    list: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
    bulk: boolean;
  };
  searchQuery: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

const INITIAL_STATE: DashboardAppsState = {
  apps: [],
  selectedAppIds: [],
  meta: {
    pagination: {
      page: 1,
      page_size: 20,
      total: 0,
      total_pages: 0,
      has_next_page: false,
      has_previous_page: false,
    },
  },
  loading: {
    list: false,
    create: false,
    update: false,
    delete: false,
    bulk: false,
  },
  searchQuery: '',
  sortBy: 'created_at',
  sortOrder: 'desc',
};

interface DashboardAppsListParams {
  page?: number;
  per_page?: number;
  q?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

interface DashboardAppsListProps {
  onBack?: () => void;
}

export default function DashboardAppsList({ onBack }: DashboardAppsListProps = {}) {
  const { t } = useLanguage('integrations');
  const [state, setState] = useState<DashboardAppsState>(INITIAL_STATE);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [appToDelete, setAppToDelete] = useState<DashboardApp | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [appModalOpen, setAppModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<DashboardApp | null>(null);
  const hasLoaded = useRef(false);

  // Load dashboard apps
  const loadDashboardApps = useCallback(async (params?: Partial<DashboardAppsListParams>) => {
    setState(prev => ({ ...prev, loading: { ...prev.loading, list: true } }));

    try {
      const response = await integrationsService.getDashboardApps();

      // Use pagination from response if available, otherwise paginate client-side
      const allApps = response.data || [];
      const pagination = response.meta.pagination;
      // If pagination is available from API, use it directly
      if (pagination) {
        setState(prev => ({
          ...prev,
          apps: allApps,
          meta: {
            pagination: pagination,
          },
          loading: { ...prev.loading, list: false },
        }));
      } else {
        // Fallback: client-side pagination if API doesn't provide it
        const searchQuery = params?.q?.toLowerCase() || '';
        const filteredApps = searchQuery
          ? allApps.filter(
              app =>
                app.title?.toLowerCase().includes(searchQuery) ||
                (
                  (Array.isArray(app.content)
                    ? app.content[0]?.url
                    : (app.content as { url?: string })?.url) || ''
                )
                  .toLowerCase()
                  .includes(searchQuery),
            )
          : allApps;

        const currentPage = params?.page || 1;
        const perPage = params?.per_page || DEFAULT_PAGE_SIZE;
        const totalCount = filteredApps.length;
        const totalPages = Math.ceil(totalCount / perPage);
        const startIndex = (currentPage - 1) * perPage;
        const endIndex = startIndex + perPage;
        const paginatedApps = filteredApps.slice(startIndex, endIndex);

        setState(prev => ({
          ...prev,
          apps: paginatedApps,
          meta: {
            pagination: {
              page: currentPage,
              page_size: perPage,
              total: totalCount,
              total_pages: totalPages,
              has_next_page: currentPage < totalPages,
              has_previous_page: currentPage > 1,
            },
          },
          loading: { ...prev.loading, list: false },
        }));
      }
    } catch (error) {
      console.error('Error loading dashboard apps:', error);
      toast.error(t('dashboardApps.messages.loadError'));
      setState(prev => ({ ...prev, loading: { ...prev.loading, list: false } }));
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (!hasLoaded.current) {
      hasLoaded.current = true;
      loadDashboardApps();
    }
  }, [loadDashboardApps]);

  // Handlers
  const handleSearchChange = (query: string) => {
    setState(prev => ({
      ...prev,
      searchQuery: query,
      meta: {
        ...prev.meta,
        pagination: { ...prev.meta.pagination, page: 1 },
      },
    }));

    // Reload with new search
    loadDashboardApps({ page: 1, q: query || undefined });
  };

  const handlePageChange = (page: number) => {
    setState(prev => ({
      ...prev,
      meta: {
        ...prev.meta,
        pagination: { ...prev.meta.pagination, page },
      },
    }));

    loadDashboardApps({ page, q: state.searchQuery || undefined });
  };

  const handlePerPageChange = (perPage: number) => {
    setState(prev => ({
      ...prev,
      meta: {
        ...prev.meta,
        pagination: { ...prev.meta.pagination, page_size: perPage, page: 1 },
      },
    }));

    loadDashboardApps({ page: 1, per_page: perPage, q: state.searchQuery || undefined });
  };

  // Dashboard app actions
  const handleCreateApp = () => {
    setEditingApp(null);
    setAppModalOpen(true);
  };

  const handleEditApp = (app: DashboardApp) => {
    setEditingApp(app);
    setAppModalOpen(true);
  };

  const handleDeleteApp = (app: DashboardApp) => {
    setAppToDelete(app);
    setDeleteDialogOpen(true);
  };

  // Bulk actions
  const handleBulkDelete = () => {
    setBulkDeleteDialogOpen(true);
  };

  // Confirm delete single app
  const confirmDeleteApp = async () => {
    if (!appToDelete) return;

    setState(prev => ({ ...prev, loading: { ...prev.loading, delete: true } }));

    try {
      await integrationsService.deleteDashboardApp(appToDelete.id);
      toast.success(t('dashboardApps.messages.deleteSuccess'));

      // Refresh the list
      loadDashboardApps({
        page: state.meta.pagination.page,
        q: state.searchQuery || undefined,
      });

      setDeleteDialogOpen(false);
      setAppToDelete(null);
    } catch (error) {
      console.error('Error deleting dashboard app:', error);
      toast.error(t('dashboardApps.messages.deleteError'));
    } finally {
      setState(prev => ({ ...prev, loading: { ...prev.loading, delete: false } }));
    }
  };

  // Confirm bulk delete
  const confirmBulkDelete = async () => {
    if (state.selectedAppIds.length === 0) return;

    setState(prev => ({ ...prev, loading: { ...prev.loading, bulk: true } }));

    try {
      // Delete each app individually (no bulk endpoint available)
      await Promise.all(state.selectedAppIds.map(id => integrationsService.deleteDashboardApp(id)));
      toast.success(
        t('dashboardApps.messages.bulkDeleteSuccess', { count: state.selectedAppIds.length }),
      );

      // Clear selection and refresh
      setState(prev => ({ ...prev, selectedAppIds: [] }));
      loadDashboardApps({
        page: state.meta.pagination.page,
        q: state.searchQuery || undefined,
      });

      setBulkDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error bulk deleting dashboard apps:', error);
      toast.error(t('dashboardApps.messages.bulkDeleteError'));
    } finally {
      setState(prev => ({ ...prev, loading: { ...prev.loading, bulk: false } }));
    }
  };

  // Handle app form submission
  const handleAppFormSubmit = async (data: any) => {
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, [editingApp ? 'update' : 'create']: true },
    }));

    try {
      if (editingApp) {
        // Update existing app
        await integrationsService.updateDashboardApp(editingApp.id, data as unknown as any);
        toast.success(t('dashboardApps.messages.updateSuccess'));
      } else {
        // Create new app
        await integrationsService.createDashboardApp(data as unknown as any);
        toast.success(t('dashboardApps.messages.createSuccess'));
      }

      // Refresh the entire list
      loadDashboardApps({
        page: state.meta.pagination.page,
        q: state.searchQuery || undefined,
      });

      // Close modal and clear editing state
      setAppModalOpen(false);
      setEditingApp(null);
    } catch (error) {
      console.error('Error saving dashboard app:', error);
      toast.error(
        editingApp
          ? t('dashboardApps.messages.updateError')
          : t('dashboardApps.messages.createError'),
      );
    } finally {
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, create: false, update: false },
      }));
    }
  };

  // Handle modal close
  const handleAppModalClose = (open: boolean) => {
    if (!open) {
      setAppModalOpen(false);
      setEditingApp(null);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-none p-4 pb-0 md:px-6 md:pt-6">
        <DashboardAppsHeader
          totalCount={state.meta.pagination.total}
          selectedCount={state.selectedAppIds.length}
          searchValue={state.searchQuery}
          onSearchChange={handleSearchChange}
          onNewApp={handleCreateApp}
          onBulkDelete={handleBulkDelete}
          onClearSelection={() => setState(prev => ({ ...prev, selectedAppIds: [] }))}
          onBack={onBack}
        />
      </div>

      {/* Content */}
      <div className="mt-5 flex-1 overflow-auto px-4 pb-4 md:px-6">
        {state.loading.list ? (
          <ListSkeleton />
        ) : state.apps.length === 0 ? (
          <EmptyState
            icon={Monitor}
            title={t('dashboardApps.notConfigured')}
            description={t('dashboardApps.notConfiguredDescription')}
            action={{
              label: t('dashboardApps.newApp'),
              onClick: handleCreateApp,
            }}
            className="h-full"
          />
        ) : (
          <DashboardAppsTable
            apps={state.apps}
            selectedApps={state.apps.filter(app => state.selectedAppIds.includes(app.id))}
            loading={state.loading.list}
            onSelectionChange={apps =>
              setState(prev => ({
                ...prev,
                selectedAppIds: apps.map(a => a.id),
              }))
            }
            onEditApp={handleEditApp}
            onDeleteApp={handleDeleteApp}
            onCreateApp={handleCreateApp}
            sortBy={state.sortBy}
            sortOrder={state.sortOrder}
            onSort={column => {
              const newOrder =
                state.sortBy === column && state.sortOrder === 'asc' ? 'desc' : 'asc';
              setState(prev => ({ ...prev, sortBy: column, sortOrder: newOrder }));
              loadDashboardApps({
                sort: column,
                order: newOrder,
                q: state.searchQuery || undefined,
              });
            }}
          />
        )}
      </div>

      {/* Fixed Pagination at Bottom */}
      {state.meta.pagination.total > 0 && (
        <div className="flex-none border-t bg-background px-4 py-3 md:px-6">
          <DashboardAppsPagination
            currentPage={state.meta.pagination.page}
            totalPages={state.meta.pagination.total_pages}
            totalCount={state.meta.pagination.total}
            perPage={state.meta.pagination.page_size}
            onPageChange={handlePageChange}
            onPerPageChange={handlePerPageChange}
            loading={state.loading.list}
          />
        </div>
      )}

      {/* Delete App Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('dashboardApps.deleteDialog.title')}
        description={t('dashboardApps.deleteDialog.description', { title: appToDelete?.title })}
        cancelLabel={t('dashboardApps.deleteDialog.cancel')}
        confirmLabel={t('dashboardApps.deleteDialog.delete')}
        onConfirm={confirmDeleteApp}
        loading={state.loading.delete}
      />

      {/* Bulk Delete Dialog */}
      <ConfirmDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        title={t('dashboardApps.bulkDeleteDialog.title')}
        description={t('dashboardApps.bulkDeleteDialog.description', { count: state.selectedAppIds.length, })}
        cancelLabel={t('dashboardApps.bulkDeleteDialog.cancel')}
        confirmLabel={t('dashboardApps.bulkDeleteDialog.deleteAll')}
        onConfirm={confirmBulkDelete}
        loading={state.loading.bulk}
      />

      {/* Dashboard App Modal */}
      <DashboardAppModal
        app={editingApp || undefined}
        open={appModalOpen}
        onOpenChange={handleAppModalClose}
        isNew={!editingApp}
        loading={state.loading.create || state.loading.update}
        onSubmit={handleAppFormSubmit}
      />
    </div>
  );
}
