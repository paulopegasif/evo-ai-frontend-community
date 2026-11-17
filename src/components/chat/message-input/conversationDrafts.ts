// Unsent composer text per conversation, WhatsApp-style: switching conversations
// keeps what was typed in each one, and it survives a page reload. Stored in
// localStorage per user so a shared browser does not leak drafts between agents.

const STORAGE_PREFIX = 'evo_conversation_drafts';
const MAX_DRAFTS = 200;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

interface DraftEntry {
  content: string;
  updatedAt: number;
}

type DraftMap = Record<string, DraftEntry>;

const storageKey = (userId?: string | number | null) => `${STORAGE_PREFIX}:${userId ?? 'anonymous'}`;

// Change notification so the conversation list can show "Rascunho:" live.
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(fn => fn());

export const subscribeConversationDrafts = (fn: () => void): (() => void) => {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key?.startsWith(STORAGE_PREFIX)) fn();
  };
  window.addEventListener('storage', onStorage); // other tabs
  return () => {
    listeners.delete(fn);
    window.removeEventListener('storage', onStorage);
  };
};

/** Raw localStorage value: a cheap, stable snapshot for useSyncExternalStore. */
export const getConversationDraftsRaw = (userId?: string | number | null): string | null => {
  try {
    return localStorage.getItem(storageKey(userId));
  } catch {
    return null;
  }
};

/** conversationId -> draft text, parsed from a raw snapshot. */
export const parseConversationDrafts = (raw: string | null): Record<string, string> => {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as DraftMap;
    return Object.fromEntries(
      Object.entries(parsed ?? {})
        .filter(([, d]) => d && typeof d.content === 'string' && d.content.trim())
        .map(([id, d]) => [id, d.content]),
    );
  } catch {
    return {};
  }
};

const read = (userId?: string | number | null): DraftMap => {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? (parsed as DraftMap) : {};
  } catch {
    return {};
  }
};

const write = (userId: string | number | null | undefined, drafts: DraftMap) => {
  try {
    const now = Date.now();
    const kept = Object.entries(drafts)
      .filter(([, d]) => d && d.content && now - d.updatedAt < MAX_AGE_MS)
      .sort(([, a], [, b]) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_DRAFTS);
    if (kept.length === 0) {
      localStorage.removeItem(storageKey(userId));
    } else {
      localStorage.setItem(storageKey(userId), JSON.stringify(Object.fromEntries(kept)));
    }
  } catch {
    // Storage full or unavailable: drafts are best-effort.
  }
  notify();
};

export const getConversationDraft = (userId: string | number | null | undefined, conversationId: string): string =>
  read(userId)[conversationId]?.content ?? '';

export const saveConversationDraft = (
  userId: string | number | null | undefined,
  conversationId: string,
  content: string,
) => {
  const drafts = read(userId);
  if (content.trim()) {
    drafts[conversationId] = { content, updatedAt: Date.now() };
  } else if (drafts[conversationId]) {
    delete drafts[conversationId];
  } else {
    return;
  }
  write(userId, drafts);
};

export const clearConversationDraft = (userId: string | number | null | undefined, conversationId: string) =>
  saveConversationDraft(userId, conversationId, '');
