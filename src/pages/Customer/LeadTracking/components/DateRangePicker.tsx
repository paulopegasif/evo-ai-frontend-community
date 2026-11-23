import { useState } from 'react';
import { CalendarDays } from '@/components/icons';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverPopup, PopoverTrigger } from '@/components/ui/popover';
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

/** Range picked on the coss calendar; future days are disabled. */
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
      <PopoverTrigger render={<Button variant="outline" className="font-normal" aria-label={ariaLabel} />}>
        <CalendarDays />
        {value ? formatRange(value) : placeholder}
      </PopoverTrigger>
      <PopoverPopup className="p-0" align="end">
        <div className="p-2">
          <Calendar
            mode="range"
            locale={ptBR}
            numberOfMonths={2}
            defaultMonth={draft?.from ?? value?.from}
            selected={draft?.from ? { from: draft.from, to: draft.to } : undefined}
            onSelect={(range: Draft | undefined) => setDraft(range)}
            disabled={{ after: new Date() }}
          />
        </div>
        <div className="flex items-center justify-end gap-2 border-t p-3">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button size="sm" onClick={apply} disabled={!draft?.from}>
            Aplicar
          </Button>
        </div>
      </PopoverPopup>
    </Popover>
  );
};

export default DateRangePicker;
