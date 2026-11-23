import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import {
  ArrowLeft,
  ArrowUpDown,
  Check,
  ChevronsUpDown,
  Copy,
  Edit,
  FileText,
  GitBranch,
  Lock,
  MoreHorizontal,
  Plus,
  Search,
  SearchX,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from '@/components/ui/menu';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';

import { pipelinesService } from '@/services/pipelines';
import { useAppDataStore } from '@/store/appDataStore';
import {
  Pipeline,
  PipelineStage,
  PipelineItem,
  UpdatePipelineData,
  CreateStageData,
} from '@/types/analytics';
import KanbanBoardSkeleton from '@/components/pipelines/kanban/KanbanBoardSkeleton';
import KanbanCard from '@/components/pipelines/kanban/KanbanCard';
import KanbanColumn from '@/components/pipelines/kanban/KanbanColumn';
import KanbanFilters from '@/components/pipelines/kanban/KanbanFilters';
import { calculateStageTotal, formatCurrency, priorityBucket } from '@/components/pipelines/kanban/kanbanUtils';
import EditPipelineModal from '@/components/pipelines/EditPipelineModal';
import CreateStageModal from '@/components/pipelines/CreateStageModal';
import AddItemModal from '@/components/pipelines/AddItemModal';
import RemoveItemModal from '@/components/pipelines/RemoveItemModal';
import EditItemModal from '@/components/pipelines/EditItemModal';
import EditStageModal from '@/components/pipelines/EditStageModal';
import DeleteStageModal from '@/components/pipelines/DeleteStageModal';
import DeletePipelineModal from '@/components/pipelines/DeletePipelineModal';
import ReorderStagesModal from '@/components/pipelines/ReorderStagesModal';
import PipelineCaptureFormsModal from '@/components/pipelines/PipelineCaptureFormsModal';
import { ScheduleActionModal } from '@/components/scheduledActions';

export default function PipelineKanban() {
  const { t } = useLanguage('pipelines');
  const { t: tc } = useLanguage('common');
  const { pipelineId } = useParams<{ pipelineId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const searchQuery = searchParams.get('search') ?? '';
  const assigneeFilter = searchParams.get('assignee') ?? '';
  const statusFilter = searchParams.get('status') ?? '';
  const dateFrom = searchParams.get('dateFrom') ?? '';
  const dateTo = searchParams.get('dateTo') ?? '';
  const labelFilter = searchParams.get('label') ?? '';
  const priorityFilter = searchParams.get('priority') ?? '';
  // Período preset bucket ('today' | '7d' | '30d' | 'month'); drives dateFrom/dateTo.
  const periodFilter = searchParams.get('period') ?? '';

  // Local state for the search input (immediate UI feedback; URL update is debounced)
  const [searchInput, setSearchInput] = useState(() => searchParams.get('search') ?? '');
  // useRef<T>() with no initial argument requires T to admit `undefined` on
  // newer @types/react. Passing `undefined` explicitly + widening the type
  // keeps the existing semantics (ref is unset until the first debounce fires).
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Sync input if URL changes externally (browser back/forward).
  // We compare before setting to avoid clobbering keystrokes the user just typed
  // while a debounce was still pending — those will be flushed by the timeout.
  const urlSearch = searchParams.get('search') ?? '';
  useEffect(() => {
    setSearchInput(prev => (prev === urlSearch ? prev : urlSearch));
  }, [urlSearch]);

  // Cancel any pending debounce on unmount to avoid setState on unmounted tree.
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  const { agents, fetchAgents } = useAppDataStore();

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const [loading, setLoading] = useState(true);
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [allPipelines, setAllPipelines] = useState<Pipeline[]>([]);
  const [draggedItem, setDraggedItem] = useState<PipelineItem | null>(null);
  const isDraggingRef = useRef(false);
  const suppressClickUntilRef = useRef(0);

  // Modal states
  const [showEditPipelineModal, setShowEditPipelineModal] = useState(false);
  const [isUpdatingPipeline, setIsUpdatingPipeline] = useState(false);
  const [showCreateStageModal, setShowCreateStageModal] = useState(false);
  const [isCreatingStage, setIsCreatingStage] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [selectedStageForItem, setSelectedStageForItem] = useState<PipelineStage | null>(null);
  const [showRemoveItemModal, setShowRemoveItemModal] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<PipelineItem | null>(null);
  const [isRemovingItem, setIsRemovingItem] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<PipelineItem | null>(null);
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [showEditStageModal, setShowEditStageModal] = useState(false);
  const [showDeleteStageModal, setShowDeleteStageModal] = useState(false);
  const [stageToEdit, setStageToEdit] = useState<PipelineStage | null>(null);
  const [stageToDelete, setStageToDelete] = useState<PipelineStage | null>(null);
  const [isEditingStage, setIsEditingStage] = useState(false);
  const [isDeletingStage, setIsDeletingStage] = useState(false);
  const [showDeletePipelineModal, setShowDeletePipelineModal] = useState(false);
  const [showReorderStagesModal, setShowReorderStagesModal] = useState(false);
  const [showCaptureFormsModal, setShowCaptureFormsModal] = useState(false);
  const [isDeletingPipeline, setIsDeletingPipeline] = useState(false);
  const [isReorderingStages, setIsReorderingStages] = useState(false);
  const [scheduleActionOpen, setScheduleActionOpen] = useState(false);
  const [selectedConversationForSchedule, setSelectedConversationForSchedule] =
    useState<PipelineItem | null>(null);
  const scheduleActionContactId =
    selectedConversationForSchedule?.conversation?.contact?.id ??
    selectedConversationForSchedule?.contact?.id;

  // Load pipeline data
  const loadPipelineData = useCallback(async () => {
    if (!pipelineId) return;

    setLoading(true);
    try {
      // Load pipeline with all data (stages, items, tasks_info, services_info)
      const pipelineData = await pipelinesService.getPipeline(pipelineId);

      setPipeline(pipelineData);
      setStages(pipelineData.stages || []);
    } catch (error) {
      console.error('Error loading pipeline data:', error);
      toast.error(t('kanban.messages.loadDataError'));
    } finally {
      setLoading(false);
    }
  }, [pipelineId]);

  // Load all pipelines for selector
  const loadAllPipelines = useCallback(async () => {
    try {
      const response = await pipelinesService.getPipelines();
      const pipelinesData = response.data || [];
      setAllPipelines(pipelinesData);
    } catch (error) {
      console.error('Error loading pipelines:', error);
    }
  }, []);

  useEffect(() => {
    loadPipelineData();
    loadAllPipelines();
  }, [loadPipelineData, loadAllPipelines]);

  // Handle pipeline change
  const handlePipelineChange = (newPipelineId: string) => {
    if (newPipelineId !== pipelineId) {
      navigate(`/pipelines/${newPipelineId}`);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (item: PipelineItem) => {
    setDraggedItem(item);
    isDraggingRef.current = true;
    suppressClickUntilRef.current = Date.now() + 200;
  };

  const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();

    if (!draggedItem) return;

    // Don't move if dropping on same stage
    if (draggedItem.stage_id === targetStageId) {
      setDraggedItem(null);
      return;
    }

    // Capture before async operations
    const movedItem = draggedItem;
    const willBeHidden = hasActiveFilters && filterItems([movedItem]).length === 0;

    try {
      await pipelinesService.moveItem({
        item_id: movedItem.id,
        pipeline_id: pipelineId!,
        from_stage_id: movedItem.stage_id,
        to_stage_id: targetStageId,
      });

      // Reload pipeline data to reflect changes
      await loadPipelineData();
      toast.success(t('kanban.messages.itemMoved'));
      if (willBeHidden) {
        toast.info(t('kanban.messages.itemHiddenByFilter'), {
          action: { label: t('kanban.search.clearFilters'), onClick: clearFilters },
        });
      }
    } catch (error) {
      console.error('Error moving item:', error);
      toast.error(t('kanban.messages.itemMoveError'));
    } finally {
      setDraggedItem(null);
      isDraggingRef.current = false;
      suppressClickUntilRef.current = Date.now() + 200;
    }
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    isDraggingRef.current = false;
    suppressClickUntilRef.current = Date.now() + 200;
  };

  // Search & filter helpers
  const updateFilters = useCallback(
    (updates: {
      search?: string;
      assignee?: string;
      status?: string;
      dateFrom?: string;
      dateTo?: string;
      label?: string;
      priority?: string;
      period?: string;
    }) => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        const keys = [
          'search',
          'assignee',
          'status',
          'dateFrom',
          'dateTo',
          'label',
          'priority',
          'period',
        ] as const;
        for (const key of keys) {
          if (key in updates) {
            const val = updates[key as keyof typeof updates];
            if (val) next.set(key, val);
            else next.delete(key);
          }
        }
        return next;
      }, { replace: true });
    },
    [setSearchParams],
  );

  // Período bucket → concrete dateFrom/dateTo (YYYY-MM-DD, local). Sets both the
  // preset key (for the UI) and the derived date range (which drives filterItems).
  const applyPeriod = useCallback(
    (bucket: string) => {
      if (!bucket) {
        updateFilters({ period: undefined, dateFrom: undefined, dateTo: undefined });
        return;
      }
      const fmt = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      let from = today;
      if (bucket === '7d') from = new Date(today.getTime() - 6 * 86400000);
      else if (bucket === '30d') from = new Date(today.getTime() - 29 * 86400000);
      else if (bucket === 'month') from = new Date(now.getFullYear(), now.getMonth(), 1);
      updateFilters({ period: bucket, dateFrom: fmt(from), dateTo: fmt(today) });
    },
    [updateFilters],
  );

  const clearFilters = useCallback(() => {
    // Cancel any pending debounce so it doesn't resurrect the search query
    // a few hundred ms after the user clicked "clear filters".
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    setSearchInput('');
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      ['search', 'assignee', 'status', 'dateFrom', 'dateTo', 'label', 'priority', 'period'].forEach(
        k => next.delete(k),
      );
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        if (value) next.set('search', value);
        else next.delete('search');
        return next;
      }, { replace: true });
    }, 250);
  }, [setSearchParams]);

  // All team agents from the store (full team, not just those with pipeline cards)
  const uniqueAssignees = useMemo(
    () => agents.map(a => ({ id: String(a.id), name: a.name, avatar_url: a.avatar_url })),
    [agents],
  );

  const filterItems = useCallback(
    (items: PipelineItem[]) => {
      const q = searchQuery.toLowerCase();
      // Parse YYYY-MM-DD as local time so the filter matches the operator's
      // calendar day. `new Date('2026-05-04')` would be interpreted as UTC
      // midnight, which drops the last 3h of the day for BRT users.
      const toLocalStartTs = (s: string) => {
        const [y, m, d] = s.split('-').map(Number);
        return new Date(y, m - 1, d).getTime() / 1000;
      };
      const dateFromTs = dateFrom ? toLocalStartTs(dateFrom) : 0;
      const dateToTs = dateTo ? toLocalStartTs(dateTo) + 86399 : Infinity;

      return items.filter(item => {
        const matchesSearch =
          !q ||
          item.contact?.name?.toLowerCase().includes(q) ||
          item.contact?.phone_number?.includes(q) ||
          item.contact?.email?.toLowerCase().includes(q) ||
          String(item.conversation?.display_id ?? '').includes(q);

        const matchesAssignee =
          !assigneeFilter || String(item.conversation?.assignee?.id) === assigneeFilter;

        const matchesStatus =
          !statusFilter || item.conversation?.status === statusFilter;

        const enteredAt = item.entered_at ?? 0;
        const matchesDateRange =
          (!dateFrom || enteredAt >= dateFromTs) &&
          (!dateTo || enteredAt <= dateToTs);

        const matchesLabel =
          !labelFilter ||
          (item.conversation?.labels ?? []).some(l => l.title === labelFilter);

        // Chatwoot priority (urgent/high/medium/low) collapsed into the mockup's
        // 3 buckets: urgent+high → alta, medium → media, low → baixa.
        const matchesPriority =
          !priorityFilter || priorityBucket(item.conversation?.priority) === priorityFilter;

        return (
          matchesSearch &&
          matchesAssignee &&
          matchesStatus &&
          matchesDateRange &&
          matchesLabel &&
          matchesPriority
        );
      });
    },
    [searchQuery, assigneeFilter, statusFilter, dateFrom, dateTo, labelFilter, priorityFilter],
  );

  const hasActiveFilters =
    searchQuery !== '' ||
    assigneeFilter !== '' ||
    statusFilter !== '' ||
    dateFrom !== '' ||
    dateTo !== '' ||
    labelFilter !== '' ||
    priorityFilter !== '';

  // Number of active filters shown on the "Filtros" chip badge (search excluded — it
  // has its own box). Date range counts as one regardless of period vs raw dates.
  const activeFilterCount =
    (assigneeFilter ? 1 : 0) +
    (statusFilter ? 1 : 0) +
    (dateFrom || dateTo ? 1 : 0) +
    (priorityFilter ? 1 : 0);

  // Memoize filtered items per stage to avoid recomputing 3× per stage per render
  const filteredItemsByStage = useMemo(() => {
    const map = new Map<string, PipelineItem[]>();
    for (const stage of stages) {
      map.set(stage.id, filterItems(stage.items || []));
    }
    return map;
  }, [stages, filterItems]);

  const totalFilteredCount = useMemo(
    () => Array.from(filteredItemsByStage.values()).reduce((t, items) => t + items.length, 0),
    [filteredItemsByStage],
  );

  const stagesWithResults = useMemo(
    () => Array.from(filteredItemsByStage.values()).filter(items => items.length > 0).length,
    [filteredItemsByStage],
  );

  const totalItemCount = useMemo(
    () => stages.reduce((total, stage) => total + (stage.items?.length || 0), 0),
    [stages],
  );

  // Defined pipeline attribute display-names (from custom_fields.attributes keys +
  // attribute_definitions). Names only — there is no per-pipeline filled value.
  const pipelineAttributeNames = useMemo(() => {
    const cf = pipeline?.custom_fields as
      | {
          attributes?: string[];
          attribute_definitions?: Record<string, { attribute_display_name?: string }>;
        }
      | undefined;
    const keys = cf?.attributes ?? [];
    const defs = cf?.attribute_definitions ?? {};
    return keys.map(k => defs[k]?.attribute_display_name || k);
  }, [pipeline]);


  // Move a card to a target stage from the card menu (mirrors the drag-and-drop
  // moveItem path; both call pipelinesService.moveItem then reload).
  const moveItemToStage = async (item: PipelineItem, targetStageId: string) => {
    if (!pipelineId || item.stage_id === targetStageId) return;
    try {
      await pipelinesService.moveItem({
        item_id: item.id,
        pipeline_id: pipelineId,
        from_stage_id: item.stage_id,
        to_stage_id: targetStageId,
      });
      await loadPipelineData();
      toast.success(t('kanban.messages.itemMoved'));
    } catch (error) {
      console.error('Error moving item:', error);
      toast.error(t('kanban.messages.itemMoveError'));
    }
  };

  // Pipeline management handlers
  const handleEditPipeline = () => {
    setShowEditPipelineModal(true);
  };

  const handleUpdatePipeline = async (data: UpdatePipelineData) => {
    if (!pipeline) return;

    setIsUpdatingPipeline(true);
    try {
      await pipelinesService.updatePipeline(pipeline.id, data);
      toast.success(t('messages.updateSuccess'));
      setShowEditPipelineModal(false);
      // Reload pipeline data to reflect changes
      await loadPipelineData();
    } catch (error) {
      console.error('Error updating pipeline:', error);
      toast.error(t('messages.updateError'));
    } finally {
      setIsUpdatingPipeline(false);
    }
  };

  const handleDeletePipeline = () => {
    setShowDeletePipelineModal(true);
  };

  const handleConfirmDeletePipeline = async () => {
    if (!pipeline) return;

    setIsDeletingPipeline(true);
    try {
      await pipelinesService.deletePipeline(pipeline.id);
      toast.success(t('messages.deleteSuccess'));
      setShowDeletePipelineModal(false);
      navigate('/pipelines');
    } catch (error) {
      console.error('Error deleting pipeline:', error);
      toast.error(t('messages.deleteError'));
    } finally {
      setIsDeletingPipeline(false);
    }
  };

  const handleReorderStages = () => {
    setShowReorderStagesModal(true);
  };

  const handleUpdateStageOrder = async (orderedStages: PipelineStage[]) => {
    if (!pipelineId) return;

    setIsReorderingStages(true);
    try {
      // Backend expects just an array of stage IDs in the correct order
      const stageOrders = orderedStages.map(stage => stage.id);

      await pipelinesService.reorderPipelineStages(pipelineId, stageOrders);

      toast.success(t('kanban.messages.stageReordered'));
      setShowReorderStagesModal(false);
      // Reload pipeline data to reflect changes
      await loadPipelineData();
    } catch (error) {
      console.error('Error reordering stages:', error);
      toast.error(t('kanban.messages.stageReorderError'));
    } finally {
      setIsReorderingStages(false);
    }
  };

  // Stage management handlers
  const handleCreateStage = async (data: CreateStageData) => {
    if (!pipeline) return;

    setIsCreatingStage(true);
    try {
      await pipelinesService.createPipelineStage(pipeline.id, data);
      toast.success(t('kanban.messages.stageCreated'));
      setShowCreateStageModal(false);
      // Reload pipeline data to show new stage
      await loadPipelineData();
    } catch (error) {
      console.error('Error creating stage:', error);
      toast.error(t('kanban.messages.stageCreateError'));
    } finally {
      setIsCreatingStage(false);
    }
  };

  // Item management handlers
  const handleAddItem = (stage?: PipelineStage) => {
    setSelectedStageForItem(stage || stages[0] || null);
    setShowAddItemModal(true);
  };

  const handleItemAdded = async () => {
    toast.success(t('kanban.messages.itemAdded'));
    // Reload pipeline data to show new item
    await loadPipelineData();
    // Warn if active filters may hide the newly added card
    if (hasActiveFilters) {
      toast.info(t('kanban.messages.newItemMayBeHidden'), {
        action: { label: t('kanban.search.clearFilters'), onClick: clearFilters },
      });
    }
  };

  const handleRemoveItem = (item: PipelineItem) => {
    setItemToRemove(item);
    setShowRemoveItemModal(true);
  };

  const handleConfirmRemoveItem = async () => {
    if (!itemToRemove || !pipelineId) return;

    setIsRemovingItem(true);
    try {
      await pipelinesService.removeItemFromPipeline(pipelineId, itemToRemove.id);
      toast.success(t('kanban.messages.itemRemoved'));
      setShowRemoveItemModal(false);
      setItemToRemove(null);
      // Reload pipeline data to reflect changes
      await loadPipelineData();
    } catch (error) {
      console.error('Error removing item from pipeline:', error);
      toast.error(t('kanban.messages.itemRemoveError'));
    } finally {
      setIsRemovingItem(false);
    }
  };

  const handleEditItem = (item: PipelineItem) => {
    setItemToEdit(item);
    setShowEditItemModal(true);
  };

  const handleUpdateItem = async (data: {
    notes: string;
    stage_id: string;
    services: Array<{ name: string; value: string }>;
    currency: string;
    custom_attributes?: Record<string, unknown>;
  }) => {
    if (!itemToEdit || !pipelineId) return;

    setIsEditingItem(true);
    try {
      await pipelinesService.updateItemInPipeline(pipelineId, itemToEdit.id, {
        pipeline_stage_id: data.stage_id,
        notes: data.notes,
        custom_fields: {
          services: data.services,
          currency: data.currency,
          // Merge custom attributes into custom_fields (backend expects them here)
          ...(data.custom_attributes || {}),
        },
      });
      toast.success(t('kanban.messages.itemUpdated'));
      setShowEditItemModal(false);
      setItemToEdit(null);
      // Reload pipeline data to reflect changes
      await loadPipelineData();
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error(t('kanban.messages.itemUpdateError'));
    } finally {
      setIsEditingItem(false);
    }
  };

  // Stage management handlers
  const handleEditStage = (stage: PipelineStage) => {
    setStageToEdit(stage);
    setShowEditStageModal(true);
  };

  const handleUpdateStage = async (data: {
    name: string;
    color: string;
    stage_type: string;
    counts_as_qualified?: boolean;
    automation_rules?: { description?: string };
    custom_fields?: Record<string, unknown>;
  }) => {
    if (!stageToEdit || !pipelineId) return;

    setIsEditingStage(true);
    try {
      await pipelinesService.updatePipelineStage(pipelineId, stageToEdit.id, {
        name: data.name,
        color: data.color,
        stage_type: data.stage_type,
        counts_as_qualified: data.counts_as_qualified,
        automation_rules: data.automation_rules,
        custom_fields: data.custom_fields,
      });
      toast.success(t('kanban.messages.stageUpdated'));
      setShowEditStageModal(false);
      setStageToEdit(null);
      // Reload pipeline data to reflect changes
      await loadPipelineData();
    } catch (error) {
      console.error('Error updating stage:', error);
      toast.error(t('kanban.messages.stageUpdateError'));
    } finally {
      setIsEditingStage(false);
    }
  };

  const handleDeleteStage = (stage: PipelineStage) => {
    setStageToDelete(stage);
    setShowDeleteStageModal(true);
  };

  const handleConfirmDeleteStage = async () => {
    if (!stageToDelete || !pipelineId) return;

    setIsDeletingStage(true);
    try {
      await pipelinesService.deletePipelineStage(pipelineId, stageToDelete.id);
      toast.success(t('kanban.messages.stageDeleted'));
      setShowDeleteStageModal(false);
      setStageToDelete(null);
      // Reload pipeline data to reflect changes
      await loadPipelineData();
    } catch (error) {
      console.error('Error deleting stage:', error);
      toast.error(t('kanban.messages.stageDeleteError'));
    } finally {
      setIsDeletingStage(false);
    }
  };

  const copyId = async (id: string) => {
    await navigator.clipboard.writeText(id);
    toast.success(t('kanban.idCopied'));
  };

  const openCard = (item: PipelineItem) => {
    if (isDraggingRef.current || Date.now() <= suppressClickUntilRef.current) return;
    // Clicking a card always opens the detail sheet; "open conversation" lives in its menu.
    handleEditItem(item);
  };

  if (loading) {
    return <KanbanBoardSkeleton />;
  }

  const leadCount = pipeline?.item_count || pipeline?.conversations_count || 0;

  return (
    <div className="flex h-full w-full min-w-0 overflow-hidden">
      <div className="flex h-full min-w-0 flex-1 flex-col bg-background">
        {/* Header */}
        <div className="shrink-0 border-b bg-background px-4 pt-3 md:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => navigate('/pipelines')}
                      aria-label={tc('base.buttons.back')}
                    />
                  }
                >
                  <ArrowLeft />
                </TooltipTrigger>
                <TooltipPopup>{tc('base.buttons.back')}</TooltipPopup>
              </Tooltip>

              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
                <GitBranch className="size-4.5" />
              </div>

              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-1.5">
                  {pipeline?.visibility === 'private' && (
                    <Lock className="size-3.5 shrink-0 text-muted-foreground" aria-label={t('kanban.header.private')} />
                  )}
                  {/* Pipeline name doubles as the pipeline switcher */}
                  <Menu>
                    <MenuTrigger
                      render={
                        <Button variant="ghost" size="sm" className="-mx-2 min-w-0 px-2 font-semibold text-base sm:text-base" />
                      }
                    >
                      <h1 className="truncate">{pipeline?.name}</h1>
                      <ChevronsUpDown className="opacity-64" />
                    </MenuTrigger>
                    <MenuPopup align="start" className="max-h-72 w-60">
                      {allPipelines.map(p => (
                        <MenuItem key={p.id} onClick={() => handlePipelineChange(p.id)}>
                          {p.visibility === 'private' ? <Lock /> : <GitBranch />}
                          <span className="flex-1 truncate">{p.name}</span>
                          {p.id === pipeline?.id && <Check className="text-primary" />}
                        </MenuItem>
                      ))}
                    </MenuPopup>
                  </Menu>
                  {pipeline && !pipeline.is_active && (
                    <Badge variant="secondary">{t('pipelinesTable.status.inactive')}</Badge>
                  )}
                  {pipeline?.is_default && (
                    <Badge variant="warning">
                      <Star className="fill-current" />
                      {t('pipelinesTable.default')}
                    </Badge>
                  )}
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={handleEditPipeline}
                          aria-label={t('kanban.header.editPipeline')}
                        />
                      }
                    >
                      <Edit />
                    </TooltipTrigger>
                    <TooltipPopup>{t('kanban.header.editPipeline')}</TooltipPopup>
                  </Tooltip>
                </div>
                <p className="truncate text-muted-foreground text-xs">
                  {pipeline?.description || t('kanban.header.noDescription')}
                </p>
              </div>
            </div>

            {/* Quick stats + actions */}
            <div className="flex items-center gap-2">
              <dl className="flex items-center divide-x rounded-lg border bg-muted/32 text-sm">
                <div className="px-3 py-1.5">
                  <dt className="text-muted-foreground text-xs">{t('kanban.header.conversations')}</dt>
                  <dd className="font-semibold tabular-nums">{leadCount}</dd>
                </div>
                <div className="px-3 py-1.5">
                  <dt className="text-muted-foreground text-xs">{t('kanban.header.stages')}</dt>
                  <dd className="font-semibold tabular-nums">{stages.length}</dd>
                </div>
                {/* Header total = server pipeline value (whole pipeline, unfiltered). */}
                <div className="px-3 py-1.5">
                  <dt className="text-muted-foreground text-xs">{t('kanban.header.totalValue')}</dt>
                  <dd className="whitespace-nowrap font-semibold text-primary tabular-nums">
                    R$ {formatCurrency(pipeline?.services_info?.total_value ?? 0)}
                  </dd>
                </div>
              </dl>

              <Button className="hidden sm:inline-flex" onClick={() => handleAddItem()} disabled={stages.length === 0}>
                <Plus />
                {t('kanban.header.addItem')}
              </Button>

              <Menu>
                <MenuTrigger render={<Button variant="outline" size="icon" aria-label={tc('base.table.actions')} />}>
                  <MoreHorizontal />
                </MenuTrigger>
                <MenuPopup align="end" className="w-56">
                  <MenuItem onClick={handleEditPipeline}>
                    <Edit />
                    {t('kanban.header.editPipeline')}
                  </MenuItem>
                  <MenuItem onClick={() => pipeline?.id && copyId(String(pipeline.id))}>
                    <Copy />
                    {t('kanban.copyId')}
                  </MenuItem>
                  <MenuItem onClick={handleReorderStages}>
                    <ArrowUpDown />
                    {t('kanban.header.reorderStages')}
                  </MenuItem>
                  <MenuItem onClick={() => setShowCaptureFormsModal(true)}>
                    <FileText />
                    {t('kanban.header.captureForms')}
                  </MenuItem>
                  <MenuSeparator />
                  <MenuItem variant="destructive" onClick={handleDeletePipeline}>
                    <Trash2 />
                    {t('kanban.header.deletePipeline')}
                  </MenuItem>
                </MenuPopup>
              </Menu>
            </div>
          </div>

          {/* Defined pipeline attributes (names only) */}
          {pipelineAttributeNames.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {pipelineAttributeNames.map(name => (
                <Badge key={name} variant="outline">
                  {name}
                </Badge>
              ))}
            </div>
          )}

          {/* Search & filters */}
          <div className="flex flex-wrap items-center gap-2 py-3">
            <InputGroup className="w-full sm:w-72">
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput
                type="search"
                aria-label={t('kanban.search.placeholder')}
                placeholder={t('kanban.search.placeholder')}
                value={searchInput}
                onChange={e => handleSearchChange(e.target.value)}
              />
            </InputGroup>

            <KanbanFilters
              value={{ assignee: assigneeFilter, status: statusFilter, period: periodFilter, priority: priorityFilter }}
              assignees={uniqueAssignees}
              activeCount={activeFilterCount}
              onChange={updateFilters}
              onPeriodChange={applyPeriod}
              onClear={clearFilters}
            />

            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearFilters}>
                <X />
                {t('kanban.search.clearFilters')}
              </Button>
            )}

            {hasActiveFilters && (
              <span className="ms-auto text-muted-foreground text-xs">
                {t('kanban.search.resultsCount', {
                  count: totalFilteredCount,
                  total: totalItemCount,
                  stages: stagesWithResults,
                })}
              </span>
            )}
          </div>
        </div>

        {/* Global empty state: every stage empty under active filters */}
        {hasActiveFilters && totalFilteredCount === 0 && stages.length > 0 && (
          <div className="mx-4 mt-4 flex items-center gap-3 rounded-lg border bg-muted/48 px-3 py-2 md:mx-6">
            <SearchX className="size-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 text-muted-foreground text-sm">{t('kanban.search.globalNoResults')}</span>
            <Button variant="ghost" size="xs" onClick={clearFilters}>
              {t('kanban.search.clearFilters')}
            </Button>
          </div>
        )}

        {/* Board */}
        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
          {stages.length === 0 ? (
            <Empty className="h-full">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <GitBranch />
                </EmptyMedia>
                <EmptyTitle>{t('kanban.stage.noStages')}</EmptyTitle>
                <EmptyDescription>{t('kanban.stage.addStageDescription')}</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button onClick={() => setShowCreateStageModal(true)}>
                  <Plus />
                  {t('kanban.stage.addStage')}
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <div className="flex h-full w-fit min-w-full gap-3 p-4 md:p-6">
              {stages.map((stage: PipelineStage) => {
                const stageItems = filteredItemsByStage.get(stage.id) || [];
                const moveTargets = stages.filter(s => s.id !== stage.id);
                return (
                  <KanbanColumn
                    key={stage.id}
                    stage={stage}
                    visibleCount={stageItems.length}
                    totalCount={stage.items?.length || stage.item_count || 0}
                    totalValue={calculateStageTotal(stage.items)}
                    hasActiveFilters={hasActiveFilters}
                    isDragActive={draggedItem !== null}
                    onDrop={handleDrop}
                    onAddItem={handleAddItem}
                    onEditStage={handleEditStage}
                    onDeleteStage={handleDeleteStage}
                    onCopyId={copyId}
                  >
                    {stageItems.map(item => (
                      <KanbanCard
                        key={item.id}
                        item={item}
                        moveTargets={moveTargets}
                        isDragging={draggedItem?.id === item.id}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onOpen={openCard}
                        onMove={moveItemToStage}
                        onOpenConversation={it => navigate(`/conversations/${it.conversation!.uuid}`)}
                        onCopyId={copyId}
                        onSchedule={it => {
                          setSelectedConversationForSchedule(it);
                          setScheduleActionOpen(true);
                        }}
                        onRemove={handleRemoveItem}
                      />
                    ))}
                  </KanbanColumn>
                );
              })}

              {/* Add stage column */}
              <button
                type="button"
                onClick={() => setShowCreateStageModal(true)}
                className="flex h-full w-72 shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed p-6 text-center text-muted-foreground outline-none transition-colors hover:border-primary/48 hover:bg-primary/4 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex size-9 items-center justify-center rounded-lg border bg-card text-primary shadow-xs/5">
                  <Plus className="size-4.5" />
                </span>
                <span className="font-medium text-foreground text-sm">{t('kanban.stage.addStage')}</span>
                <span className="max-w-48 text-xs">{t('kanban.stage.addStageDescription')}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Pipeline Modal */}
      {pipeline && (
        <EditPipelineModal
          open={showEditPipelineModal}
          onOpenChange={setShowEditPipelineModal}
          pipeline={pipeline}
          onSubmit={handleUpdatePipeline}
          loading={isUpdatingPipeline}
        />
      )}

      {/* Create Stage Modal */}
      <CreateStageModal
        open={showCreateStageModal}
        onOpenChange={setShowCreateStageModal}
        onSubmit={handleCreateStage}
        loading={isCreatingStage}
      />

      {/* Add Item Modal */}
      {pipeline && (
        <AddItemModal
          open={showAddItemModal}
          onOpenChange={setShowAddItemModal}
          pipelineId={pipeline.id}
          stages={stages}
          preselectedStage={selectedStageForItem}
          onItemAdded={handleItemAdded}
        />
      )}

      {/* Remove Item Modal */}
      <RemoveItemModal
        open={showRemoveItemModal}
        onOpenChange={setShowRemoveItemModal}
        item={itemToRemove}
        onConfirm={handleConfirmRemoveItem}
        loading={isRemovingItem}
      />

      {/* Edit Item Modal */}
      {itemToEdit && (
        <EditItemModal
          open={showEditItemModal}
          onOpenChange={setShowEditItemModal}
          item={itemToEdit}
          stages={stages}
          pipeline={pipeline}
          onSubmit={handleUpdateItem}
          loading={isEditingItem}
          onSchedule={it => {
            setSelectedConversationForSchedule(it);
            setScheduleActionOpen(true);
          }}
        />
      )}

      {/* Edit Stage Modal */}
      <EditStageModal
        open={showEditStageModal}
        onOpenChange={setShowEditStageModal}
        stage={stageToEdit}
        onSubmit={handleUpdateStage}
        loading={isEditingStage}
        stages={stages}
        agents={uniqueAssignees}
      />

      {/* Delete Stage Modal */}
      <DeleteStageModal
        open={showDeleteStageModal}
        onOpenChange={setShowDeleteStageModal}
        stage={stageToDelete}
        itemCount={stageToDelete?.item_count || 0}
        onConfirm={handleConfirmDeleteStage}
        loading={isDeletingStage}
      />

      {/* Delete Pipeline Modal */}
      {pipeline && (
        <DeletePipelineModal
          open={showDeletePipelineModal}
          onOpenChange={setShowDeletePipelineModal}
          pipeline={pipeline}
          onConfirm={handleConfirmDeletePipeline}
          loading={isDeletingPipeline}
        />
      )}

      {/* Reorder Stages Modal */}
      <ReorderStagesModal
        open={showReorderStagesModal}
        onOpenChange={setShowReorderStagesModal}
        stages={stages}
        onSubmit={handleUpdateStageOrder}
        loading={isReorderingStages}
      />

      {/* Schedule Action Modal */}
      {selectedConversationForSchedule && scheduleActionContactId && (
        <ScheduleActionModal
          open={scheduleActionOpen}
          onClose={() => {
            setScheduleActionOpen(false);
            setSelectedConversationForSchedule(null);
          }}
          contactId={scheduleActionContactId}
        />
      )}

      {/* Capture Forms (lead capture) for this pipeline */}
      <PipelineCaptureFormsModal
        open={showCaptureFormsModal}
        onOpenChange={setShowCaptureFormsModal}
        pipeline={pipeline}
        stages={stages}
        allPipelines={allPipelines}
      />
    </div>
  );
}
