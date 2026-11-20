import type { ComponentType, ReactNode } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useLanguage } from '@/hooks/useLanguage';

/**
 * Building blocks shared by the custom tool and custom MCP server lists:
 * a clickable resource card, its grid skeleton and the cards/table toggle.
 */

export type ResourceView = 'cards' | 'table';

interface ResourceCardProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  /** Accessible label of the full-card button that opens the details. */
  openLabel: string;
  onOpen: () => void;
  badges?: ReactNode;
  description: string;
  /** Monospace line (endpoint / URL). */
  location?: { icon: ComponentType<{ className?: string }>; value: string };
  tags?: string[];
  meta?: ReactNode;
  actions: ReactNode;
}

export function ResourceCard({
  icon: Icon,
  title,
  openLabel,
  onOpen,
  badges,
  description,
  location,
  tags,
  meta,
  actions,
}: ResourceCardProps) {
  const LocationIcon = location?.icon;
  return (
    <Card className="group relative flex flex-col gap-3 p-4 transition-colors hover:border-primary/40">
      <button
        type="button"
        className="absolute inset-0 rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={openLabel}
        onClick={onOpen}
      />
      <div className="pointer-events-none flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
          <Icon className="size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="truncate font-semibold text-sm">{title}</h3>
          {badges && <div className="flex flex-wrap items-center gap-1.5">{badges}</div>}
        </div>
      </div>

      <p className="pointer-events-none line-clamp-2 min-h-8 text-muted-foreground text-xs">
        {description}
      </p>

      {location && LocationIcon && (
        <div className="pointer-events-none flex min-w-0 items-center gap-1.5 rounded-md bg-muted/60 px-2 py-1 text-muted-foreground">
          <LocationIcon className="size-3 shrink-0" />
          <span className="truncate font-mono text-[11px]">{location.value}</span>
        </div>
      )}

      {tags && tags.length > 0 && (
        <div className="pointer-events-none flex flex-wrap gap-1">
          {tags.slice(0, 3).map(tag => (
            <Badge key={tag} variant="secondary" size="sm">
              {tag}
            </Badge>
          ))}
          {tags.length > 3 && (
            <Badge variant="secondary" size="sm">
              +{tags.length - 3}
            </Badge>
          )}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3">
        <div className="pointer-events-none min-w-0 truncate text-muted-foreground text-xs">
          {meta}
        </div>
        <div className="relative flex shrink-0 items-center gap-1">{actions}</div>
      </div>
    </Card>
  );
}

export function ResourceGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
      aria-busy="true"
    >
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className="flex flex-col gap-3 p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="size-10 rounded-lg" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-14 rounded-sm" />
            </div>
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-6 w-full rounded-md" />
          <div className="flex items-center justify-between border-t pt-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-20" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export function ResourceViewToggle({
  value,
  onChange,
}: {
  value: ResourceView;
  onChange: (view: ResourceView) => void;
}) {
  const { t } = useLanguage('agents');
  return (
    <ToggleGroup
      variant="outline"
      size="sm"
      value={[value]}
      onValueChange={next => next[0] && onChange(next[0] as ResourceView)}
    >
      <ToggleGroupItem value="cards" aria-label={t('view.grid')}>
        <LayoutGrid />
      </ToggleGroupItem>
      <ToggleGroupItem value="table" aria-label={t('view.table')}>
        <List />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

const METHOD_VARIANT: Record<string, 'info' | 'success' | 'warning' | 'error' | 'secondary'> = {
  GET: 'info',
  POST: 'success',
  PUT: 'warning',
  PATCH: 'warning',
  DELETE: 'error',
};

export function HttpMethodBadge({ method }: { method: string }) {
  const upper = method.toUpperCase();
  return (
    <Badge variant={METHOD_VARIANT[upper] ?? 'secondary'} size="sm" className="font-mono">
      {upper}
    </Badge>
  );
}

/** Titled block used inside the custom tool / MCP details dialogs. */
export function DetailSection({
  icon: Icon,
  title,
  count,
  isEmpty = false,
  emptyLabel,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  count?: number;
  isEmpty?: boolean;
  emptyLabel?: string;
  children?: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <h3 className="flex items-center gap-2 font-medium text-sm">
        <Icon className="size-4 text-muted-foreground" />
        {title}
        {count !== undefined && (
          <Badge variant="secondary" size="sm" className="tabular-nums">
            {count}
          </Badge>
        )}
      </h3>
      {isEmpty ? (
        <p className="rounded-lg border border-dashed px-3 py-4 text-center text-muted-foreground text-xs">
          {emptyLabel}
        </p>
      ) : (
        children
      )}
    </section>
  );
}

export function DetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="min-w-0 text-sm">{children}</dd>
    </div>
  );
}

/** Key/value rows (headers, environments) in a bordered list. */
export function KeyValueList({ entries, mask }: { entries: [string, unknown][]; mask?: boolean }) {
  return (
    <dl className="divide-y overflow-hidden rounded-lg border">
      {entries.map(([key, value]) => {
        const text = String(value);
        return (
          <div key={key} className="flex items-center justify-between gap-4 px-3 py-2">
            <dt className="truncate font-medium text-sm">{key}</dt>
            <dd
              className="max-w-[60%] truncate font-mono text-muted-foreground text-xs"
              title={mask ? undefined : text}
            >
              {mask ? '••••••••' : text}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
