import React, { useEffect, useState } from 'react';
import { CalendarClock, Edit2, Info, Megaphone, MessageSquare, Phone, Stethoscope, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, Skeleton } from '@evoapi/design-system';
import { toast } from 'sonner';
import { appointmentsService } from '@/services/appointments/appointmentsService';
import type { Appointment, AppointmentStatus } from '@/types/appointments';
import { formatCurrency } from '@/pages/Customer/Dashboard/components/dashboardUtils';
import { appointmentTimeLabel, formatZoned } from '@/utils/accountTime';
import { STATUS_STYLES, isWithoutOutcome, statusStyle } from './statusStyles';

interface Props {
  appointment: Appointment | null;
  onClose: () => void;
  onEdit: (apt: Appointment) => void;
  onChanged: () => void;
}

const QUICK_STATUSES: AppointmentStatus[] = ['confirmed', 'attended', 'no_show', 'cancelled'];

const Row = ({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) => (
  <div className="flex items-start gap-2 text-sm">
    <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
    <div className="min-w-0">{children}</div>
  </div>
);

const SOURCE_LABELS: Record<string, string> = { bitrix24: 'Bitrix24' };

/** Quick view of an appointment: who, when, where the lead came from, and one-click status. */
const AppointmentSidePanel: React.FC<Props> = ({ appointment, onClose, onEdit, onChanged }) => {
  const navigate = useNavigate();
  const [detail, setDetail] = useState<Appointment | null>(null);
  const [saving, setSaving] = useState<AppointmentStatus | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (!appointment) return;
    let cancelled = false;
    setDetail(appointment);
    setLoadingDetail(true);
    appointmentsService
      .getAppointment(appointment.id)
      .then((data) => !cancelled && setDetail(data))
      .catch(() => undefined) // keep the list data; origin just stays hidden
      .finally(() => !cancelled && setLoadingDetail(false));
    return () => {
      cancelled = true;
    };
  }, [appointment]);

  const apt = detail ?? appointment;
  const origin = detail?.lead_origin;
  const external = apt?.source ? (SOURCE_LABELS[apt.source] ?? apt.source) : null;

  const changeStatus = async (status: AppointmentStatus) => {
    if (!apt || status === apt.status) return;
    setSaving(status);
    try {
      const updated = await appointmentsService.updateAppointment(apt.id, { status });
      setDetail((current) => ({ ...(current ?? apt), ...updated }));
      toast.success(`Marcado como ${STATUS_STYLES[status].label.toLowerCase()}.`);
      onChanged();
    } catch {
      toast.error('Não foi possível alterar o status.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <Sheet open={Boolean(appointment)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        {apt && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${statusStyle(apt.status).dot}`} />
                {apt.contact?.name ?? apt.title}
              </SheetTitle>
              <SheetDescription>
                {statusStyle(apt.status).label}
                {isWithoutOutcome(apt) && ' · sem desfecho registrado'}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-5 mt-4 px-1">
              <div className="space-y-2.5">
                <Row icon={CalendarClock}>
                  {formatZoned(apt.start_time, { weekday: 'long', day: '2-digit', month: 'long' })} ·{' '}
                  {apt.all_day ? <span className="text-amber-600">horário a definir</span> : appointmentTimeLabel(apt)}
                  {!apt.all_day && <span className="text-muted-foreground"> ({apt.duration_minutes} min)</span>}
                </Row>
                <Row icon={Stethoscope}>
                  {apt.category}
                  {apt.price > 0 && <span className="text-muted-foreground"> · {formatCurrency(apt.price)}</span>}
                </Row>
                <Row icon={User}>{apt.user?.name ?? 'Sem profissional'}</Row>
                {apt.contact?.phone_number && <Row icon={Phone}>{apt.contact.phone_number}</Row>}
                {detail?.pipeline_stage && (
                  <Row icon={Info}>
                    Etapa do funil: <span className="font-medium">{detail.pipeline_stage.name}</span>
                  </Row>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Status</p>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_STATUSES.map((status) => (
                    <Button
                      key={status}
                      size="sm"
                      variant={apt.status === status ? 'default' : 'outline'}
                      disabled={saving !== null}
                      onClick={() => changeStatus(status)}
                      className="justify-start gap-2"
                    >
                      <span className={`h-2 w-2 rounded-full ${STATUS_STYLES[status].dot}`} />
                      {saving === status ? 'Salvando…' : STATUS_STYLES[status].label}
                    </Button>
                  ))}
                </div>
                {external && (
                  <p className="text-xs text-muted-foreground flex gap-1.5">
                    <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    Veio do {external}. O status que você marcar aqui é mantido mesmo que o {external} envie um status
                    anterior; mudanças de data no {external} continuam sendo aplicadas.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Megaphone className="h-3.5 w-3.5" /> Origem do lead
                </p>
                {loadingDetail ? (
                  <Skeleton className="h-16 w-full" />
                ) : origin ? (
                  <div className="rounded-lg border border-border p-3 space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{origin.source}</Badge>
                      {origin.estimated_cost != null && (
                        <span className="text-xs text-muted-foreground">custo estimado {formatCurrency(origin.estimated_cost)}</span>
                      )}
                    </div>
                    {origin.campaign_name && <p>Campanha: {origin.campaign_name}</p>}
                    {(origin.ad_name || origin.ad_id) && (
                      <p className="text-muted-foreground">
                        Anúncio: {origin.ad_unavailable ? `${origin.ad_id} (removido ou de outra conta)` : origin.ad_name ?? origin.ad_id}
                      </p>
                    )}
                    {origin.entered_at && (
                      <p className="text-xs text-muted-foreground">
                        Entrou em {formatZoned(origin.entered_at, { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Origem não informada.</p>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                <Button size="sm" variant="outline" onClick={() => onEdit(apt)}>
                  <Edit2 className="h-4 w-4 mr-1.5" /> Editar
                </Button>
                {apt.conversation_id && (
                  <Button size="sm" variant="outline" onClick={() => navigate(`/conversations/${apt.conversation_id}`)}>
                    <MessageSquare className="h-4 w-4 mr-1.5" /> Conversa
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default AppointmentSidePanel;
