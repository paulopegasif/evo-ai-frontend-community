import { useEffect } from 'react';
import { isDailyPanelOutdated, useDailyPanelStore } from '@/store/dailyPanelStore';

/**
 * Daily panel data with the refresh rules of the spec: fetch on mount when
 * missing/stale/older than 5 min, refetch after invalidate() (sale registered),
 * and refetch when the tab regains focus after at least 5 minutes.
 */
export function useDailyPanel() {
  const data = useDailyPanelStore(s => s.data);
  const loading = useDailyPanelStore(s => s.loading);
  const error = useDailyPanelStore(s => s.error);
  const stale = useDailyPanelStore(s => s.stale);
  const load = useDailyPanelStore(s => s.load);

  useEffect(() => {
    const { fetchedAt } = useDailyPanelStore.getState();
    if (stale || isDailyPanelOutdated(fetchedAt)) void load();
  }, [stale, load]);

  useEffect(() => {
    const refreshIfOld = () => {
      if (document.visibilityState === 'hidden') return;
      if (isDailyPanelOutdated(useDailyPanelStore.getState().fetchedAt)) void load();
    };
    window.addEventListener('focus', refreshIfOld);
    document.addEventListener('visibilitychange', refreshIfOld);
    return () => {
      window.removeEventListener('focus', refreshIfOld);
      document.removeEventListener('visibilitychange', refreshIfOld);
    };
  }, [load]);

  return { data, loading, error, reload: load };
}
