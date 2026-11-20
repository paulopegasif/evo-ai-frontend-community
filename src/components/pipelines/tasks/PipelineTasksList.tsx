import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { usePipelineTasks } from '@/hooks/usePipelineTasks';
import { Button } from '@/components/ui/button';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ListTodo, Plus } from 'lucide-react';
import { ConfirmDialog } from '@/components/base';
import { Badge } from '@/components/ui/badge';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import HierarchicalTaskItem from './HierarchicalTaskItem';
import type { PipelineTask } from '@/types/analytics';

interface PipelineTasksListProps {
  pipelineId: string;
  pipelineItemId: string;
  onCreateClick: () => void;
  onEditClick: (task: PipelineTask) => void;
  onAddSubtask?: (parentTask: PipelineTask) => void;
}

export interface PipelineTasksListRef {
  reloadTasks: () => void;
  pendingCount: number;
  overdueCount: number;
  createTask: (data: any) => Promise<PipelineTask | null>;
  updateTask: (taskId: string, data: any) => Promise<PipelineTask | null>;
  creating: boolean;
  updating: boolean;
}

const PipelineTasksList = forwardRef<PipelineTasksListRef, PipelineTasksListProps>(({
  pipelineId,
  pipelineItemId,
  onCreateClick,
  onEditClick,
  onAddSubtask,
}, ref) => {
  const { t } = useLanguage('pipelines');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const {
    tasks,
    loading,
    deleting,
    deleteTask,
    completeTask,
    reopenTask,
    moveTask,
    pendingCount,
    overdueCount,
    loadTasks,
    createTask,
    updateTask,
    creating,
    updating,
  } = usePipelineTasks({
    pipelineId,
    pipelineItemId,
    autoLoad: true,
  });

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    reloadTasks: loadTasks,
    pendingCount,
    overdueCount,
    createTask,
    updateTask,
    creating,
    updating,
  }), [loadTasks, pendingCount, overdueCount, createTask, updateTask, creating, updating]);

  // Notify parent about count changes
  useEffect(() => {
    if (ref && typeof ref !== 'function' && ref.current) {
      // Force update parent by triggering a re-render when counts change
      const event = new CustomEvent('tasksCountChanged', {
        detail: { pendingCount, overdueCount }
      });
      window.dispatchEvent(event);
    }
  }, [pendingCount, overdueCount, ref]);

  // Filter tasks - only root tasks (hierarchy handled by HierarchicalTaskItem)
  const filteredTasks = tasks
    .filter(task => !task.parent_task_id) // Only root tasks
    .filter(task => {
      if (filterStatus === 'all') return true;
      return task.status === filterStatus;
    });

  // Deleting a task confirms through ConfirmDialog (was window.confirm).
  const handleDelete = (taskId: string) => setDeleteId(taskId);

  const deleteConfirmMessage = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    const hasSubtasks = task?.has_subtasks || false;
    
    let confirmMessage = t('tasks.messages.deleteConfirm');
    if (hasSubtasks) {
      confirmMessage = t('tasks.messages.deleteWithSubtasksConfirm', { 
        count: task?.subtask_count || 0 
      }) || `Esta tarefa tem ${task?.subtask_count} subtarefa(s). Deletar todas?`;
    }
    
    return confirmMessage;
  };

  const handleAddSubtask = (parentTask: PipelineTask) => {
    if (onAddSubtask) {
      onAddSubtask(parentTask);
    }
  };

  const handleMoveTask = async (taskId: string, newParentId: string | null) => {
    await moveTask(taskId, newParentId);
  };

  // Flatten all tasks for passing to HierarchicalTaskItem
  const flattenTasks = (tasksList: PipelineTask[]): PipelineTask[] => {
    const result: PipelineTask[] = [];
    const flatten = (task: PipelineTask) => {
      result.push(task);
      if (task.subtasks && task.subtasks.length > 0) {
        task.subtasks.forEach(flatten);
      }
    };
    tasksList.forEach(flatten);
    return result;
  };

  const allFlatTasks = flattenTasks(tasks);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-base">{t('tasks.title')}</h3>
          <span className="text-muted-foreground text-sm tabular-nums">({filteredTasks.length})</span>
          {pendingCount > 0 && (
            <Badge variant="info" size="sm">
              {pendingCount} {t('tasks.pending')}
            </Badge>
          )}
          {overdueCount > 0 && (
            <Badge variant="error" size="sm">
              {overdueCount} {t('tasks.overdue')}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Filter */}
          <Select
            items={['all', 'pending', 'overdue', 'completed'].map(v => ({ value: v, label: t(`tasks.filters.${v}`) }))}
            value={filterStatus}
            onValueChange={value => value != null && setFilterStatus(value)}
          >
            <SelectTrigger size="sm" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              <SelectItem value="all">{t('tasks.filters.all')}</SelectItem>
              <SelectItem value="pending">{t('tasks.filters.pending')}</SelectItem>
              <SelectItem value="overdue">{t('tasks.filters.overdue')}</SelectItem>
              <SelectItem value="completed">{t('tasks.filters.completed')}</SelectItem>
            </SelectPopup>
          </Select>

          {/* Create button */}
          <Button onClick={onCreateClick} size="sm">
            <Plus />
            {t('tasks.newTask')}
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col gap-2" aria-busy="true">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
              <Skeleton className="size-4 rounded" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-3.5 w-48" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredTasks.length === 0 && (
        <Empty className="rounded-xl border border-dashed p-8 md:p-8">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ListTodo />
            </EmptyMedia>
            <EmptyDescription>{t('tasks.noTasks')}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={onCreateClick} variant="outline" size="sm">
              <Plus />
              {t('tasks.createFirstTask')}
            </Button>
          </EmptyContent>
        </Empty>
      )}

      {/* Tasks list with hierarchy */}
      {!loading && filteredTasks.length > 0 && (
        <div className="space-y-2">
          {filteredTasks.map(task => (
            <HierarchicalTaskItem
              key={task.id}
              task={task}
              depth={0}
              onEdit={onEditClick}
              onDelete={handleDelete}
              onComplete={completeTask}
              onReopen={reopenTask}
              onAddSubtask={handleAddSubtask}
              onMoveTask={handleMoveTask}
              disabled={deleting}
              allTasks={allFlatTasks}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={open => !open && !deleting && setDeleteId(null)}
        title={t('tasks.delete')}
        description={deleteId ? deleteConfirmMessage(deleteId) : undefined}
        cancelLabel={t('tasks.form.cancel')}
        confirmLabel={t('tasks.delete')}
        onConfirm={async () => {
          if (deleteId) await deleteTask(deleteId);
          setDeleteId(null);
        }}
        loading={deleting}
        variant="destructive"
      />
    </div>
  );
});

PipelineTasksList.displayName = 'PipelineTasksList';

export default PipelineTasksList;
