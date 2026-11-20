import type { ReactNode } from 'react';
import { Filter, MoreVertical, Search, X } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Menu, MenuItem, MenuPopup, MenuTrigger } from '@/components/ui/menu';
import { cn } from '@/utils/cn';
import PrimaryActionButton from './PrimaryActionButton';
import { renderIcon } from './renderIcon';

export interface HeaderAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  show?: boolean;
  className?: string;
  disabled?: boolean;
  tooltip?: string;
  dataTour?: string;
}

export interface HeaderFilter {
  label: string;
  value: string | number;
  onRemove: () => void;
}

export interface BaseHeaderProps {
  title: string;
  subtitle?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  primaryAction?: HeaderAction;
  secondaryActions?: HeaderAction[];
  moreActions?: HeaderAction[];
  filters?: HeaderFilter[];
  onFilterClick?: () => void;
  showFilters?: boolean;
  filterButtonDataTour?: string;
  searchDataTour?: string;
  totalCount?: number;
  selectedCount?: number;
  onClearSelection?: () => void;
  bulkActions?: HeaderAction[];
  className?: string;
  children?: ReactNode;
}

export default function BaseHeader({
  title,
  subtitle,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  primaryAction,
  secondaryActions = [],
  moreActions = [],
  filters = [],
  onFilterClick,
  showFilters = false,
  filterButtonDataTour,
  searchDataTour,
  selectedCount = 0,
  onClearSelection,
  bulkActions = [],
  className = '',
  children,
}: BaseHeaderProps) {
  const { t } = useLanguage('common');
  const placeholder = searchPlaceholder || t('base.header.searchPlaceholder');
  const hasSelection = selectedCount > 0;
  const visibleSecondaryActions = secondaryActions.filter(action => action.show !== false);
  const visibleMoreActions = moreActions.filter(action => action.show !== false);
  const hasToolbar =
    Boolean(onSearchChange) ||
    (showFilters && Boolean(onFilterClick)) ||
    visibleSecondaryActions.length > 0 ||
    visibleMoreActions.length > 0;

  return (
    <div className={cn('flex flex-col gap-4 sm:gap-5', className)}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="font-semibold text-xl tracking-tight sm:text-2xl">{title}</h1>
          {subtitle && <p className="mt-1 hidden text-muted-foreground text-sm sm:block">{subtitle}</p>}
        </div>

        {primaryAction && primaryAction.show !== false && (
          <div className="shrink-0" data-tour={primaryAction.dataTour}>
            <PrimaryActionButton
              label={primaryAction.label}
              icon={primaryAction.icon}
              onClick={primaryAction.onClick}
              size="default"
              variant={primaryAction.variant || 'default'}
              className={primaryAction.className}
              disabled={primaryAction.disabled}
              tooltip={primaryAction.tooltip}
            />
          </div>
        )}
      </div>

      {hasToolbar && (
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 items-center gap-2">
            {onSearchChange && (
              <InputGroup className="max-w-md flex-1" data-tour={searchDataTour}>
                <InputGroupAddon>
                  <Search />
                </InputGroupAddon>
                <InputGroupInput
                  type="search"
                  aria-label={placeholder}
                  placeholder={placeholder}
                  value={searchValue}
                  onChange={e => onSearchChange(e.target.value)}
                />
              </InputGroup>
            )}

            {showFilters && onFilterClick && (
              <Button variant="outline" onClick={onFilterClick} data-tour={filterButtonDataTour}>
                <Filter />
                {t('base.header.filters')}
                {filters.length > 0 && (
                  <Badge variant="secondary" size="sm" className="tabular-nums">
                    {filters.length}
                  </Badge>
                )}
              </Button>
            )}
          </div>

          {(visibleSecondaryActions.length > 0 || visibleMoreActions.length > 0) && (
            <div className="flex items-center gap-2">
              {visibleSecondaryActions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant === 'default' ? 'default' : action.variant || 'outline'}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className={action.className}
                  data-tour={action.dataTour}
                >
                  {renderIcon(action.icon)}
                  {action.label}
                </Button>
              ))}

              {visibleMoreActions.length > 0 && (
                <Menu>
                  <MenuTrigger render={<Button variant="outline" size="icon" aria-label={t('base.table.actions')} />}>
                    <MoreVertical />
                  </MenuTrigger>
                  <MenuPopup align="end">
                    {visibleMoreActions.map((action, index) => (
                      <MenuItem
                        key={index}
                        onClick={action.onClick}
                        disabled={action.disabled}
                        variant={action.variant === 'destructive' ? 'destructive' : 'default'}
                      >
                        {renderIcon(action.icon)}
                        {action.label}
                      </MenuItem>
                    ))}
                  </MenuPopup>
                </Menu>
              )}
            </div>
          )}
        </div>
      )}

      {hasSelection && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/48 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{t('base.header.selected', { count: selectedCount })}</span>
            {onClearSelection && (
              <Button variant="ghost" size="xs" onClick={onClearSelection}>
                <X />
                {t('base.header.clear')}
              </Button>
            )}
          </div>
          {bulkActions.length > 0 && (
            <div className="flex items-center gap-2">
              {bulkActions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant === 'destructive' ? 'destructive-outline' : action.variant || 'outline'}
                  size="sm"
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className={action.className}
                >
                  {renderIcon(action.icon)}
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {filters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.map((filter, index) => (
            <Badge key={index} variant="outline" className="gap-1 pe-0.5">
              {filter.label}: {filter.value}
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={filter.onRemove}
                aria-label={t('base.header.clear')}
                className="size-4 sm:size-4"
              >
                <X />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {children}
    </div>
  );
}
