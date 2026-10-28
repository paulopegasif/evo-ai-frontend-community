import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  CalendarCheck,
  CheckCircle2,
  DollarSign,
  RefreshCw,
  Megaphone,
  Target,
  Sparkles,
  Receipt,
  TrendingUp,
  CalendarDays,
  Wallet,
} from 'lucide-react';
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@evoapi/design-system';
import BaseHeader from '@/components/base/BaseHeader';
import DashboardMetricCard from '@/pages/Customer/Dashboard/components/DashboardMetricCard';
import { leadTrackingService } from '@/services/dashboard/leadTrackingService';
import { useAppointmentMetadata } from '@/hooks/useAppointmentMetadata';
import type { LeadTrackingDashboardResponse, LeadTrackingParams } from '@/types/leadTracking';
import { toast } from 'sonner';
import FunnelCard from './components/FunnelCard';
import TrendCharts from './components/TrendCharts';
import SourcesCard from './components/SourcesCard';
import CampaignsSection from './components/CampaignsSection';
import AgendaSection from './components/AgendaSection';
import { currencyOrDash, formatCurrency, percentOrDash, plural, roasOrDash } from './components/format';

const ALL = '__all__';

type PeriodPreset = '7d' | '30d' | 'month';

const PERIODS: { value: PeriodPreset; label: string }[] = [
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: 'month', label: 'Este mês' },
];

// Calendar days including today: "7 dias" is today and the 6 days before it.
const PERIOD_DAYS: Record<Exclude<PeriodPreset, 'month'>, number> = { '7d': 7, '30d': 30 };

const viewerTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

