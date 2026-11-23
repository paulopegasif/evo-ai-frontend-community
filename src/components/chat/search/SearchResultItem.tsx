import type React from 'react';
import { CommandItem } from '@/components/ui/command';

interface SearchResultItemProps {
  /** Stable, unique value for the option (e.g. `conversation-12`). */
  value: string;
  icon: React.ReactNode;
  onSelect: () => void;
  children: React.ReactNode;
}

/**
 * One option row of the global search list. Click or Enter (when highlighted
 * with the arrow keys from the search input) runs `onSelect`.
 */
export default function SearchResultItem({ value, icon, onSelect, children }: SearchResultItemProps) {
  return (
    <CommandItem
      value={value}
      onClick={onSelect}
      className="cursor-pointer items-start gap-2.5 rounded-md px-2 py-2"
    >
      <span
        aria-hidden="true"
        className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground [&_svg]:size-3.5"
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </CommandItem>
  );
}
