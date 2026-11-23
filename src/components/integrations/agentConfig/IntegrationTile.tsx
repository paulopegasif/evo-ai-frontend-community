import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface IntegrationTileProps {
  icon: ReactNode;
  name: ReactNode;
  description: ReactNode;
  /** Status badge rendered next to the name. */
  status?: ReactNode;
  /** Action buttons at the bottom of the tile. */
  actions?: ReactNode;
  muted?: boolean;
}

/** Compact catalog tile for agent integrations and MCP servers. */
export function IntegrationTile({
  icon,
  name,
  description,
  status,
  actions,
  muted = false,
}: IntegrationTileProps) {
  return (
    <Card
      className={cn(
        'flex h-full flex-col gap-4 p-4 transition-colors hover:border-primary/40',
        muted && 'bg-muted/40',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border bg-background shadow-xs/5 [&_img]:size-6 [&_svg]:size-6">
          {icon}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate font-semibold text-sm">{name}</h4>
            {status}
          </div>
          <p className="line-clamp-3 text-muted-foreground text-xs leading-relaxed">{description}</p>
        </div>
      </div>
      {actions && <div className="mt-auto flex flex-col gap-2 sm:flex-row">{actions}</div>}
    </Card>
  );
}

export function IntegrationTileGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className="flex flex-col gap-4 p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="size-11 shrink-0 rounded-lg" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-1/3 rounded" />
              <Skeleton className="h-3 w-full rounded" />
              <Skeleton className="h-3 w-2/3 rounded" />
            </div>
          </div>
          <Skeleton className="h-8 w-full rounded-lg" />
        </Card>
      ))}
    </div>
  );
}
