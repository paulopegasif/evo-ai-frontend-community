import type { ReactNode } from 'react';
import { Wrench } from '@/components/icons';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';

export interface ToolChecklistItem {
  key: string;
  name: string;
  description?: string;
}

interface ToolChecklistProps {
  tools: ToolChecklistItem[];
  isSelected: (key: string) => boolean;
  onToggle: (key: string) => void;
  loading?: boolean;
  emptyLabel?: ReactNode;
}

/** Scrollable checkbox list of MCP tools, shared by every integration dialog. */
export function ToolChecklist({
  tools,
  isSelected,
  onToggle,
  loading = false,
  emptyLabel,
}: ToolChecklistProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-1 rounded-lg border p-1" aria-busy="true">
        {[0, 1, 2].map(i => (
          <div key={i} className="flex items-start gap-3 px-2.5 py-2">
            <Skeleton className="size-4 rounded-sm" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-3.5 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (tools.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center text-muted-foreground text-sm">
        <Wrench className="size-4" />
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="flex max-h-64 flex-col overflow-y-auto rounded-lg border p-1">
      {tools.map(tool => (
        <label
          key={tool.key}
          className="flex cursor-pointer items-start gap-3 rounded-md px-2.5 py-2 transition-colors hover:bg-accent has-data-checked:bg-primary/4"
        >
          <Checkbox
            className="mt-0.5"
            checked={isSelected(tool.key)}
            onCheckedChange={() => onToggle(tool.key)}
          />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="break-all font-medium font-mono text-xs">{tool.name}</span>
            {tool.description && (
              <span className="line-clamp-2 text-muted-foreground text-xs">{tool.description}</span>
            )}
          </span>
        </label>
      ))}
    </div>
  );
}
