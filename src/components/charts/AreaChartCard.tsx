import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { LucideIcon } from 'lucide-react';
import { TooltipInfo } from '@/components/base/TooltipInfo';

interface AreaChartCardProps {
  title: string;
  description?: string;
  data: Array<{ name: string; value: number }>;
  icon?: LucideIcon;
  color?: string;
  gradientFrom?: string;
  gradientTo?: string;
  valueFormatter?: (value: number) => string;
  tooltip?: {
    title: string;
    content: string;
  };
}

const toChartId = (value: string) =>
  (value || 'chart')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const AreaChartCard = ({
  title,
  description,
  data,
  icon: Icon,
  color = 'var(--chart-1)',
  gradientFrom = 'var(--chart-1)',
  gradientTo = 'var(--chart-1)',
  valueFormatter = (value) => value.toLocaleString(),
  tooltip,
}: AreaChartCardProps) => {
  const chartId = toChartId(title);
  const areaGradientId = `gradient-${chartId}`;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-popover px-3 py-2 text-popover-foreground shadow-lg/5">
          <p className="text-sm font-medium text-foreground">{payload[0].payload.name}</p>
          <p className="font-semibold text-base tabular-nums" style={{ color }}>
            {valueFormatter(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 font-semibold text-base">
          {Icon && (
            <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          {title}
          {tooltip && <TooltipInfo title={tooltip.title} content={tooltip.content} />}
        </CardTitle>
        {description && (
          <CardDescription className="mt-1">{description}</CardDescription>
        )}
      </CardHeader>
      <CardPanel className="pt-4">
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id={areaGradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={gradientFrom} stopOpacity={0.3} />
                <stop offset="95%" stopColor={gradientTo} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="name"
              stroke="var(--muted-foreground)"
              axisLine={false}
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              stroke="var(--muted-foreground)"
              axisLine={false}
              fontSize={12}
              tickLine={false}
              tickFormatter={valueFormatter}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={3}
              fill={`url(#${areaGradientId})`}
              animationDuration={1000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardPanel>
    </Card>
  );
};

export default AreaChartCard;
