import { formatCurrency } from '@/pages/Customer/Dashboard/components/dashboardUtils';

export const DASH = '—';

export const plural = (count: number, one: string, other: string) => `${count} ${count === 1 ? one : other}`;

const decimal = (value: number, digits = 1) =>
  value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: digits });

/** Accepts numeric strings too: older API versions serialized decimals as strings ("1.83"). */
export const percentOrDash = (value: number | string | null | undefined, digits = 1) =>
  value == null || Number.isNaN(Number(value)) ? DASH : `${decimal(Number(value), digits)}%`;

export const currencyOrDash = (value: number | null | undefined) => (value == null ? DASH : formatCurrency(value));

export const roasOrDash = (value: number | null | undefined) =>
  value == null ? DASH : `${value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}x`;

/** Compact BRL for chart axes: R$ 1,2 mil. */
export const compactCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 });

export { formatCurrency };

export const formatNumber = (value: number | null | undefined) => (value == null ? DASH : value.toLocaleString('pt-BR'));

/** Compact count for chart axes: 1,2 mil. */
export const compactNumber = (value: number) =>
  value.toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
