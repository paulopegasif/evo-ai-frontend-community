import type { ReactNode } from 'react';
import { Card, CardFooter, CardPanel } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface SettingsSectionProps {
  title: ReactNode;
  description?: ReactNode;
  /** Shown next to the title on mobile and in the Card header row on desktop (e.g. a Switch). */
  headerActions?: ReactNode;
  /** Card footer, typically the save button. */
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/**
 * Settings section: title + description on the left, content Card on the right.
 * Consecutive sections are separated by a top border.
 */
export default function SettingsSection({
  title,
  description,
  headerActions,
  footer,
  children,
  className,
}: SettingsSectionProps) {
  return (
    <section
      className={cn(
        'grid gap-4 border-t py-6 first:border-t-0 first:pt-0 md:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] md:gap-8',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 md:flex-col md:justify-start">
        <div className="flex flex-col gap-1">
          <h2 className="font-semibold text-base">{title}</h2>
          {description && <p className="text-muted-foreground text-sm">{description}</p>}
        </div>
        {headerActions && <div className="shrink-0 md:hidden">{headerActions}</div>}
      </div>
      <Card>
        {headerActions && (
          <div className="hidden items-center justify-between gap-4 px-6 py-4 md:flex [&+[data-slot=card-panel]]:border-t">
            <span className="font-medium text-sm">{title}</span>
            {headerActions}
          </div>
        )}
        {children && <CardPanel className="flex flex-col gap-5 pt-6">{children}</CardPanel>}
        {footer && <CardFooter className="justify-end border-t">{footer}</CardFooter>}
      </Card>
    </section>
  );
}
