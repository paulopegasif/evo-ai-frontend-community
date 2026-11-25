import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDailyPanel } from './useDailyPanel';
import { DAILY_PANEL_STALE_MS, useDailyPanelStore } from '@/store/dailyPanelStore';
import { dailyPanelService } from '@/services/dailyPanel/dailyPanelService';

vi.mock('@/services/dailyPanel/dailyPanelService', () => ({
  dailyPanelService: { get: vi.fn() },
}));

describe('useDailyPanel refresh rules', () => {
  beforeEach(() => {
    vi.mocked(dailyPanelService.get).mockReset().mockResolvedValue({ generated_at: 'x' } as never);
    useDailyPanelStore.getState().reset();
  });

  it('fetches on mount and again after a sale invalidates the data', async () => {
    renderHook(() => useDailyPanel());
    await waitFor(() => expect(dailyPanelService.get).toHaveBeenCalledTimes(1));

    act(() => useDailyPanelStore.getState().invalidate());
    await waitFor(() => expect(dailyPanelService.get).toHaveBeenCalledTimes(2));
  });

  it('refetches on window focus only when the data is at least 5 minutes old', async () => {
    renderHook(() => useDailyPanel());
    await waitFor(() => expect(useDailyPanelStore.getState().fetchedAt).not.toBeNull());

    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(dailyPanelService.get).toHaveBeenCalledTimes(1);

    act(() => {
      useDailyPanelStore.setState({ fetchedAt: Date.now() - DAILY_PANEL_STALE_MS });
      window.dispatchEvent(new Event('focus'));
    });
    await waitFor(() => expect(dailyPanelService.get).toHaveBeenCalledTimes(2));
  });
});
