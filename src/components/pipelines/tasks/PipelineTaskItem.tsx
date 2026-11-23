import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { ConfirmDialog } from '@/components/base';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Phone,
  Mail,
  Calendar,
  MessageSquare,
  FileText,
  ListTodo,
  User,
  Edit,
  Trash2,
  RotateCcw,
} from '@/components/icons';
import { cn } from '@/lib/utils';
import type { PipelineTask } from '@/types/analytics';

interface PipelineTaskItemProps {
  task: PipelineTask;
  onEdit: (task: PipelineTask) => void;
  onDelete: (taskId: string) => void;
  onComplete: (taskId: string) => void;
  onReopen?: (taskId: string) => void;
  disabled?: boolean;
}

export default function PipelineTaskItem({
  task,
  onEdit,
  onDelete,
  onComplete,
  onReopen,
  disabled = false,
}: PipelineTaskItemProps) {
  const { t } = useLanguage('pipelines');
  // Complete/reopen confirms through ConfirmDialog (was window.confirm).
  const [pendingConfirm, setPendingConfirm] = useState<'complete' | 'reopen' | null>(null);

  // Get task type icon
  const getTaskTypeIcon = () => {
    const iconClass = 'w-4 h-4';
    switch (task.task_type) {
      case 'call':
        return <Phone className={iconClass} />;
      case 'email':
        return <Mail className={iconClass} />;
      case 'meeting':
        return <Calendar className={iconClass} />;
      case 'follow_up':
        return <MessageSquare className={iconClass} />;
      case 'note':
        return <FileText className={iconClass} />;
      default:
        return <ListTodo className={iconClass} />;
    }
  };

  const priorityVariant =
    task.priority === 'urgent'
      ? ('error' as const)
      : task.priority === 'high'
        ? ('warning' as const)
        : task.priority === 'medium'
          ? ('info' as const)
          : ('secondary' as const);

  // Format due date
  const formatDueDate = () => {
    if (!task.due_date) return null;

    const date = new Date(task.due_date);

    if (isToday(date)) {
      return t('tasks.dueDates.today');
    }
    if (isTomorrow(date)) {
      return t('tasks.dueDates.tomorrow');
    }

    return format(date, 'dd/MM/yyyy HH:mm');
  };

  // Get due date classes
  const getDueDateClasses = () => {
    if (!task.due_date || task.status === 'completed') {
      return 'text-muted-foreground';
    }

    const date = new Date(task.due_date);
    if (isPast(date) || task.status === 'overdue') {
      return 'text-destructive-foreground font-semibold';
    }
    if (isToday(date)) {
      return 'text-warning-foreground font-medium';
    }

    return 'text-muted-foreground';
  };

  // Get task card classes
  const getTaskCardClasses = () => {
    const baseClasses =
      'rounded-lg border p-4 transition-colors';

    if (task.status === 'overdue') {
      return cn(
        baseClasses,
        'border-destructive/24 bg-destructive/8',
      );
    }

    if (task.status === 'completed') {
      return cn(
        baseClasses,
        'border-success/24 bg-success/8',
      );
    }

    if (task.status === 'cancelled') {
      return cn(
        baseClasses,
        'bg-muted/48 opacity-60 dark:bg-muted/24',
      );
    }

    return cn(baseClasses, 'bg-card hover:border-ring/40');
  };

  const handleCheckboxChange = (checked: boolean) => {
    if (checked && task.status === 'pending') {
      setPendingConfirm('complete');
    } else if (!checked && task.status === 'completed' && onReopen) {
      setPendingConfirm('reopen');
    }
  };

  return (
    <div className={getTaskCardClasses()}>
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <Checkbox
          checked={task.status === 'completed'}
          onCheckedChange={handleCheckboxChange}
          disabled={disabled || task.status === 'cancelled'}
          className="mt-1"
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h4
            className={cn(
              'text-sm font-medium mb-2',
              task.status === 'completed' && 'line-through text-muted-foreground',
              task.status === 'cancelled' && 'line-through text-muted-foreground',
            )}
          >
            {task.title}
          </h4>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Type */}
            <div className="flex items-center gap-1 text-muted-foreground">
              {getTaskTypeIcon()}
              <span>{t(`tasks.types.${task.task_type}`)}</span>
            </div>

            {/* Priority */}
            <Badge variant={priorityVariant} size="sm">
              {t(`tasks.priority.${task.priority}`)}
            </Badge>

            {/* Due date */}
            {task.due_date && (
              <div className={cn('flex items-center gap-1', getDueDateClasses())}>
                <Calendar className="w-3 h-3" />
                <span>{formatDueDate()}</span>
              </div>
            )}

            {/* Assignee */}
            {task.assigned_to && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <User className="w-3 h-3" />
                <span>{task.assigned_to.name}</span>
              </div>
            )}

            {/* Status badge */}
            {task.status === 'overdue' && (
              <Badge variant="error" size="sm">
                {t('tasks.status.overdue')}
              </Badge>
            )}
            {task.status === 'cancelled' && (
              <Badge variant="secondary" size="sm">
                {t('tasks.status.cancelled')}
              </Badge>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {task.description}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {task.status === 'completed' && onReopen && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onReopen(task.id)}
              disabled={disabled}
              aria-label={t('tasks.confirm.reopenTitle')}
            >
              <RotateCcw />
            </Button>
          )}
          {task.status !== 'completed' && task.status !== 'cancelled' && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onEdit(task)}
              disabled={disabled}
              aria-label={t('tasks.edit')}
            >
              <Edit />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onDelete(task.id)}
            disabled={disabled}
            className="text-muted-foreground hover:text-destructive-foreground"
            aria-label={t('tasks.delete')}
          >
            <Trash2 />
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={pendingConfirm !== null}
        onOpenChange={open => !open && setPendingConfirm(null)}
        title={pendingConfirm === 'reopen' ? t('tasks.confirm.reopenTitle') : t('tasks.confirm.completeTitle')}
        description={pendingConfirm === 'reopen' ? t('tasks.messages.reopenConfirm') : t('tasks.messages.completeConfirm')}
        cancelLabel={t('tasks.form.cancel')}
        confirmLabel={pendingConfirm === 'reopen' ? t('tasks.confirm.reopen') : t('tasks.confirm.complete')}
        onConfirm={() => {
          if (pendingConfirm === 'reopen') onReopen?.(task.id);
          else onComplete(task.id);
          setPendingConfirm(null);
        }}
      />
    </div>
  );
}
