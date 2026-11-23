import api from '@/services/core/api';
import { extractData } from '@/utils/apiHelpers';
import type {
  MetaConversionsEvent,
  MetaConversionsIntegration,
  MetaConversionsPayload,
  MetaConversionsTestEventResult,
} from '@/types/integrations';

class MetaConversionsService {
  private readonly baseURL = '/integrations/meta_conversions';

  async get(): Promise<MetaConversionsIntegration> {
    const response = await api.get(this.baseURL);
    return extractData<MetaConversionsIntegration>(response);
  }

  async save(payload: MetaConversionsPayload): Promise<MetaConversionsIntegration> {
    const response = await api.put(this.baseURL, payload);
    return extractData<MetaConversionsIntegration>(response);
  }

  async test(): Promise<MetaConversionsIntegration> {
    const response = await api.post(`${this.baseURL}/test`);
    return extractData<MetaConversionsIntegration>(response);
  }

  async sendTestEvent(event: MetaConversionsEvent): Promise<MetaConversionsTestEventResult> {
    const response = await api.post(`${this.baseURL}/test_event`, { event });
    return extractData<MetaConversionsTestEventResult>(response);
  }

  async disconnect(): Promise<MetaConversionsIntegration> {
    const response = await api.delete(this.baseURL);
    return extractData<MetaConversionsIntegration>(response);
  }
}

export const metaConversionsService = new MetaConversionsService();
export default metaConversionsService;
