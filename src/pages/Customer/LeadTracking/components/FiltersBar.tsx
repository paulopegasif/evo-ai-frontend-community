import { useState } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import type { CampaignOption } from '@/types/leadTracking';

const ALL = '__all__';
const TRIGGER_CLASS = 'h-9 bg-sidebar border-sidebar-border text-sidebar-foreground';

interface FiltersBarProps {
  sources: string[];
  campaigns: CampaignOption[];
  professionals: { id: string; name: string }[];
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
  const [open, setOpen] = useState(false);
  const selected = campaigns.find((c) => c.key === value);

  const select = (next: string | null) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Filtrar por campanha"
          className={`${TRIGGER_CLASS} w-[260px] justify-between font-normal`}
        >
          <span className="truncate">{selected?.name ?? (value ? 'Campanha selecionada' : 'Todas as campanhas')}</span>
          <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar campanha..." />
          <CommandList>
            <CommandEmpty>Nenhuma campanha encontrada.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="__todas__" onSelect={() => select(null)}>
                <Check className={`h-4 w-4 mr-2 ${value ? 'opacity-0' : 'opacity-100'}`} />
                Todas as campanhas
              </CommandItem>
              {campaigns.map((c) => (
                <CommandItem key={c.key} value={`${c.name} ${c.key}`} onSelect={() => select(c.key)}>
                  <Check className={`h-4 w-4 mr-2 shrink-0 ${value === c.key ? 'opacity-100' : 'opacity-0'}`} />
                  <div className="min-w-0">
                    <div className="truncate">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.source}</div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const FiltersBar = ({ sources, campaigns, professionals, source, campaign, user, onChange, onClear }: FiltersBarProps) => {
  // Keep a selected value listed even if it has no data in the current period.
  const sourceOptions = source && !sources.includes(source) ? [...sources, source] : sources;
  const hasFilters = Boolean(source || campaign || user);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={source ?? ALL} onValueChange={(value) => onChange('source', value === ALL ? null : value)}>
        <SelectTrigger className={`${TRIGGER_CLASS} w-[190px]`} aria-label="Filtrar por origem">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todas as origens</SelectItem>
          {sourceOptions.map((name) => (
            <SelectItem key={name} value={name}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <CampaignCombobox campaigns={campaigns} value={campaign} onChange={(value) => onChange('campaign', value)} />

      <Select value={user ?? ALL} onValueChange={(value) => onChange('user', value === ALL ? null : value)}>
        <SelectTrigger className={`${TRIGGER_CLASS} w-[200px]`} aria-label="Filtrar por profissional">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos os profissionais</SelectItem>
          {professionals.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" className="h-9" onClick={onClear}>
          <X className="h-4 w-4 mr-1" />
          Limpar filtros
        </Button>
      )}
    </div>
  );
};

export default FiltersBar;
