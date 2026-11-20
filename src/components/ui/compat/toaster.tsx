import type * as React from 'react';
import { Toaster as Sonner } from 'sonner';

/** Sonner toaster themed with coss tokens (formerly from @evoapi/design-system). */
export function Toaster({ theme = 'system', ...props }: React.ComponentProps<typeof Sonner>): React.ReactElement {
  return (
    <Sonner
      theme={theme}
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius-lg)',
        } as React.CSSProperties
      }
      toastOptions={{ classNames: { toast: 'shadow-lg/5', description: 'text-muted-foreground!' } }}
      {...props}
    />
  );
}
