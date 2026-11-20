import { AlertCircle, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import { useLanguage } from '@/hooks/useLanguage';
import { useNodeValidationIssues } from '@/contexts/JourneyValidationContext';

interface NodeValidationBadgeProps {
  nodeId: string | null | undefined;
}

/**
 * Per-node validation marker (EVO-1744, AC3). Reads the node's issues from the
 * JourneyValidation context (never from node `data` — see F6) and renders an
 * error (red) or warning (amber) badge with a tooltip listing the messages.
 * Renders nothing when the node has no issues.
 */
export function NodeValidationBadge({ nodeId }: NodeValidationBadgeProps) {
  const { t } = useLanguage('journey');
  const issues = useNodeValidationIssues(nodeId);

  if (issues.length === 0) return null;

  const hasError = issues.some((i) => i.severity === 'error');
  const Icon = hasError ? AlertCircle : AlertTriangle;
  const color = hasError ? 'text-flow-feedback-error-fg' : 'text-warning';

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={`absolute -top-2 -right-2 z-10 rounded-full bg-card p-0.5 ${color}`}
            role="img"
            aria-label={t(
              hasError
                ? 'flowEditor.validation.nodeHasErrors'
                : 'flowEditor.validation.nodeHasWarnings',
            )}
          />
        }
      >
        <Icon className="size-4" />
      </TooltipTrigger>
      <TooltipPopup>
        <ul className="space-y-1 text-xs">
          {issues.map((issue, idx) => (
            <li key={idx}>{t(issue.messageKey, issue.params)}</li>
          ))}
        </ul>
      </TooltipPopup>
    </Tooltip>
  );
}
