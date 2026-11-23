import { useEffect, useRef, useState } from 'react';
import { Check, ChevronsUpDown, X } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Command, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverPopup, PopoverTrigger } from '@/components/ui/popover';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/hooks/useLanguage';
import { usePermissions } from '@/contexts/PermissionsContext';
import { campaignsService } from '@/services/campaigns/campaignsService';
import type { Campaign } from '@/types/campaigns';

interface CampaignFilterAutocompleteProps {
  id?: string;
  value: string | undefined;
  onChange: (next: string | undefined) => void;
  disabled?: boolean;
}

// Debounce delay for server-side search. 250ms is the sweet spot for typing —
// shorter and we burn extra requests on every keystroke, longer and the list
// feels laggy.
const SEARCH_DEBOUNCE_MS = 250;
const PAGE_SIZE = 20;

function isUuidLike(value: string): boolean {
  return /^[0-9a-fA-F-]{36}$/.test(value);
}

export function CampaignFilterAutocomplete({
  id,
  value,
  onChange,
  disabled,
}: CampaignFilterAutocompleteProps) {
  const { t } = useLanguage('contacts');
  const { can, isReady } = usePermissions();
  // The autocomplete reads the campaigns backend, a different resource from
  // the contacts screen that hosts it — without campaigns.read it renders
  // nothing and never fetches.
  const canReadCampaigns = isReady && can('campaigns', 'read');

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | undefined>();

  // Tracks the latest in-flight request so out-of-order responses don't
  // overwrite the current option list.
  const requestIdRef = useRef(0);

  // Resolve the label for a value the caller pre-seeded (e.g., when reopening
  // the panel with a campaign already selected). Only fires for UUID-shaped
  // values; otherwise we trust the parent to have nothing to lookup.
  useEffect(() => {
    if (!canReadCampaigns) return;
    if (!value) {
      setSelectedLabel(undefined);
      return;
    }
    // Already labeled this value — don't fetch again.
    if (selectedLabel) return;
    if (!isUuidLike(value)) {
      setSelectedLabel(value);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const campaign = await campaignsService.getCampaign(value);
        if (!cancelled) {
          setSelectedLabel(campaign.title || campaign.name || value);
        }
      } catch {
        if (!cancelled) setSelectedLabel(value);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [value, selectedLabel, canReadCampaigns]);

  // Debounced server-side search. Re-runs whenever search or open changes; we
  // only hit the API when the popover is actually visible to avoid prefetching
  // for users who never expand the field.
  useEffect(() => {
    if (!open || !canReadCampaigns) return;
    const requestId = ++requestIdRef.current;
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await campaignsService.getCampaigns({
          per_page: PAGE_SIZE,
          search: search.trim() || undefined,
          sort: 'name',
          order: 'asc',
        });
        if (requestIdRef.current === requestId) {
          setOptions(response.data ?? []);
        }
      } catch {
        if (requestIdRef.current === requestId) {
          setOptions([]);
        }
      } finally {
        if (requestIdRef.current === requestId) {
          setIsLoading(false);
        }
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [open, search, canReadCampaigns]);

  const handleSelect = (campaign: Campaign) => {
    setSelectedLabel(campaign.title || campaign.name || campaign.id);
    onChange(campaign.id);
    setOpen(false);
    setSearch('');
  };

  const handleClear = () => {
    setSelectedLabel(undefined);
    onChange(undefined);
  };

  const triggerLabel = value
    ? selectedLabel ?? t('events.filters.campaignLoading')
    : t('events.filters.campaignPlaceholder');

  if (!canReadCampaigns) return null;

  return (
    <div className="relative w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              id={id}
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={disabled}
              className={cn('w-full justify-between font-normal', value && !disabled && 'pe-14')}
              data-testid="campaign-filter-trigger"
            />
          }
        >
          <span className={cn('truncate text-left', !value && 'text-muted-foreground')}>{triggerLabel}</span>
          <ChevronsUpDown className="absolute end-2.5 opacity-56" />
        </PopoverTrigger>
        <PopoverPopup
          className="w-(--anchor-width) [--viewport-inline-padding:0] **:data-[slot=popover-viewport]:py-0"
          align="start"
        >
          <Command
            filter={null}
            value={search}
            onValueChange={(next, details) => {
              if (details.reason === 'item-press') return;
              setSearch(next);
            }}
          >
            <CommandInput placeholder={t('events.filters.campaignSearchPlaceholder')} />
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 border-t py-3 text-muted-foreground text-xs">
                <Spinner className="size-3.5" />
                {t('events.filters.campaignLoading')}
              </div>
            ) : options.length === 0 ? (
              <p className="border-t py-6 text-center text-muted-foreground text-sm">{t('events.filters.campaignEmpty')}</p>
            ) : (
              <CommandList className="max-h-64 border-t">
                {options.map(campaign => {
                  const label = campaign.title || campaign.name || campaign.id;
                  return (
                    <CommandItem key={campaign.id} value={campaign.id} onClick={() => handleSelect(campaign)}>
                      <Check className={cn('size-3.5', value === campaign.id ? 'opacity-100' : 'opacity-0')} />
                      <span className="truncate">{label}</span>
                    </CommandItem>
                  );
                })}
              </CommandList>
            )}
          </Command>
        </PopoverPopup>
      </Popover>
      {value && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="absolute end-7 top-1/2 -translate-y-1/2 text-muted-foreground"
          aria-label={t('events.filters.clearCampaign')}
          onClick={handleClear}
        >
          <X />
        </Button>
      )}
    </div>
  );
}

export default CampaignFilterAutocomplete;
