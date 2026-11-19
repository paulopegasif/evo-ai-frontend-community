export type MetaConversionsConnectionStatus = 'not_configured' | 'connected' | 'error';
export type MetaConversionsEvent = 'lead' | 'qualified' | 'purchase';
export type MetaConversionsTokenSource = 'own' | 'meta_ads';

export interface MetaConversionsStats {
  window_days: number;
  sent: number;
  failed: number;
  /** Keyed by the Meta event name (e.g. "LeadSubmitted"). */
  by_event: Record<string, { sent: number; failed: number }>;
  last_sent_at: string | null;
  last_failure: { event: string | null; error: string | null; at: string | null } | null;
}

export interface MetaConversionsIntegration {
  configured: boolean;
  /** Turned on: events are sent as leads, appointments and sales happen. */
  enabled: boolean;
  waba_id: string | null;
  waba_name: string | null;
  page_id: string | null;
  dataset_id: string | null;
  token_source: MetaConversionsTokenSource;
  /** Masked token (e.g. "EAAB…xyz9"); the full token never leaves the backend. */
  token_hint: string | null;
  /** Whether the Meta Ads integration has a token that can be reused. */
  meta_ads_token_available: boolean;
  test_event_code: string | null;
  event_names: Record<MetaConversionsEvent, string>;
  default_event_names: Record<MetaConversionsEvent, string>;
  connection_status: MetaConversionsConnectionStatus;
  last_error: { message: string; code?: number | null; at: string } | null;
  connected_at: string | null;
  stats: MetaConversionsStats | null;
}

export interface MetaConversionsPayload {
  waba_id: string;
  page_id?: string;
  /** Blank keeps the stored token. */
  access_token?: string;
  token_source: MetaConversionsTokenSource;
  test_event_code?: string;
  enabled: boolean;
  event_names: Partial<Record<MetaConversionsEvent, string>>;
}

export interface MetaConversionsTestEventResult {
  success: boolean;
  event_name: string;
  events_received: number | null;
  message: string | null;
  fbtrace_id: string | null;
}
