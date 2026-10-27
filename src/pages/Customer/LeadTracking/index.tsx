import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  CalendarCheck,
  CheckCircle2,
  DollarSign,
  BarChart3,
  PieChart as PieChartIcon,
  Layers,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import BaseHeader from '@/components/base/BaseHeader';
import { BaseTable, type TableColumn } from '@/components/base';
import DashboardMetricCard from '@/pages/Customer/Dashboard/components/DashboardMetricCard';
import { formatCurrency } from '@/pages/Customer/Dashboard/components/dashboardUtils';
import { leadTrackingService } from '@/services/dashboard/leadTrackingService';
import { useAppointmentMetadata } from '@/hooks/useAppointmentMetadata';
import type {
  CampaignPerformance,
  LeadTrackingDashboardResponse,
  LeadTrackingParams,
  ProfessionalPerformance,
} from '@/types/leadTracking';
import { toast } from 'sonner';

const ALL = '__all__';

type PeriodPreset = '7d' | '30d' | 'month';

const PERIODS: { value: PeriodPreset; label: string }[] = [
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: 'month', label: 'Este mês' },
];

// Legible on both light and dark backgrounds.
const CHART_PALETTE = ['#C084FC', '#967AB4', '#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#14B8A6', '#F97316'];

const TOOLTIP_STYLE = {
  backgroundColor: 'var(--popover)',
  borderColor: 'var(--border)',
  borderRadius: '8px',
  color: 'var(--popover-foreground)',
  fontSize: '12px',
};

const plural = (count: number, one: string, other: string) => `${count} ${count === 1 ? one : other}`;

const percentBadgeClass = 'bg-primary/10 text-primary border-primary/30';

