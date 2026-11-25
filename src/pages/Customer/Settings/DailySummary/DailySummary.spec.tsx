import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n/config';
import DailySummary from './index';
import { dailySummaryService } from '@/services/dailyPanel/dailyPanelService';
import type { DailySummarySettings } from '@/types/dailyPanel';

vi.mock('@/services/dailyPanel/dailyPanelService', () => ({
  dailySummaryService: { get: vi.fn(), update: vi.fn(), sendTest: vi.fn() },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const settings = (patch: Partial<DailySummarySettings> = {}): DailySummarySettings => ({
  enabled: false,
  time: '19:00',
  inbox_id: null,
  phones: [],
  last_run: null,
  available_inboxes: [{ id: 'i1', name: 'Atendimento', phone_number: '+5562988887777' }],
  timezone: 'America/Sao_Paulo',
  ...patch,
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <DailySummary />
    </MemoryRouter>,
  );

describe('DailySummary settings page', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('pt-BR');
  });
  beforeEach(() => {
    vi.mocked(dailySummaryService.update).mockReset();
    vi.mocked(dailySummaryService.sendTest).mockReset();
  });

  it('blocks saving an invalid phone and names it', async () => {
    vi.mocked(dailySummaryService.get).mockResolvedValue(settings({ inbox_id: 'i1' }));
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByLabelText('Número de destino 1'), '62999990000');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('62999990000 não está no formato internacional');
    expect(dailySummaryService.update).not.toHaveBeenCalled();
  });

  it('saves normalised E.164 phones', async () => {
    vi.mocked(dailySummaryService.get).mockResolvedValue(settings({ inbox_id: 'i1' }));
    vi.mocked(dailySummaryService.update).mockImplementation(async payload => settings(payload));
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByLabelText('Número de destino 1'), '+55 62 99999-0000');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(dailySummaryService.update).toHaveBeenCalledWith({
        enabled: false,
        time: '19:00',
        inbox_id: 'i1',
        phones: ['+5562999990000'],
      }),
    );
  });

  it('shows 422 field details next to the matching fields', async () => {
    vi.mocked(dailySummaryService.get).mockResolvedValue(settings({ inbox_id: 'i1' }));
    vi.mocked(dailySummaryService.update).mockRejectedValue({
      response: {
        data: {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: [
              { field: 'phones', messages: ['+5500 inválido'], full_messages: [] },
              { field: 'inbox_id', messages: ['não é uma caixa de WhatsApp'], full_messages: [] },
            ],
          },
        },
      },
    });
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByLabelText('Número de destino 1'), '+5562999990000');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    const alerts = await screen.findAllByRole('alert');
    expect(alerts.map(a => a.textContent)).toEqual(
      expect.arrayContaining(['+5500 inválido', 'não é uma caixa de WhatsApp']),
    );
  });

  it('asks to connect a WhatsApp and disables enabling when there is no inbox', async () => {
    vi.mocked(dailySummaryService.get).mockResolvedValue(settings({ available_inboxes: [] }));
    renderPage();

    expect(await screen.findByText('Para enviar o resumo é preciso conectar um WhatsApp.')).toBeInTheDocument();
    expect(screen.getByRole('switch')).toHaveAttribute('aria-disabled', 'true');
  });

  it('shows the last failed run and the test result', async () => {
    vi.mocked(dailySummaryService.get).mockResolvedValue(
      settings({
        enabled: true,
        inbox_id: 'i1',
        phones: ['+5562999990000'],
        last_run: { date: '2026-11-24', status: 'failed', error: 'WhatsApp desconectado', sent_at: null },
      }),
    );
    vi.mocked(dailySummaryService.sendTest).mockResolvedValue({ sent: 1, failed: [] });
    const user = userEvent.setup();
    renderPage();

    const lastRun = await screen.findByTestId('daily-summary-last-run');
    expect(lastRun).toHaveTextContent('Falhou');
    expect(lastRun).toHaveTextContent('WhatsApp desconectado');

    await user.click(screen.getByRole('button', { name: 'Enviar teste' }));
    expect(await screen.findByTestId('daily-summary-test-result')).toHaveTextContent('Teste enviado para 1 número');
  });
});
