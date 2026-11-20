import { GitBranch } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import { Contact, ContactPipelineInfo } from '@/types/contacts';
import { useLanguage } from '@/hooks/useLanguage';

interface ContactPipelinesBadgeProps {
  contact: Contact;
  maxPipelines?: number;
  compact?: boolean;
}

function StageDot({ color }: { color?: string }) {
  // Stage colors are user-defined (categorical).
  return <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />;
}

function HiddenList({ items }: { items: ContactPipelineInfo[] }) {
  return (
    <ul className="flex flex-col gap-1 py-0.5">
      {items.map((info, index) => (
        <li key={`hidden-${info.pipeline.id}-${index}`} className="flex items-center gap-1.5">
          <StageDot color={info.stage.color} />
          <span>
            {info.pipeline.name} · <span className="text-muted-foreground">{info.stage.name}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function ContactPipelinesBadge({ contact, maxPipelines = 2, compact = false }: ContactPipelinesBadgeProps) {
  const { t } = useLanguage('contacts');

  // Pipelines data comes with the contact object (already loaded from the API).
  const contactPipelines = contact.pipelines || [];
  if (contactPipelines.length === 0) return null;

  const visiblePipelines = contactPipelines.slice(0, maxPipelines);
  const hiddenPipelines = contactPipelines.slice(maxPipelines);

  const moreBadge = hiddenPipelines.length > 0 && (
    <Tooltip>
      <TooltipTrigger
        render={
          <Badge variant="outline" className="cursor-help text-muted-foreground tabular-nums">
            +{hiddenPipelines.length}
          </Badge>
        }
      />
      <TooltipPopup className="max-w-xs">
        <div className="mb-1 font-medium">{t('pipelines.morePipelines', { count: hiddenPipelines.length })}</div>
        <HiddenList items={hiddenPipelines} />
      </TooltipPopup>
    </Tooltip>
  );

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-1">
        {visiblePipelines.map((info, index) => (
          <Tooltip key={`${info.pipeline.id}-${index}`}>
            <TooltipTrigger
              render={
                <Badge variant="outline" className="max-w-36 cursor-help gap-1.5">
                  <StageDot color={info.stage?.color} />
                  <span className="truncate">{info.pipeline.name}</span>
                </Badge>
              }
            />
            <TooltipPopup>
              <div className="font-medium">{info.pipeline.name}</div>
              <div className="text-muted-foreground">{info.stage?.name}</div>
            </TooltipPopup>
          </Tooltip>
        ))}
        {moreBadge}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {visiblePipelines.map((info, index) => (
        <div key={`${info.pipeline.id}-${index}`} className="flex min-w-0 items-center gap-2">
          <Badge variant="outline" className="max-w-40 gap-1">
            <GitBranch />
            <span className="truncate">{info.pipeline.name}</span>
          </Badge>
          <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground text-xs">
            <StageDot color={info.stage?.color} />
            <span className="truncate">{info.stage?.name}</span>
          </span>
        </div>
      ))}
      {moreBadge}
    </div>
  );
}
