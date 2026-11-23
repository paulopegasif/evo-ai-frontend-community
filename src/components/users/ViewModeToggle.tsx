import { Grid3X3, List } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';

export type ViewMode = 'cards' | 'table';

/** Cards / table switch shared by the Users and Teams settings pages. */
export default function ViewModeToggle({
  value,
  onValueChange,
  cardsLabel,
  tableLabel,
}: {
  value: ViewMode;
  onValueChange: (mode: ViewMode) => void;
  cardsLabel: string;
  tableLabel: string;
}) {
  const items = [
    { mode: 'cards' as const, label: cardsLabel, icon: <Grid3X3 /> },
    { mode: 'table' as const, label: tableLabel, icon: <List /> },
  ];
  return (
    <ToggleGroup
      variant="outline"
      size="sm"
      value={[value]}
      onValueChange={next => {
        const mode = next[0] as ViewMode | undefined;
        if (mode) onValueChange(mode);
      }}
    >
      {items.map(item => (
        <Tooltip key={item.mode}>
          <TooltipTrigger render={<ToggleGroupItem value={item.mode} aria-label={item.label} />}>
            {item.icon}
          </TooltipTrigger>
          <TooltipPopup>{item.label}</TooltipPopup>
        </Tooltip>
      ))}
    </ToggleGroup>
  );
}