const SectionTitle = ({ title, description }: { title: string; description: string }) => (
  <div className="pt-2">
    <h2 className="text-base font-semibold">{title}</h2>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
);

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

      if (periodPreset === 'month') {
        sinceDate.setDate(1);
      } else {
        sinceDate.setDate(untilDate.getDate() - (PERIOD_DAYS[periodPreset] - 1));
      }

      const params: LeadTrackingParams = {
        since: Math.floor(sinceDate.getTime() / 1000),
        until: Math.floor(untilDate.getTime() / 1000),
        timezone: viewerTimezone(),
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
  const showAds = Boolean(kpis?.has_ad_spend);

  return (
    <div className="h-full flex flex-col gap-4 p-3 sm:p-4 overflow-y-auto">
      <BaseHeader
        title="Tracking de Leads & Funil"
        subtitle="Campanhas, conversão do funil, comparecimento e desempenho por procedimento"
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

      <SectionTitle
        title="Aquisição"
        description="Pessoas que viraram lead no período, acompanhadas até a venda"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <DashboardMetricCard
          title="Novos leads"
          value={kpis?.total_leads ?? 0}
          subtitle={`${percentOrDash(kpis?.qualification_rate)} qualificados`}
          icon={Users}
          accentClassName="bg-primary/15 text-primary"
          importance="primary"
          tooltip={{ title: 'Novos leads', content: 'Contatos criados no período. Qualificados têm consulta ou item no pipeline.' }}
        />
        <DashboardMetricCard
          title="Taxa de agendamento"
          value={percentOrDash(kpis?.scheduling_rate)}
          subtitle={plural(kpis?.total_scheduled ?? 0, 'lead agendou', 'leads agendaram')}
          icon={CalendarCheck}
          accentClassName="bg-primary/15 text-primary"
          tooltip={{ title: 'Taxa de agendamento', content: 'Leads do período com ao menos uma consulta não cancelada ÷ novos leads.' }}
        />
        <DashboardMetricCard
          title="Taxa de conversão"
          value={percentOrDash(kpis?.conversion_rate)}
          subtitle={plural(kpis?.total_won ?? 0, 'venda', 'vendas')}
          icon={Sparkles}
          accentClassName="bg-primary/15 text-primary"
          tooltip={{
            title: 'Taxa de conversão',
            content: 'Leads do período que compareceram e pagaram (ou foram fechados no pipeline) ÷ novos leads.',
          }}
        />
        <DashboardMetricCard
          title="Receita dos novos leads"
          value={formatCurrency(kpis?.cohort_revenue ?? 0)}
          subtitle={plural(kpis?.total_attended ?? 0, 'lead compareceu', 'leads compareceram')}
          icon={TrendingUp}
          accentClassName="bg-primary/15 text-primary"
          tooltip={{ title: 'Receita dos novos leads', content: 'Soma das consultas realizadas pelos leads que entraram no período.' }}
        />
      </div>

      {showAds && kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <DashboardMetricCard
            title="Investimento em anúncios"
            value={formatCurrency(kpis.ad_spend)}
            subtitle="Gasto na Meta Ads no período"
            icon={Megaphone}
            accentClassName="bg-primary/15 text-primary"
          />
          <DashboardMetricCard
            title="CPL médio"
            value={currencyOrDash(kpis.avg_cpl)}
            subtitle={plural(kpis.ad_leads, 'lead de anúncio', 'leads de anúncios')}
            icon={Target}
            accentClassName="bg-primary/15 text-primary"
            tooltip={{ title: 'Custo por lead', content: 'Investimento ÷ leads do período cujo primeiro contato veio de um anúncio.' }}
          />
          <DashboardMetricCard
            title="CAC"
            value={currencyOrDash(kpis.ad_cac)}
            subtitle={plural(kpis.ad_won, 'venda de anúncio', 'vendas de anúncios')}
            icon={Wallet}
            accentClassName="bg-primary/15 text-primary"
            tooltip={{ title: 'Custo de aquisição', content: 'Investimento ÷ vendas dos leads de anúncio do período.' }}
          />
          <DashboardMetricCard
            title="ROAS"
            value={roasOrDash(kpis.roas)}
            subtitle={`${formatCurrency(kpis.ad_revenue)} em receita`}
            icon={DollarSign}
            accentClassName="bg-primary/15 text-primary"
            tooltip={{ title: 'Retorno sobre anúncios', content: 'Receita dos leads de anúncio do período ÷ investimento.' }}
          />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="xl:col-span-3">
          <FunnelCard funnel={data?.funnel ?? []} />
        </div>
        <div className="xl:col-span-2">
          <SourcesCard sources={data?.sources ?? []} />
        </div>
      </div>

      <TrendCharts timeline={data?.timeline ?? []} showSpend={showAds} />

      <CampaignsSection campaigns={data?.campaigns ?? []} />

      <SectionTitle title="Agenda" description="Consultas com data dentro do período, de qualquer lead" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <DashboardMetricCard
          title="Consultas no período"
          value={kpis?.total_appointments ?? 0}
          subtitle={`${plural(kpis?.total_confirmed ?? 0, 'confirmada', 'confirmadas')} • ${plural(kpis?.total_cancelled ?? 0, 'cancelada', 'canceladas')}`}
          icon={CalendarDays}
          accentClassName="bg-primary/15 text-primary"
        />
        <DashboardMetricCard
          title="Comparecimento"
          value={percentOrDash(kpis?.show_rate)}
          subtitle={`${plural(kpis?.appointments_attended ?? 0, 'realizada', 'realizadas')} • ${plural(kpis?.total_no_show ?? 0, 'falta', 'faltas')}`}
          icon={CheckCircle2}
          accentClassName="bg-primary/15 text-primary"
          tooltip={{
            title: 'Comparecimento',
            content: 'Realizadas ÷ (realizadas + faltas). Consultas futuras ou pendentes não entram na taxa.',
          }}
        />
        <DashboardMetricCard
          title="Faturamento"
          value={formatCurrency(kpis?.total_revenue ?? 0)}
          subtitle={plural(kpis?.paid_appointments ?? 0, 'consulta paga', 'consultas pagas')}
          icon={DollarSign}
          accentClassName="bg-primary/15 text-primary"
        />
        <DashboardMetricCard
          title="Ticket médio"
          value={currencyOrDash(kpis?.average_ticket)}
          subtitle="Faturamento ÷ consultas pagas"
          icon={Receipt}
          accentClassName="bg-primary/15 text-primary"
        />
      </div>

      <AgendaSection categories={data?.categories ?? []} professionals={data?.professionals ?? []} />
    </div>
  );
};

export default LeadTrackingPage;
