import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverPopup, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

import { BaseFilter, FilterType } from '@/types/core';

interface BaseFilterRowProps<T extends BaseFilter> {
  filter: T;
  index: number;
  showQueryOperator: boolean;
  filterTypes: FilterType[];
  onUpdate: (index: number, field: keyof T, value: string | number | boolean) => void;
  onRemove: (index: number) => void;
  className?: string;
  translationNamespace?: string;
}

export default function BaseFilterRow<T extends BaseFilter>({
  filter,
  index,
  showQueryOperator,
  filterTypes,
  onUpdate,
  onRemove,
  className = '',
  translationNamespace = 'common',
}: BaseFilterRowProps<T>) {
  const { t } = useLanguage(translationNamespace);
  const { t: tCommon } = useLanguage('common');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const currentFilterType = filterTypes.find(ft => ft.attributeKey === filter.attributeKey);

  // Operator labels live either in the screen namespace (Contacts/Conversations)
  // or in the shared `common` namespace (other list screens). Resolve
  // namespace-first, then fall back to common so every screen shows a
  // translated operator instead of the raw key.
  const translateOperatorLabel = (label: string): string => {
    const fromNamespace = t(label);
    return fromNamespace === label ? tCommon(label) : fromNamespace;
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onUpdate(index, 'values' as keyof T, format(date, 'yyyy-MM-dd'));
      setCalendarOpen(false);
    }
  };

  const renderValueInput = () => {
    if (!currentFilterType) return null;

    const needsValueInput = !['is_present', 'is_not_present'].includes(filter.filterOperator);

    if (!needsValueInput) return null;

    switch (currentFilterType.inputType) {
      case 'date':
        return (
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  className="w-full min-w-0 justify-start truncate text-left font-normal"
                />
              }
            >
              <CalendarIcon className="shrink-0" />
              <span className="truncate">
                {filter.values
                  ? format(new Date(filter.values as string), 'dd/MM/yyyy', { locale: pt })
                  : tCommon('base.filter.selectDate')}
              </span>
            </PopoverTrigger>
            <PopoverPopup className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filter.values ? new Date(filter.values as string) : undefined}
                onSelect={handleDateSelect}
                autoFocus
              />
            </PopoverPopup>
          </Popover>
        );
      case 'search_select': {
        // Check if label is a translation key (contains a dot, indicating namespace.key format)
        const valueItems = (currentFilterType.options ?? []).map(option => {
          const isTranslationKey = typeof option.label === 'string' && option.label.includes('.');
          return {
            value: option.value.toString(),
            label: isTranslationKey ? t(option.label) : option.label,
          };
        });
        return (
          <Select
            items={valueItems}
            value={(filter.values as string) || null}
            onValueChange={value => onUpdate(index, 'values' as keyof T, value == null ? '' : String(value))}
          >
            <SelectTrigger className="w-full min-w-0 truncate">
              <SelectValue placeholder={tCommon('base.filter.selectOption')} className="truncate" />
            </SelectTrigger>
            <SelectPopup alignItemWithTrigger={false}>
              {valueItems.map(item => (
                <SelectItem key={item.value} value={item.value} className="truncate">
                  {item.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        );
      }
      case 'number':
        return (
          <Input
            type="number"
            value={filter.values as string}
            onChange={e => onUpdate(index, 'values' as keyof T, e.target.value)}
            placeholder={tCommon('base.filter.enterNumber')}
            className="w-full min-w-0"
          />
        );
      default:
        return (
          <Input
            type="text"
            value={filter.values as string}
            onChange={e => onUpdate(index, 'values' as keyof T, e.target.value)}
            placeholder={tCommon('base.filter.enterValue')}
            className="w-full min-w-0"
          />
        );
    }
  };

  const queryOperatorItems = [
    { value: 'and', label: tCommon('base.filter.and') },
    { value: 'or', label: tCommon('base.filter.or') },
  ];
  const attributeItems = filterTypes.map(filterType => ({
    value: filterType.attributeKey,
    label: t(filterType.attributeI18nKey),
  }));
  const operatorItems = (currentFilterType?.filterOperators ?? []).map(operator => ({
    value: operator.key,
    label: translateOperatorLabel(operator.label),
  }));

  return (
    <div
      className={`flex min-w-0 items-center gap-3 overflow-hidden rounded-lg border bg-muted/24 p-4 ${className}`}
    >
      {/* Query Operator */}
      {showQueryOperator && (
        <div className="flex-shrink-0">
          <Select
            items={queryOperatorItems}
            value={filter.queryOperator || null}
            onValueChange={value =>
              onUpdate(index, 'queryOperator' as keyof T, value == null ? '' : String(value))
            }
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectPopup alignItemWithTrigger={false}>
              {queryOperatorItems.map(item => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </div>
      )}

      {/* Attribute */}
      <div className="min-w-0 flex-1">
        <Select
          items={attributeItems}
          value={filter.attributeKey || null}
          onValueChange={value =>
            onUpdate(index, 'attributeKey' as keyof T, value == null ? '' : String(value))
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectPopup alignItemWithTrigger={false}>
            {attributeItems.map(item => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
      </div>

      {/* Operator */}
      <div className="min-w-0 flex-1">
        <Select
          items={operatorItems}
          value={filter.filterOperator || null}
          onValueChange={value =>
            onUpdate(index, 'filterOperator' as keyof T, value == null ? '' : String(value))
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectPopup alignItemWithTrigger={false}>
            {operatorItems.map(item => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
      </div>

      {/* Value */}
      <div className="flex-1 min-w-0">{renderValueInput()}</div>

      {/* Remove Button */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => onRemove(index)}
        aria-label={tCommon('base.filter.removeFilter')}
        className="flex-shrink-0 text-muted-foreground hover:text-foreground"
      >
        <X />
      </Button>
    </div>
  );
}
