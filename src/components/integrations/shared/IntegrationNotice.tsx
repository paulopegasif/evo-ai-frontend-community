import type { ReactNode } from 'react';
import { CircleAlert, Info, ShieldAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface IntegrationNoticeProps {
  variant?: 'info' | 'warning' | 'error';
  /** Locale titles end with a colon ("Security:"); it is dropped when shown as a title. */
  title?: string;
  children?: ReactNode;
  className?: string;
}

const ICONS = { info: Info, warning: ShieldAlert, error: CircleAlert };

/** Info / security / validation callout used inside integration dialogs. */
export default function IntegrationNotice({
  variant = 'info',
  title,
  children,
  className,
}: IntegrationNoticeProps) {
  const Icon = ICONS[variant];
  return (
    <Alert variant={variant} className={className}>
      <Icon />
      {title && <AlertTitle>{title.replace(/\s*[:：]\s*$/, '')}</AlertTitle>}
      {children && <AlertDescription>{children}</AlertDescription>}
    </Alert>
  );
}
