import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog } from '@/components/base';
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from '@/components/ui/menu';
import {
  ChevronRight,
  ChevronDown,
  GripVertical,
  Plus,
  Edit,
  Trash2,
  Calendar,
  User,
  Phone,
  Mail,
  Video,
  Bell,
  FileText,
  MoreHorizontal,
  CornerDownRight,
  CornerUpLeft,
} from '@/components/icons';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { PipelineTask } from '@/types/analytics';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HierarchicalTaskItemProps {
  task: PipelineTask;
  depth?: number;
  onEdit: (task: PipelineTask) => void;
  onDelete: (taskId: string) => void;
  onComplete: (taskId: string) => void;
  onReopen?: (taskId: string) => void;
  onAddSubtask: (parentTask: PipelineTask) => void;
  onMoveTask?: (taskId: string, newParentId: string | null) => void;
  disabled?: boolean;
  allTasks?: PipelineTask[];
}

export default function HierarchicalTaskItem({
  task,
  depth = 0,
  onEdit,
  onDelete,
  onComplete,
  onReopen,
  onAddSubtask,
  onMoveTask,
  disabled = false,
  allTasks = [],
}: HierarchicalTaskItemProps) {
  const { t } = useLanguage('pipelines');
  const [isExpanded, setIsExpanded] = useState(true);
  // Cascading complete/reopen confirms through ConfirmDialog (was window.confirm).
  const [pendingConfirm, setPendingConfirm] = useState<{ kind: 'complete' | 'reopen'; count: number } | null>(null);

  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const maxDepth = 2; // 0 = root, 1 = level 1, 2 = level 2
  const canAddSubtask = depth < maxDepth && task.status !== 'completed';
  const canPromote = depth > 0 && task.status !== 'completed'; // Can promote if not root and not completed
  const canMove = task.status !== 'completed'; // Can only move if not completed

  // Get possible parent tasks for this task (excluding itself and its descendants)
  const getPossibleParents = (): PipelineTask[] => {
    if (!allTasks || allTasks.length === 0) return [];
    
    const excludeIds = new Set([task.id]);
    
    // Add all descendants to exclude list
    const addDescendants = (t: PipelineTask) => {
      if (t.subtasks) {
        t.subtasks.forEach(st => {
          excludeIds.add(st.id);
          addDescendants(st);
        });
      }
    };
    addDescendants(task);
    
    // Also exclude current parent to avoid showing "move to same parent"
    if (task.parent_task_id) {
      excludeIds.add(task.parent_task_id);
    }
    
    // Current task depth and if it has subtasks
    const currentDepth = task.depth || 0;
    const taskHasSubtasks = hasSubtasks;
    
    // Filter tasks that can be parents based on depth restrictions
    return allTasks.filter(t => {
      if (excludeIds.has(t.id)) return false;
      
      // Exclude completed tasks as potential parents
      if (t.status === 'completed') return false;
      
      const potentialParentDepth = t.depth || 0;
      
      // Calculate what depth this task would have under the new parent
      const newDepth = potentialParentDepth + 1;
      
      // Cannot exceed max depth
      if (newDepth > maxDepth) return false;
      
      // If task has subtasks, need to ensure they won't exceed depth either
      // Check the deepest subtask level
      if (taskHasSubtasks) {
        const getMaxSubtaskDepth = (t: PipelineTask, baseDepth: number): number => {
          if (!t.subtasks || t.subtasks.length === 0) return baseDepth;
          return Math.max(...t.subtasks.map(st => getMaxSubtaskDepth(st, baseDepth + 1)));
        };
        
        const maxSubtaskDepth = getMaxSubtaskDepth(task, newDepth);
        if (maxSubtaskDepth > maxDepth) return false;
      }
      
      // Contextual filtering based on current position:
      // - If at depth 2 (max), can only move up (to depth 1 or 0)
      // - If at depth 1, can move to depth 0 or other depth 0 tasks
      // - If at depth 0, can move under other depth 0 or depth 1 tasks (if allowed)
      
      if (currentDepth === maxDepth) {
        // At max depth, can only move to shallower levels
        return potentialParentDepth < currentDepth;
      }
      
      return true;
    });
  };

  const handlePromoteToRoot = () => {
    if (onMoveTask && canPromote) {
      onMoveTask(task.id, null);
    }
  };

  const handleMoveToParent = (newParentId: string) => {
    if (onMoveTask) {
      onMoveTask(task.id, newParentId);
    }
  };

  const handleEdit = () => {
    if (task.status !== 'completed') {
      onEdit(task);
    }
  };

  const handleDelete = (id: string) => {
    if (task.status !== 'completed') {
      onDelete(id);
    }
  }

  // Get ALL descendants (recursive through all levels)
  const getAllDescendants = (t: PipelineTask): PipelineTask[] => {
    if (!t.subtasks || t.subtasks.length === 0) return [];
    
    const descendants: PipelineTask[] = [...t.subtasks];
    t.subtasks.forEach(st => {
      descendants.push(...getAllDescendants(st));
    });
    
    return descendants;
  };

  const handleCheckboxChange = (checked: boolean) => {
    if (checked) {
      // Count ALL descendants (not just direct subtasks)
      const allDescendants = getAllDescendants(task);
      const pendingDescendants = allDescendants.filter(d => d.status !== 'completed').length;
      
      if (pendingDescendants > 0) {
        setPendingConfirm({ kind: 'complete', count: pendingDescendants });
        return;
      }
      onComplete(task.id);
    } else if (onReopen) {
      // Count ALL descendants that will be reopened
      const allDescendants = getAllDescendants(task);
      const completedDescendants = allDescendants.filter(d => d.status === 'completed').length;
      
      if (completedDescendants > 0) {
        setPendingConfirm({ kind: 'reopen', count: completedDescendants });
        return;
      }
      onReopen(task.id);
    }
  };

  const getTaskTypeIcon = () => {
    const iconClass = 'w-3.5 h-3.5';
    switch (task.task_type) {
      case 'call':
        return <Phone className={iconClass} />;
      case 'email':
        return <Mail className={iconClass} />;
      case 'meeting':
        return <Video className={iconClass} />;
      case 'follow_up':
        return <Bell className={iconClass} />;
      case 'note':
        return <FileText className={iconClass} />;
      default:
        return <MoreHorizontal className={iconClass} />;
    }
  };

  const priorityVariant = (() => {
    switch (task.priority) {
      case 'urgent':
        return 'error' as const;
      case 'high':
        return 'warning' as const;
      case 'medium':
        return 'info' as const;
      default:
        return 'secondary' as const;
    }
  })();

  const statusVariant = (() => {
    switch (task.status) {
      case 'completed':
        return 'success' as const;
      case 'overdue':
        return 'error' as const;
      case 'cancelled':
        return 'secondary' as const;
      default:
        return 'info' as const;
    }
  })();

  const formatDueDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  return (
    <div className={cn('space-y-1', depth > 0 && 'ml-6')}>
      {/* Main Task Card */}
      <div
        className={cn(
          'group relative rounded-lg border bg-card p-3 transition-colors hover:border-ring/40',
          task.status === 'completed' && 'opacity-60',
          task.overdue && task.status === 'pending' && 'border-destructive/24',
          task.due_soon && task.status === 'pending' && 'border-warning/24',
        )}
      >
        {/* Depth indicator line */}
        {depth > 0 && (
          <div className="absolute -left-6 top-0 bottom-0 w-6 flex items-center justify-center">
            <div className="h-px w-4 bg-border" />
          </div>
        )}

        <div className="flex items-start gap-2">
          {/* Expand/Collapse Button */}
          {hasSubtasks ? (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setIsExpanded(!isExpanded)}
              className="shrink-0"
              aria-label={isExpanded ? t('tasks.actions.collapse') : t('tasks.actions.expand')}
              aria-expanded={isExpanded}
            >
              {isExpanded ? <ChevronDown /> : <ChevronRight />}
            </Button>
          ) : (
            <div className="w-6" /> // Spacer for alignment
          )}

          {/* Drag Handle */}
          <div className="cursor-grab p-1 opacity-0 group-hover:opacity-30 hover:opacity-50 transition-opacity flex-shrink-0">
            <GripVertical className="w-4 h-4" />
          </div>

          {/* Checkbox */}
          <Checkbox
            checked={task.status === 'completed'}
            onCheckedChange={handleCheckboxChange}
            disabled={disabled || task.status === 'cancelled'}
            className="mt-0.5 flex-shrink-0"
          />

          {/* Task Content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Title and Actions Row */}
            <div className="flex items-start justify-between gap-2">
              <h4
                className={cn(
                  'text-sm font-medium break-words',
                  task.status === 'completed' && 'line-through text-muted-foreground',
                )}
              >
                {task.title}
              </h4>

              {/* Actions */}
              <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                {/* Move Menu */}
                {onMoveTask && canMove && (canPromote || getPossibleParents().length > 0) && (
                  <Menu>
                    <MenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          disabled={disabled}
                          aria-label={t('tasks.actions.move')}
                        />
                      }
                    >
                      <MoreHorizontal />
                    </MenuTrigger>
                    <MenuPopup align="end">
                      {/* Promote to Root - only if not already root */}
                      {canPromote && (
                        <>
                          <MenuItem onClick={handlePromoteToRoot}>
                            <CornerUpLeft />
                            {t('tasks.actions.promoteToRoot')}
                          </MenuItem>
                          {getPossibleParents().length > 0 && <MenuSeparator />}
                        </>
                      )}
                      {/* Move to other parents */}
                      {getPossibleParents().length > 0 && (
                        <>
                          {getPossibleParents().map(parent => (
                            <MenuItem
                              key={parent.id}
                              onClick={() => handleMoveToParent(parent.id)}
                            >
                              <CornerDownRight />
                              {t('tasks.actions.moveUnder', { parent: parent.title })}
                            </MenuItem>
                          ))}
                        </>
                      )}
                    </MenuPopup>
                  </Menu>
                )}

                {/* Add Subtask */}
                {canAddSubtask && (
                  <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => onAddSubtask(task)}
                        disabled={disabled}
                        aria-label={t('tasks.actions.addSubtask')}
                      />
                    }
                  >
                    <Plus />
                  </TooltipTrigger>
                  <TooltipPopup>{t('tasks.actions.addSubtask')}</TooltipPopup>
                </Tooltip>
                )}

                {/* Edit */}
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={handleEdit}
                        disabled={disabled || task.status === 'completed'}
                        aria-label={t('tasks.edit')}
                      />
                    }
                  >
                    <Edit />
                  </TooltipTrigger>
                  <TooltipPopup>{t('tasks.edit')}</TooltipPopup>
                </Tooltip>

                {/* Delete */}
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleDelete(task.id)}
                        disabled={disabled || task.status === 'completed'}
                        className="text-muted-foreground hover:text-destructive-foreground"
                        aria-label={t('tasks.delete')}
                      />
                    }
                  >
                    <Trash2 />
                  </TooltipTrigger>
                  <TooltipPopup>{t('tasks.delete')}</TooltipPopup>
                </Tooltip>
              </div>
            </div>

            {/* Description */}
            {task.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 break-words">
                {task.description}
              </p>
            )}

            {/* Metadata Row */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Task Type */}
              <div className="flex items-center gap-1 text-muted-foreground">
                {getTaskTypeIcon()}
                <span>{t(`tasks.types.${task.task_type}`)}</span>
              </div>

              {/* Priority */}
              <Badge variant={priorityVariant} size="sm">
                {t(`tasks.priority.${task.priority}`)}
              </Badge>

              {/* Status */}
              {task.status !== 'pending' && (
                <Badge variant={statusVariant} size="sm">
                  {t(`tasks.status.${task.status}`)}
                </Badge>
              )}

              {/* Subtask Counter */}
              {task.has_subtasks && (
                <Badge variant="outline" size="sm">
                  {task.subtask_count} {task.subtask_count === 1 ? t('tasks.subtask') : t('tasks.subtasks')}
                </Badge>
              )}

              {/* Completion Percentage */}
              {task.has_subtasks && task.completion_percentage !== undefined && task.status !== 'completed' && (
                <div className="flex items-center gap-1.5">
                  <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${task.completion_percentage}%` }}
                    />
                  </div>
                  <span className="text-muted-foreground tabular-nums">{task.completion_percentage}%</span>
                </div>
              )}

              {/* Due Date */}
              {task.due_date && (
                <div
                  className={cn(
                    'flex items-center gap-1',
                    task.overdue && task.status === 'pending' && 'text-destructive-foreground font-medium',
                    task.due_soon && task.status === 'pending' && 'text-warning-foreground font-medium',
                  )}
                >
                  <Calendar className="w-3 h-3" />
                  <span>{formatDueDate(task.due_date)}</span>
                </div>
              )}

              {/* Assigned To */}
              {task.assigned_to && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <User className="w-3 h-3" />
                  <span>{task.assigned_to.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={pendingConfirm !== null}
        onOpenChange={open => !open && setPendingConfirm(null)}
        title={pendingConfirm?.kind === 'reopen' ? t('tasks.confirm.reopenTitle') : t('tasks.confirm.completeTitle')}
        description={
          pendingConfirm?.kind === 'reopen'
            ? t('tasks.messages.reopenWithAllDescendantsConfirm', { count: pendingConfirm.count })
            : t('tasks.messages.completeWithAllDescendantsConfirm', { count: pendingConfirm?.count ?? 0 })
        }
        cancelLabel={t('tasks.form.cancel')}
        confirmLabel={pendingConfirm?.kind === 'reopen' ? t('tasks.confirm.reopen') : t('tasks.confirm.complete')}
        onConfirm={() => {
          if (pendingConfirm?.kind === 'reopen') onReopen?.(task.id);
          else onComplete(task.id);
          setPendingConfirm(null);
        }}
      />

      {/* Subtasks (Recursive) */}
      {hasSubtasks && isExpanded && (
        <div className="space-y-1 relative">
          {/* Vertical line for hierarchy */}
          <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />
          
          {task.subtasks!.map(subtask => (
            <HierarchicalTaskItem
              key={subtask.id}
              task={subtask}
              depth={depth + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onComplete={onComplete}
              onReopen={onReopen}
              onAddSubtask={onAddSubtask}
              onMoveTask={onMoveTask}
              disabled={disabled}
              allTasks={allTasks}
            />
          ))}
        </div>
      )}
    </div>
  );
}
