import React from 'react';
import { MessageCircle, Plus, SearchX } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { useLanguage } from '@/hooks/useLanguage';

interface NoConversationsProps {
  onCreateNew?: () => void;
  searchTerm?: string;
}

const NoConversations: React.FC<NoConversationsProps> = ({ onCreateNew, searchTerm }) => {
  const { t } = useLanguage('chat');
  const isSearchResult = searchTerm && searchTerm.trim().length > 0;

  return (
    <Empty className="md:py-12">
      <EmptyHeader>
        <EmptyMedia variant="icon">{isSearchResult ? <SearchX /> : <MessageCircle />}</EmptyMedia>
        <EmptyTitle>
          {isSearchResult
            ? t('emptyStates.noConversations.title.search')
            : t('emptyStates.noConversations.title.default')}
        </EmptyTitle>
        <EmptyDescription>
          {isSearchResult
            ? t('emptyStates.noConversations.description.search', { searchTerm: searchTerm || '' })
            : t('emptyStates.noConversations.description.default')}
        </EmptyDescription>
      </EmptyHeader>

      {!isSearchResult && onCreateNew && (
        <EmptyContent>
          <Button onClick={onCreateNew}>
            <Plus />
            {t('emptyStates.noConversations.createNew')}
          </Button>
        </EmptyContent>
      )}
    </Empty>
  );
};

export default NoConversations;
