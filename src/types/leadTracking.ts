/**
 * Lead tracking dashboard. Rates are `null` (rendered as "—") when their denominator is zero.
 *
 * Two populations that are never mixed:
 * - lead cohort: contacts created in the period, followed through all of their appointments;
 * - period agenda: appointments whose date falls in the period.
 */
export interface LeadTrackingKPIs {
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

export interface CampaignPerformance {
  /** `meta:<id>`, `ad:<ad id>`, `utm:<utm_campaign>` or `none`. */
  campaign_key: string;
  meta_campaign_id: string | null;
  name: string;
  source: string;
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

export interface TimelineDataPoint {
  date: string;
  label: string;
  leads: number;
  scheduled: number;
  attended: number;
  revenue: number;
  spend: number;
}

export interface LeadTrackingDashboardResponse {
  period: {
    since: number;
    until: number;
    days: number;
    timezone: string;
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
}
