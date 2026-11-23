import type { LucideIcon } from '@/components/icons';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import PrimaryActionButton from './PrimaryActionButton';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost' | 'link';
    className?: string;
    disabled?: boolean;
    tooltip?: string;
  };
  className?: string;
}

export default function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <Empty className={className}>
      <EmptyHeader>
        {Icon && (
          <EmptyMedia variant="icon">
            <Icon />
          </EmptyMedia>
        )}
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {action && (
        <EmptyContent>
          <PrimaryActionButton
            label={action.label}
            onClick={action.onClick}
            size="sm"
            variant={action.variant}
            className={action.className}
            disabled={action.disabled}
            tooltip={action.tooltip}
          />
        </EmptyContent>
      )}
    </Empty>
  );
}
