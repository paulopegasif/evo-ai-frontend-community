import React from 'react';
import { AlertCircle } from '@/components/icons';
import { Button } from '@/components/ui/button';

interface BannerProps {
  /**
   * Main banner message text
   */
  bannerMessage: string;

  /**
   * Optional external link
   */
  hrefLink?: string;

  /**
   * Link text to display
   */
  hrefLinkText?: string;

  /**
   * Optional action button
   */
  hasActionButton?: boolean;

  /**
   * Action button label
   */
  actionButtonLabel?: string;

  /**
   * Action button click handler
   */
  onPrimaryAction?: () => void;

  /**
   * Color scheme of the banner
   * @default 'alert'
   */
  colorScheme?: 'primary' | 'secondary' | 'alert' | 'warning';
}

const Banner: React.FC<BannerProps> = ({
  bannerMessage,
  hrefLink,
  hrefLinkText,
  hasActionButton = false,
  actionButtonLabel,
  onPrimaryAction,
  colorScheme = 'alert',
}) => {
  // Color scheme classes mapping
  const colorSchemeClasses = {
    primary: 'border-primary/24 bg-primary/8 text-foreground [&>div>svg]:text-primary',
    secondary: 'border-border bg-secondary text-secondary-foreground',
    alert: 'border-destructive/24 bg-destructive/8 text-foreground [&>div>svg]:text-destructive-foreground',
    warning: 'border-warning/24 bg-warning/8 text-foreground [&>div>svg]:text-warning-foreground',
  };

  return (
    <div
      role={colorScheme === 'alert' || colorScheme === 'warning' ? 'alert' : 'status'}
      className={`mx-3 mt-2 flex items-center justify-between gap-4 rounded-lg border px-3 py-2 text-sm ${colorSchemeClasses[colorScheme]}`}
    >
      <div className="flex items-center gap-2 flex-1">
        <AlertCircle aria-hidden="true" className="size-4 flex-shrink-0" />
        <span className="banner-message">
          {bannerMessage}
          {hrefLink && hrefLinkText && (
            <>
              {' '}
              <a
                href={hrefLink}
                rel="noopener noreferrer nofollow"
                target="_blank"
                className="font-medium underline underline-offset-2 hover:opacity-80"
              >
                {hrefLinkText}
              </a>
            </>
          )}
        </span>
      </div>

      {hasActionButton && actionButtonLabel && (
        <Button size="sm" variant="outline" onClick={onPrimaryAction} className="flex-shrink-0">
          {actionButtonLabel}
        </Button>
      )}
    </div>
  );
};

export default Banner;
