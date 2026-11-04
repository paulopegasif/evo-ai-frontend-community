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
  /** cohort revenue / won leads */
  won_ticket: number | null;

  // Period agenda (appointments)
  total_appointments: number;
  total_confirmed: number;
  /** scheduled + confirmed + rescheduled still ahead */
  total_pending: number;
  /** Past appointments still scheduled/confirmed (no outcome recorded). */
  total_no_outcome: number;
  /** Sales waiting in the review queue (counted in total_revenue, never in the cohort). */
  unlinked_sales: number;
  unlinked_revenue: number;
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
  ad_scheduled: number;
  ad_attended: number;
  ad_won: number;
  cost_per_scheduled: number | null;
  cost_per_attended: number | null;
  ad_revenue: number;
  avg_cpl: number | null;
  ad_cac: number | null;
  roas: number | null;
  /** (ad_leads / conversations) * 100 in % */
  lead_capture_rate: number | null;
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
  /** (leads / conversations) * 100 in % */
  lead_capture_rate?: number | null;
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
  /** (leads / conversations) * 100 in % */
  lead_capture_rate?: number | null;
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
  no_outcome: number;
  show_rate: number | null;
  /** attended with a paid procedure */
  won: number;
  /** won / attended */
  sale_rate: number | null;
  revenue: number;
}

export interface CategoryPerformance {
  name: string;
  color: string;
  count: number;
  attended: number;
  revenue: number;
  ticket: number | null;
  share_percentage: number | null;
  revenue_share: number | null;
}

export interface AdPerformance {
  ad_id: string;
  name: string;
  campaign_name: string | null;
  /** Ad no longer returned by Meta (deleted or another account). */
  unavailable: boolean;
  leads: number;
  scheduled: number;
  attended: number;
  won: number;
  revenue: number;
  spend: number;
  conversations: number;
  cpl: number | null;
  cac: number | null;
  roas: number | null;
}

export interface FunnelVelocity {
  lead_to_evaluation_days: number | null;
  evaluation_to_close_days: number | null;
  lead_to_evaluation_count: number;
  evaluation_to_close_count: number;
}

export interface AlertLead {
  id: string;
  name: string;
  phone_number: string | null;
  created_at: string;
  campaign_name: string | null;
}

export interface AlertAppointment {
  id: string;
  start_time: string;
  all_day: boolean;
  status: string;
  contact_id: string | null;
  contact_name: string | null;
  user_name: string | null;
}

export interface TrackingAlerts {
  stale_days: number;
  stale_leads: { count: number; sample: AlertLead[] };
  no_outcome: { count: number; sample: AlertAppointment[] };
  unlinked_sales: { count: number };
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
  ads: AdPerformance[];
  velocity: FunnelVelocity;
  alerts: TrackingAlerts;
  timeline: TimelineDataPoint[];
}

export type CostBasis = 'ad_day' | 'campaign_day' | 'campaign_period' | null;

export interface LeadOrigin {
  source: string;
  channel: string | null;
  ad_id: string | null;
  ad_name: string | null;
  ad_headline: string | null;
  ad_source_url: string | null;
  ctwa_clid: string | null;
  adset_id: string | null;
  adset_name: string | null;
  campaign_id: string | null;
  campaign_name: string | null;
  ad_unavailable: boolean;
  attributed_at: string | null;
  entered_at: string | null;
  estimated_cost: number | null;
  cost_basis: CostBasis;
}

export interface LeadRow {
  id: string;
  name: string;
  phone_number: string | null;
  entered_at: string;
  source: string;
  campaign_name: string | null;
  adset_name: string | null;
  ad_id: string | null;
  ad_name: string | null;
  estimated_cost: number | null;
  cost_basis: CostBasis;
  stage_name: string | null;
  evaluation_at: string | null;
  evaluation_all_day: boolean | null;
  evaluation_status: string | null;
  scheduled: boolean;
  attended: boolean;
  won: boolean;
  revenue: number;
}

export interface LeadListResponse {
  leads: LeadRow[];
  meta: {
    page: number;
    per_page: number;
    total_count: number;
    total_pages: number;
    /** Leads per funnel step after the search term, before the step filter. */
    step_counts?: Record<LeadStep | 'all', number>;
  };
}

/** Furthest funnel step a lead reached. */
export type LeadStep = 'not_scheduled' | 'scheduled' | 'attended' | 'won';

export type LeadListSort = 'entered_at' | 'estimated_cost' | 'revenue';

export interface JourneyMessage {
  id: string;
  message_type: 'incoming' | 'outgoing' | 'activity' | 'template';
  private: boolean;
  content: string | null;
  created_at: string;
  author_name: string | null;
}

export interface JourneyConversation {
  id: string;
  inbox_name: string | null;
  mirrored: boolean;
  started_at: string;
  messages: JourneyMessage[];
}

export type JourneyEvent =
  | { type: 'lead_created'; at: string }
  | { type: 'stage_changed'; at: string; from: string | null; to: string | null; movement_type: string }
  | {
      type: 'appointment' | 'sale';
      at: string;
      id: string;
      all_day: boolean;
      status: string;
      category: string;
      price: number;
      user_name: string | null;
      source: string | null;
    };

export interface LeadJourney {
  contact: {
    id: string;
    name: string;
    phone_number: string | null;
    email: string | null;
    created_at: string;
    customer_type: string | null;
  };
  origin: LeadOrigin;
  summary: {
    estimated_cost: number | null;
    revenue: number;
    roi: number | null;
    sale_match: { source: string; external_contact_id: string; match: 'manual' | 'automatic' } | null;
  };
  conversations: JourneyConversation[];
  events: JourneyEvent[];
}

export interface UnlinkedSale {
  id: string;
  source: string;
  external_id: string;
  customer_name: string;
  customer_phone: string | null;
  reason: 'no_match' | 'ambiguous_name';
  status: 'pending' | 'linked' | 'created' | 'dismissed';
  amount: number;
  category: string | null;
  sold_at: string | null;
  resolved_contact_id: string | null;
  candidates: { id: string; name: string; phone_number: string | null; created_at: string }[];
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
  /** Days without an appointment before a lead counts as stale (default 3). */
  stale_days?: number;
}
