import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Search, Trash2, X } from '@/components/icons';
import BaseHeader from '@/components/base/BaseHeader';
import { usePermissions } from '@/contexts/PermissionsContext';

interface CannedResponsesHeaderProps {
  totalCount: number;
  selectedCount: number;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onNewCannedResponse: () => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
  showBulkActions: boolean;
}

export default function CannedResponsesHeader({
  totalCount,
  selectedCount,
  searchValue,
  onSearchChange,
  onNewCannedResponse,
  onBulkDelete,
  onClearSelection,
  showBulkActions,
}: CannedResponsesHeaderProps) {
  const { t } = useLanguage('cannedResponses');
  const { can, isReady } = usePermissions();

  return (
    <BaseHeader title={t('header.title')} totalCount={totalCount}>
      {/* Search and Actions */}
      <div className="flex items-center justify-between gap-4">
        {/* Search */}
        <InputGroup className="flex-1 max-w-sm">
          <InputGroupAddon>
            <Search aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            placeholder={t('header.searchPlaceholder')}
            aria-label={t('header.searchPlaceholder')}
            value={searchValue}
            onChange={e => onSearchChange(e.target.value)}
          />
        </InputGroup>

        {/* Bulk Actions */}
        {showBulkActions && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {t('header.selected', { count: selectedCount })}
            </span>
            {isReady && can('canned_responses', 'delete') && (
              <Button type="button" variant="destructive-outline" size="sm" onClick={onBulkDelete}>
                <Trash2 />
                {t('header.bulkDelete')}
              </Button>
            )}
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t('header.clearSelection')}
                    onClick={onClearSelection}
                  />
                }
              >
                <X />
              </TooltipTrigger>
              <TooltipPopup>{t('header.clearSelection')}</TooltipPopup>
            </Tooltip>
          </div>
        )}

        {/* New Canned Response Button */}
        {!showBulkActions && isReady && can('canned_responses', 'create') && (
          <Button type="button" onClick={onNewCannedResponse}>
            <Plus />
            {t('header.newResponse')}
          </Button>
        )}
      </div>
    </BaseHeader>
  );
}
