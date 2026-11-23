import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import OptionSelect from '@/components/automation/OptionSelect';
import { RefreshCw, ChevronDown, ChevronRight, ScrollText } from '@/components/icons';
import { automationService } from '@/services/automation/automationService';
import type {
  AutomationRuleRun,
  AutomationRuleRunStatus,
  AutomationRuleRunStep,
} from '@/types/automation';

interface Props {
  automationRuleId: string;
}

const STATUS_FILTERS: { value: string; labelKey: string }[] = [
  { value: 'all', labelKey: 'logs.filters.all' },
  { value: 'matched', labelKey: 'logs.filters.matched' },
  { value: 'no_match', labelKey: 'logs.filters.no_match' },
  { value: 'skipped', labelKey: 'logs.filters.skipped' },
  { value: 'error', labelKey: 'logs.filters.error' },
];

const STATUS_VARIANTS: Record<AutomationRuleRunStatus, 'success' | 'secondary' | 'warning' | 'error'> = {
  matched: 'success',
  no_match: 'secondary',
  skipped: 'warning',
  error: 'error',
};

const STEP_LEVEL_STYLES: Record<AutomationRuleRunStep['level'], string> = {
  info: 'text-foreground',
  success: 'text-success-foreground',
  warn: 'text-warning-foreground',
  error: 'text-destructive-foreground',
};

function formatDateTime(iso?: string) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}

function formatDuration(ms?: number) {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export default function AutomationLogsPanel({ automationRuleId }: Props) {
  const { t } = useLanguage('automation');
  const [runs, setRuns] = useState<AutomationRuleRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: { status?: string; per_page: number } = { per_page: 50 };
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await automationService.getAutomationRuns(automationRuleId, params);
      setRuns(res.data ?? []);
    } catch (e) {
      setError((e as Error)?.message ?? 'error');
    } finally {
      setLoading(false);
    }
  }, [automationRuleId, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{t('logs.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('logs.description')}</p>
        </div>
        <div className="flex items-center gap-2">
          <OptionSelect
            items={STATUS_FILTERS.map((opt) => ({ value: opt.value, label: t(opt.labelKey) }))}
            value={statusFilter}
            onValueChange={setStatusFilter}
            className="w-44"
            aria-label={t('logs.statusFilter')}
          />
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={loading ? 'animate-spin' : undefined} />
            {t('logs.refresh')}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!loading && runs.length === 0 && (
        <Empty className="rounded-xl border border-dashed py-8">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ScrollText />
            </EmptyMedia>
            <EmptyDescription>{t('logs.empty')}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {loading && runs.length === 0 && (
        <div className="flex flex-col gap-2" aria-busy="true">
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      )}

      <div className="flex flex-col gap-2">
        {runs.map((run) => {
          const isOpen = expanded.has(run.id);
          return (
            <div key={run.id} className="overflow-hidden rounded-xl border bg-muted/24">
              <button
                type="button"
                onClick={() => toggleExpanded(run.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left outline-none hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-center gap-3">
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Badge variant={STATUS_VARIANTS[run.status]} size="sm">
                    {t(`logs.status.${run.status}`)}
                  </Badge>
                  <span className="text-sm">{run.event_name}</span>
                </div>
                <div className="flex items-center gap-4 text-muted-foreground text-xs tabular-nums">
                  <span>{formatDuration(run.duration_ms)}</span>
                  <span>{formatDateTime(run.started_at)}</span>
                </div>
              </button>

              {isOpen && (
                <div className="flex flex-col gap-3 border-t bg-background px-4 py-3 text-sm">
                  {run.error_message && (
                    <Alert variant="error">
                      <AlertDescription>{run.error_message}</AlertDescription>
                    </Alert>
                  )}

                  <div>
                    <h4 className="text-xs font-medium uppercase text-muted-foreground mb-1">
                      {t('logs.detail.timeline')}
                    </h4>
                    <ol className="space-y-2">
                      {run.steps.map((step, idx) => (
                        <li key={idx} className="flex gap-3">
                          <span className="text-xs text-muted-foreground w-20 shrink-0">
                            {formatDateTime(step.at)}
                          </span>
                          <div className="flex-1">
                            <div className={`text-sm ${STEP_LEVEL_STYLES[step.level]}`}>
                              {step.label}
                            </div>
                            {step.data && Object.keys(step.data).length > 0 && (
                              <pre className="mt-1 text-xs rounded-lg border bg-muted/24 p-2 overflow-x-auto">
                                {JSON.stringify(step.data, null, 2)}
                              </pre>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {run.payload && Object.keys(run.payload).length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium uppercase text-muted-foreground mb-1">
                        {t('logs.detail.payload')}
                      </h4>
                      <pre className="text-xs rounded-lg border bg-muted/24 p-2 overflow-x-auto">
                        {JSON.stringify(run.payload, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
