import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuPopup,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import { Menu, MenuPopup, MenuItem, MenuSeparator, MenuTrigger } from '@/components/ui/menu';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import ConfirmDialog from '@/components/base/ConfirmDialog';
import {
  Mail,
  MailOpen,
  MoreVertical,
  MessageCircle,
  CheckCircle,
  Clock,
  Trash2,
  X,
  FileText,
  Pin,
  Archive,
  ArrowLeft,
  Check,
  User as UserIcon,
  Inbox as InboxIcon,
  MessagesSquare,
} from '@/components/icons';
import { useNavigate } from 'react-router-dom';
import { useChatContext } from '@/contexts/chat/ChatContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { Conversation, ConversationFilter } from '@/types/chat/api';
import {
  attachmentLabel,
  mediaTypeFromAttributes,
  senderNameFromAttributes,
} from '@/utils/chat/mediaLabels';
import { formatConversationTime, formatDetailedTime } from '@/utils/time/timeHelpers';
import { isPhoneBearingChannel } from '@/utils/channelUtils';
import { formatContactPhone } from '@/utils/contact/formatContactPhone';
import { UnreadBadge } from '@/components/shared';
import { ConversationSkeleton } from '../loading-states';
import { NoConversations } from '../empty-states';
import ContactAvatar from '../contact/ContactAvatar';
import ConversationBadges from '../conversation/ConversationBadges';
import ConversationStatusIcon from '../conversation/ConversationStatusIcon';
import ConversationsFilterPopover from '../filters/ConversationsFilterPopover';
import ConversationSegments from './ConversationSegments';
import { useAuthStore } from '@/store/authStore';
import { useConversationDrafts } from '../message-input/useConversationDrafts';
import { ASSIGNEE_TABS, buildAssigneeTabFilters, getActiveAssigneeTab, type AssigneeTab } from './assigneeTabs';
import GlobalSearchPanel from '../search/GlobalSearchPanel';
import GlobalSearchInput from '../search/GlobalSearchInput';
import { BaseFilter } from '@/types/core';
import { useLanguage } from '@/hooks/useLanguage';
import { useDebounce } from '@/hooks/useDebounce';
import chatService from '@/services/chat/chatService';
import { toast } from 'sonner';
import type {
  SearchConversationResult,
  SearchContactResult,
  SearchMessageResult,
} from '@/types/chat/search';

interface ChatSidebarProps {
  mobileView: 'list' | 'chat';
  searchInput: string;
  onSearchChange: (value: string) => void;
  onConversationSelect: (conversation: Conversation) => void;
  onFilterApply: (filters: BaseFilter[]) => void;
  onFilterClear: () => void;
  // Context menu handlers (só os 4 itens do protótipo — status/prioridade/
  // pipeline/atribuições vivem no ChatHeader da conversa aberta, não aqui)
  onPinConversation: (conversation: Conversation) => void;
  onUnpinConversation: (conversation: Conversation) => void;
  onArchiveConversation: (conversation: Conversation) => void;
  onUnarchiveConversation: (conversation: Conversation) => void;
  onDeleteConversation: (conversation: Conversation) => void;
  selectedConversationIds: Set<string>;
  onToggleSelect: (displayId: string) => void;
  onClearSelection: () => void;
  // Status em lote (resolver/reabrir/pendente) usa o endpoint dedicado
  // /bulk_actions (1 request, 1 toast, reconcilia via reloadCurrentFilters).
  // NÃO tem undo: mudar status é deliberado e dispara automações/webhooks/
  // atividade no backend.
  onBulkSetStatus: (status: 'open' | 'pending' | 'resolved') => Promise<void>;
  isBulkUpdatingStatus?: boolean;
  canBulkUpdateStatus?: boolean;
  /** Largura em px (coluna redimensionável, §3.1) — controlada pelo pai (Chat.tsx). Sem isto, cai no w-96 fixo de sempre. */
  width?: number;
}

// Prefetch the next page well before the user reaches the end so the loading
// state is not perceived while scrolling. Anticipated by ~2.5 viewport heights
// (EVO-1672: 1.5 was outrun by fast scrolling / slow connections), with a
// floor for short viewports. loadMore stays sequential via loadingMoreRef.
const PREFETCH_VIEWPORT_FACTOR = 2.5;
const MIN_PREFETCH_DISTANCE_PX = 1000;

// Atributos que são SÓ navegação por chip (Não lidas / Grupos) e NÃO existem no
// catálogo do modal avançado (CONVERSATION_FILTER_TYPES). Precisam ser excluídos
// do sync activeFilters -> modal, senão o modal renderiza uma linha quebrada
// (dropdowns em branco) ao abrir com um desses ativos.
const CHIP_ONLY_FILTER_KEYS = ['unread', 'is_group'];

// Eixos que são navegação por chip (status + unread + is_group) — não contam
// como "filtro avançado aplicado" no badge "N filtros".
const CHIP_NAV_KEYS = ['status', ...CHIP_ONLY_FILTER_KEYS];

// Snapshot mínimo p/ o undo das ações SEM efeito colateral no backend (ler/
// não-ler). Capturado ANTES de aplicar — o store muta a conversa em seguida,
// então guardamos só os primitivos (id + estado de leitura anterior).
interface BulkSnapshot {
  id: string;
  wasUnread: boolean;
}

// Converte um ConversationFilter (estado global) para o BaseFilter do modal
// avançado. Usado no sync activeFilters->modal e ao remesclar a navegação por
// chip no apply do modal.
const conversationFilterToBaseFilter = (f: ConversationFilter): BaseFilter => ({
  attributeKey: f.attribute_key,
  filterOperator: f.filter_operator,
  values: Array.isArray(f.values) ? f.values.join(',') : String(f.values[0] || ''),
  queryOperator: f.query_operator,
  attributeModel: 'standard' as const,
});

