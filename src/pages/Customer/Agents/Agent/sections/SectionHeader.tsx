import type { LucideIcon } from '@/components/icons';
import type { ReactNode } from 'react';

interface SectionHeaderProps {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}

/** Title block shared by every agent editor section. */
export function SectionHeader({ icon: Icon, title, description, action }: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-card text-muted-foreground shadow-xs/5">
            <Icon className="size-4.5" />
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="font-semibold text-lg">{title}</h2>
          {description && <p className="text-muted-foreground text-sm">{description}</p>}
        </div>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

export default SectionHeader;
