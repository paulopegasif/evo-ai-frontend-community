import { Card, CardHeader, CardPanel } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface IntegrationLoadingStateProps {
  count?: number;
  type?: 'cards' | 'table' | 'detail';
  className?: string;
}

/** Skeletons shaped like the integration grid, list and detail page. */
export default function IntegrationLoadingState({
  count = 6,
  type = 'cards',
  className = '',
}: IntegrationLoadingStateProps) {
  if (type === 'cards') {
    return (
      <div
        className={cn('grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3', className)}
        aria-busy="true"
      >
        {Array.from({ length: count }, (_, i) => (
          <Card key={i} className="gap-0">
            <div className="flex items-start gap-3 p-5">
              <Skeleton className="size-10 shrink-0 rounded-lg" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-2/3" />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t px-5 py-3">
              <Skeleton className="h-7 w-24 rounded-lg" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div
        className={cn('overflow-hidden rounded-xl border bg-card shadow-xs/5', className)}
        aria-busy="true"
      >
        <div className="border-b px-4 py-3">
          <Skeleton className="h-4 w-40" />
        </div>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-b px-4 py-3 last:border-0">
            <Skeleton className="size-9 shrink-0 rounded-lg" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-48 max-w-full" />
              <Skeleton className="h-3 w-32 max-w-full" />
            </div>
            <Skeleton className="hidden h-5 w-16 rounded-full sm:block" />
            <Skeleton className="size-7 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'detail') {
    return (
      <div className={cn('flex flex-col gap-6', className)} aria-busy="true">
        {/* Header: brand tile, title + status, description, actions */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <Skeleton className="size-12 shrink-0 rounded-xl" />
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-44" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-72 max-w-full" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-28 rounded-lg" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </CardHeader>
            <CardPanel className="flex flex-col gap-5">
              {[32, 40].map(w => (
                <div key={w} className="flex flex-col gap-2">
                  <Skeleton className="h-4" style={{ width: `${w * 4}px` }} />
                  <Skeleton className="h-8 w-full rounded-lg" />
                </div>
              ))}
            </CardPanel>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-24" />
            </CardHeader>
            <CardPanel className="flex flex-col gap-3">
              {[0, 1, 2].map(i => (
                <div key={i} className="flex justify-between gap-4">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-14" />
                </div>
              ))}
            </CardPanel>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}
