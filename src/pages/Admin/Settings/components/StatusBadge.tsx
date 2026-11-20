import { Badge } from '@/components/ui/badge';
import type { SettingsStatus } from './SettingsUI';

export function StatusBadge({ status }: { status: SettingsStatus }) {
  return (
    <Badge variant={status.variant}>
      <span
        className={`size-1.5 rounded-full ${status.variant === 'success' ? 'bg-success' : 'bg-muted-foreground/48'}`}
        aria-hidden="true"
      />
      {status.label}
    </Badge>
  );
}
