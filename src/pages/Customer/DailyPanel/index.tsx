import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw } from '@/components/icons';
import { useLanguage } from '@/hooks/useLanguage';
import { useDailyPanel } from '@/hooks/dailyPanel/useDailyPanel';
import DailyPanelView from './components/DailyPanelView';

/** Painel do Dia: post-login landing page (route `/`). */
export default function DailyPanel() {
  const { t } = useLanguage('dailyPanel');
  const { data, loading, error, reload } = useDailyPanel();

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-6">
        {data ? (
          <DailyPanelView data={data} now={new Date()} />
        ) : error ? (
          <Alert variant="error">
            <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
              {t('loadError')}
              <Button size="sm" variant="outline" onClick={() => void reload()} loading={loading}>
                <RefreshCw aria-hidden />
                {t('retry')}
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="flex flex-col gap-4" aria-busy="true" aria-label={t('loading')}>
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-48" />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
            </div>
            <Skeleton className="h-32" />
          </div>
        )}
      </div>
    </div>
  );
}
