import { create } from 'zustand';
import { dailyPanelService } from '@/services/dailyPanel/dailyPanelService';
import type { DailyPanelData } from '@/types/dailyPanel';

/** Data older than this is refetched when the tab regains focus. */
export const DAILY_PANEL_STALE_MS = 5 * 60 * 1000;

interface DailyPanelState {
  data: DailyPanelData | null;
  loading: boolean;
  error: boolean;
  fetchedAt: number | null;
  /** Set by invalidate(); the mounted panel refetches when it flips on. */
  stale: boolean;
  load: () => Promise<void>;
  /** Mark data as outdated (e.g. after a sale is registered). */
  invalidate: () => void;
  reset: () => void;
}

let inflight: Promise<void> | null = null;

export const useDailyPanelStore = create<DailyPanelState>((set) => ({
  data: null,
  loading: false,
  error: false,
  fetchedAt: null,
  stale: true,
  load: () => {
    if (inflight) return inflight;
    set({ loading: true, error: false });
    inflight = dailyPanelService
      .get()
      .then(data => set({ data, fetchedAt: Date.now(), stale: false, loading: false }))
      .catch(() => set({ error: true, loading: false, stale: false }))
      .finally(() => {
        inflight = null;
      });
    return inflight;
  },
  invalidate: () => set({ stale: true }),
  reset: () => set({ data: null, loading: false, error: false, fetchedAt: null, stale: true }),
}));

export const isDailyPanelOutdated = (fetchedAt: number | null, now = Date.now()) =>
  fetchedAt === null || now - fetchedAt >= DAILY_PANEL_STALE_MS;
