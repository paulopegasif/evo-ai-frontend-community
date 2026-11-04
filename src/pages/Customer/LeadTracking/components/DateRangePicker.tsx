import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { ptBR } from 'date-fns/locale';
import { Button, Calendar, Popover, PopoverContent, PopoverTrigger } from '@evoapi/design-system';
import { formatRange, type DateRange } from '../periods';

interface DateRangePickerProps {
  value: DateRange | null;
  onChange: (range: DateRange) => void;
  placeholder?: string;
  ariaLabel: string;
}

interface Draft {
  from?: Date;
  to?: Date;
}

/** Range picked on the design-system calendar; future days are disabled. */
const DateRangePicker = ({ value, onChange, placeholder = 'Escolher datas', ariaLabel }: DateRangePickerProps) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | undefined>(value ?? undefined);

  const handleOpenChange = (next: boolean) => {
    if (next) setDraft(value ?? undefined);
    setOpen(next);
  };

  const apply = () => {
    if (!draft?.from) return;
    onChange({ from: draft.from, to: draft.to ?? draft.from });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 font-normal" aria-label={ariaLabel}>
          <CalendarDays className="h-4 w-4 mr-2" />
          {value ? formatRange(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="range"
          locale={ptBR}
          numberOfMonths={2}
          defaultMonth={draft?.from ?? value?.from}
          selected={draft?.from ? { from: draft.from, to: draft.to } : undefined}
          onSelect={(range: Draft | undefined) => setDraft(range)}
          disabled={{ after: new Date() }}
        />
        <div className="flex items-center justify-end gap-2 border-t p-3">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button size="sm" onClick={apply} disabled={!draft?.from}>
            Aplicar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default DateRangePicker;
