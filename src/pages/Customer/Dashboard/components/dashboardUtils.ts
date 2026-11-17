export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatSeconds = (value: number) => {
  if (!value || value <= 0) return '0s';
  if (value < 60) return `${Math.round(value)}s`;

  const minutes = Math.floor(value / 60);
  const seconds = Math.round(value % 60);
  return `${minutes}min ${seconds}s`;
};

// pt-BR number formatting (the dashboard printed "766.67%" / "0.00 / 5").
export const formatPercent = (value: number, digits = 1) =>
  `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(value || 0)}%`;

export const formatDecimal = (value: number, digits = 2) =>
  new Intl.NumberFormat('pt-BR', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value || 0);

export const formatInteger = (value: number) => new Intl.NumberFormat('pt-BR').format(Math.round(value || 0));

// Theme chart palette (brand-driven: monochrome on Elph, brand colors elsewhere).
export const CHART_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];
