import { useState, type DragEvent, type ReactNode } from 'react';
import { Copy, Edit, Inbox, MoreHorizontal, Plus, SearchX, Trash2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from '@/components/ui/menu';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import type { PipelineStage } from '@/types/analytics';
import { cn } from '@/utils/cn';
import { formatCurrency } from './kanbanUtils';

export interface KanbanColumnProps {
  stage: PipelineStage;
  visibleCount: number;
  totalCount: number;
  totalValue: number;
  hasActiveFilters: boolean;
  isDragActive: boolean;
  onDrop: (e: DragEvent, stageId: string) => void;
  onAddItem: (stage: PipelineStage) => void;
  onEditStage: (stage: PipelineStage) => void;
  onDeleteStage: (stage: PipelineStage) => void;
  onCopyId: (id: string) => void;
  children: ReactNode;
}

export default function KanbanColumn({
  stage,
  visibleCount,
  totalCount,
  totalValue,
  hasActiveFilters,
  isDragActive,
  onDrop,
  onAddItem,
  onEditStage,
  onDeleteStage,
  onCopyId,
  children,
}: KanbanColumnProps) {
  const { t } = useLanguage('pipelines');
  const { t: tc } = useLanguage('common');
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    if (!isOver) setIsOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setIsOver(false);
  };

  const handleDrop = (e: DragEvent) => {
    setIsOver(false);
    onDrop(e, stage.id);
  };

  return (
    <section
      aria-label={stage.name}
      className={cn(
        'flex h-full w-72 shrink-0 flex-col rounded-2xl border bg-muted/48 transition-colors dark:bg-muted/24',
        isDragActive && 'border-dashed',
        isOver && 'border-primary/48 bg-primary/4 dark:bg-primary/8',
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column header */}
      <header className="flex shrink-0 items-start justify-between gap-2 px-3 pt-3 pb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: stage.color }} aria-hidden="true" />
            <h3 className="truncate font-semibold text-foreground text-sm">{stage.name}</h3>
            <Badge variant="secondary" className="tabular-nums">
              {hasActiveFilters ? `${visibleCount}/${totalCount}` : totalCount}
            </Badge>
          </div>
          <p className={cn('mt-1 ps-4.5 text-xs tabular-nums', totalValue > 0 ? 'font-medium text-foreground/80' : 'text-muted-foreground')}>
            R$ {formatCurrency(totalValue)}
          </p>
        </div>

        <div className="-me-1 flex shrink-0 items-center">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => onAddItem(stage)}
                  aria-label={t('kanban.header.addItem')}
                />
              }
            >
              <Plus />
            </TooltipTrigger>
            <TooltipPopup>{t('kanban.header.addItem')}</TooltipPopup>
          </Tooltip>
          <Menu>
            <MenuTrigger render={<Button variant="ghost" size="icon-xs" aria-label={tc('base.table.actions')} />}>
              <MoreHorizontal />
            </MenuTrigger>
            <MenuPopup align="end">
              <MenuItem onClick={() => onEditStage(stage)}>
                <Edit />
                {t('kanban.stage.editStage')}
              </MenuItem>
              <MenuItem onClick={() => onCopyId(String(stage.id))}>
                <Copy />
                {t('kanban.copyId')}
              </MenuItem>
              <MenuSeparator />
              <MenuItem variant="destructive" onClick={() => onDeleteStage(stage)}>
                <Trash2 />
                {t('kanban.stage.deleteStage')}
              </MenuItem>
            </MenuPopup>
          </Menu>
        </div>
      </header>

      {/* Cards drop zone */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
        {children}

        {visibleCount === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-3 py-8 text-center text-muted-foreground text-xs">
            {hasActiveFilters ? <SearchX className="size-4 opacity-72" /> : <Inbox className="size-4 opacity-72" />}
            {hasActiveFilters ? t('kanban.search.noResults') : t('kanban.stage.noConversations')}
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="w-full shrink-0 text-muted-foreground"
          onClick={() => onAddItem(stage)}
        >
          <Plus />
          {t('kanban.item.addItemShort')}
        </Button>
      </div>
    </section>
  );
}
