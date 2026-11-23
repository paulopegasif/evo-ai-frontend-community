import { Fragment, useMemo, useState, useId } from 'react';
import {
  Check,
  ChevronsUpDown,
  User,
  MessageCircle,
  MessageSquare,
  Megaphone,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandCollection,
  CommandEmpty,
  CommandGroup,
  CommandGroupLabel,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Popover, PopoverPopup, PopoverTrigger } from '@/components/ui/popover';
import {
  EVENT_CATEGORIES,
  getEventCatalog,
  getEvent,
  isCustomEvent,
  type EventCategory,
  type EventCatalogEntry,
  type EventDtoType,
} from '@/lib/events-manifest';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';

export interface EventSelectorChange {
  eventName: string;
  isCustom: boolean;
}

export interface EventSelectorProps {
  value?: string;
  onChange: (change: EventSelectorChange) => void;
  // Restrict to specific evo-flow DTO surfaces. Some screens accept only
  // 'track' events; others accept only 'identify'. Matches the card's
  // `filterByEventType?: EventType[]` requirement.
  filterByEventType?: EventDtoType[];
  // Restrict to specific UI categories (contact/message/...). Independent of
  // filterByEventType; both filters AND together when set.
  filterByCategory?: EventCategory[];
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

const CATEGORY_ICON: Record<EventCategory, LucideIcon> = {
  contact: User,
  conversation: MessageCircle,
  message: MessageSquare,
  campaign: Megaphone,
  custom: Sparkles,
};

export function EventSelector({
  value,
  onChange,
  filterByEventType,
  filterByCategory,
  disabled,
  placeholder,
  className,
}: EventSelectorProps) {
  const { t, currentLanguage } = useLanguage('events');
  const id = useId();
  const [open, setOpen] = useState(false);

  const visibleCategories = filterByCategory ?? EVENT_CATEGORIES;

  const grouped = useMemo(() => {
    const catalog = getEventCatalog();
    return visibleCategories
      .map((category) => ({
        value: category,
        items: catalog.filter((e) => {
          if (e.category !== category) return false;
          if (filterByEventType && !filterByEventType.includes(e.dtoType)) return false;
          return true;
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [visibleCategories, filterByEventType]);

  const selected = value ? getEvent(value) : undefined;
  const triggerLabel = selected
    ? selectedLabel(selected, currentLanguage)
    : (placeholder ?? t('selector.placeholder'));

  const handleSelect = (eventName: string) => {
    onChange({ eventName, isCustom: isCustomEvent(eventName) });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            disabled={disabled}
            className={cn('w-full justify-between font-normal', className)}
          />
        }
      >
        <span className={cn('flex items-center gap-2', !selected && 'text-muted-foreground')}>
          {selected && (() => {
            const Icon = CATEGORY_ICON[selected.category];
            return <Icon className="size-4" aria-hidden="true" />;
          })()}
          <span>{triggerLabel}</span>
        </span>
        <ChevronsUpDown className="ms-2 size-4 shrink-0 opacity-50" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverPopup
        className="w-(--anchor-width) p-0 **:data-[slot=popover-viewport]:p-0"
        align="start"
      >
        <Command items={grouped} itemToStringValue={item => searchText(item as EventCatalogEntry)}>
          <CommandInput placeholder={t('selector.searchPlaceholder')} />
          <CommandEmpty>{t('selector.noResults')}</CommandEmpty>
          <CommandList className="max-h-80 overflow-y-auto">
            {(group: EventGroup, index: number) => (
              <Fragment key={group.value}>
                {index > 0 && <CommandSeparator />}
                <CommandGroupSection
                  group={group}
                  value={value}
                  onSelect={handleSelect}
                  currentLanguage={currentLanguage}
                  t={t}
                />
              </Fragment>
            )}
          </CommandList>
        </Command>
      </PopoverPopup>
    </Popover>
  );
}

type EventGroup = { value: EventCategory; items: EventCatalogEntry[] };

// What the search box matches against (category, id and both labels).
function searchText(item: EventCatalogEntry): string {
  return `${item.category} ${item.eventName} ${item.labelEn} ${item.labelPt}`;
}

function CommandGroupSection({
  group,
  value,
  onSelect,
  currentLanguage,
  t,
}: {
  group: EventGroup;
  value?: string;
  onSelect: (eventName: string) => void;
  currentLanguage: string;
  t: (key: string) => string;
}) {
  const Icon = CATEGORY_ICON[group.value];
  return (
    <CommandGroup items={group.items}>
      <CommandGroupLabel>{t(`categories.${group.value}`)}</CommandGroupLabel>
      <CommandCollection>
        {(item: EventCatalogEntry) => (
          <CommandItem key={item.eventName} value={item} onClick={() => onSelect(item.eventName)}>
            <Check
              className={cn('size-4', value === item.eventName ? 'opacity-100' : 'opacity-0')}
              aria-hidden="true"
            />
            <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
            <div className="flex min-w-0 flex-col">
              <span className="flex items-center gap-2">
                {selectedLabel(item, currentLanguage)}
                {item.category === 'custom' && (
                  <Badge variant="warning" size="sm" className="uppercase">
                    {t('selector.customBadge')}
                  </Badge>
                )}
              </span>
              <span className="text-muted-foreground text-xs">{item.description}</span>
            </div>
          </CommandItem>
        )}
      </CommandCollection>
    </CommandGroup>
  );
}

// M3 fix: only pt-BR/pt receive Portuguese labels; everything else falls back
// to English. Without this, es/fr/it users see Portuguese labels in an
// otherwise fully-translated UI.
function selectedLabel(entry: EventCatalogEntry, currentLanguage: string): string {
  return currentLanguage.toLowerCase().startsWith('pt') ? entry.labelPt : entry.labelEn;
}
