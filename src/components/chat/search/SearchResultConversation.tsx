import { MessageSquare } from 'lucide-react';
import type { SearchConversationResult } from '@/types/chat/search';
import { highlightMatch } from './searchHighlight';
import SearchResultItem from './SearchResultItem';

interface Props {
  item: SearchConversationResult;
  query: string;
  onSelect: (item: SearchConversationResult) => void;
}

export default function SearchResultConversation({ item, query, onSelect }: Props) {
  const contactName = item.contact?.name ?? 'Unknown contact';
  const snippet = item.message?.content ?? '';
  const inboxName = item.inbox?.name;

  return (
    <SearchResultItem
      value={`conversation-${item.id}`}
      icon={<MessageSquare />}
      onSelect={() => onSelect(item)}
    >
      <div className="flex items-center gap-2">
        <span className="truncate font-medium text-sm">{highlightMatch(contactName, query)}</span>
        <span className="shrink-0 text-muted-foreground text-xs tabular-nums">#{item.display_id}</span>
        {inboxName && (
          <span className="ms-auto truncate text-muted-foreground text-xs">{inboxName}</span>
        )}
      </div>
      {snippet && (
        <p className="truncate text-muted-foreground text-xs">{highlightMatch(snippet, query)}</p>
      )}
    </SearchResultItem>
  );
}
