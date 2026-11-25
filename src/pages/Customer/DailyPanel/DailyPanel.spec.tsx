import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it } from 'vitest';
import i18n from '@/i18n/config';
import DailyPanelView from './components/DailyPanelView';
import { SALES_GOALS_PATH, TODO_LINKS } from './components/links';
import type { DailyPanelData } from '@/types/dailyPanel';

const base = (): DailyPanelData => ({
  generated_at: '2026-11-25T17:00:00Z',
  timezone: 'America/Sao_Paulo',
  user: { first_name: 'Paulo', is_admin: true },
  quote: { text: 'O sucesso é a soma de pequenos esforços.', author: 'Robert Collier', category: 'motivacao' },
  sales: {
    today: { count: 3, amount: 1240 },
    yesterday: { count: 2, amount: 800 },
    same_weekday_last_week: { count: 0, amount: 0 },
  },
  month: {
    month: '2026-11',
    sold: 12400,
    count: 21,
    goal: 20000,
    percent: 62,
    remaining: 7600,
    daily_pace: 1266.67,
    days_left: 6,
    goal_reached: false,
    scope: 'all',
  },
  todo: { awaiting_reply: 6, overdue_follow_ups: 0, stalled_items: 4, sales_missing_amount: 1 },
  no_sales_hint: null,
});

// Quarta-feira, 25 de novembro de 2026, 14h (horário local).
const afternoon = new Date(2026, 10, 25, 14, 0);

const renderPanel = (data: DailyPanelData, now = afternoon) =>
  render(
    <MemoryRouter>
      <DailyPanelView data={data} now={now} />
    </MemoryRouter>,
  );

describe('DailyPanelView', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('pt-BR');
  });

  it('greets by hour with the first name and the long pt-BR date', () => {
    renderPanel(base());
    expect(screen.getByTestId('daily-panel-greeting')).toHaveTextContent('Boa tarde, Paulo');
    expect(screen.getByText('quarta-feira, 25 de novembro')).toBeInTheDocument();
  });

  it.each([
    [new Date(2026, 10, 25, 5, 0), 'Bom dia, Paulo'],
    [new Date(2026, 10, 25, 11, 59), 'Bom dia, Paulo'],
    [new Date(2026, 10, 25, 18, 0), 'Boa noite, Paulo'],
    [new Date(2026, 10, 25, 4, 59), 'Boa noite, Paulo'],
  ])('greeting at %s is "%s"', (now, expected) => {
    renderPanel(base(), now);
    expect(screen.getByTestId('daily-panel-greeting')).toHaveTextContent(expected);
  });

  it('shows the quote with its author', () => {
    renderPanel(base());
    const quote = screen.getByTestId('daily-panel-quote');
    expect(quote).toHaveTextContent('O sucesso é a soma de pequenos esforços.');
    expect(quote).toHaveTextContent('Robert Collier');
  });

  it('renders no quote block when quote is null', () => {
    renderPanel({ ...base(), quote: null });
    expect(screen.queryByTestId('daily-panel-quote')).not.toBeInTheDocument();
  });

  it('shows today total with +55% vs yesterday and no percent without a base', () => {
    renderPanel(base());
    expect(screen.getByTestId('daily-panel-today-total')).toHaveTextContent('3 vendas · R$ 1.240,00');
    const today = screen.getByTestId('daily-panel-today');
    expect(within(today).getByText('+55%')).toBeInTheDocument();
    expect(within(today).getByText('R$ 0,00')).toBeInTheDocument();
    expect(within(today).getAllByText(/%$/)).toHaveLength(1);
  });

  it('replaces the sales highlight with action shortcuts when there are no sales today', () => {
    renderPanel({
      ...base(),
      sales: { ...base().sales, today: { count: 0, amount: 0 } },
      no_sales_hint: { stalled_items: 4, awaiting_reply: 0 },
    });
    expect(screen.queryByTestId('daily-panel-today')).not.toBeInTheDocument();
    const card = screen.getByTestId('daily-panel-no-sales');
    expect(within(card).getByText('Nenhuma venda hoje ainda')).toBeInTheDocument();
    const link = within(card).getByRole('link', { name: /4 propostas paradas há 3\+ dias/ });
    expect(link).toHaveAttribute('href', TODO_LINKS.stalled_items);
    expect(within(card).queryByText(/aguardando resposta/)).not.toBeInTheDocument();
  });

  it('shows only the message when there are no sales and no opportunities', () => {
    renderPanel({
      ...base(),
      sales: { ...base().sales, today: { count: 0, amount: 0 } },
      no_sales_hint: { stalled_items: 0, awaiting_reply: 0 },
    });
    const card = screen.getByTestId('daily-panel-no-sales');
    expect(within(card).queryAllByRole('link')).toHaveLength(0);
  });

  it('shows goal progress, remaining and daily pace', () => {
    renderPanel(base());
    const month = screen.getByTestId('daily-panel-month');
    expect(month).toHaveTextContent('62%');
    expect(month).toHaveTextContent('Faltam R$ 7.600,00');
    expect(month).toHaveTextContent('≈ R$ 1.266,67 por dia');
  });

  it('shows goal reached with the surplus', () => {
    renderPanel({
      ...base(),
      month: { ...base().month, sold: 21500, percent: 107.5, remaining: 0, daily_pace: 0, goal_reached: true, surplus: 1500 },
    });
    const reached = screen.getByTestId('daily-panel-goal-reached');
    expect(reached).toHaveTextContent('Meta do mês atingida!');
    expect(reached).toHaveTextContent('R$ 1.500,00 acima da meta');
    expect(screen.getByTestId('daily-panel-month')).not.toHaveTextContent('por dia');
  });

  it('without a goal shows the month total and a set-goal shortcut only for admins', () => {
    const noGoal = { ...base().month, goal: null, percent: null, remaining: null, daily_pace: null };
    const { unmount } = renderPanel({ ...base(), month: noGoal });
    expect(screen.getByTestId('daily-panel-month')).toHaveTextContent('R$ 12.400,00');
    expect(screen.getByRole('link', { name: /Definir meta do mês/ })).toHaveAttribute('href', SALES_GOALS_PATH);
    unmount();

    renderPanel({ ...base(), user: { first_name: 'Ana', is_admin: false }, month: { ...noGoal, scope: 'mine' } });
    expect(screen.queryByRole('link', { name: /Definir meta do mês/ })).not.toBeInTheDocument();
  });

  it('lists only non-zero todo items with links', () => {
    renderPanel(base());
    const todo = screen.getByTestId('daily-panel-todo');
    const links = within(todo).getAllByRole('link');
    expect(links).toHaveLength(3);
    expect(within(todo).getByRole('link', { name: /6 leads aguardando resposta/ })).toHaveAttribute(
      'href',
      TODO_LINKS.awaiting_reply,
    );
    expect(within(todo).queryByText(/follow-up/)).not.toBeInTheDocument();
  });

  it('shows "tudo em dia" when every todo count is zero', () => {
    renderPanel({
      ...base(),
      todo: { awaiting_reply: 0, overdue_follow_ups: 0, stalled_items: 0, sales_missing_amount: 0 },
    });
    expect(screen.getByTestId('daily-panel-all-clear')).toHaveTextContent('Tudo em dia!');
    expect(within(screen.getByTestId('daily-panel-todo')).queryAllByRole('link')).toHaveLength(0);
  });
});
