import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import { renderIcon } from './renderIcon';

interface PrimaryActionButtonProps {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost' | 'link';
  className?: string;
  disabled?: boolean;
  tooltip?: string;
}

export default function PrimaryActionButton({
  label,
  icon,
  onClick,
  size = 'sm',
  variant = 'default',
  className,
  disabled = false,
  tooltip,
}: PrimaryActionButtonProps) {
  const button = (
    <Button variant={variant} size={size} onClick={onClick} disabled={disabled} className={className}>
      {renderIcon(icon)}
      {label}
    </Button>
  );

  // Disabled buttons don't fire pointer events, so the tooltip hangs off a wrapper.
  if (tooltip && disabled) {
    return (
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" />}>{button}</TooltipTrigger>
        <TooltipPopup>{tooltip}</TooltipPopup>
      </Tooltip>
    );
  }

  return button;
}
