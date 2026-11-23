import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from '@/components/icons';
import { useId, useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import type { ContactEventsQuery, ContactEventType } from '@/types/contacts';

interface ContactEventsFiltersProps {
  value: ContactEventsQuery;
  onChange: (next: ContactEventsQuery) => void;
  disabled?: boolean;
}

const EVENT_TYPES: ContactEventType[] = ['identify', 'track', 'page', 'screen', 'segment'];

const ALL_VALUE = '__all__';

// Period presets computed client-side into `occurred_after` (YYYY-MM-DD). This
// replaces the old free-form "De/Até" date inputs + channel/campaign filters —
// the panel now only exposes Tipo + Período (channel/campaign stay supported
// by the ContactEventsQuery type/backend, just not surfaced in this filter UI).
type PeriodPreset = 'today' | '7d' | '30d' | 'all';

function presetToOccurredAfter(preset: PeriodPreset): string | undefined {
  if (preset === 'all') return undefined;
  const days = preset === 'today' ? 0 : preset === '7d' ? 7 : 30;
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function isFilterActive(filters: ContactEventsQuery): boolean {
  return Object.values(filters).some((v) => v !== undefined && v !== '');
}

export function ContactEventsFilters({ value, onChange, disabled }: ContactEventsFiltersProps) {
  const { t } = useLanguage('contacts');
  const baseId = useId();
  // Tracked locally because `occurred_after` alone can't distinguish which
  // preset produced it (today/7d/30d all just set a date). Reset to "all"
  // whenever an external clear removes occurred_after (e.g. "Limpar filtros").
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>(
    value.occurred_after ? '30d' : 'all',
  );

  const update = <K extends keyof ContactEventsQuery>(key: K, next: ContactEventsQuery[K]) => {
    const merged: ContactEventsQuery = { ...value };
    if (next === undefined || next === '') {
      delete merged[key];
    } else {
      merged[key] = next;
    }
    onChange(merged);
  };

  const handleClear = () => {
    setPeriodPreset('all');
    onChange({});
  };

  const eventTypeItems = [
    { value: ALL_VALUE, label: t('events.types.all') },
    ...EVENT_TYPES.map(type => ({ value: type, label: t(`events.types.${type}`) })),
  ];
  const periodItems = (['today', '7d', '30d', 'all'] as const).map(preset => ({
    value: preset,
    label: t(`events.filters.periodPresets.${preset}`),
  }));

  const eventTypeId = `${baseId}-event-type`;
  const periodId = `${baseId}-period`;

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-muted/48 p-3 dark:bg-muted/24">
      <div className="flex min-w-[140px] flex-col gap-1">
        <Label htmlFor={eventTypeId}>{t('events.filters.eventType')}</Label>
        <Select
          items={eventTypeItems}
          value={value.event_type ?? ALL_VALUE}
          onValueChange={(v) =>
            v != null &&
            update('event_type', v === ALL_VALUE ? undefined : (v as ContactEventType))
          }
          disabled={disabled}
        >
          <SelectTrigger id={eventTypeId} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectPopup>
            {eventTypeItems.map(item => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
      </div>

      <div className="flex min-w-[180px] flex-col gap-1">
        <Label htmlFor={periodId}>{t('events.filters.period')}</Label>
        <Select
          items={periodItems}
          value={periodPreset}
          onValueChange={(v) => {
            if (v == null) return;
            const preset = v as PeriodPreset;
            setPeriodPreset(preset);
            update('occurred_after', presetToOccurredAfter(preset));
          }}
          disabled={disabled}
        >
          <SelectTrigger id={periodId} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectPopup>
            {periodItems.map(item => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
      </div>

      {isFilterActive(value) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          disabled={disabled}
        >
          <X />
          {t('events.filters.clear')}
        </Button>
      )}
    </div>
  );
}

export default ContactEventsFilters;
