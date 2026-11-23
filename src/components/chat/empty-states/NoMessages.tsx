import React from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

const NoMessages: React.FC = () => {
  const { t } = useLanguage('chat');

  return (
    <Empty className="min-h-0">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <MessageSquare />
        </EmptyMedia>
        <EmptyTitle>{t('emptyStates.noMessages.title')}</EmptyTitle>
        <EmptyDescription>{t('emptyStates.noMessages.description')}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <p className="flex items-center gap-2 text-muted-foreground text-sm">
          <Send className="size-4" />
          {t('emptyStates.noMessages.hint')}
        </p>
      </EmptyContent>
    </Empty>
  );
};

export default NoMessages;
