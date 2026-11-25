import { useCallback, useEffect, useId, useState } from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Trash2 } from '@/components/icons';
import BrlAmountInput from '@/components/sales/BrlAmountInput';
import SettingsPageHeader from '@/components/dailyPanel/SettingsPageHeader';
import { useLanguage } from '@/hooks/useLanguage';
import { salesGoalsService } from '@/services/dailyPanel/dailyPanelService';
import { useDailyPanelStore } from '@/store/dailyPanelStore';
import { getApiErrorMessage } from '@/utils/apiHelpers';
import { formatBRL, formatMonthLabel, monthKey, shiftMonth, toCents } from '@/utils/dailyPanel/format';
import type { GoalProgress, SalesGoalsOverview } from '@/types/dailyPanel';

interface GoalRowProps {
  label: string;
  progress: GoalProgress;
  month: string;
  userId: string | null;
  onChanged: () => void;
  highlight?: boolean;
}

function GoalRow({ label, progress, month, userId, onChanged, highlight }: GoalRowProps) {
  const { t } = useLanguage('dailyPanel');
  const id = useId();
  const initialCents = toCents(progress.goal);
  const [cents, setCents] = useState(initialCents);
  const [saving, setSaving] = useState(false);

  useEffect(() => setCents(initialCents), [initialCents]);

  const dirty = cents !== initialCents;
  const percent = progress.percent !== null ? Math.round(progress.percent) : null;

  const save = async () => {
    if (!(cents > 0)) {
      toast.error(t('goals.errors.amount'));
      return;
    }
    setSaving(true);
    try {
      await salesGoalsService.upsert({ month, user_id: userId, amount: cents / 100 });
      toast.success(t('goals.saved'));
      onChanged();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('goals.errors.save')));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!progress.goal_id) return;
    setSaving(true);
    try {
      await salesGoalsService.remove(progress.goal_id);
      toast.success(t('goals.removed'));
      onChanged();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('goals.errors.save')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <li
      className={`flex flex-col gap-3 py-4 first:pt-0 last:pb-0 md:grid md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.3fr)_minmax(0,1.5fr)] md:items-center md:gap-4 ${highlight ? 'font-medium' : ''}`}
    >
      <label htmlFor={`${id}-goal`} className="min-w-0 truncate text-sm">
        {label}
      </label>
      <form
        className="flex items-center gap-2"
        onSubmit={e => {
          e.preventDefault();
          void save();
        }}
      >
        <BrlAmountInput
          id={`${id}-goal`}
          cents={cents}
          onCentsChange={setCents}
          className="min-w-0 flex-1"
          disabled={saving}
        />
        <Button type="submit" size="sm" disabled={!dirty || saving} loading={saving && dirty}>
          {t('goals.save')}
        </Button>
        {progress.goal_id && (
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={t('goals.remove', { name: label })}
            onClick={() => void remove()}
            disabled={saving}
          >
            <Trash2 aria-hidden />
          </Button>
        )}
      </form>
      <div className="flex min-w-0 flex-col gap-1.5 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <span className="tabular-nums">{t('goals.sold', { amount: formatBRL(progress.sold), count: progress.count })}</span>
          {percent !== null && (
            <Badge variant={progress.goal_reached ? 'success' : 'secondary'} className="tabular-nums">
              {percent}%
            </Badge>
          )}
        </div>
        {progress.goal !== null && (
          <>
            <Progress value={Math.min(100, percent ?? 0)} aria-label={t('goal.progressAria', { percent: percent ?? 0 })} />
            <span className="text-muted-foreground text-xs tabular-nums">
              {progress.goal_reached
                ? progress.surplus
                  ? `${t('goals.reached')} · ${t('goal.surplus', { amount: formatBRL(progress.surplus) })}`
                  : t('goals.reached')
                : progress.daily_pace !== null
                  ? t('goal.pace', { amount: formatBRL(progress.daily_pace), count: progress.days_left })
                  : null}
            </span>
          </>
        )}
      </div>
    </li>
  );
}

export default function SalesGoals() {
  const { t, currentLanguage } = useLanguage('dailyPanel');
  const invalidatePanel = useDailyPanelStore(s => s.invalidate);
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [data, setData] = useState<SalesGoalsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async (key: string) => {
    setLoading(true);
    setError(false);
    try {
      setData(await salesGoalsService.get(key));
    } catch {
      setError(true);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(month);
  }, [month, load]);

  const handleChanged = () => {
    invalidatePanel();
    void load(month);
  };

  const monthLabel = formatMonthLabel(month, currentLanguage || 'pt-BR');

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-6">
        <SettingsPageHeader title={t('goals.title')} subtitle={t('goals.subtitle')} />

        <div className="flex items-center gap-2" role="group" aria-label={t('goals.monthSelector')}>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={t('goals.prevMonth')}
            onClick={() => setMonth(m => shiftMonth(m, -1))}
          >
            <ChevronLeft aria-hidden />
          </Button>
          <span className="min-w-40 text-center font-medium text-sm first-letter:uppercase" aria-live="polite">
            {monthLabel}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={t('goals.nextMonth')}
            onClick={() => setMonth(m => shiftMonth(m, 1))}
          >
            <ChevronRight aria-hidden />
          </Button>
        </div>

        {error ? (
          <Alert variant="error">
            <AlertDescription>{t('goals.errors.load')}</AlertDescription>
          </Alert>
        ) : loading && !data ? (
          <Skeleton className="h-64" />
        ) : data ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('goals.general')}</CardTitle>
                <CardDescription>{t('goals.generalHint')}</CardDescription>
              </CardHeader>
              <CardPanel>
                <ul>
                  <GoalRow
                    key={`general-${data.month}`}
                    label={t('goals.generalLabel')}
                    progress={data.general}
                    month={data.month}
                    userId={null}
                    onChanged={handleChanged}
                    highlight
                  />
                </ul>
              </CardPanel>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('goals.sellers')}</CardTitle>
                <CardDescription>{t('goals.sellersHint')}</CardDescription>
              </CardHeader>
              <CardPanel>
                {data.sellers.length === 0 ? (
                  <p className="text-muted-foreground text-sm">{t('goals.noSellers')}</p>
                ) : (
                  <ul className="divide-y">
                    {data.sellers.map(seller => (
                      <GoalRow
                        key={`${seller.user.id}-${data.month}`}
                        label={seller.user.name}
                        progress={seller}
                        month={data.month}
                        userId={seller.user.id}
                        onChanged={handleChanged}
                      />
                    ))}
                  </ul>
                )}
              </CardPanel>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  );
}
