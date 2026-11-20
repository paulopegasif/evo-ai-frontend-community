import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface MessageSkeletonProps {
  count?: number;
}

// Fixed patterns so the placeholders don't shift between renders.
const messagePatterns = [
  { isOutgoing: false, lines: ['w-56', 'w-32'] },
  { isOutgoing: true, lines: ['w-44'] },
  { isOutgoing: false, lines: ['w-64', 'w-48', 'w-24'] },
  { isOutgoing: false, lines: ['w-52'] },
  { isOutgoing: true, lines: ['w-60', 'w-28'] },
];

/** Bubble-shaped placeholders, alternating incoming and outgoing. */
const MessageSkeleton: React.FC<MessageSkeletonProps> = ({ count = 5 }) => {
  return (
    <div aria-hidden="true" className="space-y-3 p-4">
      {Array.from({ length: count }).map((_, index) => {
        const { isOutgoing, lines } = messagePatterns[index % messagePatterns.length];
        return (
          <div key={index} className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[70%] space-y-1.5 rounded-2xl border px-3 py-2.5 ${
                isOutgoing ? 'rounded-br-md border-primary/16 bg-primary/8' : 'rounded-bl-md bg-card'
              }`}
            >
              {lines.map((width, lineIndex) => (
                <Skeleton key={lineIndex} className={`h-3.5 max-w-full ${width}`} />
              ))}
              <Skeleton className={`h-2.5 w-10 ${isOutgoing ? 'ms-auto' : ''}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MessageSkeleton;
