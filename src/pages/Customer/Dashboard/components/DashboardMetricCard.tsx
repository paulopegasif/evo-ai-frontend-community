import type { LucideIcon } from 'lucide-react';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@/components/ui/compat';
import { TooltipInfo } from '@/components/base/TooltipInfo';
import { deltaToneClass, formatDelta, type MetricComparison } from './metricComparison';

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
}

const toneClasses: Record<CardTone, string> = {
  good: 'bg-success/10 text-success-foreground border-success/30',
  warning: 'bg-warning/10 text-warning-foreground border-warning/30',
  critical: 'bg-destructive/10 text-destructive-foreground border-destructive/30',
  neutral: 'bg-muted text-muted-foreground border-border',
};

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
}: DashboardMetricCardProps) => {
  const valueClassName = importance === 'primary' ? 'text-3xl font-semibold' : 'text-2xl font-semibold';

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-start justify-between pb-2 gap-3">
        <div className="min-w-0">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
            <span className="truncate">{title}</span>
            {tooltip && <TooltipInfo title={tooltip.title} content={tooltip.content} />}
          </CardTitle>
          {status && (
            <Badge variant="outline" className={`mt-2 ${toneClasses[status.tone]}`}>
              {status.label}
            </Badge>
          )}
        </div>
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${accentClassName}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className={valueClassName}>{value}</div>
        {subtitle && <p className="text-sm text-muted-foreground mt-2">{subtitle}</p>}
        {comparison && (
          <p className="text-xs mt-2 flex items-center gap-1.5 flex-wrap">
            <span className={`font-medium tabular-nums ${deltaToneClass(comparison.delta, comparison.direction)}`}>{formatDelta(comparison.delta)}</span>
            <span className="text-muted-foreground">vs. {comparison.value}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default DashboardMetricCard;
