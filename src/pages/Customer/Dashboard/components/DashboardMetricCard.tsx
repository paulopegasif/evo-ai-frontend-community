import { useId } from 'react';
import type { LucideIcon } from '@/components/icons';
import { ArrowDownRight, ArrowUpRight, Minus } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TooltipInfo } from '@/components/base/TooltipInfo';
import { cn } from '@/lib/utils';
import { formatDelta, type MetricComparison } from './metricComparison';

type CardTone = 'good' | 'warning' | 'critical' | 'neutral';

type CardImportance = 'primary' | 'secondary';

interface DashboardMetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  accentClassName: string;
  importance?: CardImportance;
  status?: {
    label: string;
    tone: CardTone;
  };
  tooltip?: {
    title: string;
    content: string;
  };
  comparison?: MetricComparison;
  /** Values over the period (oldest first), drawn as a small trend line. */
  sparkline?: number[];
  /** Theme color of the sparkline; defaults to the first chart color. */
  sparklineColor?: string;
  loading?: boolean;
}

const toneVariant: Record<CardTone, 'success' | 'warning' | 'error' | 'secondary'> = {
  good: 'success',
  warning: 'warning',
  critical: 'error',
  neutral: 'secondary',
};

/** success / error / neutral badge for a variation, honoring whether a rise is good news. */
export const deltaBadgeVariant = (comparison: MetricComparison) => {
  const { delta, direction } = comparison;
  if (delta == null || delta === 0 || direction === 'neutral') return 'secondary' as const;
  const improved = direction === 'higher_is_better' ? delta > 0 : delta < 0;
  return improved ? ('success' as const) : ('error' as const);
};

export const DeltaBadge = ({ comparison }: { comparison: MetricComparison }) => {
  const { delta } = comparison;
  const Icon = delta == null || delta === 0 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <Badge variant={deltaBadgeVariant(comparison)} className="tabular-nums">
      <Icon />
      {formatDelta(delta)}
    </Badge>
  );
};

/** Minimal SVG trend line; flat or single-point series still render a baseline. */
export const Sparkline = ({ data, color = 'var(--chart-1)', className }: { data: number[]; color?: string; className?: string }) => {
  const gradientId = useId();
  if (data.length < 2) return null;
  const width = 100;
  const height = 28;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const points = data.map((v, i) => [(i / (data.length - 1)) * width, height - 2 - ((v - min) / span) * (height - 4)]);
  const line = points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  const area = `0,${height} ${line} ${width},${height}`;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn('h-8 w-full overflow-visible', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.24} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gradientId})`} />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};

/** KPI tile shared by the dashboard and lead tracking: label, value, delta badge, optional sparkline. */
const DashboardMetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  accentClassName,
  importance = 'secondary',
  status,
  tooltip,
  comparison,
  sparkline,
  sparklineColor,
  loading = false,
}: DashboardMetricCardProps) => {
  return (
    <Card className="h-full gap-0 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate font-medium text-muted-foreground text-sm">{title}</span>
          {tooltip && <TooltipInfo title={tooltip.title} content={tooltip.content} />}
        </div>
        <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', accentClassName)}>
          <Icon className="size-4" />
        </span>
      </div>

      {loading ? (
        <div className="mt-2 flex flex-col gap-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-4 w-40" />
        </div>
      ) : (
        <>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className={cn(
                'font-semibold tabular-nums tracking-tight',
                importance === 'primary' ? 'text-3xl' : 'text-2xl',
              )}
            >
              {typeof value === 'number' ? value.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : value}
            </span>
            {comparison && <DeltaBadge comparison={comparison} />}
            {status && <Badge variant={toneVariant[status.tone]}>{status.label}</Badge>}
          </div>
          {subtitle && <p className="mt-1.5 text-muted-foreground text-xs leading-relaxed">{subtitle}</p>}
          {comparison && (
            <p className="mt-1 text-muted-foreground text-xs">
              vs. <span className="tabular-nums">{comparison.value}</span>
            </p>
          )}
          {sparkline && sparkline.length > 1 && (
            <div className="mt-auto pt-3">
              <Sparkline data={sparkline} color={sparklineColor} />
            </div>
          )}
        </>
      )}
    </Card>
  );
};

export default DashboardMetricCard;
