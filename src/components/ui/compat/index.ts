/**
 * Drop-in replacement for the former `@evoapi/design-system` imports (the
 * package is no longer a dependency).
 *
 * Everything here keeps the shadcn/Radix names and props the app was written
 * against, implemented with coss ui (Base UI). Screens being redesigned should
 * import from '@/components/ui/<component>' and use the coss API directly.
 *
 * Chart (recharts) lives in ../chart, the cmdk-based Command in ./command and
 * the Sonner Toaster in ./toaster; Calendar wraps the coss one.
 */
export * from './basic';
export * from './overlays';
export * from './menus';
export * from './select';

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
  type ChartConfig,
} from '../chart';
export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from './command';
export { Calendar } from './calendar';
export { Toaster } from './toaster';
