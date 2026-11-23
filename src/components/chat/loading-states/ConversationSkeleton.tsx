import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface ConversationSkeletonProps {
  count?: number;
}

const NAME_WIDTHS = ['w-32', 'w-24', 'w-36', 'w-28', 'w-20'];
const PREVIEW_WIDTHS = ['w-48', 'w-40', 'w-52', 'w-36', 'w-44'];

/** Shaped like a conversation row: avatar, inbox line, name + time, preview. */
const ConversationSkeleton: React.FC<ConversationSkeletonProps> = ({ count = 5 }) => {
  return (
    <div aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-start gap-2.5 border-border/60 border-b px-3 py-2.5">
          <Skeleton className="mt-0.5 size-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
            <Skeleton className="h-3 w-20" />
            <div className="flex items-center justify-between gap-2">
              <Skeleton className={`h-3.5 ${NAME_WIDTHS[index % NAME_WIDTHS.length]}`} />
              <Skeleton className="h-3 w-8" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Skeleton className={`h-3 ${PREVIEW_WIDTHS[index % PREVIEW_WIDTHS.length]}`} />
              {index % 3 === 0 && <Skeleton className="size-4.5 rounded-full" />}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ConversationSkeleton;
