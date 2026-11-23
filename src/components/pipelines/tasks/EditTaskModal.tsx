import { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { UpdateTaskData, PipelineTask } from '@/types/analytics';
import type { User } from '@/types/users';

const TASK_TYPES = ['call', 'email', 'meeting', 'follow_up', 'note', 'other'] as const;
const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

interface EditTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: PipelineTask | null;
  onSubmit: (taskId: string, data: UpdateTaskData) => Promise<void>;
  loading?: boolean;
  availableUsers?: User[];
}

export default function EditTaskModal({
  open,
  onOpenChange,
  task,
  onSubmit,
  loading = false,
  availableUsers = [],
}: EditTaskModalProps) {
  const { t } = useLanguage('pipelines');

  const [formData, setFormData] = useState<UpdateTaskData>({
    title: '',
    description: '',
    task_type: 'call',
    priority: 'medium',
    due_date: '',
    assigned_to_id: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form when task changes
  useEffect(() => {
    if (open && task) {
      // Format due_date for datetime-local input
      let formattedDueDate = '';
      if (task.due_date) {
        try {
          const date = new Date(task.due_date);
          // Format to YYYY-MM-DDTHH:mm
          formattedDueDate = date.toISOString().slice(0, 16);
        } catch (e) {
          console.error('Error formatting due date:', e);
        }
      }

      setFormData({
        title: task.title || '',
        description: task.description || '',
        task_type: task.task_type,
        priority: task.priority,
        due_date: formattedDueDate,
        assigned_to_id: task.assigned_to_id || '',
      });
      setErrors({});
    }
  }, [open, task]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      newErrors.title = t('tasks.form.errors.titleRequired');
    }

    // Validate due_date against parent task if it exists
    if (task?.parent_task?.due_date && formData.due_date) {
      const taskDueDate = new Date(formData.due_date);
      const parentDueDate = new Date(task.parent_task.due_date);
      if (taskDueDate > parentDueDate) {
        newErrors.due_date = t('tasks.form.errors.dueDateExceedsParent');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!task || !validateForm()) return;

    // Prepare data - only include changed fields
    const submitData: UpdateTaskData = {};

    if (formData.title?.trim() && formData.title !== task.title) {
      submitData.title = formData.title.trim();
    }

    if (formData.description !== task.description) {
      submitData.description = formData.description?.trim() || '';
    }

    if (formData.task_type && formData.task_type !== task.task_type) {
      submitData.task_type = formData.task_type;
    }

    if (formData.priority && formData.priority !== task.priority) {
      submitData.priority = formData.priority;
    }

    if (formData.due_date !== task.due_date) {
      submitData.due_date = formData.due_date || undefined;
    }

    // Allow removing assignment by sending empty string
    if (formData.assigned_to_id !== task.assigned_to_id) {
      submitData.assigned_to_id = formData.assigned_to_id?.trim() || undefined;
    }

    await onSubmit(task.id, submitData);
  };

  const updateField = (field: keyof UpdateTaskData, value: string | number | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('tasks.editModal.title')}</DialogTitle>
          <DialogDescription>{t('tasks.editModal.description')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="contents">
          <DialogPanel className="flex flex-col gap-4">
          {/* Title */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="title">
              {t('tasks.form.title')} <span className="text-destructive-foreground">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={e => updateField('title', e.target.value)}
              placeholder={t('tasks.form.titlePlaceholder')}
              aria-invalid={errors.title ? true : undefined}
              disabled={loading}
            />
            {errors.title && (
              <p className="text-destructive-foreground text-xs">{errors.title}</p>
            )}
          </div>

          {/* Type and Priority in row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Type */}
            <div className="flex flex-col gap-2">
              <Label>{t('tasks.form.type')}</Label>
              <Select
                items={TASK_TYPES.map(v => ({ value: v, label: t(`tasks.types.${v}`) }))}
                value={formData.task_type}
                onValueChange={value => value != null && updateField('task_type', value as PipelineTask['task_type'])}
                disabled={loading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup>
                  <SelectItem value="call">{t('tasks.types.call')}</SelectItem>
                  <SelectItem value="email">{t('tasks.types.email')}</SelectItem>
                  <SelectItem value="meeting">{t('tasks.types.meeting')}</SelectItem>
                  <SelectItem value="follow_up">{t('tasks.types.follow_up')}</SelectItem>
                  <SelectItem value="note">{t('tasks.types.note')}</SelectItem>
                  <SelectItem value="other">{t('tasks.types.other')}</SelectItem>
                </SelectPopup>
              </Select>
            </div>

            {/* Priority */}
            <div className="flex flex-col gap-2">
              <Label>{t('tasks.form.priority')}</Label>
              <Select
                items={TASK_PRIORITIES.map(v => ({ value: v, label: t(`tasks.priority.${v}`) }))}
                value={formData.priority}
                onValueChange={value => value != null && updateField('priority', value as PipelineTask['priority'])}
                disabled={loading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup>
                  <SelectItem value="low">{t('tasks.priority.low')}</SelectItem>
                  <SelectItem value="medium">{t('tasks.priority.medium')}</SelectItem>
                  <SelectItem value="high">{t('tasks.priority.high')}</SelectItem>
                  <SelectItem value="urgent">{t('tasks.priority.urgent')}</SelectItem>
                </SelectPopup>
              </Select>
            </div>
          </div>

          {/* Due Date */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="due_date">{t('tasks.form.dueDate')}</Label>
            <Input
              id="due_date"
              type="datetime-local"
              value={formData.due_date}
              onChange={e => updateField('due_date', e.target.value)}
              disabled={loading}
            />
            {task?.parent_task?.due_date && (
              <p className="text-xs text-muted-foreground">
                {t('tasks.form.exactDueDate')}: {new Date(task.parent_task.due_date).toLocaleString('pt-BR')}
              </p>
            )}
            {errors.due_date && (
              <p className="text-destructive-foreground text-xs">{errors.due_date}</p>
            )}
          </div>

          {/* Assigned To */}
          {availableUsers && availableUsers.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label>{t('tasks.form.assignedTo')}</Label>
              <Select
                items={[
                  { value: 'none', label: t('tasks.form.none') || 'Nenhum' },
                  ...availableUsers.map(user => ({ value: user.id, label: user.name })),
                ]}
                value={formData.assigned_to_id || 'none'}
                onValueChange={value => value != null && updateField('assigned_to_id', value === 'none' ? '' : value)}
                disabled={loading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('tasks.form.assignedToPlaceholder') || 'Nenhum'} />
                </SelectTrigger>
                <SelectPopup>
                  <SelectItem value="none">{t('tasks.form.none') || 'Nenhum'}</SelectItem>
                  {availableUsers.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </div>
          )}

          {/* Description */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="description">{t('tasks.form.description')}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={e => updateField('description', e.target.value)}
              placeholder={t('tasks.form.descriptionPlaceholder')}
              rows={3}
              disabled={loading}
            />
          </div>

          </DialogPanel>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
              {t('tasks.form.cancel')}
            </Button>
            <Button type="submit" loading={loading}>
              {t('tasks.form.update')}
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}
