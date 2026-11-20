import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Check, Plus, Tag, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverPopup, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { ContactLabel } from '@/types/contacts';

interface Label {
  id: string;
  title: string;
  description?: string;
  color: string;
  show_on_sidebar: boolean;
}

interface ContactLabelsProps {
  contactId?: string;
  labels: (string | ContactLabel)[];
  onLabelsChange: (labels: string[]) => void;
  availableLabels?: Label[];
  disabled?: boolean;
}

export default function ContactLabels({
  labels,
  onLabelsChange,
  availableLabels = [],
  disabled = false,
}: ContactLabelsProps) {
  const { t } = useLanguage('contacts');
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // Helper function to get label name from either string or ContactLabel object
  const getLabelName = (label: string | ContactLabel): string => {
    return typeof label === 'string' ? label : label.name;
  };

  // Helper function to check if a label exists in the list
  const hasLabel = (labelTitle: string): boolean => {
    return labels.some(label => getLabelName(label) === labelTitle);
  };

  const handleLabelToggle = (labelTitle: string) => {
    if (hasLabel(labelTitle)) {
      // Remove label - convert remaining labels to strings
      const filteredLabels = labels.filter(l => getLabelName(l) !== labelTitle);
      onLabelsChange(filteredLabels.map(getLabelName));
    } else {
      // Add label - convert all labels to strings
      onLabelsChange([...labels.map(getLabelName), labelTitle]);
    }
  };

  const handleRemoveLabel = (labelTitle: string) => {
    const filteredLabels = labels.filter(l => getLabelName(l) !== labelTitle);
    onLabelsChange(filteredLabels.map(getLabelName));
  };

  const query = searchValue.trim().toLowerCase();
  const matches = availableLabels.filter(label => label.title.toLowerCase().includes(query));

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {labels.map((labelItem, index) => {
        const labelTitle = getLabelName(labelItem);
        const label = availableLabels.find(l => l.title === labelTitle);
        return (
          <Badge key={`${labelTitle}-${index}`} variant="outline" className="gap-1.5 pe-0.5">
            {label?.color ? (
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: label.color }} />
            ) : (
              <Tag />
            )}
            <span>{labelTitle}</span>
            {!disabled && (
              <button
                type="button"
                className="inline-flex size-4 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={() => handleRemoveLabel(labelTitle)}
                aria-label={`${t('labels.remove')} ${labelTitle}`}
              >
                <X className="size-3" />
              </button>
            )}
          </Badge>
        );
      })}

      {!disabled && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger render={<Button variant="outline" size="sm" className="border-dashed" />}>
            <Plus />
            {t('labels.add')}
          </PopoverTrigger>
          <PopoverPopup className="w-80 [--viewport-inline-padding:0] **:data-[slot=popover-viewport]:py-0" align="start">
            <Command
              filter={null}
              value={searchValue}
              onValueChange={(value, details) => {
                if (details.reason === 'item-press') return;
                setSearchValue(value);
              }}
            >
              <CommandInput placeholder={t('labels.search')} />
              {matches.length === 0 ? (
                <p className="border-t px-3 py-6 text-center text-muted-foreground text-sm">{t('labels.empty')}</p>
              ) : (
                <CommandList className="max-h-64 border-t">
                  {matches.map(label => (
                    <CommandItem key={label.id} value={label.title} onClick={() => handleLabelToggle(label.title)}>
                      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: label.color }} />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate">{label.title}</span>
                        {label.description && (
                          <span className="truncate text-muted-foreground text-xs">{label.description}</span>
                        )}
                      </span>
                      <Check className={cn('size-4', hasLabel(label.title) ? 'opacity-100' : 'opacity-0')} />
                    </CommandItem>
                  ))}
                </CommandList>
              )}
            </Command>
          </PopoverPopup>
        </Popover>
      )}
    </div>
  );
}
