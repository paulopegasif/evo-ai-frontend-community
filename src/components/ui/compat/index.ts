/**
 * Drop-in replacement for the former `@evoapi/design-system` imports.
 *
 * Everything here keeps the shadcn/Radix names and props the app was written
 * against, implemented with coss ui (Base UI). Screens being redesigned should
 * import from '@/components/ui/<component>' and use the coss API directly.
 *
 * Still served by @evoapi/design-system until their screens are migrated:
 * Chart (recharts wrapper), Command (cmdk), Calendar (react-day-picker) and the
 * Sonner Toaster.
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
} from '@evoapi/design-system/chart';
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
} from '@evoapi/design-system/command';
export { Calendar } from '@evoapi/design-system/calendar';
export { Toaster } from '@evoapi/design-system/sonner';
