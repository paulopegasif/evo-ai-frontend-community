import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardPanel } from '@/components/ui/card';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { BaseHeader } from '@/components/base';
import DateRangePicker from '@/pages/Customer/LeadTracking/components/DateRangePicker';
import { useLanguage } from '@/hooks/useLanguage';
import { pipelinesService } from '@/services/pipelines';
import TeamsService from '@/services/teams/teamsService';
import InboxesService from '@/services/channels/inboxesService';
import { usersService } from '@/services/users';
import { customerDashboardService } from '@/services/dashboard/customerDashboardService';
import type { CustomerDashboardParams, CustomerDashboardResponse } from '@/types/analytics/dashboard';
import DashboardMetricsSection from './components/DashboardMetricsSection';
import DashboardTrendsSection from './components/DashboardTrendsSection';
import DashboardPerformanceSection from './components/DashboardPerformanceSection';
import type { DashboardFilterState, DashboardOption } from './components/types';
import { DashboardTour } from '@/tours';
import { CHART_COLORS } from './components/dashboardUtils';

const ALL_FILTER_VALUE = '__all__';

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDefaultFilterState = (): DashboardFilterState => {
  const untilDate = new Date();
  const sinceDate = new Date();
  sinceDate.setDate(untilDate.getDate() - 29);

  return {
    pipelineId: ALL_FILTER_VALUE,
    teamId: ALL_FILTER_VALUE,
    inboxId: ALL_FILTER_VALUE,
    userId: ALL_FILTER_VALUE,
    since: toDateInputValue(sinceDate),
    until: toDateInputValue(untilDate),
  };
};

const parseDateToUnix = (value: string, endOfDay: boolean) => {
  if (!value) return undefined;
  const datetime = endOfDay ? `${value}T23:59:59` : `${value}T00:00:00`;
  const timestamp = new Date(datetime).getTime();
  if (Number.isNaN(timestamp)) return undefined;
  return Math.floor(timestamp / 1000);
};

const normalizeDateRange = (filters: DashboardFilterState): DashboardFilterState => {
  if (!filters.since || !filters.until) return filters;
  if (filters.since <= filters.until) return filters;

  return {
    ...filters,
    since: filters.until,
    until: filters.since,
  };
};

const buildDashboardParams = (filters: DashboardFilterState): CustomerDashboardParams => {
  const params: CustomerDashboardParams = {};

  if (filters.pipelineId && filters.pipelineId !== ALL_FILTER_VALUE) params.pipeline_id = filters.pipelineId;
  if (filters.teamId && filters.teamId !== ALL_FILTER_VALUE) params.team_id = filters.teamId;
  if (filters.inboxId && filters.inboxId !== ALL_FILTER_VALUE) params.inbox_id = filters.inboxId;
  if (filters.userId && filters.userId !== ALL_FILTER_VALUE) params.user_id = filters.userId;

  const since = parseDateToUnix(filters.since, false);
  const until = parseDateToUnix(filters.until, true);

  if (since) params.since = since;
  if (until) params.until = until;

  return params;
};

