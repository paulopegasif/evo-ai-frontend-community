import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, MoreHorizontal, type LucideIcon } from '@/components/icons';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Menu, MenuItem, MenuPopup, MenuTrigger } from '@/components/ui/menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/utils/cn';
import EmptyState from './EmptyState';

// The row actions column stays pinned to the right edge, so wide tables that
// scroll horizontally (e.g. contacts at 1440px) never hide the actions menu.
// Opaque backgrounds keep scrolled cells from showing through.
const STICKY_ACTIONS = 'sticky right-0 z-10 bg-card shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)]';
const LOADING_ROWS = 5;

export interface TableColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  /** Extra classes for the header and body cells, e.g. `hidden xl:table-cell`
   *  to drop secondary columns on narrower screens. */
  className?: string;
  render?: (item: T, index: number) => ReactNode;
}

export interface TableAction<T> {
  label: string;
  icon?: ReactNode;
  onClick: (item: T) => void;
  show?: (item: T) => boolean;
  variant?: 'default' | 'destructive';
}

export interface BaseTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  actions?: TableAction<T>[];
  selectable?: boolean;
  selectedItems?: T[];
  onSelectionChange?: (items: T[]) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string) => void;
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost' | 'link';
    disabled?: boolean;
    tooltip?: string;
  };
  getRowKey: (item: T) => string | number;
  /** Human-readable row name for the selection checkbox label (defaults to the row key). */
  getRowLabel?: (item: T) => string;
  className?: string;
}

export default function BaseTable<T extends Record<string, any>>({ // eslint-disable-line @typescript-eslint/no-explicit-any
  data,
  columns,
  actions,
  selectable = false,
  selectedItems = [],
  onSelectionChange,
  sortBy,
  sortOrder,
  onSort,
  loading = false,
  emptyMessage,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyAction,
  getRowKey,
  getRowLabel,
  className = '',
}: BaseTableProps<T>) {
  const { t } = useLanguage('common');
  const message = emptyMessage || t('base.table.emptyMessage');
  const isAllSelected = data.length > 0 && selectedItems.length === data.length;

  const handleSelectAll = () => {
    if (isAllSelected) {
      onSelectionChange?.([]);
    } else {
      onSelectionChange?.(data);
    }
  };

  const handleSelectItem = (item: T) => {
    const key = getRowKey(item);
    const isSelected = selectedItems.some(selected => getRowKey(selected) === key);

    if (isSelected) {
      onSelectionChange?.(selectedItems.filter(selected => getRowKey(selected) !== key));
    } else {
      onSelectionChange?.([...selectedItems, item]);
    }
  };

  const isItemSelected = (item: T) => {
    const key = getRowKey(item);
    return selectedItems.some(selected => getRowKey(selected) === key);
  };

  const hasActions = Boolean(actions && actions.length > 0);
  const isSomeSelected = selectedItems.length > 0 && !isAllSelected;

  const alignClass = (align?: 'left' | 'center' | 'right') =>
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : undefined;

  const renderHeadLabel = (column: TableColumn<T>) => {
    if (!column.sortable || !onSort) return column.label;
    const active = sortBy === column.key;
    const Icon = !active ? ArrowUpDown : sortOrder === 'asc' ? ArrowUp : ArrowDown;
    return (
      <button
        type="button"
        onClick={() => onSort(column.key)}
        className={cn(
          '-mx-1.5 inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
          active && 'text-foreground',
        )}
        aria-sort={active ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}
      >
        {column.label}
        <Icon className={cn('size-3.5', !active && 'opacity-48')} />
      </button>
    );
  };

  const renderCellContent = (item: T, column: TableColumn<T>, index: number) => {
    if (column.render) return column.render(item, index);
    const value = item[column.key];
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? t('base.table.yes') : t('base.table.no');
    return String(value);
  };

  const renderActions = (item: T) => {
    const visibleActions = (actions ?? []).filter(action => !action.show || action.show(item));
    if (visibleActions.length === 0) return null;

    return (
      <Menu>
        <MenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={t('base.table.actions')} />}>
          <MoreHorizontal />
        </MenuTrigger>
        <MenuPopup align="end">
          {visibleActions.map((action, index) => (
            <MenuItem
              key={index}
              onClick={() => action.onClick(item)}
              variant={action.variant === 'destructive' ? 'destructive' : 'default'}
            >
              {action.icon}
              {action.label}
            </MenuItem>
          ))}
        </MenuPopup>
      </Menu>
    );
  };

  if (!loading && data.length === 0) {
    if (emptyIcon && emptyTitle && emptyDescription) {
      return (
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
          className="py-12"
        />
      );
    }

    return (
      <div className="flex items-center justify-center rounded-xl border bg-card py-12 text-muted-foreground text-sm">
        {message}
      </div>
    );
  }

  return (
    <div className={cn('overflow-hidden rounded-xl border bg-card shadow-xs/5', className)}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {selectable && (
              <TableHead className="w-10 ps-4">
                <Checkbox
                  checked={isAllSelected}
                  indeterminate={isSomeSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label={t('base.table.selectAll')}
                  disabled={loading || data.length === 0}
                />
              </TableHead>
            )}
            {columns.map(column => (
              <TableHead
                key={column.key}
                className={cn(column.width, column.className, alignClass(column.align), !selectable && 'first:ps-4')}
              >
                {renderHeadLabel(column)}
              </TableHead>
            ))}
            {hasActions && (
              <TableHead className={cn('w-12 pe-4 text-right', STICKY_ACTIONS)}>
                <span className="sr-only">{t('base.table.actions')}</span>
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading
            ? Array.from({ length: LOADING_ROWS }, (_, row) => (
                <TableRow key={`loading-${row}`} className="hover:bg-transparent">
                  {selectable && (
                    <TableCell className="ps-4">
                      <Skeleton className="size-4 rounded" />
                    </TableCell>
                  )}
                  {columns.map(column => (
                    <TableCell key={column.key} className={cn(column.className, !selectable && 'first:ps-4')}>
                      <Skeleton className="h-4 w-full max-w-40" />
                    </TableCell>
                  ))}
                  {hasActions && <TableCell className={cn('pe-4', STICKY_ACTIONS)} />}
                </TableRow>
              ))
            : data.map((item, index) => {
                const key = getRowKey(item);
                const isSelected = isItemSelected(item);

                return (
                  <TableRow key={key} data-state={isSelected ? 'selected' : undefined} className="group">
                    {selectable && (
                      <TableCell className="ps-4">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleSelectItem(item)}
                          aria-label={t('base.table.selectItem', { key: getRowLabel?.(item) ?? key })}
                        />
                      </TableCell>
                    )}
                    {columns.map(column => (
                      <TableCell
                        key={column.key}
                        className={cn(column.className, alignClass(column.align), !selectable && 'first:ps-4')}
                      >
                        {renderCellContent(item, column, index)}
                      </TableCell>
                    ))}
                    {hasActions && (
                      <TableCell
                        className={cn(
                          'pe-4 text-right',
                          STICKY_ACTIONS,
                          'group-hover:bg-[color-mix(in_srgb,var(--card),var(--color-black)_2%)] group-data-[state=selected]:bg-[color-mix(in_srgb,var(--card),var(--color-black)_4%)] dark:group-hover:bg-[color-mix(in_srgb,var(--card),var(--color-white)_2%)]',
                        )}
                      >
                        {renderActions(item)}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
        </TableBody>
      </Table>
    </div>
  );
}
