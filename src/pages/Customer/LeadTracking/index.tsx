import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  DollarSign,
  RefreshCw,
  Receipt,
  CalendarDays,
  Info,
} from '@/components/icons';
import { useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardPanel } from '@/components/ui/card';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs';
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
import ExecutiveSummary from './components/ExecutiveSummary';
import VelocityAlertsSection from './components/VelocityAlertsSection';
import AdsRankingCard from './components/AdsRankingCard';
import LeadsTab from './components/LeadsTab';
import ReviewQueueTab from './components/ReviewQueueTab';
import LeadJourneySheet from './components/LeadJourneySheet';
import { currencyOrDash, formatCurrency, formatNumber, percentOrDash, plural } from './components/format';
import { useLeadTrackingFilters } from './hooks/useLeadTrackingFilters';
import { makeKpiComparer } from './compare';
import { granularityFor, parseIsoDate, toApiRange, type DateRange } from './periods';

const viewerTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

const SectionTitle = ({ title, description }: { title: string; description: string }) => (
  <div className="-mb-1 md:-mb-3">
    <h2 className="font-semibold text-base">{title}</h2>
    <p className="text-muted-foreground text-sm">{description}</p>
  </div>
);

const Notice = ({ children }: { children: React.ReactNode }) => (
  <p className="flex items-center gap-1.5 text-muted-foreground text-xs">
    <Info className="size-3.5 shrink-0" />
    {children}
  </p>
);

const count = (value: number | null) => formatNumber(value);
const percent = (value: number | null) => percentOrDash(value);
const currency = (value: number | null) => currencyOrDash(value);

const TABS = ['overview', 'leads', 'review'] as const;
type TrackingTab = (typeof TABS)[number];

export const LeadTrackingPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const tab: TrackingTab = TABS.includes(rawTab as TrackingTab) ? (rawTab as TrackingTab) : 'overview';
  const setTab = (value: string) =>
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value === 'overview') next.delete('tab');
        else next.set('tab', value);
        return next;
      },
      { replace: true },
    );
  const [journeyContact, setJourneyContact] = useState<string | null>(() => searchParams.get('lead'));
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
    <div className="flex h-full min-w-0 flex-col gap-4 overflow-y-auto overflow-x-hidden p-4 md:gap-6 md:p-6">
      <BaseHeader
        title="Tracking de Leads & Funil"
        subtitle="Campanhas, mídia paga, conversão do funil, comparecimento e desempenho por procedimento"
      />

      {/* Toolbar: period, comparison and segment filters */}
      <Card className="gap-0">
        <CardPanel className="flex flex-col gap-3 p-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-2">
            <PeriodControls
              preset={filters.preset}
              range={range}
              compareMode={filters.compareMode}
              comparison={comparison}
              onPresetChange={setPreset}
              onCompareChange={setCompare}
            />
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground"
                    onClick={fetchTrackingData}
                    disabled={loading}
                    aria-label="Atualizar"
                  />
                }
              >
                <RefreshCw className={cn(loading && 'animate-spin')} />
              </TooltipTrigger>
              <TooltipPopup>Atualizar</TooltipPopup>
            </Tooltip>
          </div>
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
        </CardPanel>
      </Card>

      <Tabs value={tab} onValueChange={(value) => setTab(String(value))} className="flex flex-col gap-4 md:gap-6">
        <TabsList className="self-start">
          <TabsTab value="overview">Visão geral</TabsTab>
          <TabsTab value="leads">Leads</TabsTab>
          <TabsTab value="review">
            Revisão
            {(kpis?.unlinked_sales ?? 0) > 0 && (
              <Badge variant="warning" size="sm" className="tabular-nums">
                {kpis?.unlinked_sales}
              </Badge>
            )}
          </TabsTab>
        </TabsList>

        <TabsPanel value="overview" className="flex flex-col gap-4 md:gap-6">
          {historyIncomplete && (
            <Notice>
              O histórico da Meta Ads está completo a partir de {historyStart.toLocaleDateString('pt-BR')}; o investimento
              {comparison ? ' do período comparado' : ''} antes dessa data pode estar incompleto enquanto a importação avança.
            </Notice>
          )}

          <ExecutiveSummary kpis={kpis} compare={compare} timeline={data?.timeline} />

          <VelocityAlertsSection velocity={data?.velocity} alerts={data?.alerts} onOpenLead={setJourneyContact} />

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

          {showAds && (data?.ads?.length ?? 0) > 0 && <AdsRankingCard ads={data?.ads ?? []} />}

          <YearOverYearCard filters={baseParams} adsHistoryFrom={data?.period.ads_history_from ?? null} />

          <SectionTitle title="Agenda" description="Consultas com data dentro do período, de qualquer lead" />
          {segmented && <Notice>Os filtros de origem e campanha não se aplicam à agenda, que mostra as consultas de todos os leads.</Notice>}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <DashboardMetricCard
              loading={!kpis}
              title="Consultas no período"
              value={kpis?.total_appointments ?? 0}
              subtitle={`${plural(kpis?.total_confirmed ?? 0, 'confirmada', 'confirmadas')} • ${plural(kpis?.total_cancelled ?? 0, 'cancelada', 'canceladas')}`}
              icon={CalendarDays}
              accentClassName="bg-primary/10 text-primary"
              comparison={compare('total_appointments', count)}
            />
            <DashboardMetricCard
              loading={!kpis}
              title="Comparecimento"
              value={percentOrDash(kpis?.show_rate)}
              subtitle={`${plural(kpis?.appointments_attended ?? 0, 'realizada', 'realizadas')} • ${plural(kpis?.total_no_show ?? 0, 'falta', 'faltas')}`}
              icon={CheckCircle2}
              accentClassName="bg-primary/10 text-primary"
              tooltip={{
                title: 'Comparecimento',
                content: 'Realizadas ÷ (realizadas + faltas). Consultas futuras ou pendentes não entram na taxa.',
              }}
              comparison={compare('show_rate', percent)}
            />
            <DashboardMetricCard
              loading={!kpis}
              title="Faturamento"
              value={formatCurrency(kpis?.total_revenue ?? 0)}
              subtitle={plural(kpis?.paid_appointments ?? 0, 'consulta paga', 'consultas pagas')}
              icon={DollarSign}
              accentClassName="bg-primary/10 text-primary"
              comparison={compare('total_revenue', currency)}
            />
            <DashboardMetricCard
              loading={!kpis}
              title="Ticket médio"
              value={currencyOrDash(kpis?.average_ticket)}
              subtitle="Faturamento ÷ consultas pagas"
              icon={Receipt}
              accentClassName="bg-primary/10 text-primary"
              comparison={compare('average_ticket', currency)}
            />
          </div>

          <AgendaSection categories={data?.categories ?? []} professionals={data?.professionals ?? []} />
        </TabsPanel>

        <TabsPanel value="leads">
          <LeadsTab params={{ ...baseParams, ...toApiRange(range) }} />
        </TabsPanel>

        <TabsPanel value="review">
          <ReviewQueueTab />
        </TabsPanel>
      </Tabs>

      <LeadJourneySheet
        contactId={journeyContact}
        onClose={() => {
          setJourneyContact(null);
          if (searchParams.has('lead')) {
            const next = new URLSearchParams(searchParams);
            next.delete('lead');
            setSearchParams(next, { replace: true });
          }
        }}
      />
    </div>
  );
};

export default LeadTrackingPage;
