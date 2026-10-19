import api from '@/services/core/api';
import { extractData } from '@/utils/apiHelpers';
import type { LeadTrackingDashboardResponse, LeadTrackingParams } from '@/types/leadTracking';

class LeadTrackingService {
  async getLeadTrackingData(params: LeadTrackingParams = {}): Promise<LeadTrackingDashboardResponse> {
    const response = await api.get('/dashboard/leads', { params });
    return extractData<LeadTrackingDashboardResponse>(response);
  }
}

export const leadTrackingService = new LeadTrackingService();
export default leadTrackingService;
