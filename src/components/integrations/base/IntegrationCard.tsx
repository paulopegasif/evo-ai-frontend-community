import { useState } from 'react';
import { ChevronRight, Power } from '@/components/icons';
import { useLanguage } from '@/hooks/useLanguage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Integration } from '@/types/integrations';
import BrandIcon, { getBrandIcon } from '@/components/BrandIcon';

interface IntegrationCardProps {
  integration: Integration;
  onConfigure: () => void;
  onToggle?: () => void; // Optional for config-only integrations
  isProcessing?: boolean;
  configOnly?: boolean; // For integrations that only need configuration
}

function IntegrationLogo({ integration }: { integration: Integration }) {
  const [imageError, setImageError] = useState(false);
  const [darkImageError, setDarkImageError] = useState(false);

  if (getBrandIcon(integration.id)) {
    return <BrandIcon id={integration.id} size={24} className="size-6" />;
  }

  if (imageError) {
    const initials = integration.name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(word => word[0]?.toUpperCase())
      .join('');
    return <span className="font-semibold text-muted-foreground text-xs">{initials}</span>;
  }

  return (
    <>
      <img
        src={`/integrations/${integration.id}.png`}
        alt=""
        className={darkImageError ? 'size-full object-contain' : 'size-full object-contain dark:hidden'}
        onError={() => setImageError(true)}
      />
      {!darkImageError && (
        <img
          src={`/integrations/${integration.id}-dark.png`}
          alt=""
          className="hidden size-full object-contain dark:block"
          onError={() => setDarkImageError(true)}
        />
      )}
    </>
  );
}

export default function IntegrationCard({
  integration,
  onConfigure,
  onToggle,
  isProcessing = false,
  configOnly = false,
}: IntegrationCardProps) {
  const { t } = useLanguage('integrations');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const connected = configOnly || integration.enabled;
  const statusText = configOnly
    ? t('status.active')
    : integration.enabled
      ? t('status.connected')
      : t('status.disconnected');

  return (
    <Card className="group flex flex-col gap-0 transition-shadow hover:shadow-md/5">
      <button
        type="button"
        onClick={configOnly || integration.enabled ? onConfigure : onToggle}
        disabled={isProcessing || (!configOnly && !integration.enabled && !onToggle)}
        className="flex flex-1 items-start gap-3 rounded-t-[inherit] p-5 text-start outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
      >
        <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-background p-1.5">
          <IntegrationLogo integration={integration} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="truncate font-semibold text-sm">{integration.name}</span>
            <Badge variant={connected ? 'success' : 'outline'} size="sm" className="shrink-0">
              <span
                aria-hidden
                className={connected ? 'size-1.5 rounded-full bg-success' : 'size-1.5 rounded-full bg-muted-foreground/48'}
              />
              {statusText}
            </Badge>
          </span>
          <span className="mt-1 line-clamp-2 text-muted-foreground text-sm">{integration.description}</span>
        </span>
      </button>

      <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
        {configOnly ? (
          <Button variant="ghost" size="sm" onClick={onConfigure} disabled={isProcessing}>
            {t('actions.configure')}
            <ChevronRight />
          </Button>
        ) : integration.enabled ? (
          <>
            {onToggle && (
              <Button
                variant="ghost"
                size="sm"
                className="me-auto text-destructive-foreground"
                onClick={() => setConfirmOpen(true)}
                loading={isProcessing}
              >
                <Power />
                {t('actions.disconnect')}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onConfigure} disabled={isProcessing}>
              {t('actions.configure')}
              <ChevronRight />
            </Button>
          </>
        ) : (
          <Button size="sm" onClick={() => onToggle?.()} loading={isProcessing} disabled={!onToggle}>
            {t('actions.connect')}
          </Button>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmDisconnect.title', { name: integration.name })}</AlertDialogTitle>
            <AlertDialogDescription>{t('confirmDisconnect.description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>{t('confirmDisconnect.cancel')}</AlertDialogClose>
            <AlertDialogClose render={<Button variant="destructive" />} onClick={() => onToggle?.()}>
              {t('actions.disconnect')}
            </AlertDialogClose>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </Card>
  );
}
