export interface LeadTrackingKPIs {
  total_leads: number;
  total_qualified: number;
  total_scheduled: number;
  total_attended: number;
  total_no_show: number;
  total_confirmed: number;
  total_cancelled: number;
  total_won: number;
  qualification_rate: number;
  scheduling_rate: number;
  show_rate: number;
  conversion_rate: number;
  total_revenue: number;
  average_ticket: number;
}

export interface FunnelStage {
  stage: string;
  count: number;
  percentage: number;
  color: string;
}

export interface LeadSourcePerformance {
  name: string;
  leads: number;
  scheduled: number;
  attended: number;
  won: number;
  revenue: number;
  conversion_rate: number;
}

export interface CampaignPerformance {
  name: string;
  source: string;
  leads: number;
  scheduled: number;
  won: number;
  revenue: number;
  conversion_rate: number;
}

export interface ProfessionalPerformance {
  user_id: string;
  name: string;
  total: number;
  attended: number;
  no_show: number;
  show_rate: number;
  revenue: number;
}

export interface CategoryPerformance {
  name: string;
  count: number;
  revenue: number;
  color: string;
  share_percentage: number;
}

export interface TimelineDataPoint {
  date: string;
  label: string;
  leads: number;
  scheduled: number;
  attended: number;
  revenue: number;
}

export interface LeadTrackingDashboardResponse {
  period: {
    since: number;
    until: number;
    days: number;
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
}
