import { useCallback, useMemo, useState } from 'react';
import { Check, ChevronsUpDown, GitBranch } from '@/components/icons';
import { useLanguage } from '@/hooks/useLanguage';
import { Badge } from '@/components/ui/badge';
import { Command, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverPopup, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Pipeline } from '@/types/analytics';

interface PipelineSwitcherProps {
  pipelines: Pipeline[];
  selectedPipeline?: Pipeline | null;
  onSwitchPipeline: (pipelineId: string) => void;
  className?: string;
}

// Pipeline accent colors are a categorical palette (first stage color, else by type).
const getPipelineColor = (pipeline: Pipeline) => {
  if (pipeline.stages && pipeline.stages.length > 0) return pipeline.stages[0].color;
  switch (pipeline.pipeline_type) {
    case 'sales':
      return '#10b981';
    case 'support':
      return '#3b82f6';
    case 'marketing':
      return '#8b5cf6';
    default:
      return '#6366f1';
  }
};

function PipelineMark({ pipeline }: { pipeline?: Pipeline | null }) {
  return (
    <span
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-lg text-white',
        !pipeline && 'bg-muted text-muted-foreground',
      )}
      style={pipeline ? { backgroundColor: getPipelineColor(pipeline) } : undefined}
    >
      <GitBranch className="size-4" />
    </span>
  );
}

export default function PipelineSwitcher({
  pipelines,
  selectedPipeline,
  onSwitchPipeline,
  className,
}: PipelineSwitcherProps) {
  const { t } = useLanguage('pipelines');
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredPipelines = useMemo(
    () => pipelines.filter(pipeline => pipeline.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [pipelines, searchQuery],
  );

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (!open) setSearchQuery('');
  }, []);

  const handlePipelineSelect = useCallback(
    (pipelineId: string) => {
      onSwitchPipeline(pipelineId);
      setSearchQuery('');
      setIsOpen(false);
    },
    [onSwitchPipeline],
  );

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        className={cn(
          'flex w-full max-w-full items-center gap-3 rounded-xl border bg-background px-3 py-2.5 text-left text-sm shadow-xs/5 outline-none transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring sm:max-w-md',
          className,
        )}
      >
        <PipelineMark pipeline={selectedPipeline} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{selectedPipeline?.name || t('pipelineSwitcher.loading')}</span>
          <span className="block truncate text-muted-foreground text-xs">
            {selectedPipeline
              ? selectedPipeline.description || t('pipelineSwitcher.noDescription')
              : t('pipelineSwitcher.waiting')}
          </span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverPopup
        align="start"
        className="w-[min(26rem,calc(100vw-2rem))] [--viewport-inline-padding:0] **:data-[slot=popover-viewport]:py-0"
      >
        <Command
          filter={null}
          value={searchQuery}
          onValueChange={(value, details) => {
            if (details.reason === 'item-press') return;
            setSearchQuery(value);
          }}
        >
          <CommandInput placeholder={t('pipelineSwitcher.search')} />
          {filteredPipelines.length === 0 ? (
            <p className="border-t px-3 py-6 text-center text-muted-foreground text-sm">
              {searchQuery ? t('pipelineSwitcher.noResults') : t('pipelineSwitcher.noAvailable')}
            </p>
          ) : (
            <CommandList className="max-h-80 border-t">
              {filteredPipelines.map(pipeline => (
                <CommandItem
                  key={pipeline.id}
                  value={String(pipeline.id)}
                  onClick={() => handlePipelineSelect(pipeline.id.toString())}
                  className="items-start gap-3 py-2"
                >
                  <PipelineMark pipeline={pipeline} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-medium">{pipeline.name}</span>
                      <Badge variant={pipeline.is_active ? 'success' : 'secondary'} size="sm">
                        {pipeline.is_active ? t('pipelineSwitcher.active') : t('pipelineSwitcher.inactive')}
                      </Badge>
                    </span>
                    {pipeline.description && (
                      <span className="block truncate text-muted-foreground text-xs">{pipeline.description}</span>
                    )}
                    <span className="mt-0.5 flex items-center gap-3 text-muted-foreground text-xs tabular-nums">
                      <span>{t('pipelineSwitcher.conversationsCount', { count: pipeline.conversations_count || 0 })}</span>
                      <span>{t('pipelineSwitcher.stagesCount', { count: pipeline.stages?.length || 0 })}</span>
                      <span className="capitalize">{pipeline.pipeline_type}</span>
                    </span>
                  </span>
                  <Check
                    className={cn('mt-2 size-4 shrink-0', selectedPipeline?.id === pipeline.id ? 'opacity-100' : 'opacity-0')}
                  />
                </CommandItem>
              ))}
            </CommandList>
          )}
        </Command>
      </PopoverPopup>
    </Popover>
  );
}
