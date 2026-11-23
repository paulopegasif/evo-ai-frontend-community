import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshCw,
  Info,
} from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card, CardPanel } from '@/components/ui/card';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import BaseHeader from '@/components/base/BaseHeader';
import { leadTrackingService } from '@/services/dashboard/leadTrackingService';
import type { LeadTrackingDashboardResponse, LeadTrackingParams } from '@/types/leadTracking';
import { toast } from 'sonner';
import FunnelCard from './components/FunnelCard';
import TrendCharts from './components/TrendCharts';
import SourcesCard from './components/SourcesCard';
import CampaignsSection from './components/CampaignsSection';
import PeriodControls from './components/PeriodControls';
import FiltersBar from './components/FiltersBar';
import PaidMediaSection from './components/PaidMediaSection';
import HighlightsSection from './components/HighlightsSection';
import YearOverYearCard from './components/YearOverYearCard';
import ExecutiveSummary from './components/ExecutiveSummary';
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

export const LeadTrackingPage: React.FC = () => {
  const { filters, setPreset, setCompare, setFilter, clearFilters } = useLeadTrackingFilters();
  const [data, setData] = useState<LeadTrackingDashboardResponse | null>(null);
  const [previous, setPrevious] = useState<LeadTrackingDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="flex h-full min-w-0 flex-col gap-4 overflow-y-auto overflow-x-hidden p-4 md:gap-6 md:p-6">
      <BaseHeader
        title="Tracking de Leads & Funil"
        subtitle="Campanhas, mídia paga e conversão do funil comercial"
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
            source={filters.source}
            campaign={filters.campaign}
            user={filters.user}
            onChange={setFilter}
            onClear={clearFilters}
          />
        </CardPanel>
      </Card>

      {historyIncomplete && (
        <Notice>
          O histórico da Meta Ads está completo a partir de {historyStart.toLocaleDateString('pt-BR')}; o investimento
          {comparison ? ' do período comparado' : ''} antes dessa data pode estar incompleto enquanto a importação avança.
        </Notice>
      )}

      <ExecutiveSummary kpis={kpis} compare={compare} timeline={data?.timeline} />

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


      <YearOverYearCard filters={baseParams} adsHistoryFrom={data?.period.ads_history_from ?? null} />

    </div>
  );
};

export default LeadTrackingPage;
