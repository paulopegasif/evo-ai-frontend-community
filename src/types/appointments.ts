export interface AppointmentCategory {
  name: string;
  color: string;
  duration: number; // minutes
  price: number;
  description?: string;
}

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'attended'
  | 'no_show'
  | 'cancelled'
  | 'rescheduled';

export interface Appointment {
  id: string;
  title: string;
  description?: string;
  category: string;
  start_time: string;
  end_time: string;
  start_timestamp: number;
  end_timestamp: number;
  duration_minutes: number;
  status: AppointmentStatus;
  user_id: string;
  user?: {
    id: string;
    name: string;
    display_name?: string;
    email: string;
    avatar_url?: string;
  };
  contact_id?: string;
  contact?: {
    id: string;
    name: string;
    email?: string;
    phone_number?: string;
  };
  conversation_id?: string;
  pipeline_item_id?: string;
  google_calendar_event_id?: string;
  google_calendar_sync_status?: 'pending' | 'synced' | 'error' | 'not_synced';
  google_calendar_url?: string;
  google_meet_link?: string;
  location?: string;
  price: number;
  custom_attributes?: Record<string, unknown>;
  created_at: number;
  updated_at: number;
}

export interface AppointmentCreateParams {
  title: string;
  description?: string;
  category: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  status?: AppointmentStatus;
  user_id?: string;
  contact_id?: string;
  conversation_id?: string;
  pipeline_item_id?: string;
  location?: string;
  price?: number;
  google_meet_link?: string;
  custom_attributes?: Record<string, unknown>;
}

export interface AppointmentsFilterParams {
  user_id?: string;
  contact_id?: string;
  category?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  since?: string;
  until?: string;
  page?: number;
  pageSize?: number;
}
