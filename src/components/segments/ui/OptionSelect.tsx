import { Fragment, useMemo, type ReactNode } from 'react';
import {
  Select,
  SelectGroup,
  SelectGroupLabel,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface OptionSelectOption {
  value: string;
  label: ReactNode;
  /** Richer content for the popup item; `label` is still used in the trigger. */
  content?: ReactNode;
  disabled?: boolean;
  /** Key of the group (see `groups`) this option belongs to. */
  group?: string;
}

export interface OptionSelectProps {
  value: string | null | undefined;
  onValueChange: (value: string) => void;
  options: OptionSelectOption[];
  groups?: { key: string; label: ReactNode }[];
  placeholder?: ReactNode;
  id?: string;
  className?: string;
  disabled?: boolean;
  size?: 'sm' | 'default' | 'lg';
  empty?: ReactNode;
  onOpenChange?: (open: boolean) => void;
  'aria-label'?: string;
  'aria-invalid'?: boolean;
}

/** Single-value coss Select driven by an options array (labels resolved for SelectValue). */
export default function OptionSelect({
  value,
  onValueChange,
  options,
  groups,
  placeholder,
  id,
  className,
  disabled,
  size,
  empty,
  onOpenChange,
  ...aria
}: OptionSelectProps) {
  const items = useMemo(() => {
    const map: Record<string, ReactNode> = {};
    for (const o of options) map[o.value] = o.label;
    return map;
  }, [options]);

  const renderItem = (o: OptionSelectOption) => (
    <SelectItem key={o.value} value={o.value} disabled={o.disabled}>
      {o.content ?? o.label}
    </SelectItem>
  );

  return (
    <Select
      items={items}
      value={value === '' || value == null ? null : value}
      onValueChange={next => onValueChange(next == null ? '' : String(next))}
      disabled={disabled}
      onOpenChange={open => onOpenChange?.(open)}
    >
      <SelectTrigger id={id} size={size} className={className} aria-label={aria['aria-label']} aria-invalid={aria['aria-invalid'] || undefined}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectPopup alignItemWithTrigger={false}>
        {options.length === 0 && empty && (
          <div className="px-2 py-3 text-center text-muted-foreground text-sm">{empty}</div>
        )}
        {groups
          ? groups.map(g => {
              const groupOptions = options.filter(o => o.group === g.key);
              if (!groupOptions.length) return null;
              return (
                <SelectGroup key={g.key}>
                  <SelectGroupLabel>{g.label}</SelectGroupLabel>
                  {groupOptions.map(renderItem)}
                </SelectGroup>
              );
            })
          : options.map(o => <Fragment key={o.value}>{renderItem(o)}</Fragment>)}
      </SelectPopup>
    </Select>
  );
}
