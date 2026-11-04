import api from '@/services/core/api';
import { extractData } from '@/utils/apiHelpers';
import type { MetaAdsConnectPayload, MetaAdsIntegration } from '@/types/integrations';

class MetaAdsService {
  private readonly baseURL = '/integrations/meta_ads';

  async get(): Promise<MetaAdsIntegration> {
    const response = await api.get(this.baseURL);
    return extractData<MetaAdsIntegration>(response);
  }

  async save(payload: MetaAdsConnectPayload): Promise<MetaAdsIntegration> {
    const response = await api.put(this.baseURL, payload);
    return extractData<MetaAdsIntegration>(response);
  }

  async test(): Promise<MetaAdsIntegration> {
    const response = await api.post(`${this.baseURL}/test`);
    return extractData<MetaAdsIntegration>(response);
  }

  async sync(): Promise<MetaAdsIntegration> {
    const response = await api.post(`${this.baseURL}/sync`);
    return extractData<MetaAdsIntegration>(response);
  }

  async disconnect(): Promise<MetaAdsIntegration> {
    const response = await api.delete(this.baseURL);
    return extractData<MetaAdsIntegration>(response);
  }
}

export const metaAdsService = new MetaAdsService();
export default metaAdsService;
