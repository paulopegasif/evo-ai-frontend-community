import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ArrowLeft,
  X,
  MoreVertical,
  ArrowUp,
  ArrowDown,
  Minus,
  AlertTriangle,
  User as UserIcon,
  Users,
  Tag,
  GitBranch,
  Check,
} from '@/components/icons';
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuSub,
  MenuSubPopup,
  MenuSubTrigger,
  MenuTrigger,
} from '@/components/ui/menu';
import { Conversation } from '@/types/chat/api';
import type { Pipeline, PipelineStage } from '@/types/analytics';
import ContactAvatar from '@/components/chat/contact/ContactAvatar';
import { getStatusLabel } from '@/utils/chat/conversationStatus';
import ConversationStatusButton from './ConversationStatusButton';
import { STATUS_META } from './statusMeta';
import { isPhoneBearingChannel } from '@/utils/channelUtils';
import { formatContactPhone } from '@/utils/contact/formatContactPhone';
import { useLanguage } from '@/hooks/useLanguage';
import { useChatContext } from '@/contexts/chat/ChatContext';
import { pipelinesService } from '@/services/pipelines/pipelinesService';
import chatService from '@/services/chat/chatService';
import { toast } from 'sonner';
import { findItemInPipeline } from '@/utils/chat/pipelineUtils';
import RecordSaleButton from '@/components/sales/RecordSaleButton';

interface ChatHeaderProps {
  conversation: Conversation;
  onBackClick: () => void;
  onCloseConversation: () => void;
  onContactSidebarOpen: () => void;
  onMarkAsRead: (conversation: Conversation) => void;
  onMarkAsUnread: (conversation: Conversation) => void;
  onMarkAsOpen: (conversation: Conversation) => void;
  onMarkAsResolved: (conversation: Conversation) => void;
  onPostpone: (conversation: Conversation) => void;
  onMarkAsSnoozed: (conversation: Conversation) => void;
  onSetPriority: (
    conversation: Conversation,
    priority: 'low' | 'medium' | 'high' | 'urgent' | null,
  ) => void;
  onPinConversation: (conversation: Conversation) => void;
  onUnpinConversation: (conversation: Conversation) => void;
  onArchiveConversation: (conversation: Conversation) => void;
  onUnarchiveConversation: (conversation: Conversation) => void;
  onAssignAgent: (conversation: Conversation) => void;
  onAssignTeam: (conversation: Conversation) => void;
  onAssignTag: (conversation: Conversation) => void;
  onDeleteConversation: (conversation: Conversation) => void;
  unreadCount: number;
}

interface ConvPipelineData {
  pipelines: Pipeline[];
}

