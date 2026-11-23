import { User } from '@/components/icons';
import type { SearchContactResult } from '@/types/chat/search';
import { highlightMatch } from './searchHighlight';
import SearchResultItem from './SearchResultItem';

interface Props {
  item: SearchContactResult;
  query: string;
  onSelect: (item: SearchContactResult) => void;
}

export default function SearchResultContact({ item, query, onSelect }: Props) {
  const secondary = item.email || item.phone_number || item.identifier || '';

  return (
    <SearchResultItem value={`contact-${item.id}`} icon={<User />} onSelect={() => onSelect(item)}>
      <div className="truncate font-medium text-sm">{highlightMatch(item.name, query)}</div>
      {secondary && (
        <p className="truncate text-muted-foreground text-xs">{highlightMatch(secondary, query)}</p>
      )}
    </SearchResultItem>
  );
}
