import React, { useEffect, useRef } from 'react';
import { Card, CardPanel } from '@/components/ui/card';
import { Kbd } from '@/components/ui/kbd';
import { Spinner } from '@/components/ui/spinner';
import { Hash, Search, Paperclip } from '@/components/icons';
import type { CannedResponse } from '@/types/knowledge';
import { useLanguage } from '@/hooks/useLanguage';

interface CannedResponsesListProps {
  cannedResponses: CannedResponse[];
  selectedIndex: number;
  searchQuery: string;
  isLoading?: boolean;
  onSelect: (cannedResponse: CannedResponse) => void;
}

const CannedResponsesList: React.FC<CannedResponsesListProps> = ({
  cannedResponses,
  selectedIndex,
  searchQuery,
  isLoading = false,
  onSelect,
}) => {
  const { t } = useLanguage('chat');
  const listRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLDivElement>(null);

  // Auto-scroll para o item selecionado
  useEffect(() => {
    if (selectedItemRef.current && listRef.current) {
      const listRect = listRef.current.getBoundingClientRect();
      const itemRect = selectedItemRef.current.getBoundingClientRect();

      // Se o item está fora da view, rola para ele
      if (itemRect.bottom > listRect.bottom) {
        selectedItemRef.current.scrollIntoView({ block: 'end', behavior: 'smooth' });
      } else if (itemRect.top < listRect.top) {
        selectedItemRef.current.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  // Função para destacar o termo pesquisado
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <span>
        {parts.map((part, index) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={index} className="bg-warning/16 text-foreground">
              {part}
            </mark>
          ) : (
            <span key={index}>{part}</span>
          ),
        )}
      </span>
    );
  };

  // Truncar conteúdo para preview
  const truncateContent = (content: string, maxLength: number = 80) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  if (isLoading) {
    return (
      <Card className="absolute right-0 bottom-full left-0 z-50 mb-2 gap-0 overflow-hidden py-0 shadow-lg animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
        <CardPanel className="p-4">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Spinner className="size-4" />
            <span className="text-sm">{t('cannedResponses.loading')}</span>
          </div>
        </CardPanel>
      </Card>
    );
  }

  if (cannedResponses.length === 0) {
    return (
      <Card className="absolute right-0 bottom-full left-0 z-50 mb-2 gap-0 overflow-hidden py-0 shadow-lg animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
        <CardPanel className="p-4">
          <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Search className="h-8 w-8" />
            <div className="text-center">
              <p className="text-sm font-medium">{t('cannedResponses.noResults')}</p>
              {searchQuery && (
                <p className="text-xs mt-1">{t('cannedResponses.tryAnotherTerm')}</p>
              )}
            </div>
          </div>
        </CardPanel>
      </Card>
    );
  }

  return (
    <Card className="absolute right-0 bottom-full left-0 z-50 mb-2 gap-0 overflow-hidden py-0 shadow-lg animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
      <CardPanel className="p-0">
        {/* Header */}
        <div className="border-b bg-muted/40 px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t('cannedResponses.title')}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {cannedResponses.length}{' '}
              {cannedResponses.length === 1
                ? t('cannedResponses.result')
                : t('cannedResponses.results')}
            </span>
          </div>
          {searchQuery && (
            <p className="text-xs text-muted-foreground mt-2">
              {t('cannedResponses.searchingFor')} <span className="font-medium">"{searchQuery}"</span>
            </p>
          )}
        </div>

        {/* Lista de Canned Responses */}
        <div
          ref={listRef}
          role="listbox"
          aria-label={t('cannedResponses.title')}
          className="max-h-[280px] overflow-y-auto"
        >
          {cannedResponses.map((cannedResponse, index) => {
            const isSelected = index === selectedIndex;

            return (
              <div
                key={cannedResponse.id}
                ref={isSelected ? selectedItemRef : null}
                role="option"
                aria-selected={isSelected}
                className={`cursor-pointer border-b border-l-2 px-3 py-2 transition-colors last:border-b-0 ${
                  isSelected ? 'border-l-primary bg-accent' : 'border-l-transparent hover:bg-accent/50'
                }`}
                onClick={() => onSelect(cannedResponse)}
                onMouseEnter={() => {
                  // Mouse hover atualiza seleção visualmente
                  // mas não interfere com navegação por teclado
                }}
              >
                {/* Short Code */}
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`
                    text-sm font-mono font-semibold
                    text-foreground
                  `}
                  >
                    /{highlightMatch(cannedResponse.short_code, searchQuery)}
                  </span>

                  {/* 🎯 ATTACHMENTS INDICATOR: Mostrar ícone se tem mídia */}
                  {cannedResponse.attachments && cannedResponse.attachments.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-info/12 text-info-foreground rounded text-xs">
                      <Paperclip className="h-3 w-3" />
                      <span>{cannedResponse.attachments.length}</span>
                    </span>
                  )}
                </div>

                {/* Content Preview */}
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {highlightMatch(truncateContent(cannedResponse.content), searchQuery)}
                </p>
              </div>
            );
          })}
        </div>

        {/* Footer com dicas de navegação */}
        <div className="border-t bg-muted/40 px-3 py-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Kbd>
                  ↑↓
                </Kbd>
                {t('cannedResponses.navigate')}
              </span>
              <span className="flex items-center gap-1">
                <Kbd>
                  Enter
                </Kbd>
                {t('cannedResponses.select')}
              </span>
              <span className="flex items-center gap-1">
                <Kbd>
                  Esc
                </Kbd>
                {t('cannedResponses.close')}
              </span>
            </div>
          </div>
        </div>
      </CardPanel>
    </Card>
  );
};

export default CannedResponsesList;
