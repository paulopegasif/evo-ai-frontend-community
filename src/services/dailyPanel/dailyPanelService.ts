import api from '@/services/core/api';
import { extractData, extractResponse } from '@/utils/apiHelpers';
import type { PaginationMeta } from '@/types/core';
import type {
  DailyPanelData,
  DailySummarySettings,
  DailySummarySettingsPayload,
  DailySummaryTestResult,
  GoalProgress,
  NamedRef,
  QuoteCategory,
  QuotePreferences,
  Sale,
  SalePayload,
  SalesGoalPayload,
  SalesGoalsOverview,
  SalesListParams,
} from '@/types/dailyPanel';

export const salesService = {
  async list(params?: SalesListParams): Promise<{ data: Sale[]; pagination?: PaginationMeta }> {
    const response = await api.get('/sales', { params });
    const { data, meta } = extractResponse<Sale>(response);
    return { data: data ?? [], pagination: meta?.pagination };
  },

  /** CRM users that can be picked as seller (admin only). */
  async sellers(): Promise<NamedRef[]> {
    const response = await api.get('/sales/sellers');
    return extractData<NamedRef[]>(response) ?? [];
  },

  async create(sale: SalePayload): Promise<Sale> {
    const response = await api.post('/sales', { sale });
    return extractData<Sale>(response);
  },

  async update(id: string, sale: Partial<SalePayload>): Promise<Sale> {
    const response = await api.patch(`/sales/${id}`, { sale });
    return extractData<Sale>(response);
  },

  async cancel(id: string): Promise<Sale> {
    const response = await api.post(`/sales/${id}/cancel`);
    return extractData<Sale>(response);
  },
};

export const dailyPanelService = {
  async get(): Promise<DailyPanelData> {
    const response = await api.get('/daily_panel');
    return extractData<DailyPanelData>(response);
  },

  async getPreferences(): Promise<QuotePreferences> {
    const response = await api.get('/daily_panel/preferences');
    return extractData<QuotePreferences>(response);
  },

  async updatePreferences(daily_quote_category: QuoteCategory | null): Promise<QuotePreferences> {
    const response = await api.patch('/daily_panel/preferences', { daily_quote_category });
    return extractData<QuotePreferences>(response);
  },

  async updateSettings(default_quote_category: QuoteCategory): Promise<QuotePreferences> {
    const response = await api.patch('/daily_panel/settings', { default_quote_category });
    return extractData<QuotePreferences>(response);
  },
};

export const salesGoalsService = {
  async get(month: string): Promise<SalesGoalsOverview> {
    const response = await api.get('/sales_goals', { params: { month } });
    return extractData<SalesGoalsOverview>(response);
  },

  async upsert(payload: SalesGoalPayload): Promise<GoalProgress> {
    const response = await api.put('/sales_goals', payload);
    return extractData<GoalProgress>(response);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/sales_goals/${id}`);
  },
};

export const dailySummaryService = {
  async get(): Promise<DailySummarySettings> {
    const response = await api.get('/daily_summary_settings');
    return extractData<DailySummarySettings>(response);
  },

  async update(daily_summary_settings: DailySummarySettingsPayload): Promise<DailySummarySettings> {
    const response = await api.put('/daily_summary_settings', { daily_summary_settings });
    return extractData<DailySummarySettings>(response);
  },

  async sendTest(): Promise<DailySummaryTestResult> {
    const response = await api.post('/daily_summary_settings/test');
    return extractData<DailySummaryTestResult>(response);
  },
};
