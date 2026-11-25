import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n/config';
import RecordSaleDialog from './RecordSaleDialog';
import { salesService } from '@/services/dailyPanel/dailyPanelService';
import { useDailyPanelStore } from '@/store/dailyPanelStore';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

vi.mock('@/services/dailyPanel/dailyPanelService', () => ({
  salesService: { create: vi.fn(), sellers: vi.fn().mockResolvedValue([{ id: 'crm-7', name: 'Ana' }]) },
  dailyPanelService: { get: vi.fn() },
}));

vi.mock('@/services/products/productsService', () => ({
  productsService: {
    getProducts: vi.fn().mockResolvedValue({
      data: [{ id: 'p1', name: 'Consulta', default_price: 199.9, status: 'active' }],
    }),
  },
}));


vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const renderDialog = () => {
  const onOpenChange = vi.fn();
  render(
    <RecordSaleDialog open onOpenChange={onOpenChange} conversationId="conv-1" contactId="contact-9" />,
  );
  return { onOpenChange };
};

describe('RecordSaleDialog', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('pt-BR');
  });

  beforeEach(() => {
    vi.mocked(salesService.create).mockReset();
    vi.mocked(toast.success).mockReset();
    vi.mocked(salesService.sellers).mockClear();
    useDailyPanelStore.setState({ stale: false });
    useAuthStore.setState({ currentUser: null });
  });

  it('does not load sellers for agents', async () => {
    renderDialog();
    await screen.findByLabelText('Valor da venda');
    expect(salesService.sellers).not.toHaveBeenCalled();
  });

  it('loads CRM sellers from /sales/sellers for admins', async () => {
    useAuthStore.setState({ currentUser: { id: 'u1', role: { key: 'administrator' } } as never });
    renderDialog();
    await waitFor(() => expect(salesService.sellers).toHaveBeenCalledTimes(1));
  });

  it('blocks submit when the amount is empty or zero', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    await user.click(await screen.findByRole('button', { name: 'Registrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('O valor deve ser maior que zero.');
    expect(screen.getByLabelText('Valor da venda')).toHaveAttribute('aria-invalid', 'true');
    expect(salesService.create).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('applies the BRL mask while typing', async () => {
    const user = userEvent.setup();
    renderDialog();
    const amount = await screen.findByLabelText('Valor da venda');
    await user.type(amount, '124000');
    expect(amount).toHaveValue('1.240,00');
  });

  it('creates the sale for the conversation, toasts, refreshes the panel and closes', async () => {
    vi.mocked(salesService.create).mockResolvedValue({ id: 's1', amount: 350 } as never);
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    await user.type(await screen.findByLabelText('Valor da venda'), '35000');
    await user.click(screen.getByRole('button', { name: 'Registrar' }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(salesService.create).toHaveBeenCalledWith({
      amount: 350,
      conversation_id: 'conv-1',
      contact_id: 'contact-9',
    });
    expect(toast.success).toHaveBeenCalledWith('Venda de R$ 350,00 registrada');
    expect(useDailyPanelStore.getState().stale).toBe(true);
  });

  it('shows a 422 amount error next to the field', async () => {
    vi.mocked(salesService.create).mockRejectedValue({
      response: {
        data: {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: [{ field: 'amount', messages: ['deve ser maior que 0'], full_messages: ['Amount deve ser maior que 0'] }],
          },
        },
      },
    });
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    await user.type(await screen.findByLabelText('Valor da venda'), '100');
    await user.click(screen.getByRole('button', { name: 'Registrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('deve ser maior que 0');
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('keeps the dialog open and shows the server error on failure', async () => {
    vi.mocked(salesService.create).mockRejectedValue({
      response: { data: { success: false, error: { code: 'VALIDATION', message: 'Valor inválido' } } },
    });
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    await user.type(await screen.findByLabelText('Valor da venda'), '100');
    await user.click(screen.getByRole('button', { name: 'Registrar' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Valor inválido'));
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
