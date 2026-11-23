import type { ReactNode } from 'react';

/** Titled definition-list block used by the user and team detail dialogs. */
export function DetailSection({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="flex items-center gap-2 font-semibold text-sm [&_svg]:size-4 [&_svg]:text-muted-foreground">
        {icon}
        {title}
      </h3>
      <dl className="flex flex-col divide-y rounded-xl border bg-muted/24 text-sm">{children}</dl>
    </section>
  );
}

export function DetailRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5">
      <dt className="flex flex-col gap-0.5">
        <span className={hint ? 'font-medium' : 'text-muted-foreground'}>{label}</span>
        {hint && <span className="text-muted-foreground text-xs">{hint}</span>}
      </dt>
      <dd className="min-w-0 truncate text-end">{children}</dd>
    </div>
  );
}
