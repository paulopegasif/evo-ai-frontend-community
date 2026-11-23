import { useEffect, useRef, type ReactNode } from 'react';
import { SearchX } from '@/components/icons';
import { Command, CommandGroup, CommandGroupLabel, CommandList } from '@/components/ui/command';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from '@/components/ui/empty';
import { Kbd } from '@/components/ui/kbd';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useLanguage } from '@/hooks/useLanguage';
import useGlobalSearch from '@/hooks/chat/useGlobalSearch';
import SearchResultConversation from './SearchResultConversation';
import SearchResultContact from './SearchResultContact';
import SearchResultMessage from './SearchResultMessage';
import type {
  SearchConversationResult,
  SearchContactResult,
  SearchMessageResult,
} from '@/types/chat/search';

const SECTION_DISPLAY_LIMIT = 5;

interface Props {
  isOpen: boolean;
  searchTerm: string;
  rawInputValue: string;
  onClose: () => void;
  onSelectConversation: (item: SearchConversationResult) => void;
  onSelectContact: (item: SearchContactResult) => void;
  onSelectMessage: (item: SearchMessageResult) => void;
  /**
   * The search field (`GlobalSearchInput`). Rendering it here puts it inside
   * the same combobox as the results, so ArrowUp/ArrowDown move through them
   * and Enter opens the highlighted one.
   */
  children?: ReactNode;
  /** Called when the user types in the search field. */
  onInputValueChange?: (value: string) => void;
}

const SectionEmpty = ({ children }: { children: ReactNode }) => (
  <div className="px-2 py-1.5 text-muted-foreground text-xs">{children}</div>
);

export default function GlobalSearchPanel({
  isOpen,
  searchTerm,
  rawInputValue,
  onClose,
  onSelectConversation,
  onSelectContact,
  onSelectMessage,
  children,
  onInputValueChange,
}: Props) {
  const { t } = useLanguage('chat');
  const rootRef = useRef<HTMLDivElement>(null);
  const { status, error, conversations, contacts, messages, isEmpty, term } =
    useGlobalSearch(searchTerm);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen && !children) return null;

  const limitedConversations = conversations.slice(0, SECTION_DISPLAY_LIMIT);
  const limitedContacts = contacts.slice(0, SECTION_DISPLAY_LIMIT);
  const limitedMessages = messages.slice(0, SECTION_DISPLAY_LIMIT);
  const trimmedInput = rawInputValue.trim();
  const hasResults = status === 'success' && !isEmpty;

  const select = <T,>(handler: (item: T) => void) => (item: T) => {
    handler(item);
    onClose();
  };

  return (
    <Command
      // Results come from the server already filtered; the list renders them as-is.
      filter={null}
      autoHighlight={false}
      keepHighlight={false}
      value={rawInputValue}
      onValueChange={(value, details) => {
        // Picking an item would otherwise write its value into the field.
        if (details.reason === 'item-press') return;
        onInputValueChange?.(value);
      }}
    >
      <div ref={rootRef} className="relative">
        {children}

        {isOpen && (
          <div
            className="absolute inset-x-0 top-full z-50 mt-1.5 flex max-h-[60vh] flex-col overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg/5"
            role="dialog"
            aria-label={t('globalSearch.ariaLabel')}
          >
            {status === 'loading' && (
              <div aria-busy="true" className="border-b">
                <div className="flex items-center gap-2 px-3 py-2 text-muted-foreground text-xs">
                  <Spinner className="size-3.5" />
                  <span>{t('globalSearch.loading')}</span>
                </div>
                <div className="space-y-2.5 px-3 pb-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <Skeleton className="size-6 rounded-md" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3 w-2/5" />
                        <Skeleton className="h-2.5 w-4/5" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="p-2">
                <Alert variant="error">
                  <AlertDescription>{error || t('globalSearch.error')}</AlertDescription>
                </Alert>
              </div>
            )}

            {status === 'idle' && trimmedInput.length > 0 && trimmedInput.length < 2 && (
              <p className="px-3 py-4 text-center text-muted-foreground text-sm">
                {t('globalSearch.typeMoreHint')}
              </p>
            )}

            {status === 'idle' && trimmedInput.length === 0 && (
              <p className="px-3 py-4 text-center text-muted-foreground text-sm">
                {t('globalSearch.emptyHint')}
              </p>
            )}

            {status === 'success' && isEmpty && (
              <Empty className="gap-3 p-6">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <SearchX />
                  </EmptyMedia>
                  <EmptyDescription>{t('globalSearch.noResults')}</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}

            <CommandList className={hasResults ? 'p-1.5' : 'hidden'}>
              {hasResults && (
                <>
                  <CommandGroup>
                    <CommandGroupLabel>{t('globalSearch.sections.conversations')}</CommandGroupLabel>
                    {limitedConversations.length === 0 ? (
                      <SectionEmpty>{t('globalSearch.sections.conversationsEmpty')}</SectionEmpty>
                    ) : (
                      limitedConversations.map(item => (
                        <SearchResultConversation
                          key={`conv-${item.id}`}
                          item={item}
                          query={term}
                          onSelect={select(onSelectConversation)}
                        />
                      ))
                    )}
                  </CommandGroup>

                  <CommandGroup>
                    <CommandGroupLabel>{t('globalSearch.sections.contacts')}</CommandGroupLabel>
                    {limitedContacts.length === 0 ? (
                      <SectionEmpty>{t('globalSearch.sections.contactsEmpty')}</SectionEmpty>
                    ) : (
                      limitedContacts.map(item => (
                        <SearchResultContact
                          key={`contact-${item.id}`}
                          item={item}
                          query={term}
                          onSelect={select(onSelectContact)}
                        />
                      ))
                    )}
                  </CommandGroup>

                  <CommandGroup>
                    <CommandGroupLabel>{t('globalSearch.sections.messages')}</CommandGroupLabel>
                    {limitedMessages.length === 0 ? (
                      <SectionEmpty>{t('globalSearch.sections.messagesEmpty')}</SectionEmpty>
                    ) : (
                      limitedMessages.map(item => (
                        <SearchResultMessage
                          key={`msg-${item.id}`}
                          item={item}
                          query={term}
                          onSelect={select(onSelectMessage)}
                        />
                      ))
                    )}
                  </CommandGroup>
                </>
              )}
            </CommandList>

            {hasResults && (
              <div className="flex items-center gap-3 border-t px-3 py-1.5 text-muted-foreground text-xs">
                <span className="flex items-center gap-1">
                  <Kbd>↑</Kbd>
                  <Kbd>↓</Kbd>
                  {t('globalSearch.hints.navigate', 'navegar')}
                </span>
                <span className="flex items-center gap-1">
                  <Kbd>Enter</Kbd>
                  {t('globalSearch.hints.open', 'abrir')}
                </span>
                <span className="flex items-center gap-1">
                  <Kbd>Esc</Kbd>
                  {t('globalSearch.hints.close', 'fechar')}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </Command>
  );
}
