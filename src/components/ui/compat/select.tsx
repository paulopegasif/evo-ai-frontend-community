/* eslint-disable @typescript-eslint/no-unused-vars -- Radix-only props are destructured to drop them. */
/**
 * Select, Tabs and Accordion with the former Radix API, on coss ui.
 *
 * Radix Select shows the selected item's label by itself; Base UI needs an
 * `items` map for that, so it is collected from the SelectItem children.
 */
import {
  Children,
  isValidElement,
  useMemo,
  type ReactElement,
  type ReactNode,
} from 'react';
import type * as React from 'react';
import {
  Select as CossSelect,
  SelectGroup,
  SelectGroupLabel,
  SelectItem,
  SelectPopup,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs as CossTabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs';
import {
  Accordion as CossAccordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export { SelectGroup, SelectItem, SelectTrigger, SelectValue, SelectSeparator };
export const SelectLabel = SelectGroupLabel;

function collectItems(children: ReactNode, items: Record<string, ReactNode>): void {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const element = child as ReactElement<{ value?: unknown; children?: ReactNode }>;
    if (element.type === SelectItem && element.props.value != null) {
      items[String(element.props.value)] = element.props.children;
    } else if (element.props.children) {
      collectItems(element.props.children, items);
    }
  });
}

const toBase = (value: string | null | undefined) => (value === '' || value == null ? null : value);

type SelectProps = Omit<
  React.ComponentProps<typeof CossSelect>,
  'value' | 'defaultValue' | 'onValueChange' | 'items'
> & {
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?(value: string): void;
  children?: ReactNode;
};

export function Select({ value, defaultValue, onValueChange, children, ...props }: SelectProps): ReactElement {
  const items = useMemo(() => {
    const collected: Record<string, ReactNode> = {};
    collectItems(children, collected);
    return collected;
  }, [children]);

  return (
    <CossSelect
      items={items}
      value={value === undefined ? undefined : toBase(value)}
      defaultValue={defaultValue === undefined ? undefined : toBase(defaultValue)}
      onValueChange={(next: unknown) => onValueChange?.(next == null ? '' : String(next))}
      {...props}
    >
      {children}
    </CossSelect>
  );
}

type SelectContentProps = React.ComponentProps<typeof SelectPopup> & { position?: string };

export function SelectContent({ position: _position, ...props }: SelectContentProps): ReactElement {
  return <SelectPopup alignItemWithTrigger={false} {...props} />;
}

// Tabs -----------------------------------------------------------------------

type TabsProps = Omit<React.ComponentProps<typeof CossTabs>, 'onValueChange'> & {
  onValueChange?(value: string): void;
};

export function Tabs({ onValueChange, ...props }: TabsProps): ReactElement {
  return <CossTabs onValueChange={onValueChange ? (v: unknown) => onValueChange(String(v)) : undefined} {...props} />;
}

export { TabsList };
export const TabsTrigger = TabsTab;

export function TabsContent({
  forceMount,
  ...props
}: React.ComponentProps<typeof TabsPanel> & { forceMount?: boolean }): ReactElement {
  return <TabsPanel keepMounted={forceMount} {...props} />;
}

// Accordion ------------------------------------------------------------------

type AccordionProps = Omit<
  React.ComponentProps<typeof CossAccordion>,
  'value' | 'defaultValue' | 'onValueChange' | 'multiple'
> & {
  type?: 'single' | 'multiple';
  collapsible?: boolean;
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string & string[]) => void;
};

const toArray = (value: string | string[] | undefined) =>
  value === undefined ? undefined : Array.isArray(value) ? value : value ? [value] : [];

export function Accordion({
  type = 'single',
  collapsible: _collapsible,
  value,
  defaultValue,
  onValueChange,
  ...props
}: AccordionProps): ReactElement {
  const multiple = type === 'multiple';
  return (
    <CossAccordion
      multiple={multiple}
      value={toArray(value)}
      defaultValue={toArray(defaultValue)}
      onValueChange={(next: unknown[]) => {
        const values = next.map(String);
        (onValueChange as ((v: string | string[]) => void) | undefined)?.(multiple ? values : (values[0] ?? ''));
      }}
      {...props}
    />
  );
}

export { AccordionItem, AccordionTrigger, AccordionContent };
