import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n/config';
import SalesGoals from './index';
import { salesGoalsService } from '@/services/dailyPanel/dailyPanelService';
import { monthKey, shiftMonth } from '@/utils/dailyPanel/format';
import type { GoalProgress, SalesGoalsOverview } from '@/types/dailyPanel';

vi.mock('@/services/dailyPanel/dailyPanelService', () => ({
  salesGoalsService: { get: vi.fn(), upsert: vi.fn(), remove: vi.fn() },
  dailyPanelService: { get: vi.fn() },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const progress = (patch: Partial<GoalProgress> = {}): GoalProgress => ({
  goal_id: null,
  goal: null,
  sold: 0,
  count: 0,
  percent: null,
  remaining: null,
  daily_pace: null,
  goal_reached: false,
  days_left: 6,
  ...patch,
});

const overview = (month: string): SalesGoalsOverview => ({
  month,
  general: progress({ goal_id: 'g1', goal: 20000, sold: 12400, count: 21, percent: 62, remaining: 7600, daily_pace: 1266.67 }),
  sellers: [{ user: { id: 'u1', name: 'Ana' }, ...progress({ sold: 3000, count: 4 }) }],
});

describe('SalesGoals settings page', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('pt-BR');
  });

  it('shows general and seller progress and saves a seller goal', async () => {
    const current = monthKey(new Date());
    vi.mocked(salesGoalsService.get).mockImplementation(async m => overview(m));
    vi.mocked(salesGoalsService.upsert).mockResolvedValue(progress());
    const user = userEvent.setup();
    render(<SalesGoals />);

    expect(await screen.findByText('62%')).toBeInTheDocument();
    expect(screen.getByText('≈ R$ 1.266,67 por dia · 6 dias restantes')).toBeInTheDocument();

    const anaInput = screen.getByLabelText('Ana');
    await user.type(anaInput, '500000');
    const row = anaInput.closest('li') as HTMLElement;
    await user.click(within(row).getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(salesGoalsService.upsert).toHaveBeenCalledWith({ month: current, user_id: 'u1', amount: 5000 }),
    );
  });

  it('loads another month from the selector', async () => {
    vi.mocked(salesGoalsService.get).mockImplementation(async m => overview(m));
    const user = userEvent.setup();
    render(<SalesGoals />);
    await screen.findByText('62%');

    await user.click(screen.getByRole('button', { name: 'Mês anterior' }));
    await waitFor(() =>
      expect(salesGoalsService.get).toHaveBeenLastCalledWith(shiftMonth(monthKey(new Date()), -1)),
    );
  });
});
