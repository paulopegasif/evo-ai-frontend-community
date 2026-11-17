import { useMemo, useSyncExternalStore } from 'react';
import {
  getConversationDraftsRaw,
  parseConversationDrafts,
  subscribeConversationDrafts,
} from './conversationDrafts';

/** Live map of conversationId -> unsent draft text for the given user. */
export const useConversationDrafts = (userId?: string | number | null): Record<string, string> => {
  const raw = useSyncExternalStore(
    subscribeConversationDrafts,
    () => getConversationDraftsRaw(userId),
    () => null,
  );
  return useMemo(() => parseConversationDrafts(raw), [raw]);
};
