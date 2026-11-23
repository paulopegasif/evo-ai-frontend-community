import React, { useEffect, useState } from 'react';
import { CalendarClock, Edit2, Info, Megaphone, MessageCircle, MessageSquare, Phone, Route, Stethoscope, User } from '@/components/icons';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetDescription, SheetFooter, SheetHeader, SheetPanel, SheetPopup, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
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
  <div className="flex items-start gap-2.5 text-sm">
    <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
    <div className="min-w-0">{children}</div>
  </div>
);

const SOURCE_LABELS: Record<string, string> = { bitrix24: 'Bitrix24' };

/** wa.me link for a phone number; Brazilian numbers without country code get 55. */
const whatsappUrl = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return null;
  return `https://wa.me/${digits.length <= 11 ? `55${digits}` : digits}`;
};

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
      <SheetPopup side="right" className="sm:max-w-md">
        {apt && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2 pe-8 font-semibold text-lg leading-tight">
                <span className={cn('size-2.5 shrink-0 rounded-full', statusStyle(apt.status).dot)} />
                <span className="truncate">{apt.contact?.name ?? apt.title}</span>
              </SheetTitle>
              <SheetDescription render={<div />} className="flex flex-wrap items-center gap-1.5">
                <Badge variant={statusStyle(apt.status).badge}>{statusStyle(apt.status).label}</Badge>
                {isWithoutOutcome(apt) && <Badge variant="warning">sem desfecho registrado</Badge>}
              </SheetDescription>
            </SheetHeader>

            <SheetPanel className="flex flex-col gap-6">
              <div className="flex flex-col gap-2.5">
                <Row icon={CalendarClock}>
                  {formatZoned(apt.start_time, { weekday: 'long', day: '2-digit', month: 'long' })} ·{' '}
                  {apt.all_day ? <span className="text-warning-foreground">horário a definir</span> : appointmentTimeLabel(apt)}
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

              <section className="flex flex-col gap-2">
                <h3 className="font-medium text-muted-foreground text-xs">Status</h3>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_STATUSES.map((status) => (
                    <Button
                      key={status}
                      size="sm"
                      variant={apt.status === status ? 'secondary' : 'outline'}
                      aria-pressed={apt.status === status}
                      disabled={saving !== null}
                      loading={saving === status}
                      onClick={() => changeStatus(status)}
                      className={cn('justify-start', apt.status === status && 'ring-1 ring-ring/40')}
                    >
                      <span className={cn('size-2 rounded-full', STATUS_STYLES[status].dot)} />
                      {STATUS_STYLES[status].label}
                    </Button>
                  ))}
                </div>
                {external && (
                  <p className="flex gap-1.5 text-muted-foreground text-xs">
                    <Info className="mt-0.5 size-3.5 shrink-0" />
                    Veio do {external}. O status que você marcar aqui é mantido mesmo que o {external} envie um status
                    anterior; mudanças de data no {external} continuam sendo aplicadas.
                  </p>
                )}
              </section>

              <section className="flex flex-col gap-2">
                <h3 className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs">
                  <Megaphone className="size-3.5" /> Origem do lead
                </h3>
                {loadingDetail ? (
                  <Skeleton className="h-20 w-full rounded-lg" />
                ) : origin ? (
                  <div className="flex flex-col gap-1 rounded-lg border bg-muted/32 p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{origin.source}</Badge>
                      {origin.estimated_cost != null && (
                        <span className="text-muted-foreground text-xs">custo estimado {formatCurrency(origin.estimated_cost)}</span>
                      )}
                    </div>
                    {origin.campaign_name && <p>Campanha: {origin.campaign_name}</p>}
                    {(origin.ad_name || origin.ad_id) && (
                      <p className="text-muted-foreground">
                        Anúncio: {origin.ad_unavailable ? `${origin.ad_id} (removido ou de outra conta)` : origin.ad_name ?? origin.ad_id}
                      </p>
                    )}
                    {origin.entered_at && (
                      <p className="text-muted-foreground text-xs">
                        Entrou em {formatZoned(origin.entered_at, { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Origem não informada.</p>
                )}
              </section>
            </SheetPanel>

            <SheetFooter className="flex-row flex-wrap sm:justify-start">
              <Button size="sm" variant="outline" onClick={() => onEdit(apt)}>
                <Edit2 /> Editar
              </Button>
              {apt.conversation_id && (
                <Button size="sm" variant="outline" onClick={() => navigate(`/conversations/${apt.conversation_id}`)}>
                  <MessageSquare /> Conversa
                </Button>
              )}
              {apt.contact?.phone_number && whatsappUrl(apt.contact.phone_number) && (
                <Button
                  size="sm"
                  variant="outline"
                  render={<a href={whatsappUrl(apt.contact.phone_number) ?? undefined} target="_blank" rel="noopener noreferrer" />}
                >
                  <MessageCircle /> WhatsApp
                </Button>
              )}
              {(apt.contact_id ?? apt.contact?.id) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/tracking?tab=leads&lead=${apt.contact_id ?? apt.contact?.id}`)}
                >
                  <Route /> Jornada do lead
                </Button>
              )}
            </SheetFooter>
          </>
        )}
      </SheetPopup>
    </Sheet>
  );
};

export default AppointmentSidePanel;
