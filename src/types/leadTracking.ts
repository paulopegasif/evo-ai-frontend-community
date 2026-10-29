/**
 * Lead tracking dashboard. Rates are `null` (rendered as "—") when their denominator is zero.
 *
 * Two populations that are never mixed:
 * - lead cohort: contacts created in the period, followed through all of their appointments;
 * - period agenda: appointments whose date falls in the period.
 */
export interface LeadTrackingKPIs extends MediaMetrics {
  // Lead cohort (people)
  total_leads: number;
  total_qualified: number;
  total_scheduled: number;
  total_attended: number;
  total_won: number;
  qualification_rate: number | null;
  scheduling_rate: number | null;
  conversion_rate: number | null;
  /** Revenue from the attended appointments of the cohort. */
  cohort_revenue: number;

  // Period agenda (appointments)
  total_appointments: number;
  total_confirmed: number;
  /** scheduled + confirmed + rescheduled */
  total_pending: number;
  appointments_attended: number;
  total_no_show: number;
  total_cancelled: number;
  /** attended / (attended + no-show) */
  show_rate: number | null;
  total_revenue: number;
  paid_appointments: number;
  average_ticket: number | null;

  // Meta Ads
  ad_spend: number;
  ad_leads: number;
  ad_won: number;
  ad_revenue: number;
  avg_cpl: number | null;
  ad_cac: number | null;
  roas: number | null;
  /** Whether spend KPIs should be shown (integration connected or spend in the period). */
  has_ad_spend: boolean;
}

/** Delivery and results measured by Meta; ratios are null when the denominator is zero. */
export interface MediaMetrics {
  impressions: number;
  link_clicks: number;
  /** link clicks / impressions, in % */
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  /** Messaging conversations started (Meta's 7-day attribution). */
  conversations: number;
  cost_per_conversation: number | null;
  /** Lead form results reported by Meta. */
  meta_leads: number;
  cost_per_meta_lead: number | null;
}

/** Media metrics of a campaign row; null for campaigns that are not Meta campaigns. */
export type NullableMediaMetrics = { [K in keyof MediaMetrics]: MediaMetrics[K] | null };

export interface FunnelStage {
  key: 'leads' | 'qualified' | 'scheduled' | 'attended' | 'won';
  stage: string;
  count: number;
  /** Share of the period's leads. */
  percentage: number | null;
  /** Share of the previous stage; null for the first stage. */
  step_rate: number | null;
}

export interface LeadSourcePerformance {
  name: string;
  leads: number;
  scheduled: number;
  attended: number;
  won: number;
  revenue: number;
  conversion_rate: number | null;
  share_percentage: number | null;
}

export interface CampaignPerformance extends NullableMediaMetrics {
  /** `meta:<id>`, `ad:<ad id>`, `utm:<utm_campaign>` or `none`. */
  campaign_key: string;
  meta_campaign_id: string | null;
  name: string;
  source: string;
  /** Meta effective_status (ACTIVE, PAUSED, ARCHIVED...); null outside Meta. */
  status: string | null;
  leads: number;
  scheduled: number;
  attended: number;
  won: number;
  revenue: number;
  conversion_rate: number | null;
  /** Ratios are null when the denominator is zero or spend is unknown. */
  spend: number | null;
  cpl: number | null;
  cac: number | null;
  roas: number | null;
}

export interface ProfessionalPerformance {
  user_id: string;
  name: string;
  total: number;
  attended: number;
  no_show: number;
  cancelled: number;
  pending: number;
  show_rate: number | null;
  revenue: number;
}

export interface CategoryPerformance {
  name: string;
  color: string;
  count: number;
  attended: number;
  revenue: number;
  share_percentage: number | null;
  revenue_share: number | null;
}

export type TimelineGranularity = 'day' | 'week' | 'month';

/** One bucket (day, week or month) of the period. */
export interface TimelineDataPoint {
  /** First day of the bucket inside the period (same as start_date). */
  date: string;
  start_date: string;
  end_date: string;
  label: string;
  leads: number;
  scheduled: number;
  attended: number;
  revenue: number;
  spend: number;
  impressions: number;
  link_clicks: number;
  conversations: number;
  meta_leads: number;
}

export interface CampaignOption {
  key: string;
  name: string;
  source: string;
}

export interface LeadTrackingDashboardResponse {
  period: {
    since: number;
    until: number;
    days: number;
    timezone: string;
    granularity: TimelineGranularity;
    /** Oldest day with complete Meta Ads history, or null. */
    ads_history_from: string | null;
  };
  filter_options: {
    sources: string[];
    campaigns: CampaignOption[];
  };
  kpis: LeadTrackingKPIs;
  funnel: FunnelStage[];
  sources: LeadSourcePerformance[];
  campaigns: CampaignPerformance[];
  professionals: ProfessionalPerformance[];
  categories: CategoryPerformance[];
  timeline: TimelineDataPoint[];
}

export interface LeadTrackingParams {
  user_id?: string;
  pipeline_id?: string;
  since?: number;
  until?: number;
  timezone?: string;
  /** First-touch source label (e.g. "Meta Ads"). */
  source?: string;
  /** `meta:<id>`, `ad:<ad id>`, `utm:<utm_campaign>` or `none`. */
  campaign_key?: string;
  granularity?: TimelineGranularity;
}
