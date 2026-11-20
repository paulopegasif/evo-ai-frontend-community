import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import { usePermissions } from '@/contexts/PermissionsContext';
import { Server } from 'lucide-react';
import {
  ResourceGridSkeleton,
  ResourceViewToggle,
  type ResourceView,
} from '@/components/agents/resourceCard';
import ListSkeleton from '@/components/base/ListSkeleton';
import EmptyState from '@/components/base/EmptyState';
import { MCPServer, MCPServersState, MCPServersListParams } from '@/types/ai';
import { MCPServerCard } from '@/components/mcpServers';

import MCPServersHeader from '@/components/mcpServers/MCPServersHeader';
import MCPServersTable from '@/components/mcpServers/MCPServersTable';
import MCPServersPagination from '@/components/mcpServers/MCPServersPagination';
import MCPServerDetails from '@/components/mcpServers/MCPServerDetails';
import { listMCPServers } from '@/services/agents/mcpServerService';
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination';

const INITIAL_STATE: MCPServersState = {
  servers: [],
  selectedServerIds: [],
  meta: {
    pagination: {
      page: 1,
      page_size: 20,
      total: 0,
      total_pages: 0,
    },
  },
  loading: {
    list: false,
    create: false,
    update: false,
    delete: false,
  },
  filters: [],
  searchQuery: '',
};

export default function MCPServers() {
  const { t } = useLanguage('customerMcpServers');
  const { can, isReady: permissionsReady } = usePermissions();
  const [state, setState] = useState<MCPServersState>(INITIAL_STATE);
  const [viewMode, setViewMode] = useState<ResourceView>('cards');
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsServer, setDetailsServer] = useState<MCPServer | null>(null);
  const hasLoaded = useRef(false);

  // Load servers
  const loadServers = useCallback(
    async (params?: Partial<MCPServersListParams>) => {
      if (!can('ai_mcp_servers', 'read')) {
        toast.error(t('errors.permissionDenied'));
        return;
      }
      setState(prev => ({ ...prev, loading: { ...prev.loading, list: true } }));

      try {
        const requestParams: MCPServersListParams = {
          skip: 0,
          limit: DEFAULT_PAGE_SIZE,
          ...params,
        };

        const response = await listMCPServers(requestParams);

        setState(prev => ({
          ...prev,
          servers: response,
          meta: {
            pagination: {
              page:
                Math.floor((requestParams.skip || 0) / (requestParams.limit || DEFAULT_PAGE_SIZE)) +
                1,
              page_size: requestParams.limit || DEFAULT_PAGE_SIZE,
              total: response.length,
              total_pages: Math.ceil(response.length / (requestParams.limit || DEFAULT_PAGE_SIZE)),
            },
          },
          loading: { ...prev.loading, list: false },
        }));
      } catch (error) {
        console.error('Error loading MCP servers:', error);
        toast.error(t('errors.loadError'));
        setState(prev => ({ ...prev, loading: { ...prev.loading, list: false } }));
      }
    },
    [can, t],
  );

  // Initial load
  useEffect(() => {
    if (!permissionsReady) {
      return;
    }

    if (!hasLoaded.current) {
      hasLoaded.current = true;
      loadServers();
    }
  }, [permissionsReady, loadServers]);

  // Handlers
  const handleSearchChange = (query: string) => {
    setState(prev => ({
      ...prev,
      searchQuery: query,
      meta: { ...prev.meta, pagination: { ...prev.meta.pagination, page: 1 } },
    }));

    loadServers({ skip: 0, search: query });
  };

  const handleServerClick = (server: MCPServer) => {
    setDetailsServer(server);
    setDetailsModalOpen(true);
  };

  const handlePageChange = (page: number) => {
    const skip = (page - 1) * state.meta.pagination.page_size;
    setState(prev => ({
      ...prev,
      meta: { ...prev.meta, pagination: { ...prev.meta.pagination, page } },
    }));
    loadServers({ skip });
  };

  const handlePageSizeChange = (pageSize: number) => {
    setState(prev => ({
      ...prev,
      meta: { ...prev.meta, pagination: { ...prev.meta.pagination, page_size: pageSize, page: 1 } },
    }));
    loadServers({ skip: 0, limit: pageSize });
  };

  const selectedServers = state.servers.filter(server =>
    state.selectedServerIds.includes(server.id),
  );

  return (
    <div className="flex h-full flex-col p-4 md:p-6">
      {/* Header */}
      <MCPServersHeader
        totalCount={state.meta.pagination.total}
        selectedCount={state.selectedServerIds.length}
        searchValue={state.searchQuery}
        onSearchChange={handleSearchChange}
        onClearSelection={() => setState(prev => ({ ...prev, selectedServerIds: [] }))}
      />

      <div className="mb-3 flex items-center justify-end">
        <ResourceViewToggle value={viewMode} onChange={setViewMode} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {state.loading.list ? (
          viewMode === 'cards' ? (
            <ResourceGridSkeleton />
          ) : (
            <ListSkeleton rows={6} />
          )
        ) : state.servers.length === 0 ? (
          <EmptyState
            icon={Server}
            title={t('emptyState.title')}
            description={t('emptyState.description')}
          />
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {state.servers.map(server => (
              <MCPServerCard
                key={server.id}
                server={server}
                onClick={() => handleServerClick(server)}
              />
            ))}
          </div>
        ) : (
          <MCPServersTable
            servers={state.servers}
            selectedServers={selectedServers}
            loading={state.loading.list}
            onSelectionChange={servers =>
              setState(prev => ({
                ...prev,
                selectedServerIds: servers.map(s => s.id),
              }))
            }
            onServerClick={handleServerClick}
          />
        )}
      </div>

      {/* Pagination */}
      {state.servers.length > 0 && (
        <MCPServersPagination
          currentPage={state.meta.pagination.page}
          totalPages={state.meta.pagination.total_pages}
          totalCount={state.meta.pagination.total}
          perPage={state.meta.pagination.page_size}
          onPageChange={handlePageChange}
          onPerPageChange={handlePageSizeChange}
        />
      )}

      {/* Server Details Modal */}
      <MCPServerDetails
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        server={detailsServer}
      />
    </div>
  );
}
