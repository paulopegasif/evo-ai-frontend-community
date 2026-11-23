import { useLanguage } from '@/hooks/useLanguage';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from '@/components/ui/menu';
import {
  AlertCircle,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Edit,
  GitBranch,
  GripVertical,
  Inbox,
  ListTodo,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Trash2,
  User,
} from '@/components/icons';
import { PipelineItem, Pipeline, PipelineStage } from '@/types/analytics';
import { initials } from '@/lib/initials';

interface PipelineItemCardProps {
  item: PipelineItem;
  pipeline?: Pipeline;
  stage?: PipelineStage;
  onView?: (item: PipelineItem) => void;
  onEdit?: (item: PipelineItem) => void;
  onRemove?: (item: PipelineItem) => void;
  showDragHandle?: boolean;
  showActions?: boolean;
}

const stripHtml = (html: string): string => {
  if (!html) return '';
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  return (tempDiv.textContent || tempDiv.innerText || '').trim();
};


export default function PipelineItemCard({
  item,
  pipeline,
  stage,
  onView,
  onEdit,
  onRemove,
  showDragHandle = false,
  showActions = true,
}: PipelineItemCardProps) {
  const { t } = useLanguage('pipelines');
  const { t: tc } = useLanguage('common');
  const lastMessage = item.conversation?.last_non_activity_message;
  const status = item.conversation?.status;
  const tasks = item.tasks_info;

  return (
    <div
      className="group relative cursor-pointer select-none rounded-xl border bg-card p-3.5 shadow-xs/5 transition-[box-shadow,border-color] hover:border-ring/40 hover:shadow-md/5"
      onClick={() => onView?.(item)}
    >
      {/* Card options menu */}
      {showActions && (onEdit || onRemove) && (
        <div
          className="absolute top-2 right-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 has-data-popup-open:opacity-100"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center gap-1">
            <Menu>
              <MenuTrigger render={<Button variant="ghost" size="icon-xs" aria-label={tc('base.table.actions')} />}>
                <MoreHorizontal />
              </MenuTrigger>
              <MenuPopup align="end">
                {onEdit && (
                  <MenuItem onClick={() => onEdit(item)}>
                    <Edit />
                    {t('kanban.item.editItem')}
                  </MenuItem>
                )}
                {onEdit && onRemove && <MenuSeparator />}
                {onRemove && (
                  <MenuItem variant="destructive" onClick={() => onRemove(item)}>
                    <Trash2 />
                    {t('kanban.item.removeFromPipeline')}
                  </MenuItem>
                )}
              </MenuPopup>
            </Menu>
            {showDragHandle && <GripVertical className="size-4 text-muted-foreground" />}
          </div>
        </div>
      )}

      {/* Contact */}
      <div className="mb-3 flex items-start gap-3 pe-8">
        <Avatar className="size-9 text-xs">
          {item.contact?.avatar_url && <AvatarImage src={item.contact.avatar_url} alt="" />}
          <AvatarFallback className="bg-muted font-semibold text-foreground/80">
            {initials(item.contact?.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <h4 className="truncate font-medium text-foreground text-sm">
              {item.contact?.name || t('kanban.item.unknownUser', 'Usuário Desconhecido')}
            </h4>
            {item.conversation?.display_id && (
              <span className="shrink-0 text-muted-foreground text-xs tabular-nums">#{item.conversation.display_id}</span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-muted-foreground text-xs">
            {item.contact?.phone_number && (
              <span className="flex min-w-0 items-center gap-1 tabular-nums">
                <Phone className="size-3 shrink-0" />
                <span className="truncate">{item.contact.phone_number}</span>
              </span>
            )}
            {item.contact?.email && (
              <span className="flex min-w-0 items-center gap-1">
                <Mail className="size-3 shrink-0" />
                <span className="truncate">{item.contact.email}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Pipeline and stage */}
      {(pipeline || stage) && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {pipeline && (
            <Badge variant="outline" className="max-w-40 gap-1">
              <GitBranch />
              <span className="truncate">{pipeline.name}</span>
            </Badge>
          )}
          {stage && (
            <Badge variant="outline" className="max-w-36 gap-1.5">
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: stage.color }} />
              <span className="truncate">{stage.name}</span>
            </Badge>
          )}
        </div>
      )}

      {/* Last message preview */}
      {lastMessage?.content && (
        <div className="mb-3 border-s-2 ps-2.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="flex min-w-0 items-center gap-1 font-medium text-foreground/80">
              <MessageSquare className="size-3 shrink-0 text-muted-foreground" />
              <span className="truncate">{lastMessage.sender?.name || t('kanban.item.system', 'Sistema')}</span>
            </span>
            <span className="shrink-0 text-muted-foreground tabular-nums">
              {new Date(
                typeof lastMessage.created_at === 'number' ? lastMessage.created_at * 1000 : lastMessage.created_at,
              ).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              {lastMessage.message_type === 0
                ? ` · ${t('kanban.conversation.incoming', 'Entrada')}`
                : lastMessage.message_type === 1
                  ? ` · ${t('kanban.conversation.outgoing', 'Saída')}`
                  : ''}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-2 text-muted-foreground text-xs leading-relaxed">
            {stripHtml(lastMessage.processed_message_content || lastMessage.content)}
          </p>
        </div>
      )}

      {/* Inbox and status */}
      {!item.is_lead && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <Badge variant="secondary" className="max-w-40 gap-1">
            <Inbox />
            <span className="truncate">{item.conversation?.inbox?.name || t('kanban.item.noInbox', 'Sem Inbox')}</span>
          </Badge>
          <Badge variant={status === 'open' ? 'success' : status === 'resolved' ? 'info' : 'secondary'}>
            {status === 'open'
              ? t('kanban.item.status.open', 'Aberto')
              : status === 'resolved'
                ? t('kanban.item.status.resolved', 'Resolvido')
                : status || t('kanban.item.status.unknown', 'Desconhecido')}
          </Badge>
        </div>
      )}

      {/* Services total value */}
      {item.services_info?.has_services && item.services_info.total_value > 0 && (
        <div className="mb-3 flex items-center justify-between border-t pt-2 text-xs">
          <span className="flex items-center gap-1 text-muted-foreground">
            <CircleDollarSign className="size-3" />
            {t('kanban.item.valueLabel', 'Valor Total:')}
          </span>
          <span className="font-semibold text-foreground text-sm tabular-nums">{item.services_info.formatted_total}</span>
        </div>
      )}

      {/* Tasks summary */}
      {(tasks?.pending_count > 0 || tasks?.overdue_count > 0 || tasks?.due_soon_count > 0 || tasks?.completed_count > 0) && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <span className="text-muted-foreground text-xs">{t('tasks.title')}</span>
          {tasks.overdue_count > 0 && (
            <Badge title={t('tasks.status.overdue')} variant="error" className="tabular-nums">
              <AlertCircle />
              {tasks.overdue_count}
            </Badge>
          )}
          {tasks.due_soon_count > 0 && (
            <Badge title={t('tasks.status.dueSoon')} variant="warning" className="tabular-nums">
              <Clock />
              {tasks.due_soon_count}
            </Badge>
          )}
          {tasks.pending_count > 0 && !tasks.overdue_count && !tasks.due_soon_count && (
            <Badge title={t('tasks.status.pending')} variant="secondary" className="tabular-nums">
              <ListTodo />
              {tasks.pending_count}
            </Badge>
          )}
          {tasks.completed_count > 0 && (
            <Badge title={t('tasks.status.completed')} variant="success" className="tabular-nums">
              <CheckCircle2 />
              {tasks.completed_count}
            </Badge>
          )}
        </div>
      )}

      {/* Time and assignee */}
      <div className="flex items-center justify-between text-muted-foreground text-xs">
        <span className="flex items-center gap-1 tabular-nums">
          <Clock className="size-3" />
          {item.conversation?.last_activity_at
            ? new Date(item.conversation.last_activity_at * 1000).toLocaleDateString('pt-BR')
            : new Date((item.entered_at || 0) * 1000).toLocaleDateString('pt-BR')}
        </span>
        {item.conversation?.assignee && (
          <span className="flex min-w-0 items-center gap-1">
            <User className="size-3 shrink-0" />
            <span className="max-w-28 truncate">{item.conversation.assignee.name}</span>
          </span>
        )}
      </div>
    </div>
  );
}