const CustomerDashboardPage = () => {
  const { t } = useLanguage('customerDashboard');
  const [defaultFilters] = useState<DashboardFilterState>(() => getDefaultFilterState());
  const [data, setData] = useState<CustomerDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<DashboardFilterState>(defaultFilters);
  // Lead tracking moved to its own sidebar entry (/tracking); keep old
  // /dashboard?tab=leads links working.
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  useEffect(() => {
    if (searchParams.get('tab') === 'leads') navigate('/tracking', { replace: true });
  }, [searchParams, navigate]);

  const [pipelines, setPipelines] = useState<DashboardOption[]>([]);
  const [teams, setTeams] = useState<DashboardOption[]>([]);
  const [inboxes, setInboxes] = useState<DashboardOption[]>([]);
  const [users, setUsers] = useState<DashboardOption[]>([]);

  const loadDashboard = useCallback(async (filters: DashboardFilterState) => {
    setLoading(true);
    setError(null);

    try {
      const response = await customerDashboardService.getCustomerDashboard(buildDashboardParams(filters));
      setData(response);
    } catch (err) {
      console.error('Error loading customer dashboard:', err);
      setError(t('dashboard.error') || 'Falha ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadDashboard(appliedFilters);
  }, [appliedFilters, loadDashboard]);

  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const [pipelinesResponse, teamsResponse, inboxesResponse, usersResponse] = await Promise.all([
          pipelinesService.getPipelines({ page: 1, per_page: 100, sort: 'name', order: 'asc' }),
          TeamsService.getTeams({ page: 1, per_page: 100, sort: 'name', order: 'asc' }),
          InboxesService.list(),
          usersService.getUsers({ page: 1, per_page: 100, sort: 'name', order: 'asc' }),
        ]);

        setPipelines((pipelinesResponse.data || []).map(item => ({ id: item.id, name: item.name })));
        setTeams((teamsResponse.data || []).map(item => ({ id: item.id, name: item.name })));
        setInboxes((inboxesResponse.data || []).map(item => ({ id: item.id, name: item.name })));
        setUsers((usersResponse.data || []).map(item => ({ id: item.id, name: item.available_name || item.name })));
      } catch (err) {
        console.error('Error loading dashboard filter options:', err);
      }
    };

    loadFilterOptions();
  }, []);

  // Filters apply as soon as they change; the date range is normalized (since <= until).
  const updateFilters = (changes: Partial<DashboardFilterState>) =>
    setAppliedFilters(prev => normalizeDateRange({ ...prev, ...changes }));

  const handleClearFilters = () => setAppliedFilters(defaultFilters);

  const hasActiveFilters =
    appliedFilters.pipelineId !== ALL_FILTER_VALUE ||
    appliedFilters.teamId !== ALL_FILTER_VALUE ||
    appliedFilters.inboxId !== ALL_FILTER_VALUE ||
    appliedFilters.userId !== ALL_FILTER_VALUE ||
    appliedFilters.since !== defaultFilters.since ||
    appliedFilters.until !== defaultFilters.until;

  const filterSelects = [
    { key: 'pipelineId' as const, label: t('dashboard.filters.pipeline') || 'Pipeline', all: t('dashboard.filters.allPipelines') || 'Todos os pipelines', options: pipelines },
    { key: 'teamId' as const, label: t('dashboard.filters.team') || 'Equipe', all: t('dashboard.filters.allTeams') || 'Todas as equipes', options: teams },
    { key: 'inboxId' as const, label: t('dashboard.filters.channel') || 'Canal', all: t('dashboard.filters.allChannels') || 'Todos os canais', options: inboxes },
    { key: 'userId' as const, label: t('dashboard.filters.user') || 'Usuário', all: t('dashboard.filters.allUsers') || 'Todos os usuários', options: users },
  ];

  useEffect(() => {
    setAppliedFilters(prev => ({
      ...prev,
      pipelineId: prev.pipelineId !== ALL_FILTER_VALUE && !pipelines.some(item => item.id === prev.pipelineId)
        ? ALL_FILTER_VALUE
        : prev.pipelineId,
      teamId: prev.teamId !== ALL_FILTER_VALUE && !teams.some(item => item.id === prev.teamId)
        ? ALL_FILTER_VALUE
        : prev.teamId,
      inboxId: prev.inboxId !== ALL_FILTER_VALUE && !inboxes.some(item => item.id === prev.inboxId)
        ? ALL_FILTER_VALUE
        : prev.inboxId,
      userId: prev.userId !== ALL_FILTER_VALUE && !users.some(item => item.id === prev.userId)
        ? ALL_FILTER_VALUE
        : prev.userId,
    }));
  }, [inboxes, pipelines, teams, users]);

  const dateRange = useMemo(
    () => ({
      from: new Date(`${appliedFilters.since}T00:00:00`),
      to: new Date(`${appliedFilters.until}T00:00:00`),
    }),
    [appliedFilters.since, appliedFilters.until],
  );

  const channelShareData = useMemo(() => {
    if (!data) return [];

    const colors = CHART_COLORS;

    return data.channels.map((channel, index) => ({
      name: channel.name,
      value: Number(channel.percentage.toFixed(2)),
      color: colors[index % colors.length],
    }));
  }, [data]);

  const toolbar = (
    <Card className="gap-0" data-tour="dashboard-filter-button">
      <CardPanel className="flex flex-col gap-3 p-3 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="flex flex-wrap items-center gap-2" data-tour="dashboard-period-badge">
          <DateRangePicker
            value={dateRange}
            onChange={range => updateFilters({ since: toDateInputValue(range.from), until: toDateInputValue(range.to) })}
            ariaLabel={t('dashboard.filters.period') || 'Período'}
          />
          {data && (
            <Badge variant="secondary" className="tabular-nums">
              {data.period.days} {t('dashboard.filters.days')}
            </Badge>
          )}
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-2 lg:justify-end">
          {filterSelects.map(filter => {
            const items = [{ value: ALL_FILTER_VALUE, label: filter.all }, ...filter.options.map(o => ({ value: o.id, label: o.name }))];
            return (
              <Select
                key={filter.key}
                items={items}
                value={appliedFilters[filter.key]}
                onValueChange={value => updateFilters({ [filter.key]: value ?? ALL_FILTER_VALUE })}
              >
                <SelectTrigger className="w-full sm:w-44" aria-label={filter.label}>
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup>
                  {items.map(item => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            );
          })}
          {hasActiveFilters && (
            <Button variant="ghost" onClick={handleClearFilters}>
              <X />
              {t('dashboard.filters.clear') || 'Limpar filtros'}
            </Button>
          )}
        </div>
      </CardPanel>
    </Card>
  );

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4 md:gap-6 md:p-6">
      <DashboardTour />
      <div data-tour="dashboard-header">
        <BaseHeader title={t('dashboard.title')} subtitle={t('dashboard.subtitle')} />
      </div>

      {toolbar}

      {loading && !data ? (
        <DashboardSkeleton />
      ) : error || !data ? (
        <Alert variant="error">
          <AlertTriangle />
          <AlertTitle>{error || t('dashboard.error') || 'Falha ao carregar dashboard'}</AlertTitle>
          <AlertDescription>
            <Button variant="outline" size="sm" onClick={() => loadDashboard(appliedFilters)}>
              <RotateCcw />
              {t('dashboard.retry')}
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <div className={loading ? 'pointer-events-none opacity-64 transition-opacity' : 'transition-opacity'} aria-busy={loading}>
          <div className="flex flex-col gap-6 md:gap-8">
            <div data-tour="dashboard-metrics">
              <DashboardMetricsSection data={data} t={t} />
            </div>
            <div data-tour="dashboard-trends">
              <DashboardTrendsSection data={data} t={t} channelShareData={channelShareData} />
            </div>
            <div data-tour="dashboard-performance">
              <DashboardPerformanceSection data={data} t={t} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/** Placeholder shaped like the KPI row and the two chart rows. */
const DashboardSkeleton = () => (
  <div className="flex flex-col gap-6" aria-hidden="true">
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-36 rounded-2xl" />
      ))}
    </div>
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      <Skeleton className="h-64 rounded-2xl xl:col-span-7" />
      <Skeleton className="h-64 rounded-2xl xl:col-span-5" />
    </div>
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Skeleton className="h-80 rounded-2xl" />
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  </div>
);

export default CustomerDashboardPage;
