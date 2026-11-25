import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  ListChecks,
  Sparkles,
  Target,
  Trophy,
} from '@/components/icons';
import { useLanguage } from '@/hooks/useLanguage';
import {
  formatBRL,
  formatLongDate,
  greetingKey,
  percentChange,
} from '@/utils/dailyPanel/format';
import type { DailyPanelData, SalesBucket, TodoCounts } from '@/types/dailyPanel';
import { SALES_GOALS_PATH, TODO_LINKS, TODO_ORDER } from './links';


interface DailyPanelViewProps {
  data: DailyPanelData;
  now: Date;
}

export default function DailyPanelView({ data, now }: DailyPanelViewProps) {
  const { t, currentLanguage } = useLanguage('dailyPanel');
  const locale = currentLanguage || 'pt-BR';

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-semibold text-2xl leading-tight md:text-3xl" data-testid="daily-panel-greeting">
          {t(`greeting.${greetingKey(now)}`, { name: data.user.first_name })}
        </h1>
        <p className="text-muted-foreground text-sm first-letter:uppercase md:text-base">
          {formatLongDate(now, locale)}
        </p>
      </header>

      {data.quote && (
        <figure
          className="rounded-2xl border bg-muted/40 px-4 py-3 md:px-5 md:py-4"
          data-testid="daily-panel-quote"
          aria-label={t('quote.label')}
        >
          <blockquote className="text-balance text-base italic leading-relaxed md:text-lg">
            “{data.quote.text}”
          </blockquote>
          <figcaption className="mt-2 text-muted-foreground text-sm">— {data.quote.author}</figcaption>
        </figure>
      )}

      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
        <TodaySalesCard data={data} />
        <MonthGoalCard data={data} />
      </div>

      <TodoCard todo={data.todo} />
    </div>
  );
}

function Comparison({ label, current, base }: { label: string; current: number; base: SalesBucket }) {
  const { t } = useLanguage('dailyPanel');
  const pct = percentChange(current, base.amount);
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-sm tabular-nums">{formatBRL(base.amount)}</span>
        {pct !== null && (
          <Badge
            variant={pct > 0 ? 'success' : pct < 0 ? 'error' : 'secondary'}
            aria-label={t('sales.changeAria', { value: `${pct > 0 ? '+' : ''}${pct}%` })}
          >
            {pct > 0 ? '+' : ''}
            {pct}%
          </Badge>
        )}
      </span>
    </div>
  );
}

function TodaySalesCard({ data }: { data: DailyPanelData }) {
  const { t } = useLanguage('dailyPanel');
  const { today, yesterday, same_weekday_last_week } = data.sales;

  if (today.count === 0) {
    const hint = data.no_sales_hint;
    const shortcuts = [
      hint && hint.stalled_items > 0
        ? { key: 'stalled', to: TODO_LINKS.stalled_items, label: t('noSales.stalled', { count: hint.stalled_items }) }
        : null,
      hint && hint.awaiting_reply > 0
        ? { key: 'awaiting', to: TODO_LINKS.awaiting_reply, label: t('noSales.awaiting', { count: hint.awaiting_reply }) }
        : null,
    ].filter((s): s is { key: string; to: string; label: string } => s !== null);

    return (
      <Card data-testid="daily-panel-no-sales">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-primary" aria-hidden />
            {t('noSales.title')}
          </CardTitle>
          <CardDescription>
            {shortcuts.length > 0 ? t('noSales.encourageWithOpportunities') : t('noSales.encourage')}
          </CardDescription>
        </CardHeader>
        {shortcuts.length > 0 && (
          <CardPanel className="flex flex-col gap-2 pt-0">
            {shortcuts.map(s => (
              <Button
                key={s.key}
                variant="outline"
                className="h-auto min-h-9 justify-between whitespace-normal py-2 text-left"
                render={<Link to={s.to} />}
              >
                {s.label}
                <ArrowRight aria-hidden />
              </Button>
            ))}
          </CardPanel>
        )}
      </Card>
    );
  }

  return (
    <Card data-testid="daily-panel-today">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CircleDollarSign className="size-4 text-primary" aria-hidden />
          {t('sales.title')}
        </CardTitle>
      </CardHeader>
      <CardPanel className="flex flex-col gap-4 pt-0">
        <p className="font-semibold text-2xl tabular-nums xl:text-3xl" data-testid="daily-panel-today-total">
          {t('sales.summary', { count: today.count, amount: formatBRL(today.amount) })}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Comparison label={t('sales.vsYesterday')} current={today.amount} base={yesterday} />
          <Comparison label={t('sales.vsLastWeek')} current={today.amount} base={same_weekday_last_week} />
        </div>
      </CardPanel>
    </Card>
  );
}

