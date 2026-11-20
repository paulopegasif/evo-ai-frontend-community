import type { ReactNode } from 'react';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface OptionSelectItem {
  value: string;
  label: ReactNode;
}

interface OptionSelectProps {
  items: OptionSelectItem[];
  /** Empty string means "nothing selected" (shows the placeholder). */
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

/** Flat string-valued select used by the automation rule rows. */
export default function OptionSelect({
  items,
  value,
  onValueChange,
  placeholder,
  disabled,
  className,
  'aria-label': ariaLabel,
}: OptionSelectProps) {
  return (
    <Select
      items={items}
      value={value || null}
      onValueChange={next => next != null && onValueChange(String(next))}
      disabled={disabled}
    >
      <SelectTrigger className={className} aria-label={ariaLabel}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectPopup alignItemWithTrigger={false}>
        {items.map(item => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  );
}
