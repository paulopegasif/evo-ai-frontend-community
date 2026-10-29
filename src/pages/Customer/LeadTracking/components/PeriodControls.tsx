import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@evoapi/design-system';
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

const TRIGGER_CLASS = 'h-9 bg-sidebar border-sidebar-border text-sidebar-foreground';

const PeriodControls = ({ preset, range, compareMode, comparison, onPresetChange, onCompareChange }: PeriodControlsProps) => (
  <div className="flex flex-col gap-1">
    <div className="flex items-center gap-2 flex-wrap">
      <Select
        value={preset}
        // "Personalizado" keeps the current dates until the user picks new ones.
        onValueChange={(value) => onPresetChange(value as PeriodPreset, value === 'custom' ? range : undefined)}
      >
        <SelectTrigger className={`${TRIGGER_CLASS} w-[150px]`} aria-label="Período">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PERIOD_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {preset === 'custom' && (
        <DateRangePicker value={range} onChange={(next) => onPresetChange('custom', next)} ariaLabel="Datas do período" />
      )}

      <Select
        value={compareMode}
        // A custom comparison starts from the dates being compared (or the previous period).
        onValueChange={(value) =>
          onCompareChange(
            value as CompareMode,
            value === 'custom' ? (comparison ?? resolveComparison('previous', range, null) ?? undefined) : undefined,
          )
        }
      >
        <SelectTrigger className={`${TRIGGER_CLASS} w-[240px]`} aria-label="Comparar com">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {COMPARE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.value === 'none' ? option.label : `Comparar: ${option.label.toLowerCase()}`}
            </SelectItem>
          ))}
        </SelectContent>
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
    <p className="text-xs text-muted-foreground">
      {formatRange(range)}
      {comparison && <> · comparado com {formatRange(comparison)}</>}
    </p>
  </div>
);

export default PeriodControls;
