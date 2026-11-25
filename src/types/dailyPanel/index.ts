/** Painel do Dia — sales, goals, daily panel and daily summary contracts. */

export type SaleStatus = 'active' | 'cancelled';
export type SaleSource = 'manual' | 'pipeline';

export interface NamedRef {
  id: string;
  name: string;
}

export interface Sale {
  id: string;
  amount: number;
  sold_at: string;
  status: SaleStatus;
  source: SaleSource;
  missing_amount: boolean;
  notes: string | null;
  seller: NamedRef | null;
  created_by_id: string | null;
  contact: NamedRef | null;
  conversation_id: string | null;
  pipeline_item_id: string | null;
  product: NamedRef | null;
  cancelled_at: string | null;
  created_at: string;
}

export interface SalePayload {
  amount: number;
  conversation_id?: string;
  contact_id?: string;
  product_id?: string;
  sold_at?: string;
  seller_id?: string;
  notes?: string;
}

export interface SalesListParams {
  since?: string;
  until?: string;
  seller_id?: string;
  status?: SaleStatus;
  conversation_id?: string;
  page?: number;
  per_page?: number;
}

export type QuoteCategory = 'motivacao' | 'negocios' | 'biblia' | 'off';

export interface DailyQuote {
  text: string;
  author: string;
  category: QuoteCategory;
}

export interface SalesBucket {
  count: number;
  amount: number;
}

export interface MonthProgress {
  month: string;
  sold: number;
  count: number;
  goal: number | null;
  percent: number | null;
  remaining: number | null;
  daily_pace: number | null;
  days_left: number;
  goal_reached: boolean;
  /** Amount above the goal when reached, else null. */
  surplus?: number | null;
  scope: 'all' | 'mine';
}

export interface TodoCounts {
  awaiting_reply: number;
  overdue_follow_ups: number;
  stalled_items: number;
  sales_missing_amount: number;
}

export interface NoSalesHint {
  stalled_items: number;
  awaiting_reply: number;
}

export interface DailyPanelData {
  generated_at: string;
  timezone: string;
  user: { first_name: string; is_admin: boolean };
  quote: DailyQuote | null;
  sales: {
    today: SalesBucket;
    yesterday: SalesBucket;
    same_weekday_last_week: SalesBucket;
  };
  month: MonthProgress;
  todo: TodoCounts;
  no_sales_hint: NoSalesHint | null;
}

export interface QuotePreferences {
  daily_quote_category: QuoteCategory | null;
  default_quote_category: QuoteCategory;
  categories: QuoteCategory[];
}

export interface GoalProgress {
  goal_id: string | null;
  goal: number | null;
  sold: number;
  count: number;
  percent: number | null;
  remaining: number | null;
  daily_pace: number | null;
  goal_reached: boolean;
  surplus?: number | null;
  days_left: number;
}

export interface SellerGoalProgress extends GoalProgress {
  user: NamedRef;
}

export interface SalesGoalsOverview {
  month: string;
  general: GoalProgress;
  sellers: SellerGoalProgress[];
}

export interface SalesGoalPayload {
  month: string;
  user_id: string | null;
  amount: number;
}

export type DailySummaryRunStatus = 'sent' | 'failed' | 'partial';

export interface DailySummaryInbox {
  id: string;
  name: string;
  phone_number: string | null;
}

export interface DailySummarySettings {
  enabled: boolean;
  time: string;
  inbox_id: string | null;
  phones: string[];
  last_run: {
    date: string;
    status: DailySummaryRunStatus;
    error: string | null;
    sent_at: string | null;
  } | null;
  available_inboxes: DailySummaryInbox[];
  timezone: string;
}

export interface DailySummarySettingsPayload {
  enabled: boolean;
  time: string;
  inbox_id: string | null;
  phones: string[];
}

/** Shape of `error.details` items on 422 responses. */
export interface ApiFieldError {
  field: string;
  messages: string[];
  full_messages?: string[];
}

export interface DailySummaryTestResult {
  sent: number;
  failed: { phone: string; error: string }[];
}