function MonthGoalCard({ data }: { data: DailyPanelData }) {
  const { t } = useLanguage('dailyPanel');
  const month = data.month;
  const title = month.scope === 'mine' ? t('goal.titleMine') : t('goal.title');

  if (month.goal === null) {
    return (
      <Card data-testid="daily-panel-month">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="size-4 text-primary" aria-hidden />
            {t('goal.monthTotal')}
          </CardTitle>
        </CardHeader>
        <CardPanel className="flex flex-col gap-3 pt-0">
          <p className="font-semibold text-2xl tabular-nums md:text-3xl">{formatBRL(month.sold)}</p>
          <p className="text-muted-foreground text-sm">{t('goal.salesCount', { count: month.count })}</p>
          {data.user.is_admin && (
            <Button variant="outline" className="self-start" render={<Link to={SALES_GOALS_PATH} />}>
              <Target aria-hidden />
              {t('goal.setGoal')}
            </Button>
          )}
        </CardPanel>
      </Card>
    );
  }

  const percent = Math.max(0, Math.round(month.percent ?? (month.goal > 0 ? (month.sold / month.goal) * 100 : 0)));
  const surplus = month.surplus ?? Math.max(0, month.sold - month.goal);

  return (
    <Card data-testid="daily-panel-month">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="size-4 text-primary" aria-hidden />
          {title}
        </CardTitle>
      </CardHeader>
      <CardPanel className="flex flex-col gap-3 pt-0">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="font-semibold text-2xl tabular-nums md:text-3xl">{percent}%</p>
          <p className="text-muted-foreground text-sm tabular-nums">
            {t('goal.soldOfGoal', { sold: formatBRL(month.sold), goal: formatBRL(month.goal) })}
          </p>
        </div>
        <Progress value={Math.min(100, percent)} aria-label={t('goal.progressAria', { percent })} />
        {month.goal_reached ? (
          <div className="flex items-start gap-2 text-sm" data-testid="daily-panel-goal-reached">
            <Trophy className="mt-0.5 size-4 shrink-0 text-success-foreground" aria-hidden />
            <div className="flex flex-col">
              <span className="font-medium">{t('goal.reached')}</span>
              {surplus > 0 && (
                <span className="text-muted-foreground">{t('goal.surplus', { amount: formatBRL(surplus) })}</span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5 text-sm">
            <span className="font-medium tabular-nums">
              {t('goal.remaining', { amount: formatBRL(month.remaining ?? Math.max(0, month.goal - month.sold)) })}
            </span>
            {month.daily_pace !== null && (
              <span className="text-muted-foreground tabular-nums">
                {t('goal.pace', { amount: formatBRL(month.daily_pace), count: month.days_left })}
              </span>
            )}
          </div>
        )}
      </CardPanel>
    </Card>
  );
}

function TodoCard({ todo }: { todo: TodoCounts }) {
  const { t } = useLanguage('dailyPanel');
  const items = TODO_ORDER.filter(key => (todo[key] ?? 0) > 0);

  return (
    <Card data-testid="daily-panel-todo">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ListChecks className="size-4 text-primary" aria-hidden />
          {t('todo.title')}
        </CardTitle>
      </CardHeader>
      <CardPanel className="pt-0">
        {items.length === 0 ? (
          <p className="flex items-center gap-2 text-muted-foreground text-sm" data-testid="daily-panel-all-clear">
            <CheckCircle2 className="size-4 text-success-foreground" aria-hidden />
            {t('todo.allClear')}
          </p>
        ) : (
          <ul className="flex flex-col divide-y">
            {items.map(key => (
              <li key={key}>
                <Link
                  to={TODO_LINKS[key]}
                  className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-sm outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Badge variant="warning" size="lg" className="tabular-nums">
                      {todo[key]}
                    </Badge>
                    <span className="min-w-0">{t(`todo.items.${key}`, { count: todo[key] })}</span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardPanel>
    </Card>
  );
}