const ChatHeader = ({
  conversation,
  onBackClick,
  onCloseConversation,
  onContactSidebarOpen,
  onMarkAsOpen,
  onMarkAsResolved,
  onPostpone,
  onMarkAsSnoozed,
  onSetPriority,
  onAssignAgent,
  onAssignTeam,
  onAssignTag,
}: ChatHeaderProps) => {
  const { t } = useLanguage('chat');
  const chatContext = useChatContext();
  const currentStatus = conversation.status;

  const inboxName = conversation.inbox?.name || '';
  const phoneDisplay = isPhoneBearingChannel(conversation.inbox?.channel_type)
    ? formatContactPhone(conversation.contact?.phone_number)
    : null;

  const [menuOpen, setMenuOpen] = useState(false);
  const [allPipelines, setAllPipelines] = useState<Pipeline[]>([]);
  const [isLoadingPipelines, setIsLoadingPipelines] = useState(false);
  const [pipelinesLoaded, setPipelinesLoaded] = useState(false);
  const [pipelinesLoadFailed, setPipelinesLoadFailed] = useState(false);
  const [convPipelineData, setConvPipelineData] = useState<ConvPipelineData | null>(null);
  const [isLoadingConvPipelines, setIsLoadingConvPipelines] = useState(false);
  const pipelineFetchCountRef = useRef(0);
  const isMountedRef = useRef(true);
  useEffect(() => () => { isMountedRef.current = false; }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await pipelinesService.getPipelines({ is_active: true });
        if (!cancelled) {
          setAllPipelines(resp.data ?? []);
          setPipelinesLoaded(true);
        }
      } catch {
        if (!cancelled) setPipelinesLoadFailed(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setConvPipelineData(null);
  }, [conversation.id]);

  const reloadConvPipelineData = useCallback(() => {
    if (!isMountedRef.current) return;
    const fetchId = ++pipelineFetchCountRef.current;
    setIsLoadingConvPipelines(true);
    (async () => {
      try {
        const pipelines = await pipelinesService.getPipelinesByConversation(
          String(conversation.id),
        );
        if (!isMountedRef.current || pipelineFetchCountRef.current !== fetchId) return;
        setConvPipelineData({ pipelines });
      } catch {
        if (isMountedRef.current && pipelineFetchCountRef.current === fetchId) {
          setConvPipelineData({ pipelines: [] });
        }
      } finally {
        if (isMountedRef.current && pipelineFetchCountRef.current === fetchId) {
          setIsLoadingConvPipelines(false);
        }
      }
    })();
  }, [conversation.id]);

  useEffect(() => {
    if (!menuOpen) return;
    reloadConvPipelineData();
  }, [menuOpen, conversation.id, reloadConvPipelineData]);

  const refreshConversationBadge = useCallback(async () => {
    const [badgeResult, pipelinesResult] = await Promise.allSettled([
      chatService.getConversation(String(conversation.id)),
      pipelinesService.getPipelinesByConversation(String(conversation.id)),
    ]);

    if (badgeResult.status === 'fulfilled') {
      const raw = badgeResult.value;
      const envelope = raw as unknown as { data?: Conversation } | null;
      const updated: Conversation | null = envelope?.data ?? (raw as unknown as Conversation);
      if (updated) chatContext.conversations.updateConversation(updated);
    }

    if (pipelinesResult.status === 'fulfilled' && isMountedRef.current) {
      setConvPipelineData({ pipelines: pipelinesResult.value });
    }
  }, [conversation.id, chatContext]);

  const handlePipelineStageSelect = useCallback(
    async (pipeline: Pipeline, stage: PipelineStage) => {
      const currentPipelines = convPipelineData?.pipelines ?? [];
      const samePipeline = currentPipelines.find(p => p.id === pipeline.id);
      const existingInOtherPipelines = currentPipelines.filter(p => p.id !== pipeline.id);
      // MOVER vs ADICIONAR por item ATIVO encontrável, não por presença do pipeline
      // (pipeline com jornada COMPLETED volta sem item ativo → precisa cair no ADD,
      // senão morre em moveError). Mesmo fix do ChatSidebar.
      const existingItem = samePipeline
        ? findItemInPipeline(samePipeline, String(conversation.id))
        : undefined;

      if (existingItem?.id) {
        try {
          await pipelinesService.moveItem({
            pipeline_id: pipeline.id,
            item_id: existingItem.id,
            from_stage_id: existingItem.stage_id,
            to_stage_id: stage.id,
          });
          toast.success(t('pipeline.moveSuccess'));
          await refreshConversationBadge();
        } catch {
          toast.error(t('pipeline.moveError'));
        }
      } else {
        if (existingInOtherPipelines.length > 0) {
          const removeResults = await Promise.allSettled(
            existingInOtherPipelines.map(p => {
              const item = findItemInPipeline(p, String(conversation.id));
              return item?.id
                ? pipelinesService.removeItemFromPipeline(p.id, item.id)
                : Promise.resolve();
            }),
          );
          if (removeResults.some(r => r.status === 'rejected')) {
            toast.error(t('pipeline.removeError'));
            reloadConvPipelineData();
            return;
          }
        }
        try {
          await pipelinesService.addItemToPipeline(pipeline.id, {
            item_id: String(conversation.id),
            type: 'conversation',
            pipeline_stage_id: stage.id,
          });
          toast.success(t('pipeline.addSuccess'));
          await refreshConversationBadge();
        } catch {
          toast.error(t('pipeline.addError'));
        }
      }
    },
    [convPipelineData, conversation.id, t, refreshConversationBadge, reloadConvPipelineData],
  );

  const handleRemoveFromPipeline = useCallback(
    async (pipeline: Pipeline) => {
      const item = findItemInPipeline(pipeline, String(conversation.id));
      const itemId = item?.id;
      if (!itemId) { toast.error(t('pipeline.removeError')); return; }
      try {
        await pipelinesService.removeItemFromPipeline(pipeline.id, itemId);
        toast.success(t('pipeline.removeSuccess'));
        await refreshConversationBadge();
      } catch {
        toast.error(t('pipeline.removeError'));
      }
    },
    [conversation.id, t, refreshConversationBadge],
  );

  const renderPipelineSubmenuContent = () => {
    if (pipelinesLoadFailed) {
      return (
        <MenuItem
          closeOnClick={false}
          className="text-destructive-foreground text-xs"
          onClick={async () => {
            setPipelinesLoadFailed(false);
            setIsLoadingPipelines(true);
            try {
              const resp = await pipelinesService.getPipelines({ is_active: true });
              setAllPipelines(resp.data ?? []);
              setPipelinesLoaded(true);
            } catch {
              setPipelinesLoadFailed(true);
            } finally {
              setIsLoadingPipelines(false);
            }
          }}
        >
          {t('pipeline.loadError')}
        </MenuItem>
      );
    }

    if (isLoadingPipelines || !pipelinesLoaded) {
      return <div className="px-2 py-1.5 text-muted-foreground text-xs">{t('pipeline.loading')}</div>;
    }

    if (allPipelines.length === 0) {
      return <div className="px-2 py-1.5 text-muted-foreground text-xs">{t('pipeline.noPipelines')}</div>;
    }

    const currentPipelines = convPipelineData?.pipelines ?? [];

    return (
      <>
        {allPipelines.map(pipeline => {
          const convInThisPipeline = currentPipelines.find(p => p.id === pipeline.id);
          const currentItem = convInThisPipeline
            ? findItemInPipeline(convInThisPipeline, String(conversation.id))
            : undefined;
          return (
            <MenuSub key={pipeline.id}>
              <MenuSubTrigger>
                <GitBranch />
                {pipeline.name}
              </MenuSubTrigger>
              <MenuSubPopup>
                {isLoadingConvPipelines ? (
                  <div className="px-2 py-1.5 text-muted-foreground text-xs">{t('pipeline.loading')}</div>
                ) : (
                  <>
                    {(pipeline.stages ?? []).map(stage => {
                      const isCurrentStage = currentItem?.stage_id === stage.id;

                      return (
                        <MenuItem
                          key={stage.id}
                          onClick={() => handlePipelineStageSelect(pipeline, stage)}
                        >
                          {isCurrentStage ? <Check className="text-primary" /> : <span className="size-4" />}
                          {stage.name}
                        </MenuItem>
                      );
                    })}
                    {convInThisPipeline && (
                      <>
                        <MenuSeparator />
                        <MenuItem
                          onClick={() => handleRemoveFromPipeline(convInThisPipeline)}
                          variant="destructive"
                        >
                          <X />
                          {t('pipeline.removeFrom')}
                        </MenuItem>
                      </>
                    )}
                  </>
                )}
              </MenuSubPopup>
            </MenuSub>
          );
        })}
      </>
    );
  };

  // Menu de 3 pontinhos (§3.3 do protótipo): SÓ pipeline/atribuir/prioridade.
  // Status (aberto/pendente/pausada/concluído) já vive no ConversationStatusButton
  // dedicado — não duplica aqui. Fixar/Arquivar/Deletar/Marcar lida-não lida
  // vivem no context menu da LISTA (clique-direito), não no header da conversa
  // aberta — ver spec-extraida.md.
  const renderConversationStatusDropdown = () => {
    return (
      <Menu open={menuOpen} onOpenChange={setMenuOpen}>
        <MenuTrigger
          render={<Button aria-label={t('a11y.moreActions', 'Mais ações')} variant="ghost" size="icon-sm" />}
        >
          <MoreVertical />
        </MenuTrigger>
        <MenuPopup align="end" className="w-56">
          {/* Pipeline Actions */}
          <MenuSub>
            <MenuSubTrigger>
              <GitBranch className="text-primary" />
              {t('pipeline.addTo')}
            </MenuSubTrigger>
            <MenuSubPopup className="w-48">
              {renderPipelineSubmenuContent()}
            </MenuSubPopup>
          </MenuSub>

          <MenuItem
            onClick={() => onAssignAgent(conversation)}
          >
            <UserIcon className="text-primary" />
            {t('chatHeader.actions.assignAgent')}
          </MenuItem>

          <MenuItem
            onClick={() => onAssignTeam(conversation)}
          >
            <Users className="text-primary" />
            {t('chatHeader.actions.assignTeam')}
          </MenuItem>

          <MenuItem
            onClick={() => onAssignTag(conversation)}
          >
            <Tag className="text-primary" />
            {t('chatHeader.actions.assignTag')}
          </MenuItem>

          <MenuSeparator />

          <MenuGroup>
          <MenuGroupLabel>{t('chatHeader.actions.priorityLabel', 'Prioridade')}</MenuGroupLabel>

          <MenuItem
            onClick={() => onSetPriority(conversation, 'urgent')}
          >
            <AlertTriangle className="text-destructive-foreground" />
            {t('chatHeader.actions.priorityUrgent')}
          </MenuItem>

          <MenuItem
            onClick={() => onSetPriority(conversation, 'high')}
          >
            <ArrowUp className="text-warning-foreground" />
            {t('chatHeader.actions.priorityHigh')}
          </MenuItem>

          <MenuItem
            onClick={() => onSetPriority(conversation, 'medium')}
          >
            <Minus className="text-info-foreground" />
            {t('chatHeader.actions.priorityMedium')}
          </MenuItem>

          <MenuItem
            onClick={() => onSetPriority(conversation, 'low')}
          >
            <ArrowDown className="text-muted-foreground" />
            {t('chatHeader.actions.priorityLow')}
          </MenuItem>

          {conversation.priority && (
            <MenuItem
              onClick={() => onSetPriority(conversation, null)}
            >
              <X />
              {t('chatHeader.actions.removePriority')}
            </MenuItem>
          )}
          </MenuGroup>
        </MenuPopup>
      </Menu>
    );
  };

  return (
    <div className="relative z-20 flex-shrink-0 border-b bg-background/95 px-3 py-2.5 backdrop-blur-sm md:px-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {/* Back button for mobile */}
          <Button aria-label={t('a11y.back', 'Voltar')} variant="ghost" size="icon-sm" className="md:hidden" onClick={onBackClick}>
            <ArrowLeft />
          </Button>
          <button
            type="button"
            aria-label={t('chatHeader.openContact', 'Ver detalhes do contato')}
            className="shrink-0 cursor-pointer rounded-full outline-none transition-shadow hover:ring-2 hover:ring-primary/20 focus-visible:ring-2 focus-visible:ring-ring"
            onClick={onContactSidebarOpen}
          >
            <ContactAvatar contact={conversation.contact} />
          </button>
          {/* min-w-0 + truncate keep the header to two lines at ~1024px instead
              of wrapping the name, the status pill and the inbox name. */}
          <div className="min-w-0 overflow-hidden">
            <div className="flex min-w-0 items-baseline gap-2">
              <h3 className="min-w-0 truncate font-semibold text-base leading-6">
                <button
                  type="button"
                  className="max-w-full cursor-pointer truncate rounded-sm text-left outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={onContactSidebarOpen}
                >
                  {conversation.contact?.name || t('chatHeader.contactNoName')}
                </button>
              </h3>
              {phoneDisplay && (
                <span
                  className="hidden shrink-0 whitespace-nowrap text-sm text-muted-foreground xl:inline"
                  title={t('chatHeader.phoneNumber')}
                  aria-label={`${t('chatHeader.phoneNumber')}: ${phoneDisplay}`}
                >
                  {phoneDisplay}
                </span>
              )}
            </div>
            <div className="flex min-w-0 items-center gap-2 text-muted-foreground text-xs">
              {inboxName && <span className="min-w-0 shrink truncate">{inboxName}</span>}
              {(() => {
                const dotColor = (STATUS_META[conversation.status] || STATUS_META.snoozed).color;
                // Rótulo LONGO do protótipo ("Atendimento em Aberto" etc.), distinto do
                // rótulo curto de getStatusLabel ("Aberta") usado em badges compactos —
                // chave própria (chatHeader.statusPill.*) para não regressar os outros
                // 5 idiomas ao fallback PT-BR do protótipo.
                const pillLabel = t(
                  `chatHeader.statusPill.${conversation.status}`,
                  STATUS_META[conversation.status]?.label || getStatusLabel(conversation.status, t),
                );
                // Neutral pill (theme tokens) with the status color only in the dot:
                // the pastel inline palette stayed light-blue on the dark theme.
                return (
                  <span
                    title={pillLabel}
                    className="inline-flex h-5 min-w-0 items-center gap-1.5 whitespace-nowrap rounded-sm border bg-muted/72 px-1.5 font-medium text-foreground text-xs leading-none"
                  >
                    <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: dotColor }} />
                    <span className="truncate">{pillLabel}</span>
                  </span>
                );
              })()}
            </div>
          </div>
        </div>
        {/* Ações do chat */}
        <div className="flex shrink-0 items-center gap-1">
          {/* Painel do Dia: registra uma venda ligada a esta conversa e ao contato */}
          <span className="me-1">
            <RecordSaleButton conversationId={conversation.id} contactId={conversation.contact?.id} />
          </span>

          {/* Botão de status: cor + próxima ação mudam conforme o status atual */}
          <ConversationStatusButton
            status={currentStatus}
            onMarkAsOpen={() => onMarkAsOpen(conversation)}
            onMarkAsResolved={() => onMarkAsResolved(conversation)}
            onMarkAsPending={() => onPostpone(conversation)}
            onMarkAsSnoozed={() => onMarkAsSnoozed(conversation)}
          />

          {/* Dropdown de ações da conversa */}
          <span className="ms-1">{renderConversationStatusDropdown()}</span>

          {/* Botão fechar conversa */}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onCloseConversation}
                  aria-label={t('chatHeader.closeConversation')}
                  className="text-muted-foreground hover:text-foreground"
                />
              }
            >
              <X />
            </TooltipTrigger>
            <TooltipPopup>{t('chatHeader.closeConversation')}</TooltipPopup>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;
