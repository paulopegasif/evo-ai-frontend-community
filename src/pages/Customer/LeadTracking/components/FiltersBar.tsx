import { X } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
} from '@/components/ui/combobox';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CampaignOption } from '@/types/leadTracking';

const ALL = '__all__';

interface FiltersBarProps {
  sources: string[];
  campaigns: CampaignOption[];
  source: string | null;
  campaign: string | null;
  user: string | null;
  onChange: (key: 'source' | 'campaign' | 'user', value: string | null) => void;
  onClear: () => void;
}

const CampaignCombobox = ({
  campaigns,
  value,
  onChange,
}: {
  campaigns: CampaignOption[];
  value: string | null;
  onChange: (value: string | null) => void;
}) => {
  // A selected campaign without data in the period stays selectable under a generic name.
  const selected = campaigns.find((c) => c.key === value) ?? (value ? { key: value, name: 'Campanha selecionada', source: '' } : null);

  return (
    <Combobox
      items={campaigns}
      value={selected}
      onValueChange={(c) => onChange(c?.key ?? null)}
      itemToStringLabel={(c) => c.name}
      itemToStringValue={(c) => `${c.name} ${c.key}`}
      isItemEqualToValue={(a, b) => a.key === b.key}
    >
      <div className="w-full sm:w-64">
        <ComboboxInput placeholder="Todas as campanhas" aria-label="Filtrar por campanha" showClear={Boolean(value)} />
      </div>
      <ComboboxPopup className="w-(--anchor-width) min-w-80">
        <ComboboxEmpty>Nenhuma campanha encontrada.</ComboboxEmpty>
        <ComboboxList>
          {(c: CampaignOption) => (
            <ComboboxItem key={c.key} value={c}>
              <div className="min-w-0">
                <div className="truncate">{c.name}</div>
                <div className="text-muted-foreground text-xs">{c.source}</div>
              </div>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxPopup>
    </Combobox>
  );
};

const FiltersBar = ({ sources, campaigns, source, campaign, user, onChange, onClear }: FiltersBarProps) => {
  // Keep a selected value listed even if it has no data in the current period.
  const sourceOptions = source && !sources.includes(source) ? [...sources, source] : sources;
  const sourceItems = [{ value: ALL, label: 'Todas as origens' }, ...sourceOptions.map((name) => ({ value: name, label: name }))];
  const hasFilters = Boolean(source || campaign || user);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select items={sourceItems} value={source ?? ALL} onValueChange={(value) => onChange('source', !value || value === ALL ? null : value)}>
        <SelectTrigger className="w-full sm:w-48" aria-label="Filtrar por origem">
          <SelectValue />
        </SelectTrigger>
        <SelectPopup>
          {sourceItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>

      <CampaignCombobox campaigns={campaigns} value={campaign} onChange={(value) => onChange('campaign', value)} />

      {hasFilters && (
        <Button variant="ghost" onClick={onClear}>
          <X />
          Limpar filtros
        </Button>
      )}
    </div>
  );
};

export default FiltersBar;
