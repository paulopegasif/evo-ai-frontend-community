import api from '@/services/core/api';
import { extractData } from '@/utils/apiHelpers';
import type {
  LeadJourney,
  LeadListResponse,
  LeadListSort,
  LeadStep,
  LeadTrackingDashboardResponse,
  LeadTrackingParams,
  UnlinkedSale,
} from '@/types/leadTracking';

export interface LeadListParams extends LeadTrackingParams {
  page?: number;
  per_page?: number;
  sort?: LeadListSort;
  order?: 'asc' | 'desc';
  /** Name, phone or campaign. */
  q?: string;
  step?: LeadStep;
}

class LeadTrackingService {
  async getLeadTrackingData(params: LeadTrackingParams = {}): Promise<LeadTrackingDashboardResponse> {
    const response = await api.get('/dashboard/leads', { params });
    return extractData<LeadTrackingDashboardResponse>(response);
  }

  async getLeadList(params: LeadListParams): Promise<LeadListResponse> {
    const response = await api.get('/dashboard/leads/list', { params });
    return extractData<LeadListResponse>(response);
  }

  async downloadLeadListCsv(params: LeadListParams): Promise<Blob> {
    const response = await api.get('/dashboard/leads/list', {
      params: { ...params, format: 'csv' },
      responseType: 'blob',
    });
    return response.data as Blob;
  }

  async getLeadJourney(contactId: string): Promise<LeadJourney> {
    const response = await api.get(`/dashboard/leads/${contactId}/journey`);
    return extractData<LeadJourney>(response);
  }

  async getUnlinkedSales(status = 'pending'): Promise<UnlinkedSale[]> {
    const response = await api.get('/unlinked_sales', { params: { status, per_page: 100 } });
    return extractData<{ sales: UnlinkedSale[] }>(response).sales;
  }

  async linkUnlinkedSale(id: string, contactId: string): Promise<UnlinkedSale> {
    const response = await api.post(`/unlinked_sales/${id}/link`, { contact_id: contactId });
    return extractData<UnlinkedSale>(response);
  }

  async createLeadFromSale(id: string): Promise<UnlinkedSale> {
    const response = await api.post(`/unlinked_sales/${id}/create_lead`);
    return extractData<UnlinkedSale>(response);
  }

  async dismissUnlinkedSale(id: string): Promise<UnlinkedSale> {
    const response = await api.post(`/unlinked_sales/${id}/dismiss`);
    return extractData<UnlinkedSale>(response);
  }
}

export const leadTrackingService = new LeadTrackingService();
export default leadTrackingService;
