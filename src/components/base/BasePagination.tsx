import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/utils/cn';
import { DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE_OPTIONS } from '@/constants/pagination';
import { getVisiblePageNumbers } from './paginationRange';

export interface BasePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  itemsPerPageOptions?: number[];
  showItemsPerPage?: boolean;
  showTotalItems?: boolean;
  showPageNumbers?: boolean;
  className?: string;
  disabled?: boolean;
}

export default function BasePagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  showItemsPerPage = true,
  showTotalItems = true,
  showPageNumbers = true,
  className = '',
  disabled = false,
}: BasePaginationProps) {
  const { t } = useLanguage('common');

  const safeItemsPerPage = itemsPerPage ?? DEFAULT_PAGE_SIZE;
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * safeItemsPerPage + 1;
  const endItem = Math.min(currentPage * safeItemsPerPage, totalItems);
  const canGoPrevious = currentPage > 1 && !disabled;
  const canGoNext = currentPage < totalPages && !disabled;

  const handlePageChange = (page: number) => {
    if (disabled) return;
    const validPage = Math.max(1, Math.min(page, totalPages));
    if (validPage !== currentPage) onPageChange(validPage);
  };

  const handleItemsPerPageChange = (value: string | null) => {
    if (disabled || !onItemsPerPageChange || !value) return;
    const newItemsPerPage = parseInt(value, 10);
    if (newItemsPerPage !== safeItemsPerPage) {
      onItemsPerPageChange(newItemsPerPage);
      if (currentPage > 1) onPageChange(1);
    }
  };

  const renderPageButton = (page: number, isActive = false) => (
    <Button
      key={page}
      variant={isActive ? 'outline' : 'ghost'}
      size="icon"
      onClick={() => handlePageChange(page)}
      disabled={disabled}
      aria-current={isActive ? 'page' : undefined}
      className={cn('tabular-nums', isActive && 'pointer-events-none shadow-xs/5')}
    >
      {page}
    </Button>
  );

  const renderDots = (key: string) => (
    <span key={key} aria-hidden className="flex w-8 justify-center text-muted-foreground">
      …
    </span>
  );

  if (totalItems === 0) return null;

  return (
    <nav
      aria-label="pagination"
      className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}
    >
      <div className="flex items-center gap-4">
        {showItemsPerPage && onItemsPerPageChange && (
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap text-muted-foreground text-sm">{t('base.pagination.itemsPerPage')}</span>
            <Select
              value={safeItemsPerPage.toString()}
              onValueChange={handleItemsPerPageChange}
              disabled={disabled}
              items={itemsPerPageOptions.map(option => ({ label: String(option), value: String(option) }))}
            >
              <SelectTrigger size="sm" className="w-auto min-w-18">
                <SelectValue />
              </SelectTrigger>
              <SelectPopup>
                {itemsPerPageOptions.map(option => (
                  <SelectItem key={option} value={option.toString()}>
                    {option}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          </div>
        )}
        {showTotalItems && (
          <span className="text-muted-foreground text-sm tabular-nums">
            {t('base.pagination.showing', { start: startItem, end: endItem, total: totalItems })}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={!canGoPrevious}
          aria-label="Previous page"
        >
          <ChevronLeft />
        </Button>

        {showPageNumbers && totalPages <= 7 ? (
          Array.from({ length: totalPages }, (_, i) => i + 1).map(page => renderPageButton(page, page === currentPage))
        ) : showPageNumbers ? (
          getVisiblePageNumbers(currentPage, totalPages).map(page =>
            page < 0 ? renderDots(`dots-${page}`) : renderPageButton(page, page === currentPage),
          )
        ) : (
          <span className="px-3 text-muted-foreground text-sm tabular-nums">
            {t('base.pagination.page', { current: currentPage, total: totalPages })}
          </span>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={!canGoNext}
          aria-label="Next page"
        >
          <ChevronRight />
        </Button>
      </div>
    </nav>
  );
}
