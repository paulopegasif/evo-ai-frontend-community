import type { DragEvent } from 'react';
import {
  AlertCircle,
  ArrowLeftRight,
  CalendarClock,
  Clock,
  Copy,
  Edit,
  GripVertical,
  ListTodo,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Trash2,
} from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { getContactColor } from '@/utils/avatar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from '@/components/ui/menu';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import type { PipelineItem, PipelineStage } from '@/types/analytics';
import { cn } from '@/utils/cn';
import { PRIORITY_VARIANT, STATUS_VARIANT, initials, priorityBucket } from './kanbanUtils';

export interface KanbanCardProps {
  item: PipelineItem;
  moveTargets: PipelineStage[];
  isDragging: boolean;
  onDragStart: (item: PipelineItem) => void;
  onDragEnd: () => void;
  onOpen: (item: PipelineItem) => void;
  onMove: (item: PipelineItem, stageId: string) => void;
  onOpenConversation: (item: PipelineItem) => void;
  onCopyId: (id: string) => void;
  onSchedule: (item: PipelineItem) => void;
  onRemove: (item: PipelineItem) => void;
}

const formatDateTime = (value: number | string) =>
  new Date(typeof value === 'number' ? value * 1000 : value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function KanbanCard({
  item,
  moveTargets,
  isDragging,
  onDragStart,
  onDragEnd,
  onOpen,
  onMove,
  onOpenConversation,
  onCopyId,
  onSchedule,
  onRemove,
}: KanbanCardProps) {
  const { t } = useLanguage('pipelines');
  const { t: tc } = useLanguage('common');
  const conversation = item.conversation;
  const contactName = item.contact?.name || t('kanban.conversation.unknownUser');
  const pBucket = priorityBucket(conversation?.priority);
  const labels = conversation?.labels ?? [];
  const lastMessage = conversation?.last_non_activity_message;
  const assignee = conversation?.assignee;
  const hasValue = Boolean(item.services_info?.has_services && item.services_info.total_value > 0);
  const overdue = item.tasks_info?.overdue_count ?? 0;
  const pending = item.tasks_info?.pending_count ?? 0;
  const activityDate = conversation?.last_activity_at
    ? new Date(conversation.last_activity_at * 1000)
    : new Date((item.entered_at || 0) * 1000);

  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.effectAllowed = 'move';
    onDragStart(item);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(item)}
      onKeyDown={e => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(item);
        }
      }}
      aria-label={contactName}
      className={cn(
        'group relative cursor-grab select-none rounded-xl border bg-card p-3 text-left shadow-xs/5 outline-none transition-[box-shadow,border-color,opacity] hover:border-ring/40 hover:shadow-md/5 focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing',
        isDragging && 'opacity-48 ring-2 ring-primary/40',
      )}
    >
      {/* Drag affordance */}
      <GripVertical
        aria-hidden="true"
        className="absolute top-3.5 left-0.5 size-3.5 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground/72"
      />

      {/* Card actions */}
      <div
        className="absolute top-2 right-2 flex items-center gap-0.5 opacity-100 transition-opacity focus-within:opacity-100 group-hover:opacity-100 md:opacity-0 has-data-popup-open:opacity-100"
        onClick={e => e.stopPropagation()}
        onKeyDown={e => e.stopPropagation()}
      >
        {moveTargets.length > 0 && (
          <Menu>
            <MenuTrigger
              render={<Button variant="ghost" size="icon-xs" aria-label={t('kanban.item.moveCard')} />}
            >
              <ArrowLeftRight />
            </MenuTrigger>
            <MenuPopup align="end">
              <MenuGroup>
                <MenuGroupLabel>{t('kanban.item.moveTo')}</MenuGroupLabel>
                {moveTargets.map(target => (
                  <MenuItem key={target.id} onClick={() => onMove(item, target.id)}>
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: target.color }} />
                    {target.name}
                  </MenuItem>
                ))}
              </MenuGroup>
            </MenuPopup>
          </Menu>
        )}
        <Menu>
          <MenuTrigger render={<Button variant="ghost" size="icon-xs" aria-label={tc('base.table.actions')} />}>
            <MoreHorizontal />
          </MenuTrigger>
          <MenuPopup align="end">
            <MenuItem onClick={() => onOpen(item)}>
              <Edit />
              {t('kanban.item.editItem')}
            </MenuItem>
            {conversation?.uuid && (
              <MenuItem onClick={() => onOpenConversation(item)}>
                <MessageSquare />
                {t('kanban.item.openConversation')}
              </MenuItem>
            )}
            <MenuItem onClick={() => onCopyId(String(item.id))}>
              <Copy />
              {t('kanban.copyId')}
            </MenuItem>
            <MenuItem onClick={() => onSchedule(item)}>
              <CalendarClock />
              {t('kanban.item.scheduleAction')}
            </MenuItem>
            <MenuSeparator />
            <MenuItem variant="destructive" onClick={() => onRemove(item)}>
              <Trash2 />
              {t('kanban.item.removeFromPipeline')}
            </MenuItem>
          </MenuPopup>
        </Menu>
      </div>

      {/* Title: contact + conversation id */}
      <div className="flex items-start gap-2.5 pe-14">
        <Avatar className="size-8 text-xs">
          {item.contact?.avatar_url && <AvatarImage src={item.contact.avatar_url} alt="" />}
          <AvatarFallback className="font-semibold text-white" style={{ backgroundColor: getContactColor(item.contact?.name) }}>
            {initials(item.contact?.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <h4 className="truncate font-medium text-foreground text-sm">{contactName}</h4>
            {conversation?.display_id && (
              <span className="shrink-0 text-muted-foreground text-xs tabular-nums">#{conversation.display_id}</span>
            )}
          </div>
          {item.contact?.phone_number && (
            <div className="mt-0.5 flex items-center gap-1 text-muted-foreground text-xs">
              <Phone className="size-3 shrink-0" />
              <span className="truncate tabular-nums">{item.contact.phone_number}</span>
            </div>
          )}
        </div>
      </div>

      {/* Value */}
      {hasValue && (
        <div className="mt-2.5 font-semibold text-base text-foreground tabular-nums">
          {item.services_info!.formatted_total}
        </div>
      )}

      {/* Last message preview */}
      {lastMessage?.content && (
        <div className="mt-2.5 border-s-2 ps-2.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="truncate font-medium text-foreground/80">
              {lastMessage.sender?.name || t('kanban.conversation.system')}
            </span>
            <span className="shrink-0 text-muted-foreground tabular-nums">{formatDateTime(lastMessage.created_at)}</span>
          </div>
          <p
            className="mt-0.5 line-clamp-2 break-words text-muted-foreground text-xs leading-relaxed [&_br]:hidden [&_p]:inline"
            dangerouslySetInnerHTML={{
              __html: lastMessage.processed_message_content || lastMessage.content || '',
            }}
          />
        </div>
      )}

      {/* Tags, priority, status */}
      {(labels.length > 0 || pBucket || conversation?.status) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1">
          {labels.slice(0, 2).map(label => (
            <Badge key={label.id} variant="outline" className="max-w-30 gap-1">
              {label.color && <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: label.color }} />}
              <span className="truncate">{label.title}</span>
            </Badge>
          ))}
          {labels.length > 2 && (
            <Badge variant="outline" className="tabular-nums">
              +{labels.length - 2}
            </Badge>
          )}
          {pBucket && (
            <Badge variant={PRIORITY_VARIANT[pBucket]}>{t(`kanban.search.priority.${pBucket}`)}</Badge>
          )}
          {conversation?.status && (
            <Badge variant={STATUS_VARIANT[conversation.status] ?? 'secondary'}>
              {t(`kanban.conversation.status.${conversation.status}`, conversation.status)}
            </Badge>
          )}
        </div>
      )}

      {/* Footer: activity date, tasks, owner */}
      <div className="mt-3 flex items-center justify-between gap-2 border-t pt-2.5 text-muted-foreground text-xs">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex items-center gap-1 tabular-nums">
            <Clock className="size-3" />
            {activityDate.toLocaleDateString('pt-BR')}
          </span>
          {overdue > 0 ? (
            <span className="flex items-center gap-1 font-medium text-destructive-foreground tabular-nums">
              <AlertCircle className="size-3" />
              {overdue} {t('kanban.tasks.overdue')}
            </span>
          ) : (
            pending > 0 && (
              <span className="flex items-center gap-1 tabular-nums">
                <ListTodo className="size-3" />
                {pending} {t('kanban.tasks.pending')}
              </span>
            )
          )}
        </div>
        {assignee && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Avatar className="size-5 text-[0.625rem]" aria-label={assignee.name}>
                  {assignee.avatar_url && <AvatarImage src={assignee.avatar_url} alt="" />}
                  <AvatarFallback className="bg-muted font-semibold text-muted-foreground">
                    {initials(assignee.name)}
                  </AvatarFallback>
                </Avatar>
              }
            />
            <TooltipPopup>{assignee.name}</TooltipPopup>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
