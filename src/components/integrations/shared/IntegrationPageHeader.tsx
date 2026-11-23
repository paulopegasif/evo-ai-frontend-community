import type { ReactNode } from 'react';
import { ArrowLeft, type LucideIcon } from '@/components/icons';
import { useLanguage } from '@/hooks/useLanguage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import BrandIcon, { getBrandIcon } from '@/components/BrandIcon';

export interface IntegrationPageStatus {
  label: string;
  variant: 'success' | 'warning' | 'error' | 'info' | 'outline';
}

interface IntegrationPageHeaderProps {
  /** Brand id used to look up the logo; falls back to `icon`. */
  brandId?: string;
  icon?: LucideIcon;
  /** Image used when there is no brand icon nor `icon`. */
  logoSrc?: string;
  title: string;
  description?: ReactNode;
  status?: IntegrationPageStatus | null;
  loading?: boolean;
  onBack?: () => void;
  /** Buttons on the right of the back link (e.g. external links). */
  topActions?: ReactNode;
  /** Buttons on the right of the title (e.g. test / disconnect). */
  actions?: ReactNode;
  children?: ReactNode;
}

/** Top bar + title block shared by the integration settings pages. */
export default function IntegrationPageHeader({
  brandId,
  icon: Icon,
  logoSrc,
  title,
  description,
  status,
  loading,
  onBack,
  topActions,
  actions,
  children,
}: IntegrationPageHeaderProps) {
  const { t } = useLanguage('integrations');
  const hasBrand = brandId ? Boolean(getBrandIcon(brandId)) : false;

  return (
    <>
      {(onBack || topActions) && (
        <div className="flex items-center justify-between gap-3">
          {onBack ? (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft />
              {t('actions.backToIntegrations')}
            </Button>
          ) : (
            <span />
          )}
          {topActions && <div className="flex items-center gap-2">{topActions}</div>}
        </div>
      )}

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border bg-card shadow-xs/5">
            {hasBrand && brandId ? (
              <BrandIcon id={brandId} className="size-7" />
            ) : Icon ? (
              <Icon className="size-6 text-primary" />
            ) : logoSrc ? (
              <img src={logoSrc} alt="" className="size-7 object-contain" />
            ) : null}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-semibold text-xl tracking-tight">{title}</h1>
              {loading ? (
                <Skeleton className="h-5 w-24" />
              ) : (
                status && <Badge variant={status.variant}>{status.label}</Badge>
              )}
            </div>
            {description && <p className="mt-1 max-w-2xl text-muted-foreground text-sm">{description}</p>}
            {children}
          </div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </>
  );
}
