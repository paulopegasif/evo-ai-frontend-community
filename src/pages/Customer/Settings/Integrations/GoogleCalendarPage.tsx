import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Switch,
} from '@evoapi/design-system';
import { ArrowRight, Calendar, Clock, RefreshCw, Sparkles, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { toast } from 'sonner';
import IntegrationBackButton from '@/components/integrations/shared/IntegrationBackButton';
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

const controlClassName = 'bg-sidebar border-sidebar-border text-sidebar-foreground';

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
    <div className="h-full flex flex-col gap-4 p-3 sm:p-4 overflow-y-auto">
      <div className="flex items-center justify-between gap-3">
        <IntegrationBackButton onBack={() => navigate('/settings/integrations')} />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/calendar')} className="gap-2">
            <Calendar className="h-4 w-4" />
            Abrir agenda
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Button>
          <span title={NOT_CONNECTED_HINT}>
            <Button size="sm" disabled className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Sincronizar agora
            </Button>
          </span>
        </div>
      </div>

      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-lg border border-border bg-card flex items-center justify-center shrink-0">
                <BrandIcon id="google_calendar" className="h-8 w-8" />
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Google Calendar</h1>
                  {loading ? null : isConfigured ? (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                      Configurado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
                      Não configurado
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                  Sincronize os agendamentos do CRM com as agendas Google dos profissionais.
                </p>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-3">
                  <Clock className="h-4 w-4" />
                  Última sincronização: <span className="font-medium text-foreground">{lastSync}</span>
                </div>
              </div>
            </div>

            <span title={NOT_CONNECTED_HINT} className="shrink-0">
              <Button variant="outline" size="sm" disabled>
                Reconectar conta
              </Button>
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: account & preferences */}
        <div className="space-y-4 lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Conta conectada</CardTitle>
              <CardDescription>Conta Google usada para criar os eventos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>E-mail da conta Google</Label>
                <Input
                  value={settings.account_email || ''}
                  readOnly
                  placeholder="Nenhuma conta conectada"
                  className={controlClassName}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gcal-calendar-id">ID da agenda principal</Label>
                <Input
                  id="gcal-calendar-id"
                  value={calendarId}
                  onChange={e => setCalendarId(e.target.value)}
                  placeholder="primary ou e-mail da agenda"
                  className={controlClassName}
                />
                {settings.calendar_name && (
                  <p className="text-xs text-muted-foreground">{settings.calendar_name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="gcal-reminder">Lembrete padrão (minutos antes)</Label>
                <Input
                  id="gcal-reminder"
                  type="number"
                  min="0"
                  value={reminderMinutes}
                  onChange={e => setReminderMinutes(e.target.value)}
                  placeholder="60"
                  className={controlClassName}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Preferências de sincronização</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Label htmlFor="gcal-two-way">Sincronização bidirecional</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Consultas criadas no CRM vão para o Google, e eventos do Google refletem no CRM.
                  </p>
                </div>
                <Switch id="gcal-two-way" checked={twoWaySync} onCheckedChange={setTwoWaySync} />
              </div>

              <div className="flex items-start justify-between gap-4">
                <div>
                  <Label htmlFor="gcal-meet">Link do Google Meet automático</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Gera link de videoconferência para teleconsultas e avaliações online.
                  </p>
                </div>
                <Switch id="gcal-meet" checked={autoMeet} onCheckedChange={setAutoMeet} />
              </div>

              <Button onClick={handleSaveSettings} disabled={isSaving || loading} className="w-full">
                {isSaving ? 'Salvando...' : 'Salvar preferências'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right: professionals & categories */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-primary" />
                  Profissionais
                </CardTitle>
                <CardDescription>Usuários da conta que podem receber agendamentos</CardDescription>
              </div>
              <Badge variant="secondary">{professionals.length}</Badge>
            </CardHeader>
            <CardContent>
              {professionals.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
              ) : (
                <div className="divide-y divide-border border border-border rounded-md overflow-hidden">
                  {professionals.map(prof => (
                    <div key={prof.id} className="flex items-center justify-between gap-3 p-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                          {initials(prof.name)}
                        </div>
                        <span className="text-sm font-medium truncate">{prof.name}</span>
                      </div>
                      {prof.email && (
                        <span className="text-sm text-muted-foreground truncate hidden sm:inline">{prof.email}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Procedimentos
                </CardTitle>
                <CardDescription>Categorias de agendamento enviadas como eventos</CardDescription>
              </div>
              <Badge variant="secondary">{categories.length}</Badge>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {categories.map(cat => (
                  <div
                    key={cat.name}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-md border border-sidebar-border bg-sidebar text-sm"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="font-medium truncate">{cat.name}</span>
                    </span>
                    <Badge variant="outline" className="shrink-0">
                      {formatDuration(cat.duration)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
