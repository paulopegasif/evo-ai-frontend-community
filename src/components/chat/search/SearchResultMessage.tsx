import { MessageCircle } from 'lucide-react';
import type { SearchMessageResult } from '@/types/chat/search';
import { highlightMatch } from './searchHighlight';
import SearchResultItem from './SearchResultItem';

interface Props {
  item: SearchMessageResult;
  query: string;
  onSelect: (item: SearchMessageResult) => void;
}

export default function SearchResultMessage({ item, query, onSelect }: Props) {
  const senderName = item.sender?.available_name || item.sender?.name || 'Unknown';
  const inboxName = item.inbox?.name;
  const content = item.content ?? '';

  return (
    <SearchResultItem value={`message-${item.id}`} icon={<MessageCircle />} onSelect={() => onSelect(item)}>
      {content && <p className="line-clamp-2 text-sm">{highlightMatch(content, query)}</p>}
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
        <span className="truncate">{senderName}</span>
        {item.conversation_id != null && <span className="tabular-nums">· #{item.conversation_id}</span>}
        {inboxName && <span className="truncate">· {inboxName}</span>}
      </div>
    </SearchResultItem>
  );
}
