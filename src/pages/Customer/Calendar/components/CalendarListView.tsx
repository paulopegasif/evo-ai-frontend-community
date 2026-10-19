import React, { useState } from 'react';
import type { Appointment, AppointmentStatus } from '@/types/appointments';
import {
  User,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Edit2,
  Search,
} from 'lucide-react';
import { appointmentsService } from '@/services/appointments/appointmentsService';
import { toast } from 'sonner';

interface CalendarListViewProps {
  appointments: Appointment[];
  onSelectAppointment: (apt: Appointment) => void;
  onRefresh: () => void;
}

export const CalendarListView: React.FC<CalendarListViewProps> = ({
  appointments,
  onSelectAppointment,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAppointments = appointments.filter((apt) => {
    const q = searchTerm.toLowerCase();
    return (
      apt.title.toLowerCase().includes(q) ||
      apt.category.toLowerCase().includes(q) ||
      (apt.contact?.name && apt.contact.name.toLowerCase().includes(q)) ||
      (apt.user?.name && apt.user.name.toLowerCase().includes(q))
    );
  });

  const handleStatusChange = async (apt: Appointment, newStatus: AppointmentStatus) => {
    try {
      await appointmentsService.updateAppointment(apt.id, { status: newStatus });
      toast.success(`Status atualizado para: ${newStatus}`);
      onRefresh();
    } catch {
      toast.error('Erro ao atualizar status.');
    }
  };

  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case 'attended':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
            <CheckCircle2 className="w-3 h-3" /> Compareceu
          </span>
        );
      case 'no_show':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300">
            <XCircle className="w-3 h-3" /> Faltou (No-show)
          </span>
        );
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300">
            Confirmado
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
            Cancelado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300">
            Agendado
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar agendamento por paciente, procedimento ou profissional..."
          className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 shadow-2xs"
        />
      </div>

      {/* List */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs divide-y divide-zinc-200 dark:divide-zinc-800">
        {filteredAppointments.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 text-sm">
            Nenhum agendamento encontrado para os filtros selecionados.
          </div>
        ) : (
          filteredAppointments.map((apt) => {
            const startDate = new Date(apt.start_time);
            const dateStr = startDate.toLocaleDateString('pt-BR', {
              weekday: 'short',
              day: '2-digit',
              month: 'short',
            });
            const timeStr = startDate.toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={apt.id}
                className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors"
              >
                {/* Left: Date badge & Title */}
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="text-center px-3 py-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200/50 dark:border-purple-900/40 shrink-0">
                    <span className="block text-xs uppercase font-semibold text-purple-700 dark:text-purple-300">
                      {dateStr}
                    </span>
                    <span className="block text-base font-bold text-zinc-900 dark:text-zinc-100">
                      {timeStr}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4
                        onClick={() => onSelectAppointment(apt)}
                        className="text-sm font-bold text-zinc-900 dark:text-zinc-100 hover:text-purple-600 cursor-pointer transition-colors"
                      >
                        {apt.title}
                      </h4>
                      {getStatusBadge(apt.status)}
                    </div>

                    <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 flex-wrap">
                      <span className="flex items-center gap-1 font-medium text-purple-700 dark:text-purple-300">
                        <span className="w-2 h-2 rounded-full bg-purple-600 inline-block" />
                        {apt.category}
                      </span>

                      {apt.contact && (
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {apt.contact.name}
                          {apt.contact.phone_number && (
                            <span className="opacity-75 text-[11px]">
                              ({apt.contact.phone_number})
                            </span>
                          )}
                        </span>
                      )}

                      {apt.user && (
                        <span className="flex items-center gap-1">
                          <span className="text-[11px] opacity-75">Profissional:</span>{' '}
                          {apt.user.name}
                        </span>
                      )}

                      {apt.price > 0 && (
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                          R$ {apt.price.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Quick actions & Google sync */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {apt.status === 'scheduled' || apt.status === 'confirmed' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(apt, 'attended')}
                        className="px-2.5 py-1 text-xs font-medium rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 transition-all flex items-center gap-1"
                        title="Marcar como Compareceu"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Compareceu
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(apt, 'no_show')}
                        className="px-2.5 py-1 text-xs font-medium rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 dark:bg-rose-950 dark:text-rose-300 transition-all flex items-center gap-1"
                        title="Marcar como Faltou (No-show)"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Faltou
                      </button>
                    </>
                  ) : null}

                  {apt.google_calendar_url && (
                    <a
                      href={apt.google_calendar_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-all"
                      title="Abrir no Google Calendar"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => onSelectAppointment(apt)}
                    className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-all"
                    title="Editar Agendamento"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
