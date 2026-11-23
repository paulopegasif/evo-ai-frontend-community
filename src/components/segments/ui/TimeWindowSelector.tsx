import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import OptionSelect from './OptionSelect';
import { Clock } from '@/components/icons';
import { useLanguage } from '@/hooks/useLanguage';

interface TimeWindowSelectorProps {
  show: boolean;
  onToggleShow: (show: boolean) => void;
  value: number;
  unit: string;
  onValueChange: (value: number) => void;
  onUnitChange: (unit: string) => void;
}

// const convertToSeconds = (value: number, unit: string): number => {
//   switch (unit) {
//     case 'minutes': return value * 60;
//     case 'hours': return value * 3600;
//     case 'days': return value * 86400;
//     case 'weeks': return value * 604800;
//     case 'months': return value * 2592000; // 30 days
//     default: return value * 86400;
//   }
// };

export default function TimeWindowSelector({
  show,
  onToggleShow,
  value,
  unit,
  onValueChange,
  onUnitChange,
}: TimeWindowSelectorProps) {
  const { t } = useLanguage('segments');
  const units = ['minutes', 'hours', 'days', 'weeks', 'months'].map(u => ({
    value: u,
    label: t(`timeWindow.units.${u}`),
  }));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="segment-time-window" className="flex items-center gap-2">
          <Clock className="size-4 text-muted-foreground" />
          {t('timeWindow.title')}
        </Label>
        <Switch id="segment-time-window" checked={show} onCheckedChange={checked => onToggleShow(checked)} />
      </div>

      {show && (
        <div className="flex gap-2">
          <Input
            type="number"
            value={value}
            onChange={e => {
              const newValue = parseInt(e.target.value);
              onValueChange(newValue);
            }}
            className="w-24"
            aria-label={t('timeWindow.title')}
          />
          <OptionSelect value={unit} onValueChange={onUnitChange} options={units} className="flex-1" />
        </div>
      )}
    </div>
  );
}
