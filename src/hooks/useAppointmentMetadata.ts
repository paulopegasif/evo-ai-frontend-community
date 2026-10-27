import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { usersService } from '@/services/users';
import { contactsService } from '@/services/contacts/contactsService';
import { appointmentsService } from '@/services/appointments/appointmentsService';
import type { AppointmentCategory } from '@/types/appointments';

export interface AppointmentProfessional {
  id: string;
  name: string;
  email?: string;
}

export interface AppointmentPatient {
  id: string;
  name: string;
  phone_number?: string;
}

// Upper bound for the patient picker; the select filters client-side.
const PATIENTS_PAGE_SIZE = 100;

// Shared metadata for the Agenda, Lead Tracking and Google Calendar screens.
// The users/contacts services return `{ data: [] }` (see extractResponse), not a bare array.
export function useAppointmentMetadata(options: { contacts?: boolean } = {}) {
  const { contacts: loadContacts = true } = options;
  const [professionals, setProfessionals] = useState<AppointmentProfessional[]>([]);
  const [patients, setPatients] = useState<AppointmentPatient[]>([]);
  const [categories, setCategories] = useState<AppointmentCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [usersRes, contactsRes, categoriesRes] = await Promise.allSettled([
      usersService.getUsers({ per_page: 100, sort: 'name', order: 'asc' }),
      loadContacts
        ? contactsService.getContacts({ per_page: PATIENTS_PAGE_SIZE, sort: 'name', order: 'asc' })
        : Promise.resolve(null),
      appointmentsService.getCategories(),
    ]);

    if (usersRes.status === 'fulfilled') {
      const list = Array.isArray(usersRes.value?.data) ? usersRes.value.data : [];
      setProfessionals(
        list.map(u => ({
          id: u.id,
          name: u.name || u.available_name || u.email,
          email: u.email,
        })),
      );
    } else {
      toast.error('Não foi possível carregar os profissionais.');
    }

    if (contactsRes.status === 'fulfilled' && contactsRes.value) {
      const list = Array.isArray(contactsRes.value.data) ? contactsRes.value.data : [];
      setPatients(
        list.map(c => ({
          id: c.id,
          name: c.name || c.email || c.phone_number || 'Contato',
          phone_number: c.phone_number || undefined,
        })),
      );
    } else if (contactsRes.status === 'rejected') {
      toast.error('Não foi possível carregar os pacientes.');
    }

    if (categoriesRes.status === 'fulfilled' && Array.isArray(categoriesRes.value)) {
      setCategories(categoriesRes.value);
    }

    setLoading(false);
  }, [loadContacts]);

  useEffect(() => {
    load();
  }, [load]);

  return { professionals, patients, categories, loading, reload: load };
}
