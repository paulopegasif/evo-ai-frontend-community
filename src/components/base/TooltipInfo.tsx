import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';

interface TooltipInfoProps {
  title: string;
  content: string;
}

/** Help icon with an explanatory tooltip; focusable so keyboard users can open it. */
export function TooltipInfo({ title, content }: TooltipInfoProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={title}
            className="inline-flex shrink-0 cursor-help rounded-full text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
        }
      >
        <HelpCircle className="size-3.5" />
      </TooltipTrigger>
      <TooltipPopup side="top" className="max-w-72">
        <p className="mb-1 font-semibold">{title}</p>
        <p className="leading-relaxed opacity-80">{content}</p>
      </TooltipPopup>
    </Tooltip>
  );
}
