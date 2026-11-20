import React, { useEffect, useState } from 'react';
import { ListFilter, Tag, UserCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverPopup, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/hooks/useLanguage';
import { useContactFilterOptions } from '@/hooks/contacts/useContactFilterOptions';
import { BaseFilter } from '@/types/core';

interface ContactsFilterPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: BaseFilter[];
  onFiltersChange: (filters: BaseFilter[]) => void;
  onApplyFilters: (filters: BaseFilter[]) => void;
  onClearFilters: () => void;
  activeFiltersCount?: number;
  disabled?: boolean;
  /** When set, the popover has no trigger of its own and anchors to this element
   *  (e.g. the BaseHeader filter button). */
  anchorSelector?: string;
}

// Active/blocked dots match the status badge shown elsewhere in the UI.
const BLOCKED_OPTIONS: Array<{ value: 'false' | 'true'; dotColor: string }> = [
  { value: 'false', dotColor: 'bg-success' },
  { value: 'true', dotColor: 'bg-destructive' },
];

const filterToValues = (filter: BaseFilter | undefined): string[] => {
  if (!filter) return [];
  return Array.isArray(filter.values)
    ? filter.values.map(String)
    : String(filter.values || '')
        .split(',')
        .filter(Boolean);
};

const buildFilter = (attributeKey: string, values: string[]): BaseFilter => ({
  attributeKey,
  filterOperator: 'equal_to',
  values: values.length > 1 ? values : values[0] || '',
  queryOperator: 'and',
  attributeModel: 'standard',
});

const ContactsFilterPopover: React.FC<ContactsFilterPopoverProps> = ({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  onApplyFilters,
  onClearFilters,
  activeFiltersCount = 0,
  disabled = false,
  anchorSelector,
}) => {
  const { t } = useLanguage('contacts');
  const { labels } = useContactFilterOptions({ enabled: open });

  // Rascunho local: só vira `filters` de verdade ao clicar Aplicar.
  const [draft, setDraft] = useState<BaseFilter[]>(filters);

  useEffect(() => {
    if (open) {
      setDraft(filters);
    }
  }, [open, filters]);

  const toggleValue = (attributeKey: string, value: string, multi: boolean) => {
    const current = draft.find(f => f.attributeKey === attributeKey);
    const currentValues = filterToValues(current);

    let nextValues: string[];
    if (multi) {
      nextValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
    } else {
      nextValues = currentValues.includes(value) ? [] : [value];
    }

    const withoutSection = draft.filter(f => f.attributeKey !== attributeKey);
    setDraft(nextValues.length > 0 ? [...withoutSection, buildFilter(attributeKey, nextValues)] : withoutSection);
  };

  const blockedValues = filterToValues(draft.find(f => f.attributeKey === 'blocked'));
  const labelValues = filterToValues(draft.find(f => f.attributeKey === 'labels'));

  const activeCount = draft.filter(f => filterToValues(f).length > 0).length;
  const hasAppliedFilters = filters.filter(f => filterToValues(f).length > 0).length > 0 || activeFiltersCount > 0;

  const handleApply = () => {
    const validDraft = draft.filter(f => filterToValues(f).length > 0);
    onFiltersChange(validDraft);
    onApplyFilters(validDraft);
    onOpenChange(false);
  };

  const handleClearAll = () => {
    setDraft([]);
    onClearFilters();
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      {!anchorSelector && (
        <PopoverTrigger
          render={<Button variant="outline" disabled={disabled} data-tour="contacts-filter-button" />}
        >
          <ListFilter />
          {t('filter.popover.trigger')}
          {hasAppliedFilters && (
            <Badge size="sm" className="tabular-nums">
              {activeFiltersCount || activeCount}
            </Badge>
          )}
        </PopoverTrigger>
      )}

      <PopoverPopup
        className="w-72"
        side="bottom"
        align="start"
        sideOffset={6}
        anchor={anchorSelector ? () => document.querySelector(anchorSelector) : undefined}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm">{t('filter.popover.title')}</span>
            {activeCount > 0 && (
              <Badge variant="secondary" className="tabular-nums">
                {activeCount}
              </Badge>
            )}
          </div>

          <fieldset className="flex flex-col gap-1">
            <legend className="mb-1.5 flex items-center gap-1.5 font-medium text-muted-foreground text-xs">
              <UserCheck className="size-3.5" />
              {t('filter.attributes.blocked')}
            </legend>
            {BLOCKED_OPTIONS.map(option => (
              <Label
                key={option.value}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-1 py-1.5 font-normal hover:bg-accent/50"
              >
                <Checkbox
                  checked={blockedValues.includes(option.value)}
                  onCheckedChange={() => toggleValue('blocked', option.value, false)}
                />
                <span className="flex-1">{t(`filter.options.blocked.${option.value}`)}</span>
                <span className={cn('size-2 shrink-0 rounded-full', option.dotColor)} />
              </Label>
            ))}
          </fieldset>

          <fieldset className="flex min-h-0 flex-col gap-1">
            <legend className="mb-1.5 flex items-center gap-1.5 font-medium text-muted-foreground text-xs">
              <Tag className="size-3.5" />
              {t('filter.attributes.labels')}
            </legend>
            {labels.length === 0 ? (
              <p className="px-1 py-1.5 text-muted-foreground text-xs">{t('filter.popover.noOptions')}</p>
            ) : (
              <div className="-mx-1 flex max-h-44 flex-col gap-0.5 overflow-y-auto px-1">
                {labels.map(option => (
                  <Label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-2.5 rounded-md px-1 py-1.5 font-normal hover:bg-accent/50"
                  >
                    <Checkbox
                      checked={labelValues.includes(option.value)}
                      onCheckedChange={() => toggleValue('labels', option.value, true)}
                    />
                    <span className="flex-1 truncate">{option.label}</span>
                  </Label>
                ))}
              </div>
            )}
          </fieldset>

          <div className="flex items-center justify-end gap-2 border-t pt-3">
            <Button variant="ghost" size="sm" onClick={handleClearAll}>
              {t('filter.popover.clearAll')}
            </Button>
            <Button size="sm" onClick={handleApply}>
              {t('filter.apply')}
            </Button>
          </div>
        </div>
      </PopoverPopup>
    </Popover>
  );
};

export default ContactsFilterPopover;
