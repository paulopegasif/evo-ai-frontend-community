import { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { PipelineStage as BasePipelineStage } from '@/types/analytics';

interface PipelineStage extends BasePipelineStage {
  conversations?: Array<unknown>;
}

interface ReorderStagesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: PipelineStage[];
  onSubmit: (orderedStages: PipelineStage[]) => void;
  loading: boolean;
}

export default function ReorderStagesModal({
  open,
  onOpenChange,
  stages,
  onSubmit,
  loading,
}: ReorderStagesModalProps) {
  const { t } = useLanguage('pipelines');
  const [orderedStages, setOrderedStages] = useState<PipelineStage[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Initialize stages when modal opens
  useEffect(() => {
    if (open && stages.length > 0) {
      // Sort stages by position if available, otherwise by id
      const sortedStages = [...stages].sort((a, b) => {
        if (a.position !== undefined && b.position !== undefined) {
          return a.position - b.position;
        }
        return a.id.localeCompare(b.id);
      });
      setOrderedStages(sortedStages);
    }
  }, [open, stages]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const newOrderedStages = [...orderedStages];
    const draggedStage = newOrderedStages[draggedIndex];

    // Remove dragged item
    newOrderedStages.splice(draggedIndex, 1);

    // Insert at new position
    newOrderedStages.splice(dropIndex, 0, draggedStage);

    setOrderedStages(newOrderedStages);
    setDraggedIndex(null);
  };

  const moveStage = (fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;

    if (toIndex < 0 || toIndex >= orderedStages.length) return;

    const newOrderedStages = [...orderedStages];
    const stage = newOrderedStages[fromIndex];

    // Swap positions
    newOrderedStages[fromIndex] = newOrderedStages[toIndex];
    newOrderedStages[toIndex] = stage;

    setOrderedStages(newOrderedStages);
  };

  const handleSubmit = () => {
    // Add position property to stages based on their order
    const stagesWithPosition = orderedStages.map((stage, index) => ({
      ...stage,
      position: index + 1,
    }));

    onSubmit(stagesWithPosition);
  };

  const hasChanges = JSON.stringify(orderedStages.map(s => s.id)) !== JSON.stringify(stages.map(s => s.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-h-[85vh] max-w-md">
        <DialogHeader>
          <DialogTitle>{t('reorderStages.title')}</DialogTitle>
          <DialogDescription>{t('reorderStages.description')}</DialogDescription>
        </DialogHeader>

        <DialogPanel>
          {orderedStages.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground text-sm">{t('reorderStages.noStages')}</p>
          ) : (
            <ol className="flex flex-col gap-1.5">
              {orderedStages.map((stage, index) => {
                const count = stage.conversations?.length || 0;
                return (
                  <li
                    key={stage.id}
                    className={cn(
                      'group flex cursor-grab items-center gap-3 rounded-lg border bg-card px-2.5 py-2 transition-[opacity,border-color] hover:border-ring/40 active:cursor-grabbing',
                      draggedIndex === index && 'opacity-48',
                    )}
                    draggable
                    onDragStart={e => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={e => handleDrop(e, index)}
                  >
                    <GripVertical className="size-4 shrink-0 text-muted-foreground/72" aria-hidden="true" />
                    <span className="w-5 shrink-0 text-center text-muted-foreground text-xs tabular-nums">{index + 1}</span>
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: stage.color }} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-sm">{stage.name}</div>
                      <div className="truncate text-muted-foreground text-xs">
                        {stage.description ? `${stage.description} · ` : ''}
                        {t('reorderStages.conversationsCount', { count, plural: count !== 1 ? 's' : '' })}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => moveStage(index, 'up')}
                        disabled={index === 0}
                        aria-label={t('reorderStages.moveUp')}
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => moveStage(index, 'down')}
                        disabled={index === orderedStages.length - 1}
                        aria-label={t('reorderStages.moveDown')}
                      >
                        <ArrowDown />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </DialogPanel>

        <DialogFooter>
          <DialogClose render={<Button variant="ghost" disabled={loading} />}>{t('reorderStages.cancel')}</DialogClose>
          <Button onClick={handleSubmit} disabled={!hasChanges} loading={loading}>
            {t('reorderStages.save')}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
