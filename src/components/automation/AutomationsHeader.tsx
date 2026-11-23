import { useLanguage } from '@/hooks/useLanguage';
import { Plus, Trash2 } from '@/components/icons';
import { BaseHeader } from '@/components/base';

interface Props {
  totalCount: number;
  selectedCount: number;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onNewAutomation: () => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
  canCreate: boolean;
  canDelete: boolean;
}

export default function AutomationsHeader({
  totalCount,
  selectedCount,
  searchValue,
  onSearchChange,
  onNewAutomation,
  onBulkDelete,
  onClearSelection,
  canCreate,
  canDelete,
}: Props) {
  const { t } = useLanguage('automation');

  return (
    <BaseHeader
      title={t('page.title')}
      subtitle={t('page.subtitle', { count: totalCount })}
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      searchPlaceholder={t('page.searchPlaceholder')}
      primaryAction={canCreate ? { label: t('page.newAutomation'), icon: <Plus />, onClick: onNewAutomation } : undefined}
      selectedCount={canDelete ? selectedCount : 0}
      onClearSelection={onClearSelection}
      bulkActions={
        canDelete
          ? [{ label: t('page.bulkDelete'), icon: <Trash2 />, onClick: onBulkDelete, variant: 'destructive' }]
          : []
      }
    />
  );
}
