import { type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs';
import { ChevronDown } from '@/components/icons';
import { cn } from '@/lib/utils';

export type NodeConfigModalTab = {
  value: string;
  label: string;
  content: ReactNode;
  /**
   * Optional indicator rendered next to the tab label (e.g. a count dot
   * signalling "this tab has data"). Purely visual — carry any a11y text on
   * the node itself (aria-label). Default-off: tabs that omit it render
   * exactly as before. See EVO-1276.
   */
  badge?: ReactNode;
  /**
   * Keep this tab's content mounted (Radix `forceMount`) even while another tab
   * is active, so local component state inside it survives tab switches.
   * Default-off → inactive tabs unmount as before. Use sparingly: only for tabs
   * whose local state can't be reconstructed from lifted props. See EVO-1276.
   */
  forceMount?: boolean;
};

type CommonProps = {
  open: boolean;
  /** Called on ESC, click outside, X button, and Cancel button. Required: consumer controls close. */
  onCancel: () => void;
  /**
   * Called when the Save button is clicked. Component does NOT await the returned promise —
   * consumer is responsible for flipping `loading` true before the async work and false after
   * (or on error). The component never auto-manages loading state.
   */
  onSave: () => void | Promise<void>;
  title: string;
  /** Optional category icon rendered before the title in the header. */
  icon?: ReactNode;
  description?: string;
  loading?: boolean;
  dirty?: boolean;
  /** Gate the Save button beyond dirty/loading — e.g. required-field validation. Defaults to false. */
  saveDisabled?: boolean;
  saveLabel?: string;
  cancelLabel?: string;
  /**
   * Screen-reader-only text announced while `loading` is true. Default
   * is English "Saving…"; consumers should pass a translated value so
   * the audio feedback respects the user's locale.
   */
  savingAriaLabel?: string;
  /** Forwarded onto Dialog.Content's className via cn(). Useful for width overrides (e.g. max-w-4xl). */
  contentClassName?: string;
};

type SimpleProps = CommonProps & {
  variant: 'simple';
  children: ReactNode;
};

type TabsVariantProps = CommonProps & {
  variant: 'tabs';
  tabs: NodeConfigModalTab[];
  defaultTab?: string;
  onTabChange?: (value: string) => void;
  /**
   * Always-visible content rendered ABOVE the tab list (e.g. a type selector
   * that must stay reachable from any tab). Omitted → no slot, identical to the
   * pre-EVO-1276 layout. See EVO-1276.
   */
  header?: ReactNode;
  /**
   * Drives the active tab in controlled mode. When provided, the modal honors
   * this value (and `onTabChange` becomes the change handler); when omitted, the
   * tabs stay uncontrolled via `defaultTab`. See EVO-1276.
   */
  value?: string;
};

type DisclosureProps = CommonProps & {
  variant: 'disclosure';
  children: ReactNode;
  advanced: ReactNode;
  advancedLabel?: string;
  defaultAdvancedOpen?: boolean;
};

export type NodeConfigModalProps = SimpleProps | TabsVariantProps | DisclosureProps;

export function NodeConfigModal(props: NodeConfigModalProps) {
  const {
    open,
    onCancel,
    onSave,
    title,
    icon,
    description,
    loading = false,
    dirty = false,
    saveDisabled = false,
    saveLabel = 'Save',
    cancelLabel = 'Cancel',
    savingAriaLabel = 'Saving...',
    contentClassName,
  } = props;

  const handleOpenChange = (next: boolean) => {
    if (!next) onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogPopup
        bottomStickOnMobile={false}
        className={cn('max-w-2xl overflow-hidden bg-flow-panel-bg', contentClassName)}
        {...(description ? {} : { 'aria-describedby': undefined })}
      >
        <DialogHeader className="gap-1 border-flow-panel-divider border-b bg-flow-panel-header-bg px-6 py-4 pe-12">
          <div className="flex items-center gap-3">
            {icon ? (
              <span className="shrink-0" aria-hidden="true">
                {icon}
              </span>
            ) : null}
            <div className="min-w-0 flex-1 text-left">
              <DialogTitle className="text-lg leading-tight">{title}</DialogTitle>
              {description ? <DialogDescription className="mt-1">{description}</DialogDescription> : null}
            </div>
          </div>
        </DialogHeader>

        <DialogPanel className="max-h-[70vh] px-6 py-4 in-[[data-slot=dialog-popup]:has([data-slot=dialog-header])]:pt-4">
          {props.variant === 'simple' ? props.children : null}

          {props.variant === 'tabs' ? (
            <Tabs
              {...(props.value !== undefined
                ? { value: props.value }
                : { defaultValue: props.defaultTab ?? props.tabs[0]?.value })}
              onValueChange={value => props.onTabChange?.(String(value))}
            >
              {props.header ? <div className="mb-4">{props.header}</div> : null}
              <TabsList className="mb-4">
                {props.tabs.map((tab) => (
                  <TabsTab key={tab.value} value={tab.value}>
                    {tab.label}
                    {tab.badge ? (
                      <span className="ml-1.5 inline-flex items-center">{tab.badge}</span>
                    ) : null}
                  </TabsTab>
                ))}
              </TabsList>
              {props.tabs.map((tab) => (
                <TabsPanel
                  key={tab.value}
                  value={tab.value}
                  // Inactive panels unmount unless kept mounted; a kept-mounted panel
                  // stays in the DOM, so hide it while inactive. See EVO-1276.
                  {...(tab.forceMount ? { keepMounted: true, className: 'data-hidden:hidden' } : {})}
                >
                  {tab.content}
                </TabsPanel>
              ))}
            </Tabs>
          ) : null}

          {props.variant === 'disclosure' ? (
            <>
              {props.children}
              <Collapsible
                defaultOpen={props.defaultAdvancedOpen}
                className="mt-4 border-flow-panel-divider border-t pt-3"
              >
                <CollapsibleTrigger render={<Button variant="ghost" size="sm" className="group -ml-3" />}>
                  <ChevronDown className="transition-transform group-data-panel-open:rotate-180" />
                  {props.advancedLabel ?? 'Advanced settings'}
                </CollapsibleTrigger>
                <CollapsiblePanel className="pt-3">{props.advanced}</CollapsiblePanel>
              </Collapsible>
            </>
          ) : null}
        </DialogPanel>

        <DialogFooter className="border-flow-panel-divider bg-flow-panel-header-bg">
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button onClick={onSave} disabled={!dirty || loading || saveDisabled} loading={loading}>
            {loading ? <span className="sr-only">{savingAriaLabel}</span> : null}
            {saveLabel}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

NodeConfigModal.displayName = 'NodeConfigModal';
