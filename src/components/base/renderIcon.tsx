import { isValidElement, type ComponentType, type ReactNode } from 'react';

/** Accepts an icon element (`<Plus />`) or component (`Plus`) and renders it. */
export function renderIcon(icon: ReactNode | ComponentType<{ className?: string }>): ReactNode {
  if (!icon) return null;
  if (isValidElement(icon)) return icon;
  if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null && '$$typeof' in icon)) {
    const Icon = icon as ComponentType<{ className?: string }>;
    return <Icon />;
  }
  return icon as ReactNode;
}
