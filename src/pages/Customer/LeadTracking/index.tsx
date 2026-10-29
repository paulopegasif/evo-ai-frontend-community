import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Users,
  CalendarCheck,
  CheckCircle2,
  DollarSign,
  RefreshCw,
  Sparkles,
  Receipt,
  TrendingUp,
  CalendarDays,
  Info,
} from 'lucide-react';
import { Button } from '@evoapi/design-system';
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
import PeriodControls from './components/PeriodControls';
import FiltersBar from './components/FiltersBar';
import PaidMediaSection from './components/PaidMediaSection';
import HighlightsSection from './components/HighlightsSection';
import YearOverYearCard from './components/YearOverYearCard';
import { currencyOrDash, formatCurrency, formatNumber, percentOrDash, plural } from './components/format';
import { useLeadTrackingFilters } from './hooks/useLeadTrackingFilters';
import { makeKpiComparer } from './compare';
import { granularityFor, parseIsoDate, toApiRange, type DateRange } from './periods';

const viewerTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

const SectionTitle = ({ title, description }: { title: string; description: string }) => (
  <div className="pt-2">
    <h2 className="text-base font-semibold">{title}</h2>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
);

const Notice = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
    <Info className="h-3.5 w-3.5 shrink-0" />
    {children}
  </p>
);

const count = (value: number | null) => formatNumber(value);
const percent = (value: number | null) => percentOrDash(value);
const currency = (value: number | null) => currencyOrDash(value);

