export type MetaAdsConnectionStatus = 'not_configured' | 'connected' | 'error' | 'token_invalid';

export interface MetaAdsIntegration {
  configured: boolean;
  ad_account_id: string | null;
  /** Masked token (e.g. "EAAB…xyz9"); the full token never leaves the backend. */
  token_hint: string | null;
  account_name: string | null;
  currency: string | null;
  timezone_name: string | null;
  connection_status: MetaAdsConnectionStatus;
  last_synced_at: string | null;
  last_sync_started_at: string | null;
  last_error: { message: string; code?: number | null; at: string } | null;
  sync_in_progress: boolean;
  counts: { campaigns: number; adsets: number; ads: number };
  /** Oldest day whose daily metrics are fully imported (ISO date), or null. */
  history_synced_from: string | null;
  /** Whether the 24-month history is filled. */
  history_complete: boolean;
  graph_api_version: string;
}

export interface MetaAdsConnectPayload {
  ad_account_id: string;
  /** Blank keeps the stored token. */
  access_token?: string;
}
