/* eslint-disable @typescript-eslint/no-unused-vars -- Radix-only props are destructured to drop them. */
/**
 * DropdownMenu and ContextMenu with the former Radix API (asChild, onSelect,
 * Label outside a group), on coss ui Menu / ContextMenu.
 */
import type * as React from 'react';
import { cn } from '@/lib/utils';
import {
  Menu,
  MenuCheckboxItem,
  MenuGroup,
  MenuItem,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuShortcut,
  MenuSub,
  MenuSubPopup,
  MenuSubTrigger,
  MenuTrigger,
} from '@/components/ui/menu';
import {
  ContextMenu,
  ContextMenuGroup,
  ContextMenuItem as CossContextMenuItem,
  ContextMenuPopup,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubPopup,
  ContextMenuSubTrigger,
  ContextMenuTrigger as CossContextMenuTrigger,
} from '@/components/ui/context-menu';
import { slot } from './slot';

type AsChild = { asChild?: boolean };
type RadixItemProps = AsChild & {
  onSelect?: (event: Event) => void;
  inset?: boolean;
  textValue?: string;
};

function itemProps<P extends { onClick?: React.MouseEventHandler<HTMLElement>; children?: React.ReactNode; render?: unknown }>(
  { asChild, onSelect, onClick, inset: _inset, textValue: _textValue, children, render, ...props }: P & RadixItemProps,
) {
  const s = slot(asChild, children, render);
  return {
    ...props,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render: s.render as any,
    children: s.children,
    onClick: (event: React.MouseEvent<HTMLElement>) => {
      onClick?.(event);
      onSelect?.(event.nativeEvent);
    },
  };
}

const labelClassName = 'px-2 py-1.5 font-medium text-muted-foreground text-xs';

// DropdownMenu ---------------------------------------------------------------

export const DropdownMenu = Menu;
export const DropdownMenuGroup = MenuGroup;
export const DropdownMenuSeparator = MenuSeparator;
export const DropdownMenuShortcut = MenuShortcut;
export const DropdownMenuSub = MenuSub;
export const DropdownMenuSubContent = MenuSubPopup;
export const DropdownMenuRadioGroup = MenuRadioGroup;
export const DropdownMenuRadioItem = MenuRadioItem;
export const DropdownMenuCheckboxItem = MenuCheckboxItem;

export function DropdownMenuTrigger({
  asChild,
  children,
  render,
  ...props
}: React.ComponentProps<typeof MenuTrigger> & AsChild): React.ReactElement {
  const s = slot(asChild, children, render);
  return (
    <MenuTrigger {...props} render={s.render}>
      {s.children}
    </MenuTrigger>
  );
}

type DropdownMenuContentProps = React.ComponentProps<typeof MenuPopup> & {
  forceMount?: unknown;
  onCloseAutoFocus?: unknown;
  collisionPadding?: unknown;
};

export function DropdownMenuContent({
  forceMount: _a,
  onCloseAutoFocus: _b,
  collisionPadding: _c,
  ...props
}: DropdownMenuContentProps): React.ReactElement {
  return <MenuPopup {...props} />;
}

export function DropdownMenuItem(props: React.ComponentProps<typeof MenuItem> & RadixItemProps): React.ReactElement {
  return <MenuItem {...itemProps(props)} />;
}

export function DropdownMenuSubTrigger({
  inset: _inset,
  ...props
}: React.ComponentProps<typeof MenuSubTrigger> & { inset?: boolean }): React.ReactElement {
  return <MenuSubTrigger {...props} />;
}

/** Plain heading: Base UI group labels must live inside a group. */
export function DropdownMenuLabel({
  className,
  inset: _inset,
  ...props
}: React.ComponentProps<'div'> & { inset?: boolean }): React.ReactElement {
  return <div data-slot="menu-label" className={cn(labelClassName, className)} {...props} />;
}

// ContextMenu ----------------------------------------------------------------

export {
  ContextMenu,
  ContextMenuGroup,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubTrigger,
};
export const ContextMenuSubContent = ContextMenuSubPopup;

export function ContextMenuTrigger({
  asChild,
  children,
  render,
  ...props
}: React.ComponentProps<typeof CossContextMenuTrigger> & AsChild): React.ReactElement {
  const s = slot(asChild, children, render);
  return (
    <CossContextMenuTrigger {...props} render={s.render}>
      {s.children}
    </CossContextMenuTrigger>
  );
}

export const ContextMenuContent = ContextMenuPopup;

export function ContextMenuItem(
  props: React.ComponentProps<typeof CossContextMenuItem> & RadixItemProps,
): React.ReactElement {
  return <CossContextMenuItem {...itemProps(props)} />;
}

export function ContextMenuLabel({ className, ...props }: React.ComponentProps<'div'>): React.ReactElement {
  return <div data-slot="context-menu-label" className={cn(labelClassName, className)} {...props} />;
}