export const LeadTrackingPage: React.FC = () => {
  const [data, setData] = useState<LeadTrackingDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('30d');
  const [selectedUser, setSelectedUser] = useState<string>(ALL);
  const { professionals: users } = useAppointmentMetadata({ contacts: false });

  const fetchTrackingData = useCallback(async () => {
    try {
      setLoading(true);
      const untilDate = new Date();
      const sinceDate = new Date();

      if (periodPreset === '7d') {
        sinceDate.setDate(untilDate.getDate() - 7);
      } else if (periodPreset === 'month') {
        sinceDate.setDate(1); // 1st of current month
      } else {
        sinceDate.setDate(untilDate.getDate() - 30);
      }

      const params: LeadTrackingParams = {
        since: Math.floor(sinceDate.getTime() / 1000),
        until: Math.floor(untilDate.getTime() / 1000),
      };

      if (selectedUser !== ALL) {
        params.user_id = selectedUser;
      }

      const res = await leadTrackingService.getLeadTrackingData(params);
      setData(res);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar os dados de tracking de leads.');
    } finally {
      setLoading(false);
    }
  }, [periodPreset, selectedUser]);

  useEffect(() => {
    fetchTrackingData();
  }, [fetchTrackingData]);

  const kpis = data?.kpis;
  const funnel = data?.funnel || [];
  const sources = data?.sources || [];
  const campaigns = data?.campaigns || [];
  const professionals = data?.professionals || [];
  const categories = data?.categories || [];
  const timeline = data?.timeline || [];

  const campaignColumns: TableColumn<CampaignPerformance>[] = [
    {
      key: 'name',
      label: 'Campanha',
      render: (c) => (
        <div>
          <div className="font-medium">{c.name}</div>
          <div className="text-xs text-muted-foreground">{c.source}</div>
        </div>
      ),
    },
    { key: 'leads', label: 'Leads', align: 'center' },
    { key: 'scheduled', label: 'Agendados', align: 'center' },
    {
      key: 'conversion_rate',
      label: 'Conversão',
      align: 'center',
      render: (c) => (
        <Badge variant="outline" className={percentBadgeClass}>
          {c.conversion_rate}%
        </Badge>
      ),
    },
    {
      key: 'revenue',
      label: 'Receita',
      align: 'right',
      render: (c) => <span className="font-medium">{formatCurrency(c.revenue)}</span>,
    },
  ];

  const professionalColumns: TableColumn<ProfessionalPerformance>[] = [
    { key: 'name', label: 'Profissional', render: (p) => <span className="font-medium">{p.name}</span> },
    { key: 'total', label: 'Consultas', align: 'center' },
    {
      key: 'attended',
      label: 'Compareceram',
      align: 'center',
      render: (p) => <span className="text-emerald-600 dark:text-emerald-400">{p.attended}</span>,
    },
    {
      key: 'no_show',
      label: 'Faltas',
      align: 'center',
      render: (p) => <span className="text-red-600 dark:text-red-400">{p.no_show}</span>,
    },
    {
      key: 'show_rate',
      label: 'Comparecimento',
      align: 'center',
      render: (p) => (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
          {p.show_rate}%
        </Badge>
      ),
    },
    {
      key: 'revenue',
      label: 'Faturamento',
      align: 'right',
      render: (p) => <span className="font-medium">{formatCurrency(p.revenue)}</span>,
    },
  ];

  return (
    <div className="h-full flex flex-col gap-4 p-3 sm:p-4 overflow-y-auto">
      <BaseHeader
        title="Tracking de Leads & Funil"
        subtitle="Campanhas UTM, conversão do funil, comparecimento e desempenho por procedimento"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger
              className="h-9 w-[200px] bg-sidebar border-sidebar-border text-sidebar-foreground"
              aria-label="Filtrar por profissional"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os profissionais</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1">
            {PERIODS.map((p) => (
              <Button
                key={p.value}
                variant={periodPreset === p.value ? 'default' : 'outline'}
                size="sm"
                className="h-9"
                onClick={() => setPeriodPreset(p.value)}
              >
                {p.label}
              </Button>
            ))}
          </div>

          <Button variant="outline" size="sm" className="h-9" onClick={fetchTrackingData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </BaseHeader>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <DashboardMetricCard
          title="Total de leads"
          value={kpis?.total_leads || 0}
          subtitle={`${kpis?.qualification_rate || 0}% qualificados`}
          icon={Users}
          accentClassName="bg-primary/15 text-primary"
          importance="primary"
        />
        <DashboardMetricCard
          title="Taxa de agendamento"
          value={`${kpis?.scheduling_rate || 0}%`}
          subtitle={`${plural(kpis?.total_scheduled || 0, 'agendado', 'agendados')} • ${plural(kpis?.total_confirmed || 0, 'confirmado', 'confirmados')}`}
          icon={CalendarCheck}
          accentClassName="bg-sky-500/15 text-sky-500"
        />
        <DashboardMetricCard
          title="Taxa de comparecimento"
          value={`${kpis?.show_rate || 0}%`}
          subtitle={`${plural(kpis?.total_attended || 0, 'compareceu', 'compareceram')} • ${plural(kpis?.total_no_show || 0, 'falta', 'faltas')}`}
          icon={CheckCircle2}
          accentClassName="bg-emerald-500/15 text-emerald-500"
        />
        <DashboardMetricCard
          title="Taxa de conversão"
          value={`${kpis?.conversion_rate || 0}%`}
          subtitle={plural(kpis?.total_won || 0, 'venda', 'vendas')}
          icon={Sparkles}
          accentClassName="bg-primary/15 text-primary"
        />
        <DashboardMetricCard
          title="Faturamento gerado"
          value={formatCurrency(kpis?.total_revenue || 0)}
          subtitle={`Ticket médio: ${formatCurrency(kpis?.average_ticket || 0)}`}
          icon={DollarSign}
          accentClassName="bg-amber-500/15 text-amber-500"
        />
      </div>

      {/* Funnel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Funil de aquisição e conversão
          </CardTitle>
          <CardDescription>Jornada do lead desde a captura até o procedimento realizado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {funnel.map((f, idx) => (
              <div key={f.stage} className="p-3.5 rounded-md border border-sidebar-border bg-sidebar flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">
                    {idx + 1}. {f.stage}
                  </span>
                  <Badge variant="outline" className={percentBadgeClass}>
                    {f.percentage}%
                  </Badge>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-semibold">{f.count}</span>
                  <span className="text-sm text-muted-foreground ml-1.5">{f.count === 1 ? 'lead' : 'leads'}</span>
                </div>
                <div className="mt-3 w-full bg-muted h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(f.percentage, 5)}%`,
                      backgroundColor: f.color || CHART_PALETTE[idx % CHART_PALETTE.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Evolução: leads, agendamentos e comparecimentos
            </CardTitle>
            <CardDescription>Volume diário de novos contatos e atendimentos realizados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_PALETTE[0]} stopOpacity={0.6} />
                      <stop offset="95%" stopColor={CHART_PALETTE[0]} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorScheduled" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_PALETTE[2]} stopOpacity={0.6} />
                      <stop offset="95%" stopColor={CHART_PALETTE[2]} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorAttended" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_PALETTE[3]} stopOpacity={0.6} />
                      <stop offset="95%" stopColor={CHART_PALETTE[3]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="label" fontSize={11} stroke="#888888" />
                  <YAxis fontSize={11} stroke="#888888" allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Area type="monotone" dataKey="leads" name="Novos leads" stroke={CHART_PALETTE[0]} fillOpacity={1} fill="url(#colorLeads)" />
                  <Area type="monotone" dataKey="scheduled" name="Agendados" stroke={CHART_PALETTE[2]} fillOpacity={1} fill="url(#colorScheduled)" />
                  <Area type="monotone" dataKey="attended" name="Compareceram" stroke={CHART_PALETTE[3]} fillOpacity={1} fill="url(#colorAttended)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-primary" />
              Origem dos leads
            </CardTitle>
            <CardDescription>Distribuição por canal de entrada e campanhas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[210px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sources} dataKey="leads" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4}>
                    {sources.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-1.5 border-t border-border pt-3">
              {sources.slice(0, 4).map((s, idx) => (
                <div key={s.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground truncate">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: CHART_PALETTE[idx % CHART_PALETTE.length] }}
                    />
                    <span className="truncate">{s.name}</span>
                  </span>
                  <span className="font-medium ml-2">
                    {plural(s.leads, 'lead', 'leads')} ({s.conversion_rate}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns & categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Desempenho de campanhas (UTM)</CardTitle>
            <span className="text-sm text-muted-foreground">{plural(campaigns.length, 'campanha', 'campanhas')}</span>
          </CardHeader>
          <CardContent>
            <BaseTable<CampaignPerformance>
              data={campaigns}
              columns={campaignColumns}
              getRowKey={(c) => `${c.source}-${c.name}`}
              emptyMessage="Nenhuma campanha encontrada no período."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Desempenho por procedimento</CardTitle>
            <span className="text-sm text-muted-foreground">{plural(categories.length, 'categoria', 'categorias')}</span>
          </CardHeader>
          <CardContent className="space-y-3">
            {categories.map((cat) => (
              <div key={cat.name} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    {cat.name}
                  </span>
                  <span className="text-muted-foreground text-right">
                    {plural(cat.count, 'consulta', 'consultas')} • {formatCurrency(cat.revenue)} ({cat.share_percentage}%)
                  </span>
                </div>
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(cat.share_percentage, 5)}%`, backgroundColor: cat.color }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Professionals */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Desempenho por profissional
          </CardTitle>
          <span className="text-sm text-muted-foreground">{plural(professionals.length, 'profissional', 'profissionais')}</span>
        </CardHeader>
        <CardContent>
          <BaseTable<ProfessionalPerformance>
            data={professionals}
            columns={professionalColumns}
            getRowKey={(p) => p.user_id}
            emptyMessage="Nenhum atendimento registrado no período."
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadTrackingPage;
