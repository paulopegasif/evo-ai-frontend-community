import { ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  'data-tour'?: string;
}

export const FormSection = ({
  title,
  description,
  children,
  className,
  'data-tour': dataTour,
}: FormSectionProps) => {
  return (
    <section className={cn('rounded-xl border bg-muted/24 p-4', className)} data-tour={dataTour}>
      <div className="mb-4">
        <h4 className="font-semibold text-sm">{title}</h4>
        {description && <p className="mt-1 text-muted-foreground text-xs">{description}</p>}
      </div>
      {children}
    </section>
  );
};
