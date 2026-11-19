import { isValidElement, type ReactElement, type ReactNode } from 'react';

/**
 * Translates the Radix `asChild` pattern to Base UI's `render` prop.
 *
 * With `asChild`, the single child element becomes the rendered element and
 * keeps its own children. Base UI merges the render element's props over the
 * component's, so no `children` is passed to the component itself.
 */
export function slot<R>(
  asChild: boolean | undefined,
  children: ReactNode,
  render?: R,
): { render: R | ReactElement | undefined; children: ReactNode } {
  if (!asChild || !isValidElement(children)) return { render, children };
  return { render: children as ReactElement, children: undefined };
}