export const LeadTrackingPage: React.FC = () => {
  const { filters, setPreset, setCompare, setFilter, clearFilters } = useLeadTrackingFilters();
  const [data, setData] = useState<LeadTrackingDashboardResponse | null>(null);
  const [previous, setPrevious] = useState<LeadTrackingDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { professionals: users } = useAppointmentMetadata({ contacts: false });

  // Filters shared by the period, the compared period and the year-over-year chart.
  const baseParams = useMemo<LeadTrackingParams>(
    () => ({
      timezone: viewerTimezone(),
      ...(filters.user ? { user_id: filters.user } : {}),
      ...(filters.source ? { source: filters.source } : {}),
      ...(filters.campaign ? { campaign_key: filters.campaign } : {}),
    }),
    [filters.user, filters.source, filters.campaign],
  );

  const { range, comparison } = filters;
  const rangeKey = `${range.from.getTime()}-${range.to.getTime()}`;
  const comparisonKey = comparison ? `${comparison.from.getTime()}-${comparison.to.getTime()}` : '';

  const fetchTrackingData = useCallback(async () => {
    // Both periods use the current period's bucket size so the series line up.
    const granularity = granularityFor(range);
    const load = (period: DateRange) =>
      leadTrackingService.getLeadTrackingData({ ...baseParams, ...toApiRange(period), granularity });

    try {
      setLoading(true);
      const [current, compared] = await Promise.all([load(range), comparison ? load(comparison) : null]);
      setData(current);
      setPrevious(compared);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar os dados de tracking de leads.');
    } finally {
      setLoading(false);
    }
    // rangeKey/comparisonKey stand for the Date objects, rebuilt on every URL read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseParams, rangeKey, comparisonKey]);

  useEffect(() => {
    fetchTrackingData();
  }, [fetchTrackingData]);

  const kpis = data?.kpis;
  const compare = makeKpiComparer(kpis, previous?.kpis);
  const showAds = Boolean(kpis?.has_ad_spend);
  const historyStart = parseIsoDate(data?.period.ads_history_from ?? null);
  const oldestDay = comparison && comparison.from < range.from ? comparison.from : range.from;
  const historyIncomplete = showAds && historyStart && historyStart > oldestDay;
  const segmented = Boolean(filters.source || filters.campaign);

  return (
    <div className="h-full flex flex-col gap-4 p-3 sm:p-4 overflow-y-auto">
      <BaseHeader
        title="Tracking de Leads & Funil"
        subtitle="Campanhas, mídia paga, conversão do funil, comparecimento e desempenho por procedimento"
      >
        <div className="flex items-start gap-2 flex-wrap">
          <PeriodControls
            preset={filters.preset}
            range={range}
            compareMode={filters.compareMode}
            comparison={comparison}
            onPresetChange={setPreset}
            onCompareChange={setCompare}
          />
          <Button variant="outline" size="sm" className="h-9" onClick={fetchTrackingData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </BaseHeader>

      <FiltersBar
        sources={data?.filter_options.sources ?? []}
        campaigns={data?.filter_options.campaigns ?? []}
        professionals={users}
        source={filters.source}
        campaign={filters.campaign}
        user={filters.user}
        onChange={setFilter}
        onClear={clearFilters}
      />

      {historyIncomplete && (
        <Notice>
          O histórico da Meta Ads está completo a partir de {historyStart.toLocaleDateString('pt-BR')}; o investimento
          {comparison ? ' do período comparado' : ''} antes dessa data pode estar incompleto enquanto a importação avança.
        </Notice>
      )}

      {showAds && kpis && (
        <>
          <SectionTitle
            title="Mídia paga (Meta)"
            description="Entrega e resultados medidos pela Meta, e o que esses anúncios geraram no CRM"
          />
          <PaidMediaSection kpis={kpis} compare={compare} />
          <HighlightsSection campaigns={data?.campaigns ?? []} previousCampaigns={previous?.campaigns} />
        </>
      )}

      <SectionTitle title="Aquisição" description="Pessoas que viraram lead no período, acompanhadas até a venda" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <DashboardMetricCard
          title="Novos leads"
          value={kpis?.total_leads ?? 0}
          subtitle={`${percentOrDash(kpis?.qualification_rate)} qualificados`}
          icon={Users}
          accentClassName="bg-primary/15 text-primary"
          importance="primary"
          tooltip={{ title: 'Novos leads', content: 'Contatos criados no período. Qualificados têm consulta ou item no pipeline.' }}
          comparison={compare('total_leads', count)}
        />
        <DashboardMetricCard
          title="Taxa de agendamento"
          value={percentOrDash(kpis?.scheduling_rate)}
          subtitle={plural(kpis?.total_scheduled ?? 0, 'lead agendou', 'leads agendaram')}
          icon={CalendarCheck}
          accentClassName="bg-primary/15 text-primary"
          tooltip={{ title: 'Taxa de agendamento', content: 'Leads do período com ao menos uma consulta não cancelada ÷ novos leads.' }}
          comparison={compare('scheduling_rate', percent)}
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
          comparison={compare('conversion_rate', percent)}
        />
        <DashboardMetricCard
          title="Receita dos novos leads"
          value={formatCurrency(kpis?.cohort_revenue ?? 0)}
          subtitle={plural(kpis?.total_attended ?? 0, 'lead compareceu', 'leads compareceram')}
          icon={TrendingUp}
          accentClassName="bg-primary/15 text-primary"
          tooltip={{ title: 'Receita dos novos leads', content: 'Soma das consultas realizadas pelos leads que entraram no período.' }}
          comparison={compare('cohort_revenue', currency)}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="xl:col-span-3">
          <FunnelCard funnel={data?.funnel ?? []} />
        </div>
        <div className="xl:col-span-2">
          <SourcesCard sources={data?.sources ?? []} />
        </div>
      </div>

      <TrendCharts
        timeline={data?.timeline ?? []}
        previousTimeline={previous?.timeline}
        granularity={data?.period.granularity ?? 'day'}
        showSpend={showAds}
      />

      <CampaignsSection campaigns={data?.campaigns ?? []} />

      <YearOverYearCard filters={baseParams} adsHistoryFrom={data?.period.ads_history_from ?? null} />

      <SectionTitle title="Agenda" description="Consultas com data dentro do período, de qualquer lead" />
      {segmented && <Notice>Os filtros de origem e campanha não se aplicam à agenda, que mostra as consultas de todos os leads.</Notice>}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <DashboardMetricCard
          title="Consultas no período"
          value={kpis?.total_appointments ?? 0}
          subtitle={`${plural(kpis?.total_confirmed ?? 0, 'confirmada', 'confirmadas')} • ${plural(kpis?.total_cancelled ?? 0, 'cancelada', 'canceladas')}`}
          icon={CalendarDays}
          accentClassName="bg-primary/15 text-primary"
          comparison={compare('total_appointments', count)}
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
          comparison={compare('show_rate', percent)}
        />
        <DashboardMetricCard
          title="Faturamento"
          value={formatCurrency(kpis?.total_revenue ?? 0)}
          subtitle={plural(kpis?.paid_appointments ?? 0, 'consulta paga', 'consultas pagas')}
          icon={DollarSign}
          accentClassName="bg-primary/15 text-primary"
          comparison={compare('total_revenue', currency)}
        />
        <DashboardMetricCard
          title="Ticket médio"
          value={currencyOrDash(kpis?.average_ticket)}
          subtitle="Faturamento ÷ consultas pagas"
          icon={Receipt}
          accentClassName="bg-primary/15 text-primary"
          comparison={compare('average_ticket', currency)}
        />
      </div>

      <AgendaSection categories={data?.categories ?? []} professionals={data?.professionals ?? []} />
    </div>
  );
};

export default LeadTrackingPage;
