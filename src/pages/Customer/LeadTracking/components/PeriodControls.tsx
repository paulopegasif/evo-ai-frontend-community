import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  COMPARE_OPTIONS,
  PERIOD_OPTIONS,
  formatRange,
  resolveComparison,
  type CompareMode,
  type DateRange,
  type PeriodPreset,
} from '../periods';
import DateRangePicker from './DateRangePicker';

interface PeriodControlsProps {
  preset: PeriodPreset;
  range: DateRange;
  compareMode: CompareMode;
  comparison: DateRange | null;
  onPresetChange: (preset: PeriodPreset, custom?: DateRange) => void;
  onCompareChange: (mode: CompareMode, custom?: DateRange) => void;
}

const compareLabel = (option: { value: string; label: string }) =>
  option.value === 'none' ? option.label : `Comparar: ${option.label.toLowerCase()}`;
const COMPARE_ITEMS = COMPARE_OPTIONS.map((option) => ({ value: option.value, label: compareLabel(option) }));

const PeriodControls = ({ preset, range, compareMode, comparison, onPresetChange, onCompareChange }: PeriodControlsProps) => (
  <div className="flex min-w-0 flex-col gap-1.5">
    <div className="flex items-center gap-2 flex-wrap">
      <Select
        items={PERIOD_OPTIONS}
        value={preset}
        // "Personalizado" keeps the current dates until the user picks new ones.
        onValueChange={(value) => value && onPresetChange(value as PeriodPreset, value === 'custom' ? range : undefined)}
      >
        <SelectTrigger className="w-full sm:w-40" aria-label="Período">
          <SelectValue />
        </SelectTrigger>
        <SelectPopup>
          {PERIOD_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
      {preset === 'custom' && (
        <DateRangePicker value={range} onChange={(next) => onPresetChange('custom', next)} ariaLabel="Datas do período" />
      )}

      <Select
        items={COMPARE_ITEMS}
        value={compareMode}
        // A custom comparison starts from the dates being compared (or the previous period).
        onValueChange={(value) =>
          value &&
          onCompareChange(
            value as CompareMode,
            value === 'custom' ? (comparison ?? resolveComparison('previous', range, null) ?? undefined) : undefined,
          )
        }
      >
        <SelectTrigger className="w-full sm:w-60" aria-label="Comparar com">
          <SelectValue />
        </SelectTrigger>
        <SelectPopup>
          {COMPARE_ITEMS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
      {compareMode === 'custom' && (
        <DateRangePicker
          value={comparison}
          onChange={(next) => onCompareChange('custom', next)}
          placeholder="Datas da comparação"
          ariaLabel="Datas da comparação"
        />
      )}
    </div>
    <p className="text-muted-foreground text-xs tabular-nums">
      {formatRange(range)}
      {comparison && <> · comparado com {formatRange(comparison)}</>}
    </p>
  </div>
);

export default PeriodControls;
