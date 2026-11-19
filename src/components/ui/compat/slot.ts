import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';

/**
 * Translates the Radix `asChild` pattern to Base UI's `render` prop.
 *
 * With `asChild`, the single child element becomes the rendered element and its
 * own children become the content. Base UI merges the component's `children`
 * over the render element's, so the child's children are lifted out.
 */
export function slot<R>(
  asChild: boolean | undefined,
  children: ReactNode,
  render?: R,
): { render: R | ReactElement | undefined; children: ReactNode } {
  if (!asChild || !isValidElement(children)) return { render, children };
  const element = children as ReactElement<{ children?: ReactNode }>;
  return {
    render: cloneElement(element, { children: undefined }),
    children: element.props.children,
  };
}