const ChatSidebar = ({
  mobileView,
  searchInput,
  onSearchChange,
  onConversationSelect,
  onFilterApply,
  onFilterClear,
  onPinConversation,
  onUnpinConversation,
  onArchiveConversation,
  onUnarchiveConversation,
  onDeleteConversation,
  selectedConversationIds,
  onToggleSelect,
  onClearSelection,
  onBulkSetStatus,
  isBulkUpdatingStatus = false,
  canBulkUpdateStatus = true,
  width,
}: ChatSidebarProps) => {
  const { t } = useLanguage('chat');
  const chatContext = useChatContext();
  // Explicitly type conversations to ensure TypeScript recognizes it has 'state'
  const conversations = chatContext.conversations as typeof chatContext.conversations & {
    state: {
      conversations: Conversation[];
      conversationsLoading: boolean;
      conversationsError: string | null;
      selectedConversationId: string | null;
      conversationsPagination: {
        page?: number;
        total_pages?: number;
        has_next_page?: boolean;
        total?: number;
      } | null;
    };
    getUnreadCount: (conversationId: string) => number;
    loadConversations: (params?: unknown) => Promise<void>;
    loadMoreConversations: () => Promise<void>;
  };
  const filters = chatContext.filters;
  const { can } = usePermissions();
  const [conversationFilters, setConversationFilters] = useState<BaseFilter[]>([]);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [isLoadingMoreConversations, setIsLoadingMoreConversations] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  // Modo de seleção em lote: default OFF (lista limpa, sem checkbox). O botão
  // "Selecionar" liga; "Concluir" desliga. Só nesse modo os checkboxes aparecem
  // e o click na row alterna seleção (em vez de abrir a conversa).
  const [selectionMode, setSelectionMode] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const sidebarScrollRef = useRef<HTMLDivElement | null>(null);
  const loadingMoreRef = useRef(false);
  const lastScrollTimeRef = useRef<number>(0);

  useEffect(() => {
    onClearSelection();
    setSelectionMode(false);
  }, [showArchived, onClearSelection]);

  // 🎯 SYNC: activeFilters (global) -> estado local do popover avançado.
  // Exclui só CHIP_ONLY_FILTER_KEYS (unread/is_group): esses não têm seção no
  // popover (não estão em CONVERSATION_FILTER_TYPES), então precisam ficar de
  // fora do sync ou o popover não teria onde exibi-los. `status` NÃO é excluído
  // aqui: o popover tem seção própria pra ele (checkboxes por status), e todo
  // `status` que chega em activeFilters é um `equal_to` explícito (o default da
  // tela usa DEFAULT_CONVERSATION_FILTER em `assignee_type`, nunca `status`) —
  // por isso incluir status no sync não semeia linha-fantasma nenhuma; sem essa
  // inclusão, reabrir o popover depois de escolher um status pelo chip OU pelo
  // próprio popover não vinha com o checkbox pré-marcado.
  useEffect(() => {
    const modalFilters = filters.state.activeFilters
      .filter((f: ConversationFilter) => !CHIP_ONLY_FILTER_KEYS.includes(f.attribute_key))
      .map(conversationFilterToBaseFilter);

    if (JSON.stringify(conversationFilters) !== JSON.stringify(modalFilters)) {
      setConversationFilters(modalFilters);
    }
  }, [filters.state.activeFilters, conversationFilters]);

  const navigate = useNavigate();
  const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(false);
  const debouncedSearchTerm = useDebounce(searchInput, 500);

  const handleSearchChange = (value: string) => {
    onSearchChange(value);
    if (value.trim().length > 0) {
      setIsSearchPanelOpen(true);
    }
  };

  const handleSearchFocus = () => {
    if (searchInput.trim().length > 0) {
      setIsSearchPanelOpen(true);
    }
  };

  const handleSelectConversation = useCallback(
    (item: SearchConversationResult) => {
      navigate(`/conversations/${item.id}`);
      onSearchChange('');
      setIsSearchPanelOpen(false);
    },
    [navigate, onSearchChange],
  );

  const handleSelectContact = useCallback(
    (item: SearchContactResult) => {
      navigate(`/contacts/${item.id}`);
      onSearchChange('');
      setIsSearchPanelOpen(false);
    },
    [navigate, onSearchChange],
  );

  const handleSelectMessage = useCallback(
    async (item: SearchMessageResult) => {
      setIsSearchPanelOpen(false);
      onSearchChange('');

      if (item.conversation_id == null) return;

      try {
        const raw = await chatService.getConversation(String(item.conversation_id));
        const envelope = raw as { data?: { uuid?: string; id?: string }; uuid?: string; id?: string } | null;
        const conv = envelope?.data?.id ? envelope.data : envelope;
        const uuid = conv?.uuid || conv?.id;
        if (uuid) {
          navigate(`/conversations/${uuid}`, {
            state: { scrollToMessageId: item.id },
          });
        }
      } catch (error) {
        console.error('Failed to load conversation from message result:', error);
      }
    },
    [navigate, onSearchChange],
  );

  // Navegação por chip. Simétrico ao handleApplyAdvancedFilters (que preserva o
  // status ao aplicar avançado): um chip de STATUS preserva os filtros avançados
  // ativos (troca só o status). Não-lidas/Grupos são CHIP_ONLY e NÃO combinam com
  // avançado no backend (POST /filter = 400; é o EVO-1970), então limpam o
  // avançado — mas avisando, em vez do sumiço silencioso de antes.
  const handleApplyFilters = async (segmentPreset: BaseFilter[]) => {
    const advanced = filters.state.activeFilters
      .filter((f: ConversationFilter) => !CHIP_NAV_KEYS.includes(f.attribute_key))
      .map(conversationFilterToBaseFilter);

    if (advanced.length === 0) {
      setConversationFilters([]);
      onFilterApply(segmentPreset);
      return;
    }

    const isChipOnly = segmentPreset.some(f => CHIP_ONLY_FILTER_KEYS.includes(f.attributeKey));
    if (isChipOnly) {
      toast.info(t('chatSidebar.advancedFiltersCleared'));
      setConversationFilters([]);
      onFilterApply(segmentPreset);
      return;
    }

    // Chip de status: mantém o avançado, troca só a navegação de status.
    setConversationFilters(advanced);
    onFilterApply([...segmentPreset, ...advanced]);
  };

  // Apply do POPOVER avançado: unread/is_group são navegação SÓ de chip (não têm
  // seção no popover) e precisam ser preservados, senão desaparecem a cada apply
  // avançado. `status`, ao contrário, TEM seção própria no popover (checkboxes) —
  // o popover é autoritativo pra ele, e `advancedFilters` já reflete exatamente o
  // que o usuário deixou marcado (inclusive "nada marcado" = sem filtro de status).
  // Tentar "preservar" status vindo de activeFilters aqui reintroduzia um status
  // stale sempre que o usuário desmarcava tudo e aplicava (EVO-2037): activeFilters
  // ainda carregava o status do apply ANTERIOR, e como advancedFilters não tinha
  // mais nenhuma entrada 'status', ele voltava a ser re-mesclado.
  const handleApplyAdvancedFilters = async (advancedFilters: BaseFilter[]) => {
    setConversationFilters(advancedFilters);
    const advancedKeys = new Set(advancedFilters.map(f => f.attributeKey));
    const chipNav = filters.state.activeFilters
      .filter(
        (f: ConversationFilter) =>
          CHIP_ONLY_FILTER_KEYS.includes(f.attribute_key) &&
          !advancedKeys.has(f.attribute_key),
      )
      .map(conversationFilterToBaseFilter);
    onFilterApply([...chipNav, ...advancedFilters]);
  };

  const handleClearFilters = async () => {
    setConversationFilters([]);
    onFilterClear();
  };

  const pagination = conversations.state.conversationsPagination;
  const currentPage = pagination?.page || 1;
  const totalPages = pagination?.total_pages || 1;
  const hasNextPage = pagination?.has_next_page ?? currentPage < totalPages;

  // Os eixos de chip (status / unread / is_group) são navegação, não filtro
  // avançado — não contam no badge. Só filtros de verdade (prioridade, data,
  // label, inbox, canal…) acendem. (Estende a exclusão do EVO-1939.)
  // assignee_type "me"/"unassigned" vem das abas Minhas/Não atribuídas — é
  // navegação, não conta no badge de filtros.
  const appliedFilterCount = filters.state.activeFilters.filter(
    f =>
      !CHIP_NAV_KEYS.includes(f.attribute_key) &&
      !(f.attribute_key === 'assignee_type' && ['me', 'unassigned'].includes(String(f.values?.[0]))),
  ).length;

  // Rascunhos não enviados (WhatsApp-style "Rascunho: …" na prévia).
  const currentUserId = useAuthStore(state => state.currentUser?.id);
  const drafts = useConversationDrafts(currentUserId);

  const activeAssigneeTab = getActiveAssigneeTab(filters.state.activeFilters);
  const handleAssigneeTab = (tab: AssigneeTab) => {
    if (tab === activeAssigneeTab) return;
    const { filters: next, droppedChipOnly } = buildAssigneeTabFilters(filters.state.activeFilters, tab);
    if (droppedChipOnly) toast.info(t('chatSidebar.assigneeTabs.chipCleared', 'Não lidas/Grupos não combinam com esta aba e foram removidos'));
    setConversationFilters(next.filter(f => !CHIP_ONLY_FILTER_KEYS.includes(f.attributeKey)));
    if (next.length === 0) onFilterClear();
    else onFilterApply(next);
  };

  const handleSidebarScroll = useCallback(async () => {
    const now = Date.now();
    if (now - lastScrollTimeRef.current < 150) return;

    const container = sidebarScrollRef.current;
    if (!container || loadingMoreRef.current) return;

    const pagination = conversations.state.conversationsPagination;
    if (!pagination) return;

    const currentPage = pagination.page || 1;
    const totalPages = pagination.total_pages || 1;
    const hasNextPage = pagination.has_next_page ?? currentPage < totalPages;
    if (!hasNextPage) return;

    const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const prefetchThreshold = Math.max(
      MIN_PREFETCH_DISTANCE_PX,
      container.clientHeight * PREFETCH_VIEWPORT_FACTOR,
    );
    if (distanceToBottom > prefetchThreshold) return;

    // Update throttle timestamp only after confirming we are near the bottom
    lastScrollTimeRef.current = now;
    loadingMoreRef.current = true;
    setIsLoadingMoreConversations(true);

    try {
      await conversations.loadMoreConversations();
    } finally {
      // EVO-1672: no forced scrollTop restore here. It compensated for the
      // full-list remount (now gone — the list stays mounted during loadMore)
      // and, with the wider prefetch, it yanked the user back to wherever the
      // trigger fired if they kept scrolling during the request. Appending
      // below the viewport does not move scrollTop natively.
      setIsLoadingMoreConversations(false);
      loadingMoreRef.current = false;
    }
  }, [conversations]);

  const handleLoadMoreClick = useCallback(async () => {
    if (loadingMoreRef.current || isLoadingMoreConversations || !hasNextPage) return;

    loadingMoreRef.current = true;
    setIsLoadingMoreConversations(true);
    try {
      await conversations.loadMoreConversations();
    } finally {
      setIsLoadingMoreConversations(false);
      loadingMoreRef.current = false;
    }
  }, [conversations, hasNextPage, isLoadingMoreConversations]);

  const visibleConversations = useMemo(() => {
    const filtered = conversations.state.conversations.filter(conversation => {
      const isArchived = Boolean(conversation.custom_attributes?.archived);
      return showArchived ? isArchived : !isArchived;
    });

    // Ordena por last_activity_at (autoritativo: avança em status/atendente/label/
    // mensagem e é mantido em sincronia pelo WS). NÃO usa conversation.timestamp
    // como chave primária — o conversation.updated do WS o deixa defasado, e a
    // conversa não subia ("bump que não reordena"). Tudo normalizado em ms para
    // não misturar segundos (timestamp) com milissegundos (Date.parse).
    const getSortTimestamp = (conversation: Conversation): number => {
      const activityMs = Date.parse(conversation.last_activity_at || '');
      if (!Number.isNaN(activityMs)) return activityMs;
      const updatedMs = Date.parse(conversation.updated_at || '');
      if (!Number.isNaN(updatedMs)) return updatedMs;
      const createdMs = Date.parse(conversation.created_at || '');
      if (!Number.isNaN(createdMs)) return createdMs;
      if (typeof conversation.timestamp === 'number') return conversation.timestamp * 1000;
      return 0;
    };

    return [...filtered].sort((a, b) => {
      const aPinned = Boolean(a.custom_attributes?.pinned);
      const bPinned = Boolean(b.custom_attributes?.pinned);
      if (aPinned !== bPinned) {
        return aPinned ? -1 : 1;
      }
      const diff = getSortTimestamp(b) - getSortTimestamp(a);
      if (diff !== 0) return diff;
      // Tiebreaker determinístico: evita swaps/duplicatas na borda de página
      // quando last_activity_at empata.
      return String(b.id).localeCompare(String(a.id));
    });
  }, [conversations.state.conversations, showArchived]);

  // Conversas selecionadas (map display_id -> conversa) para as ações em lote.
  const selectedConversations = useMemo(
    () =>
      conversations.state.conversations.filter(c =>
        selectedConversationIds.has(String(c.display_id)),
      ),
    [conversations.state.conversations, selectedConversationIds],
  );

  const exitSelection = useCallback(() => {
    onClearSelection();
    setSelectionMode(false);
  }, [onClearSelection]);

  // Sai do modo seleção sozinho quando a última conversa é desmarcada. Guard de
  // TRANSIÇÃO (prev > 0 -> 0), não de nível: o botão "Selecionar" do topo entra
  // no modo com o Set VAZIO (usuário ainda vai marcar) — um guard de nível
  // (`size === 0`) fecharia o modo no mesmo render em que ele abre.
  const prevSelectedSizeRef = useRef(0);
  useEffect(() => {
    const size = selectedConversationIds.size;
    if (selectionMode && prevSelectedSizeRef.current > 0 && size === 0) {
      exitSelection();
    }
    prevSelectedSizeRef.current = size;
  }, [selectionMode, selectedConversationIds.size, exitSelection]);

  // Roda uma ação por-conversa em todas as selecionadas (loop no client — v1;
  // o endpoint bulk dedicado fica como otimização futura). Quando `revert` é
  // passado (só ler/não-ler, ações sem efeito colateral no backend), captura o
  // estado de leitura ANTES de aplicar e, ao final, mostra um toast "Desfazer"
  // (5s) que reaplica o inverso por conversa (cobre seleção mista). O toast e o
  // undo cobrem APENAS as conversas que a ação aplicou com sucesso. Todas as
  // ações em massa silenciam o toast por-conversa ({ silent: true }) e mostram
  // só o consolidado; as sem `revert` (arquivar/excluir) mostram-no sem undo.
  const runBulk = useCallback(
    async (
      action: (conv: Conversation) => Promise<unknown>,
      revert?: (item: BulkSnapshot) => Promise<unknown>,
      successKey: string = 'chatSidebar.bulkApplied',
    ) => {
      if (selectedConversations.length === 0) return;
      const convs = selectedConversations.slice();
      // Snapshot dos primitivos que o undo precisa, antes do store mutar as rows.
      const items: BulkSnapshot[] = convs.map(c => ({
        id: c.id,
        wasUnread: (conversations.getUnreadCount(c.id) ?? c.unread_count ?? 0) > 0,
      }));
      setBulkRunning(true);
      let results: PromiseSettledResult<unknown>[] = [];
      try {
        results = await Promise.allSettled(convs.map(c => action(c)));
      } finally {
        setBulkRunning(false);
        exitSelection();
      }
      // Toast CONSOLIDADO (1 só): as ações em massa silenciam o toast por-conversa,
      // então mostramos um único resumo. Conta só o que aplicou com sucesso; o undo
      // (quando reversível — ler/não-ler) reaplica o inverso por conversa.
      const applied = items.filter((_, i) => results[i]?.status === 'fulfilled');
      const failedCount = results.length - applied.length;
      if (applied.length > 0) {
        toast(t(successKey, { count: applied.length }), {
          duration: 5000,
          ...(revert
            ? {
                action: {
                  label: t('chatSidebar.undo'),
                  onClick: () => {
                    void Promise.allSettled(applied.map(it => revert(it)));
                  },
                },
              }
            : {}),
        });
      }
      // Falhas TAMBÉM consolidadas num único toast (as ações silenciam o erro
      // por-conversa via { silent: true }), pra não empilhar N erros nem afogar
      // o toast de sucesso/undo.
      if (failedCount > 0) {
        toast.error(t('chatSidebar.bulkFailed', { count: failedCount }));
      }
    },
    [selectedConversations, exitSelection, conversations, t],
  );

  // Undo só dos eixos SEM efeito colateral no backend: ler/não-ler usam
  // update_column (sem automação/webhook/atividade). Restaura o estado de
  // leitura anterior de cada conversa (cobre seleção mista). Status e
  // arquivamento NÃO têm undo — re-disparariam eventos no backend.
  const revertRead = (item: BulkSnapshot) =>
    item.wasUnread
      ? conversations.markAsUnread(item.id, { silent: true })
      : conversations.markAsRead(item.id, { silent: true });

  const stripHtml = (html: string): string => {
    if (!html) return '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return (tempDiv.textContent || tempDiv.innerText || '').trim();
  };

  const getLastMessage = (conversation: Conversation) => {
    const msg = conversation.last_non_activity_message;
    const rawText = stripHtml(msg?.processed_message_content || msg?.content || '');
    // Media-only messages come with empty content; surface a typed placeholder.
    // Prefer the attachment file_type; fall back to backend-tagged media_type.
    const firstAttachmentType = msg?.attachments?.[0]?.file_type;
    const fallbackMediaType = mediaTypeFromAttributes(msg?.content_attributes);
    const cleanContent =
      rawText ||
      (firstAttachmentType ? attachmentLabel(firstAttachmentType) : '') ||
      (fallbackMediaType ? attachmentLabel(fallbackMediaType) : '');
    // Group conversations: prepend the participant who actually spoke.
    const senderName =
      msg && msg.message_type === 'incoming'
        ? senderNameFromAttributes(msg.content_attributes)
        : undefined;
    const preview = senderName ? `${senderName}: ${cleanContent}` : cleanContent;
    return preview.length > 60 ? preview.substring(0, 60) + '...' : preview;
  };

  // Render conversation context menu
  // Context menu (clique-direito) da LISTA — SÓ os 4 itens do protótipo:
  // Selecionar/Fixar/Arquivar/Deletar. Status/prioridade/pipeline/atribuições
  // vivem na conversa ABERTA (ConversationStatusButton + menu de 3 pontinhos
  // do header) — não duplicam aqui. Ver spec-extraida.md.
  const renderConversationContextMenu = (conversation: Conversation, children: React.ReactNode) => {
    const isPinned = Boolean(conversation.custom_attributes?.pinned);
    const isArchived = Boolean(conversation.custom_attributes?.archived);

    return (
      <ContextMenu key={conversation.id}>
        <ContextMenuTrigger render={children as React.ReactElement} />
        <ContextMenuPopup className="w-56">
          <ContextMenuItem
            onClick={e => {
              e.stopPropagation();
              setSelectionMode(true);
              if (!selectedConversationIds.has(String(conversation.display_id))) {
                onToggleSelect(String(conversation.display_id));
              }
            }}
          >
            <Check />
            {t('chatSidebar.select')}
          </ContextMenuItem>
          <ContextMenuSeparator />

          <ContextMenuItem
            onClick={e => {
              e.stopPropagation();
              if (isPinned) {
                onUnpinConversation(conversation);
              } else {
                onPinConversation(conversation);
              }
            }}
          >
            <Pin />
            {isPinned
              ? t('chatHeader.actions.unpinConversation')
              : t('chatHeader.actions.pinConversation')}
          </ContextMenuItem>

          <ContextMenuItem
            onClick={e => {
              e.stopPropagation();
              if (isArchived) {
                onUnarchiveConversation(conversation);
              } else {
                onArchiveConversation(conversation);
              }
            }}
          >
            <Archive />
            {isArchived
              ? t('chatHeader.actions.unarchiveConversation')
              : t('chatHeader.actions.archiveConversation')}
          </ContextMenuItem>

          <ContextMenuSeparator />

          <ContextMenuItem
            onClick={e => {
              e.stopPropagation();
              onDeleteConversation(conversation);
            }}
            variant="destructive"
          >
            <Trash2 />
            {t('chatHeader.actions.deleteConversation')}
          </ContextMenuItem>
        </ContextMenuPopup>
      </ContextMenu>
    );
  };

  return (
    <div
      data-tour="chat-sidebar"
      className={`
        ${mobileView === 'list' ? 'flex' : 'hidden'} md:flex
        w-full ${width == null ? 'md:w-96' : 'md:shrink-0'} border-r bg-card/50 flex-col h-full
      `}
      style={width != null ? { width: `${width}px` } : undefined}
    >
      {/* Search and Filter Header */}
      <div className="space-y-3 border-b px-3 pt-3 pb-2.5">
        {/* Search */}
        <div className="relative" data-tour="chat-search">
          <GlobalSearchPanel
            isOpen={isSearchPanelOpen && searchInput.trim().length > 0}
            searchTerm={debouncedSearchTerm}
            rawInputValue={searchInput}
            onInputValueChange={handleSearchChange}
            onClose={() => setIsSearchPanelOpen(false)}
            onSelectConversation={handleSelectConversation}
            onSelectContact={handleSelectContact}
            onSelectMessage={handleSelectMessage}
          >
            <GlobalSearchInput
              placeholder={t('chatSidebar.searchPlaceholder')}
              aria-label={t('chatSidebar.searchPlaceholder')}
              onFocus={handleSearchFocus}
            />
          </GlobalSearchPanel>
        </div>

        {/* Chips de segmento (Abertas/Pendentes/Concluídas/Agente/Grupos) — SÓ
            aparecem com a busca focada (spec do protótipo: "filtros rápidos
            ao focar a busca"), não fixos abaixo da aba Ativas. */}
        {!showArchived && !selectionMode && isSearchPanelOpen && (
          <ConversationSegments
            activeFilters={filters.state.activeFilters}
            onSelectSegment={handleApplyFilters}
            disabled={filters.state.isApplyingFilters}
          />
        )}

        {/* Linha "Ativas"/"Arquivadas" — navegação de nível superior (não
            filtro de status). "Ativas": texto+sublinhado verde-claro quando
            ativa, com seta "←" quando dentro de Arquivadas (voltar). O ícone
            de caixa (Arquivadas) fica na MESMA linha, à direita, sem label —
            só tooltip. Espelha exatamente o protótipo (não é um segmented
            control nem duas seções empilhadas). */}
        {!selectionMode && (
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (!showArchived) return;
                setShowArchived(false);
                void filters.applyFilters(
                  filters.state.activeFilters,
                  (c, p, q) => conversations.setConversations(c, p, q),
                  () => {},
                );
              }}
              className={`-ms-1 flex cursor-pointer items-center gap-1.5 rounded-md px-1 py-0.5 font-semibold text-base outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                !showArchived ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {showArchived && <ArrowLeft className="size-4" />}
              {showArchived
                ? t('chatSidebar.view.archived')
                : t('chatSidebar.view.active', 'Ativas')}
            </button>
            {!showArchived && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t('chatSidebar.view.archived')}
                      onClick={() => {
                        setShowArchived(true);
                        void conversations.loadConversations({ status: 'all', archived: true, per_page: 100 });
                      }}
                    />
                  }
                >
                  <Archive />
                </TooltipTrigger>
                <TooltipPopup>{t('chatSidebar.view.archived')}</TooltipPopup>
              </Tooltip>
            )}
          </div>
        )}

        {/* Abas por responsável (Minhas / Não atribuídas / Todas) */}
        {!showArchived && !selectionMode && (
          <div
            role="tablist"
            aria-label={t('chatSidebar.assigneeTabs.label', 'Filtrar por responsável')}
            className="grid grid-cols-3 gap-0.5 rounded-lg bg-muted p-0.5"
          >
            {ASSIGNEE_TABS.map(tab => {
              const selected = activeAssigneeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  disabled={filters.state.isApplyingFilters}
                  onClick={() => handleAssigneeTab(tab.id)}
                  className={`h-7 cursor-pointer truncate rounded-md px-2 font-medium text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait ${
                    selected
                      ? 'bg-background text-foreground shadow-xs/5 dark:bg-input/64'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t(tab.labelKey, tab.fallback)}
                </button>
              );
            })}
          </div>
        )}

        {/* Contagem + Filtros — sem botão "Selecionar" (entra em modo seleção
            via clique-direito → "Selecionar Conversa", ver context menu). */}
        {!selectionMode && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs tabular-nums">
              {(conversations.state.conversationsPagination?.total || visibleConversations.length)}{' '}
              {(conversations.state.conversationsPagination?.total || visibleConversations.length) === 1
                ? t('chatSidebar.conversation')
                : t('chatSidebar.conversations')}
            </span>
            <div className="flex items-center gap-2">
              {/* Indicador de filtros ativos (status é navegação, não conta) */}
              {appliedFilterCount > 0 && (
                <Badge variant="info">
                  {appliedFilterCount}{' '}
                  {appliedFilterCount === 1
                    ? t('chatSidebar.filter')
                    : t('chatSidebar.filters')}
                </Badge>
              )}

              {/* Popover de filtros — ancorado no próprio botão-trigger */}
              <ConversationsFilterPopover
                open={filterModalOpen}
                onOpenChange={setFilterModalOpen}
                filters={conversationFilters}
                onFiltersChange={setConversationFilters}
                onApplyFilters={handleApplyAdvancedFilters}
                onClearFilters={handleClearFilters}
                disabled={filters.state.isApplyingFilters}
              />
            </div>
          </div>
        )}
      </div>

      {/* Barra de ações em lote (estilo WhatsApp: ✕ N selecionadas + kebab ⋮) */}
      {selectionMode && (
        <div className="flex flex-shrink-0 items-center justify-between gap-2 border-b bg-primary/6 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={exitSelection}
              aria-label={t('chatSidebar.doneSelection')}
            >
              <X />
            </Button>
            <span className="truncate font-medium text-sm tabular-nums">
              {t('chatSidebar.selectedCount', { count: selectedConversationIds.size })}
            </span>
          </div>
          <Menu>
            <MenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={selectedConversationIds.size === 0 || bulkRunning}
                  aria-label={t('chatSidebar.bulkActions')}
                />
              }
            >
              <MoreVertical />
            </MenuTrigger>
            <MenuPopup align="end">
              {canBulkUpdateStatus && (
                <>
                  <MenuItem
                    disabled={isBulkUpdatingStatus}
                    onClick={() => {
                      void onBulkSetStatus('resolved').finally(() => setSelectionMode(false));
                    }}
                  >
                    <CheckCircle />
                    {t('chatHeader.actions.markAsResolved')}
                  </MenuItem>
                  <MenuItem
                    disabled={isBulkUpdatingStatus}
                    onClick={() => {
                      void onBulkSetStatus('open').finally(() => setSelectionMode(false));
                    }}
                  >
                    <MessageCircle />
                    {t('chatHeader.actions.markAsOpen')}
                  </MenuItem>
                  <MenuItem
                    disabled={isBulkUpdatingStatus}
                    onClick={() => {
                      void onBulkSetStatus('pending').finally(() => setSelectionMode(false));
                    }}
                  >
                    <Clock />
                    {t('chatHeader.actions.markAsPending')}
                  </MenuItem>
                </>
              )}
              {showArchived ? (
                <MenuItem
                  onClick={() => void runBulk(c => conversations.unarchiveConversation(c.id, undefined, { silent: true }))}
                >
                  <Archive />
                  {t('chatHeader.actions.unarchiveConversation')}
                </MenuItem>
              ) : (
                <MenuItem
                  onClick={() => void runBulk(c => conversations.archiveConversation(c.id, undefined, { silent: true }))}
                >
                  <Archive />
                  {t('chatHeader.actions.archiveConversation')}
                </MenuItem>
              )}
              <MenuItem
                onClick={() =>
                  void runBulk(c => conversations.markAsRead(c.id, { silent: true }), revertRead)
                }
              >
                <MailOpen />
                {t('chatHeader.actions.markAsRead')}
              </MenuItem>
              <MenuItem
                onClick={() => void runBulk(c => conversations.markAsUnread(c.id, { silent: true }), revertRead)}
              >
                <Mail />
                {t('chatHeader.actions.markAsUnread')}
              </MenuItem>
              {can('conversations', 'delete') && (
                <>
                <MenuSeparator />
                <MenuItem
                  variant="destructive"
                  onClick={() => setBulkDeleteOpen(true)}
                >
                  <Trash2 />
                  {t('chatHeader.actions.deleteConversation')}
                </MenuItem>
                </>
              )}
            </MenuPopup>
          </Menu>
        </div>
      )}

      {/* Confirmação de exclusão em lote */}
      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={t('deleteDialog.title')}
        description={t('chatSidebar.bulkDeleteDescription', { count: selectedConversationIds.size })}
        cancelLabel={t('deleteDialog.cancel')}
        confirmLabel={t('deleteDialog.confirm')}
        onConfirm={() => {
          setBulkDeleteOpen(false);
          void runBulk(c => conversations.deleteConversation(c.id, { silent: true }), undefined, 'chatSidebar.bulkDeleted');
        }}
      />

      {/* Conversations List */}
      <div
        ref={sidebarScrollRef}
        className="flex-1 overflow-y-auto"
        onScroll={handleSidebarScroll}
        data-tour="chat-conversations-list"
      >
        {!conversations ? (
          <ConversationSkeleton count={8} />
        ) : (conversations.state.conversationsLoading && visibleConversations.length === 0) ||
          filters.state.isApplyingFilters ? (
          // EVO-1672: the full-list skeleton is for the EMPTY/initial load only.
          // loadMore flips the shared conversationsLoading flag too, and swapping
          // the whole list mid-scroll loses the user's position (flicker + jump);
          // with items on screen the bottom cushion is the loading feedback.
          <ConversationSkeleton count={8} />
        ) : conversations.state.conversationsError ? (
          <div className="p-3">
            <Alert variant="error">
              <AlertTitle>{t('chatSidebar.errors.loadConversations')}</AlertTitle>
              <AlertDescription>
                <p>{conversations.state.conversationsError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => conversations.loadConversations({})}
                >
                  {t('chatSidebar.errors.tryAgain')}
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        ) : visibleConversations.length === 0 ? (
          <div>
            {searchInput ? (
              <NoConversations
                searchTerm={searchInput}
                onCreateNew={() => console.log('Create new conversation')}
              />
            ) : (
              <Empty className="md:py-12">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    {showArchived ? <Archive /> : <MessagesSquare />}
                  </EmptyMedia>
                  <EmptyTitle>
                    {showArchived
                      ? t('chatSidebar.emptyArchived.title')
                      : t('chatSidebar.empty.title')}
                  </EmptyTitle>
                  <EmptyDescription>
                    {showArchived
                      ? t('chatSidebar.emptyArchived.description')
                      : t('chatSidebar.empty.description')}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </div>
        ) : (
          <>
            {visibleConversations.map((conversation: Conversation) => {
              const isSelected =
                String(conversations.state.selectedConversationId) === String(conversation.id);
              const isBulkSelected =
                selectionMode && selectedConversationIds.has(String(conversation.display_id));

              // Usar channel da conversa diretamente, com fallback para inbox
              const channelType =
                conversation.inbox?.channel_type || conversation.inbox?.channel_type;
              const channelProvider = conversation.inbox?.provider;
              const phoneDisplay = isPhoneBearingChannel(channelType)
                ? formatContactPhone(conversation.contact?.phone_number)
                : null;
              const inboxName = conversation.inbox?.name || conversation.inbox_name;
              const assigneeName = conversation.assignee?.name;
              const contactName = conversation.contact?.name;
              const unreadCount = conversations.getUnreadCount(conversation.id) || 0;
              const hasUnread = unreadCount > 0;

              return renderConversationContextMenu(
                conversation,
                <div
                  key={conversation.id}
                  data-testid="conversation-row"
                  role="button"
                  tabIndex={0}
                  aria-current={isSelected ? 'true' : undefined}
                  onKeyDown={e => {
                    if (e.target !== e.currentTarget) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (selectionMode) onToggleSelect(String(conversation.display_id));
                      else onConversationSelect(conversation);
                    }
                  }}
                  // Moldura (border-b + barra esquerda de 2px) é a MESMA em todo estado —
                  // só a cor muda — para a row não "pular" ao (des)selecionar.
                  className={`flex cursor-pointer items-start gap-2.5 border-border/60 border-b border-l-2 px-3 py-2.5 outline-none transition-colors focus-visible:bg-muted/72 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${
                    isBulkSelected
                      ? 'border-l-primary/40 bg-primary/6'
                      : isSelected
                        ? 'border-l-primary bg-accent'
                        : 'border-l-transparent hover:bg-muted/56'
                  }`}
                  onClick={() =>
                    selectionMode
                      ? onToggleSelect(String(conversation.display_id))
                      : onConversationSelect(conversation)
                  }
                >
                  {selectionMode && (
                    <div className="mt-2.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedConversationIds.has(String(conversation.display_id))}
                        onCheckedChange={(checked: boolean) => {
                          const isSelected = selectedConversationIds.has(String(conversation.display_id));
                          if ((checked === true && !isSelected) || (checked === false && isSelected)) {
                            onToggleSelect(String(conversation.display_id));
                          }
                        }}
                        aria-label={t('chatSidebar.selectConversation')}
                      />
                    </div>
                  )}
                  <div className="mt-0.5 flex-shrink-0">
                    <ContactAvatar
                      contact={conversation.contact}
                      channelType={channelType}
                      channelProvider={channelProvider}
                      size="md"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    {/* Linha 1: caixa de entrada (esq.) · responsável + status (dir.) */}
                    <div className="flex items-center justify-between gap-2 text-[11px] leading-4 text-muted-foreground">
                      <span className="flex items-center gap-1 min-w-0" title={inboxName}>
                        {inboxName && (
                          <>
                            <InboxIcon className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{inboxName}</span>
                          </>
                        )}
                      </span>
                      <span className="flex items-center gap-1.5 min-w-0 flex-shrink-0 max-w-[55%]">
                        {assigneeName && (
                          <span className="flex items-center gap-1 min-w-0" title={assigneeName}>
                            <UserIcon className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{assigneeName}</span>
                          </span>
                        )}
                        <ConversationStatusIcon status={conversation.status} size="xs" />
                      </span>
                    </div>

                    {/* Linha 2: nome do contato (esq.) · horário (dir.) */}
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p
                          className="text-sm font-semibold text-foreground truncate"
                          title={
                            phoneDisplay
                              ? `${contactName ? `${contactName} · ` : ''}${t('chatSidebar.phoneNumber')}: ${phoneDisplay}`
                              : contactName || undefined
                          }
                        >
                          {contactName || phoneDisplay || t('chatSidebar.contactNoName')}
                        </p>
                        {Boolean(conversation.custom_attributes?.pinned) && (
                          <Pin className="h-3 w-3 text-primary flex-shrink-0" />
                        )}
                        {conversation.additional_attributes?.conversation_type === 'post' && (
                          <Badge variant="info" size="sm" className="flex-shrink-0" title="Facebook Post">
                            <FileText />
                            Post
                          </Badge>
                        )}
                      </div>
                      <span
                        className={`text-[11px] leading-4 flex-shrink-0 ${
                          hasUnread ? 'text-foreground font-medium' : 'text-muted-foreground'
                        }`}
                        title={formatDetailedTime(conversation.timestamp)}
                      >
                        {formatConversationTime(conversation.timestamp)}
                      </span>
                    </div>

                    {/* Linha 3: prévia da última mensagem (esq.) · não lidas (dir.) */}
                    <div className="flex items-center justify-between gap-2 mt-0.5 min-h-5">
                      {(() => {
                        const draft = !isSelected ? drafts[String(conversation.id)] : undefined;
                        if (draft) {
                          return (
                            <p className="text-[13px] leading-5 truncate min-w-0 text-muted-foreground">
                              <span className="font-semibold text-primary">
                                {t('chatSidebar.draftPrefix', 'Rascunho:')}
                              </span>{' '}
                              {draft.replace(/[*_~`>#]/g, '').replace(/\s+/g, ' ').trim()}
                            </p>
                          );
                        }
                        return (
                          <p
                            className={`text-[13px] leading-5 truncate min-w-0 ${
                              hasUnread ? 'text-foreground font-medium' : 'text-muted-foreground'
                            }`}
                          >
                            {getLastMessage(conversation)}
                          </p>
                        );
                      })()}
                      <UnreadBadge
                        count={unreadCount}
                        ariaLabel={t('unreadBadge.ariaLabel', { count: unreadCount })}
                        className="flex-shrink-0 min-w-[18px] h-[18px] px-1 text-[10.5px]"
                      />
                    </div>

                    {/* Linha 4 (só quando há algo): prioridade, pipeline/etapa e etiquetas */}
                    <ConversationBadges conversation={conversation} maxLabels={2} showStatus={false} />
                  </div>
                </div>,
              );
            })}

            {/* EVO-1672: proportional cushion (~half a viewport) so fast
                scroll / slow networks read as a deliberate "loading more"
                affordance instead of a blank gap with pop-in. */}
            {isLoadingMoreConversations && (
              <div className="border-t border-border/40">
                <ConversationSkeleton count={5} />
              </div>
            )}

            {!isLoadingMoreConversations && hasNextPage && !showArchived && (
              <div className="p-3 border-t border-border/40">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleLoadMoreClick}
                >
                  {t('chatSidebar.loadMore', 'Carregar mais')}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;
