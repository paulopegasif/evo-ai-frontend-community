import { useLanguage } from '@/hooks/useLanguage';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

export default function ProductsPagination({ page, totalPages, totalCount, onPageChange }: Props) {
  const { t } = useLanguage('products');

  if (totalPages <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-between text-sm">
      <span className="text-muted-foreground tabular-nums">{t('pagination.summary', { page, totalPages, totalCount })}</span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft />
          {t('pagination.previous')}
        </Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          {t('pagination.next')}
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
