import { Badge } from '@/components/ui/badge';
import { ContactLabel } from '@/types/contacts';

interface ContactTagsListProps {
  labels?: (string | ContactLabel)[];
  maxVisible?: number;
  size?: 'sm' | 'md';
}

const DEFAULT_COLOR = '#1f93ff';

export default function ContactTagsList({ labels = [], maxVisible = 3, size = 'sm' }: ContactTagsListProps) {
  if (!labels || labels.length === 0) {
    return null;
  }

  const visibleLabels = labels.slice(0, maxVisible);
  const remainingCount = labels.length - maxVisible;
  const badgeSize = size === 'sm' ? 'default' : 'lg';

  const getLabelData = (label: string | ContactLabel) =>
    typeof label === 'string' ? { name: label, color: DEFAULT_COLOR } : label;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {visibleLabels.map((label, index) => {
        const labelData = getLabelData(label);
        return (
          <Badge key={`${labelData.name}-${index}`} variant="outline" size={badgeSize} className="max-w-40 gap-1.5">
            {/* Label colors are user-defined (categorical), shown as a dot */}
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: labelData.color || DEFAULT_COLOR }}
              aria-hidden="true"
            />
            <span className="truncate">{labelData.name}</span>
          </Badge>
        );
      })}

      {remainingCount > 0 && (
        <Badge variant="outline" size={badgeSize} className="text-muted-foreground tabular-nums">
          +{remainingCount}
        </Badge>
      )}
    </div>
  );
}
