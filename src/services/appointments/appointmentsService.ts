import api from '@/services/core/api';
import { extractData } from '@/utils/apiHelpers';
import type {
  Appointment,
  AppointmentCategory,
  AppointmentCreateParams,
  AppointmentsFilterParams,
} from '@/types/appointments';

export interface AppointmentsResponse {
  payload: Appointment[];
  categories: AppointmentCategory[];
  meta: {
    total_count: number;
    current_page?: number;
    total_pages?: number;
  };
}

export interface GoogleCalendarAuthInfo {
  configured: boolean;
  client_id?: string;
  auth_url?: string;
  one_click_sync_enabled: boolean;
}

class AppointmentsService {
  async getAppointments(params: AppointmentsFilterParams = {}): Promise<AppointmentsResponse> {
    const response = await api.get('/appointments', { params });
    // The endpoint returns { payload, categories, meta } directly
    return response.data;
  }

  async getAppointment(id: string): Promise<Appointment> {
    const response = await api.get(`/appointments/${id}`);
    return extractData<Appointment>(response);
  }

  async createAppointment(data: AppointmentCreateParams): Promise<Appointment> {
    const response = await api.post('/appointments', { appointment: data });
    return extractData<Appointment>(response);
  }

  async updateAppointment(id: string, data: Partial<AppointmentCreateParams>): Promise<Appointment> {
    const response = await api.patch(`/appointments/${id}`, { appointment: data });
    return extractData<Appointment>(response);
  }

  async deleteAppointment(id: string): Promise<void> {
    await api.delete(`/appointments/${id}`);
  }

  async getCategories(): Promise<AppointmentCategory[]> {
    const response = await api.get('/appointments/categories');
    return extractData<AppointmentCategory[]>(response);
  }

  async getGoogleCalendarAuthUrl(): Promise<GoogleCalendarAuthInfo> {
    const response = await api.get('/appointments/google_calendar_auth_url');
    return extractData<GoogleCalendarAuthInfo>(response);
  }

  async syncGoogleCalendar(id: string): Promise<{ appointment: Appointment; google_calendar_url: string }> {
    const response = await api.post(`/appointments/${id}/sync_google_calendar`);
    return extractData<{ appointment: Appointment; google_calendar_url: string }>(response);
  }
}

export const appointmentsService = new AppointmentsService();
export default appointmentsService;
