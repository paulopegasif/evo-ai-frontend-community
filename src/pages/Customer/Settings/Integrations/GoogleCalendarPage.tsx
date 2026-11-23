import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Calendar, Clock, RefreshCw, Sparkles, UserCheck } from '@/components/icons';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardPanel, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import BrandIcon from '@/components/BrandIcon';
import { integrationsService } from '@/services/integrations/integrationsService';
import { useAppointmentMetadata } from '@/hooks/useAppointmentMetadata';
import type { IntegrationHook } from '@/types/integrations';

const APP_ID = 'google_calendar';

interface GoogleCalendarSettings {
  account_email?: string;
  calendar_id?: string;
  calendar_name?: string;
  sync_enabled?: boolean;
  two_way_sync?: boolean;
  auto_meet?: boolean;
  reminder_minutes?: number;
  last_synced_at?: string;
  total_events_synced?: number;
}

const NOT_CONNECTED_HINT = 'Disponível após conectar a conta Google';

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
};

export default function GoogleCalendarPage() {
  const navigate = useNavigate();
  const { professionals, categories } = useAppointmentMetadata({ contacts: false });
  const [hook, setHook] = useState<IntegrationHook | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form state (persisted in the google_calendar hook settings)
  const [calendarId, setCalendarId] = useState('');
  const [reminderMinutes, setReminderMinutes] = useState('');
  const [twoWaySync, setTwoWaySync] = useState(false);
  const [autoMeet, setAutoMeet] = useState(false);

  const settings: GoogleCalendarSettings = (hook?.settings as GoogleCalendarSettings) || {};

  const applySettings = (s: GoogleCalendarSettings) => {
    setCalendarId(s.calendar_id || '');
    setReminderMinutes(s.reminder_minutes != null ? String(s.reminder_minutes) : '');
    setTwoWaySync(Boolean(s.two_way_sync));
    setAutoMeet(Boolean(s.auto_meet));
  };

  const loadIntegration = useCallback(async () => {
    setLoading(true);
    try {
      const app = await integrationsService.getIntegration(APP_ID);
      const current = app.hooks?.[0] ?? null;
      setHook(current);
      applySettings((current?.settings as GoogleCalendarSettings) || {});
    } catch (err) {
      console.error(err);
      toast.error('Não foi possível carregar a integração do Google Calendar.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIntegration();
  }, [loadIntegration]);

  const handleSaveSettings = async () => {
    const reminder = reminderMinutes === '' ? undefined : Number(reminderMinutes);
    if (reminder !== undefined && (Number.isNaN(reminder) || reminder < 0)) {
      toast.error('Informe um lembrete válido, em minutos.');
      return;
    }

    const nextSettings: GoogleCalendarSettings = {
      ...settings,
      calendar_id: calendarId.trim() || undefined,
      reminder_minutes: reminder,
      two_way_sync: twoWaySync,
      auto_meet: autoMeet,
    };

    setIsSaving(true);
    try {
      const saved = hook
        ? await integrationsService.updateIntegrationHook(hook.id, nextSettings as Record<string, unknown>)
        : await integrationsService.createIntegrationHook(APP_ID, nextSettings as Record<string, unknown>);
      setHook(saved);
      toast.success('Preferências do Google Calendar salvas.');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar as preferências. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const isConfigured = Boolean(hook);
  const lastSync = settings.last_synced_at
    ? format(new Date(settings.last_synced_at), "dd/MM/yyyy 'às' HH:mm", { locale: pt })
    : 'Nunca sincronizado';

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 md:p-6">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/settings/integrations')}>
            <ArrowLeft />
            Integrações
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/calendar')}>
              <Calendar />
              Abrir agenda
              <ArrowRight className="text-muted-foreground" />
            </Button>
            <span title={NOT_CONNECTED_HINT}>
              <Button size="sm" disabled>
                <RefreshCw />
                Sincronizar agora
              </Button>
            </span>
          </div>
        </div>

        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border bg-card shadow-xs/5">
              <BrandIcon id="google_calendar" className="size-7" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-semibold text-xl tracking-tight">Google Calendar</h1>
                {loading ? (
                  <Skeleton className="h-5 w-24" />
                ) : (
                  <Badge variant={isConfigured ? 'success' : 'outline'}>
                    {isConfigured ? 'Configurado' : 'Não configurado'}
                  </Badge>
                )}
              </div>
              <p className="mt-1 max-w-2xl text-muted-foreground text-sm">
                Sincronize os agendamentos do CRM com as agendas Google dos profissionais.
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-muted-foreground text-sm">
                <Clock className="size-4" />
                Última sincronização:
                <span className="font-medium text-foreground">{lastSync}</span>
              </p>
            </div>
          </div>
          <span title={NOT_CONNECTED_HINT} className="shrink-0">
            <Button variant="outline" size="sm" disabled>
              Reconectar conta
            </Button>
          </span>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          {/* Left: account & preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Conta e preferências</CardTitle>
              <CardDescription>Conta Google usada para criar os eventos.</CardDescription>
            </CardHeader>
            <CardPanel className="flex flex-col gap-5">
              <Field>
                <FieldLabel>E-mail da conta Google</FieldLabel>
                <Input value={settings.account_email || ''} readOnly placeholder="Nenhuma conta conectada" />
              </Field>

              <Field>
                <FieldLabel>ID da agenda principal</FieldLabel>
                <Input
                  id="gcal-calendar-id"
                  value={calendarId}
                  onChange={e => setCalendarId(e.target.value)}
                  placeholder="primary ou e-mail da agenda"
                />
                {settings.calendar_name && <FieldDescription>{settings.calendar_name}</FieldDescription>}
              </Field>

              <Field>
                <FieldLabel>Lembrete padrão (minutos antes)</FieldLabel>
                <Input
                  id="gcal-reminder"
                  type="number"
                  min="0"
                  value={reminderMinutes}
                  onChange={e => setReminderMinutes(e.target.value)}
                  placeholder="60"
                />
              </Field>

              <div className="flex flex-col gap-2">
                <ToggleRow
                  id="gcal-two-way"
                  title="Sincronização bidirecional"
                  description="Consultas criadas no CRM vão para o Google, e eventos do Google refletem no CRM."
                  checked={twoWaySync}
                  onCheckedChange={setTwoWaySync}
                />
                <ToggleRow
                  id="gcal-meet"
                  title="Link do Google Meet automático"
                  description="Gera link de videoconferência para teleconsultas e avaliações online."
                  checked={autoMeet}
                  onCheckedChange={setAutoMeet}
                />
              </div>
            </CardPanel>
            <CardFooter className="justify-end border-t">
              <Button onClick={handleSaveSettings} disabled={loading} loading={isSaving}>
                Salvar preferências
              </Button>
            </CardFooter>
          </Card>

          {/* Right: professionals & categories */}
          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="size-4 text-muted-foreground" />
                  Profissionais
                </CardTitle>
                <CardDescription>Usuários da conta que podem receber agendamentos.</CardDescription>
                <CardAction>
                  <Badge variant="secondary">{professionals.length}</Badge>
                </CardAction>
              </CardHeader>
              <CardPanel>
                {professionals.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nenhum usuário encontrado.</p>
                ) : (
                  <ul className="divide-y overflow-hidden rounded-lg border">
                    {professionals.map(prof => (
                      <li key={prof.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                        <span className="flex min-w-0 items-center gap-3">
                          <Avatar className="size-8">
                            <AvatarFallback className="bg-primary/12 font-semibold text-primary text-xs">
                              {initials(prof.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate font-medium text-sm">{prof.name}</span>
                        </span>
                        {prof.email && (
                          <span className="hidden truncate text-muted-foreground text-sm sm:inline">{prof.email}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardPanel>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="size-4 text-muted-foreground" />
                  Procedimentos
                </CardTitle>
                <CardDescription>Categorias de agendamento enviadas como eventos.</CardDescription>
                <CardAction>
                  <Badge variant="secondary">{categories.length}</Badge>
                </CardAction>
              </CardHeader>
              <CardPanel>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {categories.map(cat => (
                    <div
                      key={cat.name}
                      className="flex items-center justify-between gap-2 rounded-lg border bg-muted/32 px-3 py-2.5 text-sm"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="truncate font-medium">{cat.name}</span>
                      </span>
                      <Badge variant="outline" className="shrink-0">
                        {formatDuration(cat.duration)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardPanel>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  id,
  title,
  description,
  checked,
  onCheckedChange,
}: {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <Label className="flex items-start justify-between gap-4 rounded-lg border p-3 has-data-checked:border-primary/48 has-data-checked:bg-primary/4">
      <span className="flex flex-col gap-1">
        <span className="font-medium text-sm">{title}</span>
        <span className="font-normal text-muted-foreground text-xs">{description}</span>
      </span>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </Label>
  );
}
