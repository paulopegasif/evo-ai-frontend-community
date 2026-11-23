import { Skeleton } from '@/components/ui/skeleton';

const COLUMNS = [3, 2, 4, 1];

/** Loading state shaped like the board: header, toolbar and card columns. */
export default function KanbanBoardSkeleton() {
  return (
    <div className="flex h-full w-full min-w-0 flex-col" aria-busy="true">
      <div className="shrink-0 border-b bg-background px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-lg" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3.5 w-64" />
          </div>
          <div className="ms-auto hidden items-center gap-6 md:flex">
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Skeleton className="h-9 w-72 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden p-4 md:p-6">
        {COLUMNS.map((cards, col) => (
          <div key={col} className="flex w-72 shrink-0 flex-col gap-2 rounded-2xl border bg-muted/48 p-2 dark:bg-muted/24">
            <div className="flex flex-col gap-1.5 px-1 pt-1 pb-1.5">
              <div className="flex items-center gap-2">
                <Skeleton className="size-2.5 rounded-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-6" />
              </div>
              <Skeleton className="ms-4.5 h-3 w-16" />
            </div>
            {Array.from({ length: cards }, (_, i) => (
              <div key={i} className="flex flex-col gap-3 rounded-xl border bg-card p-3">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="size-8 rounded-full" />
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-3 w-full" />
                <div className="flex gap-1">
                  <Skeleton className="h-4 w-14" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
