import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/hooks/useLanguage';

export interface BaseStatusBadgeProps {
  status: 'active' | 'inactive' | 'blocked' | 'pending' | 'success' | 'error' | 'warning';
  text?: string;
  className?: string;
}

const VARIANT = {
  active: 'success',
  success: 'success',
  inactive: 'secondary',
  blocked: 'error',
  error: 'error',
  pending: 'warning',
  warning: 'warning',
} as const;

/** Soft status pill shared by contacts and users; same Badge variants as the rest of the app. */
export default function BaseStatusBadge({ status, text, className }: BaseStatusBadgeProps) {
  const { t } = useLanguage('common');
  return (
    <Badge variant={VARIANT[status]} className={className}>
      {text || t(`base.status.${status}`)}
    </Badge>
  );
}
