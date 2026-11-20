import { useState, useEffect, type ReactNode } from 'react';
import {
  Building2,
  Calendar,
  CalendarCheck,
  CalendarClock,
  Clock,
  FileText,
  Mail,
  Repeat,
  Settings,
  User,
  Video,
  Zap,
} from 'lucide-react';
import BrandIcon from '@/components/BrandIcon';
import ConfirmDialog from '@/components/base/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { AgentIntegrationDialog, SettingRow } from './agentConfig/AgentIntegrationDialog';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';
import GoogleCalendarService from '@/services/integrations/googleCalendarService';
import { GoogleCalendarConfig, GoogleCalendarItem } from '@/types/integrations';

interface GoogleCalendarConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: GoogleCalendarConfig) => void;
  onDisconnect?: () => void;
  initialConfig?: Partial<GoogleCalendarConfig>;
  agentId: string;
}

const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const GoogleCalendarConfigDialog = ({
  open,
  onOpenChange,
  onSave,
  onDisconnect,
  initialConfig,
  agentId,
}: GoogleCalendarConfigDialogProps) => {
  const { t } = useLanguage('aiAgents');

  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(false);
  const [availableCalendars, setAvailableCalendars] = useState<GoogleCalendarItem[]>([]);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const [config, setConfig] = useState<GoogleCalendarConfig>({
    provider: 'google_calendar',
    email: initialConfig?.email || '',
    connected: initialConfig?.connected || false,
    calendars: initialConfig?.calendars || [],
    settings: {
      selectedCalendarId: initialConfig?.settings?.selectedCalendarId || '',
      minAdvanceTime: {
        enabled: initialConfig?.settings?.minAdvanceTime?.enabled || false,
        value: initialConfig?.settings?.minAdvanceTime?.value || 1,
        unit: initialConfig?.settings?.minAdvanceTime?.unit || 'hours',
      },
      maxDistance: {
        enabled: initialConfig?.settings?.maxDistance?.enabled || false,
        value: initialConfig?.settings?.maxDistance?.value || 1,
        unit: initialConfig?.settings?.maxDistance?.unit || 'weeks',
      },
      maxDuration: {
        value: initialConfig?.settings?.maxDuration?.value || 1,
        unit: initialConfig?.settings?.maxDuration?.unit || 'hours',
      },
      simultaneousBookings: {
        enabled: initialConfig?.settings?.simultaneousBookings?.enabled || false,
        limit: initialConfig?.settings?.simultaneousBookings?.limit || 1,
      },
      alwaysOpen: initialConfig?.settings?.alwaysOpen || false,
      businessHours: initialConfig?.settings?.businessHours || {
        monday: { enabled: true, start: '08:00', end: '18:00' },
        tuesday: { enabled: true, start: '08:00', end: '18:00' },
        wednesday: { enabled: true, start: '08:00', end: '18:00' },
        thursday: { enabled: true, start: '08:00', end: '18:00' },
        friday: { enabled: true, start: '08:00', end: '18:00' },
        saturday: { enabled: false, start: '08:00', end: '18:00' },
        sunday: { enabled: false, start: '08:00', end: '18:00' },
      },
      meetIntegration: initialConfig?.settings?.meetIntegration || false,
      allowAvailabilityCheck: initialConfig?.settings?.allowAvailabilityCheck || true,
      restrictedHours: {
        enabled: initialConfig?.settings?.restrictedHours?.enabled || false,
        allowedTimes: initialConfig?.settings?.restrictedHours?.allowedTimes || ['09:00'],
      },
      distributionMode: initialConfig?.settings?.distributionMode || 'sequential',
      bookingFields: initialConfig?.settings?.bookingFields || [
        { id: '1', name: 'name', label: 'Nome', enabled: false, required: false },
        { id: '2', name: 'company', label: 'Empresa', enabled: true, required: false },
        { id: '3', name: 'subject', label: 'Assunto', enabled: true, required: false },
        { id: '4', name: 'duration', label: 'Duração', enabled: false, required: false },
        { id: '5', name: 'email', label: 'E-mail', enabled: true, required: false },
        { id: '6', name: 'summary', label: 'Resumo', enabled: false, required: false },
      ],
    },
  });

  // Sync config when initialConfig changes
  useEffect(() => {
    if (initialConfig) {
      setConfig({
        provider: 'google_calendar',
        email: initialConfig?.email || '',
        connected: initialConfig?.connected || false,
        calendars: initialConfig?.calendars || [],
        settings: {
          selectedCalendarId: initialConfig?.settings?.selectedCalendarId || '',
          minAdvanceTime: {
            enabled: initialConfig?.settings?.minAdvanceTime?.enabled || false,
            value: initialConfig?.settings?.minAdvanceTime?.value || 1,
            unit: initialConfig?.settings?.minAdvanceTime?.unit || 'hours',
          },
          maxDistance: {
            enabled: initialConfig?.settings?.maxDistance?.enabled || false,
            value: initialConfig?.settings?.maxDistance?.value || 1,
            unit: initialConfig?.settings?.maxDistance?.unit || 'weeks',
          },
          maxDuration: {
            value: initialConfig?.settings?.maxDuration?.value || 1,
            unit: initialConfig?.settings?.maxDuration?.unit || 'hours',
          },
          simultaneousBookings: {
            enabled: initialConfig?.settings?.simultaneousBookings?.enabled || false,
            limit: initialConfig?.settings?.simultaneousBookings?.limit || 1,
          },
          alwaysOpen: initialConfig?.settings?.alwaysOpen || false,
          businessHours: initialConfig?.settings?.businessHours || {
            monday: { enabled: true, start: '08:00', end: '18:00' },
            tuesday: { enabled: true, start: '08:00', end: '18:00' },
            wednesday: { enabled: true, start: '08:00', end: '18:00' },
            thursday: { enabled: true, start: '08:00', end: '18:00' },
            friday: { enabled: true, start: '08:00', end: '18:00' },
            saturday: { enabled: false, start: '08:00', end: '18:00' },
            sunday: { enabled: false, start: '08:00', end: '18:00' },
          },
          meetIntegration: initialConfig?.settings?.meetIntegration || false,
          allowAvailabilityCheck: initialConfig?.settings?.allowAvailabilityCheck || true,
          restrictedHours: {
            enabled: initialConfig?.settings?.restrictedHours?.enabled || false,
            allowedTimes: initialConfig?.settings?.restrictedHours?.allowedTimes || ['09:00'],
          },
          distributionMode: initialConfig?.settings?.distributionMode || 'sequential',
          bookingFields: initialConfig?.settings?.bookingFields || [
            { id: '1', name: 'name', label: 'Nome', enabled: false, required: false },
            { id: '2', name: 'company', label: 'Empresa', enabled: true, required: false },
            { id: '3', name: 'subject', label: 'Assunto', enabled: true, required: false },
            { id: '4', name: 'duration', label: 'Duração', enabled: false, required: false },
            { id: '5', name: 'email', label: 'E-mail', enabled: true, required: false },
            { id: '6', name: 'summary', label: 'Resumo', enabled: false, required: false },
          ],
        },
      });
    }
  }, [initialConfig]);

  // Load calendars when connected
  useEffect(() => {
    if (config.connected && open) {
      loadCalendars();
    }
  }, [config.connected, open]);

  const loadCalendars = async () => {
    setIsLoadingCalendars(true);
    try {
      const calendars = await GoogleCalendarService.getCalendars(agentId);
      setAvailableCalendars(calendars);
      setConfig(prev => ({ ...prev, calendars }));
    } catch (error) {
      console.error('Error loading calendars:', error);
      toast.error(t('edit.integrations.toasts.loadCalendarsError'));
    } finally {
      setIsLoadingCalendars(false);
    }
  };

  const handleConnectGoogle = async () => {
    if (!config.email) {
      toast.error(t('edit.integrations.toasts.emailRequired'));
      return;
    }

    setIsConnecting(true);
    try {
      const response = await GoogleCalendarService.generateAuthorization(agentId, config.email);

      if (response.url) {
        // Redirect to Google OAuth
        window.location.href = response.url;
      }
    } catch (error) {
      console.error('Error connecting to Google Calendar:', error);
      toast.error(t('edit.integrations.toasts.connectError', { name: 'Google Calendar' }));
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSave = async () => {
    if (!config.settings?.selectedCalendarId) {
      toast.error(t('edit.integrations.toasts.selectCalendar'));
      return;
    }

    try {
      // Save configuration to backend first
      await GoogleCalendarService.saveConfiguration(agentId, config);

      // Then update local state
      onSave(config);
      toast.success(t('edit.integrations.toasts.saveSuccess'));
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving Google Calendar configuration:', error);
      toast.error(t('edit.integrations.toasts.saveError'));
    }
  };

  const handleDisconnect = async () => {
    try {
      // Call backend to disconnect
      await GoogleCalendarService.disconnect(agentId);

      // Update local state
      if (onDisconnect) {
        onDisconnect();
      }

      toast.success(t('edit.integrations.toasts.disconnectSuccess', { name: 'Google Calendar' }));
      onOpenChange(false);
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error);
      toast.error(t('edit.integrations.toasts.disconnectError', { name: 'Google Calendar' }));
    }
  };

  const updateBusinessHours = (
    day: string,
    field: 'enabled' | 'start' | 'end',
    value: boolean | string,
  ) => {
    setConfig(prev => {
      const currentDayData = prev.settings?.businessHours?.[day] || {
        enabled: false,
        start: '08:00',
        end: '18:00',
      };
      return {
        ...prev,
        settings: {
          ...prev.settings,
          businessHours: {
            ...prev.settings?.businessHours,
            [day]: {
              enabled: field === 'enabled' ? (value as boolean) : currentDayData.enabled,
              start: field === 'start' ? (value as string) : currentDayData.start,
              end: field === 'end' ? (value as string) : currentDayData.end,
            },
          },
        },
      };
    });
  };

  const updateBookingField = (fieldId: string, enabled: boolean) => {
    setConfig(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        bookingFields: prev.settings?.bookingFields?.map(field =>
          field.id === fieldId ? { ...field, enabled } : field,
        ),
      },
    }));
  };

  const getFieldIcon = (fieldName: string) => {
    switch (fieldName) {
      case 'name':
        return <User />;
      case 'company':
        return <Building2 />;
      case 'subject':
        return <FileText />;
      case 'duration':
        return <Clock />;
      case 'email':
        return <Mail />;
      case 'summary':
        return <FileText />;
      default:
        return null;
    }
  };

  const patchSettings = (patch: Partial<NonNullable<GoogleCalendarConfig['settings']>>) =>
    setConfig({
      ...config,
      settings: { ...config.settings, ...patch } as GoogleCalendarConfig['settings'],
    });

  const calendarItems = availableCalendars.map(calendar => ({
    value: calendar.id,
    label: `${calendar.name}${calendar.primary ? ' (Principal)' : ''}`,
  }));

  const bookingFieldHint: Record<string, string> = {
    name: 'Solicitar nome do usuário',
    company: 'Solicitar nome da empresa',
    subject: 'Solicitar assunto',
    duration: 'Quanto tempo vai durar',
    email: 'Solicitar e-mail para enviar convite na agenda',
    summary: 'Anexar um resumo da conversa no agendamento',
  };

  const distributionModes = [
    {
      value: 'sequential' as const,
      title: 'Distribuir sequencial',
      description:
        'Os agendamentos são distribuídos entre as agendas alternando entre elas de maneira sequencial.',
    },
    {
      value: 'intelligent' as const,
      title: 'Distribuição Inteligente',
      description:
        'Seleciona automaticamente a agenda mais apropriada de acordo com a conversa com o cliente.',
    },
  ];

  return (
    <>
      <AgentIntegrationDialog
        open={open}
        onOpenChange={onOpenChange}
        className="sm:max-w-3xl"
        icon={<BrandIcon id="google-calendar" size={20} />}
        title={t('edit.integrations.googleCalendar.configTitle') || 'Configurar Google Calendar'}
        description={
          t('edit.integrations.googleCalendar.connectDescription') ||
          'Permita que o agente acesse e gerencie agendamentos na sua agenda do Google'
        }
        footerStart={
          onDisconnect && config.connected ? (
            <Button variant="destructive-outline" onClick={() => setConfirmDisconnect(true)}>
              {t('edit.integrations.googleCalendar.disconnect') || 'Desconectar'}
            </Button>
          ) : undefined
        }
        footer={
          config.connected ? (
            <Button onClick={handleSave}>
              {t('edit.integrations.googleCalendar.saveConfig') || 'APLICAR CONFIGURAÇÕES'}
            </Button>
          ) : (
            <Button
              onClick={handleConnectGoogle}
              loading={isConnecting}
              className="w-full sm:w-auto"
            >
              {!isConnecting && <Calendar />}
              {isConnecting
                ? t('edit.integrations.googleCalendar.connecting') || 'Conectando...'
                : t('edit.integrations.googleCalendar.connectButton') || 'Conectar com Google'}
            </Button>
          )
        }
      >
        {!config.connected ? (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-muted/40 px-6 py-6 text-center">
              <div className="flex size-14 items-center justify-center rounded-full border bg-card shadow-xs/5">
                <BrandIcon id="google-calendar" size={28} />
              </div>
              <h3 className="font-semibold text-base">
                {t('edit.integrations.googleCalendar.connectTitle') ||
                  'Conectar com Google Calendar'}
              </h3>
            </div>
            <Field>
              <FieldLabel>
                {t('edit.integrations.googleCalendar.email') || 'E-mail do Google'}
              </FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="seuemail@gmail.com"
                value={config.email}
                onChange={e => setConfig({ ...config, email: e.target.value })}
              />
            </Field>
          </div>
        ) : (
          <Tabs defaultValue="general" className="flex flex-col gap-5">
            <TabsList className="w-full">
              <TabsTab value="general" className="flex-1">
                <Settings />
                Geral
              </TabsTab>
              <TabsTab value="schedule" className="flex-1">
                <CalendarClock />
                Horários
              </TabsTab>
              <TabsTab value="settings" className="flex-1">
                <Zap />
                Configurações
              </TabsTab>
            </TabsList>

            <TabsPanel value="general" className="flex flex-col gap-5">
              <Field>
                <FieldLabel>
                  {t('edit.integrations.googleCalendar.calendar.selectCalendar') || 'Agenda'}
                </FieldLabel>
                <Select
                  items={calendarItems}
                  value={config.settings?.selectedCalendarId || null}
                  onValueChange={value =>
                    patchSettings({ selectedCalendarId: (value as string) || '' })
                  }
                  disabled={isLoadingCalendars}
                >
                  <SelectTrigger>
                    {isLoadingCalendars ? (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Spinner className="size-4" />
                        Carregando agendas...
                      </span>
                    ) : (
                      <SelectValue placeholder="Selecione uma agenda" />
                    )}
                  </SelectTrigger>
                  <SelectPopup>
                    {calendarItems.map(item => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              </Field>

              <ToggleBlock
                icon={<Clock />}
                title={
                  t('edit.integrations.googleCalendar.minAdvanceTime.title') ||
                  'Tempo mínimo de antecedência'
                }
                description="Não permita agendamentos em cima da hora"
                checked={Boolean(config.settings?.minAdvanceTime?.enabled)}
                onCheckedChange={checked =>
                  patchSettings({
                    minAdvanceTime: { ...config.settings?.minAdvanceTime, enabled: checked },
                  })
                }
              >
                <AmountUnit
                  value={config.settings?.minAdvanceTime?.value || 1}
                  unit={config.settings?.minAdvanceTime?.unit || 'hours'}
                  units={[
                    { value: 'hours', label: 'Horas' },
                    { value: 'days', label: 'Dias' },
                    { value: 'weeks', label: 'Semanas' },
                  ]}
                  onValueChange={value =>
                    patchSettings({
                      minAdvanceTime: {
                        enabled: config.settings?.minAdvanceTime?.enabled || false,
                        value,
                        unit: config.settings?.minAdvanceTime?.unit || 'hours',
                      },
                    })
                  }
                  onUnitChange={unit =>
                    patchSettings({
                      minAdvanceTime: {
                        enabled: config.settings?.minAdvanceTime?.enabled || false,
                        value: config.settings?.minAdvanceTime?.value || 1,
                        unit: unit as 'hours' | 'days' | 'weeks',
                      },
                    })
                  }
                />
              </ToggleBlock>

              <ToggleBlock
                icon={<CalendarCheck />}
                title={
                  t('edit.integrations.googleCalendar.maxDistance.title') ||
                  'Distância máxima permitida'
                }
                description="Limite máximo de dias permitido"
                checked={Boolean(config.settings?.maxDistance?.enabled)}
                onCheckedChange={checked =>
                  patchSettings({
                    maxDistance: { ...config.settings?.maxDistance, enabled: checked },
                  })
                }
              >
                <AmountUnit
                  value={config.settings?.maxDistance?.value || 1}
                  unit={config.settings?.maxDistance?.unit || 'weeks'}
                  units={[
                    { value: 'days', label: 'Dias' },
                    { value: 'weeks', label: 'Semanas' },
                    { value: 'months', label: 'Meses' },
                  ]}
                  onValueChange={value =>
                    patchSettings({
                      maxDistance: {
                        enabled: config.settings?.maxDistance?.enabled || false,
                        value,
                        unit: config.settings?.maxDistance?.unit || 'weeks',
                      },
                    })
                  }
                  onUnitChange={unit =>
                    patchSettings({
                      maxDistance: {
                        enabled: config.settings?.maxDistance?.enabled || false,
                        value: config.settings?.maxDistance?.value || 1,
                        unit: unit as 'days' | 'weeks' | 'months',
                      },
                    })
                  }
                />
              </ToggleBlock>

              <Field>
                <FieldLabel>
                  <Clock className="size-4 text-muted-foreground" />
                  {t('edit.integrations.googleCalendar.maxDuration.title') ||
                    'Duração máxima da agenda'}
                </FieldLabel>
                <AmountUnit
                  value={config.settings?.maxDuration?.value || 1}
                  unit={config.settings?.maxDuration?.unit || 'hours'}
                  units={[
                    { value: 'minutes', label: 'Minutos' },
                    { value: 'hours', label: 'Horas' },
                  ]}
                  onValueChange={value =>
                    patchSettings({
                      maxDuration: { value, unit: config.settings?.maxDuration?.unit || 'hours' },
                    })
                  }
                  onUnitChange={unit =>
                    patchSettings({
                      maxDuration: {
                        value: config.settings?.maxDuration?.value || 1,
                        unit: unit as 'minutes' | 'hours',
                      },
                    })
                  }
                />
                <FieldDescription>Limite tempo para cada agendamento</FieldDescription>
              </Field>
            </TabsPanel>

            <TabsPanel value="schedule" className="flex flex-col gap-5">
              <ToggleBlock
                icon={<Repeat />}
                title="Agendamentos simultâneos"
                checked={Boolean(config.settings?.simultaneousBookings?.enabled)}
                onCheckedChange={checked =>
                  patchSettings({
                    simultaneousBookings: {
                      ...config.settings?.simultaneousBookings,
                      enabled: checked,
                    },
                  })
                }
              >
                <Field>
                  <FieldLabel>Limite de agendamento no mesmo horário</FieldLabel>
                  <Input
                    type="number"
                    min="1"
                    className="w-24"
                    value={config.settings?.simultaneousBookings?.limit || 1}
                    onChange={e =>
                      patchSettings({
                        simultaneousBookings: {
                          enabled: config.settings?.simultaneousBookings?.enabled || false,
                          limit: parseInt(e.target.value) || 1,
                        },
                      })
                    }
                  />
                </Field>
              </ToggleBlock>

              <SettingRow
                icon={<Repeat />}
                title="Sempre aberto"
                description="Permite agendamento em qualquer horário"
                control={
                  <Switch
                    checked={Boolean(config.settings?.alwaysOpen)}
                    onCheckedChange={checked => patchSettings({ alwaysOpen: checked })}
                  />
                }
              />

              {!config.settings?.alwaysOpen && (
                <section className="flex flex-col gap-2">
                  <h4 className="font-medium text-sm">Horários de atendimento</h4>
                  <div className="flex flex-col divide-y rounded-lg border">
                    {DAYS_OF_WEEK.map(day => {
                      const dayData = config.settings?.businessHours?.[day];
                      return (
                        <div
                          key={day}
                          className="flex min-h-12 flex-wrap items-center gap-3 px-3.5 py-2"
                        >
                          <Label className="w-36 cursor-pointer capitalize">
                            <Checkbox
                              checked={Boolean(dayData?.enabled)}
                              onCheckedChange={checked =>
                                updateBusinessHours(day, 'enabled', Boolean(checked))
                              }
                            />
                            {t(`edit.integrations.googleCalendar.businessHours.days.${day}`) || day}
                          </Label>
                          {dayData?.enabled && (
                            <div className="flex items-center gap-2">
                              <Input
                                type="time"
                                className="w-32"
                                value={dayData.start}
                                onChange={e => updateBusinessHours(day, 'start', e.target.value)}
                              />
                              <span className="text-muted-foreground">–</span>
                              <Input
                                type="time"
                                className="w-32"
                                value={dayData.end}
                                onChange={e => updateBusinessHours(day, 'end', e.target.value)}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </TabsPanel>

            <TabsPanel value="settings" className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <SettingRow
                  icon={<Video />}
                  title="Integração com Google Meet"
                  description="Gerar link do meet ao fazer o agendamento"
                  control={
                    <Switch
                      checked={Boolean(config.settings?.meetIntegration)}
                      onCheckedChange={checked => patchSettings({ meetIntegration: checked })}
                    />
                  }
                />
                <SettingRow
                  icon={<CalendarCheck />}
                  title="Consulta de horários"
                  description="Agente pode consultar horários disponíveis"
                  control={
                    <Switch
                      checked={Boolean(config.settings?.allowAvailabilityCheck)}
                      onCheckedChange={checked =>
                        patchSettings({ allowAvailabilityCheck: checked })
                      }
                    />
                  }
                />
              </div>

              <section className="flex flex-col gap-2">
                <div className="flex flex-col gap-0.5">
                  <h4 className="font-medium text-sm">Modo de distribuição</h4>
                  <p className="text-muted-foreground text-xs">
                    Como os agendamentos serão divididos
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {distributionModes.map(mode => {
                    const active = config.settings?.distributionMode === mode.value;
                    return (
                      <button
                        key={mode.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => patchSettings({ distributionMode: mode.value })}
                        className={cn(
                          'flex flex-col gap-1 rounded-lg border p-3.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                          active
                            ? 'border-primary bg-primary/8'
                            : 'hover:border-primary/40 hover:bg-accent/50',
                        )}
                      >
                        <span className="font-medium text-sm">{mode.title}</span>
                        <span className="text-muted-foreground text-xs">{mode.description}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="flex flex-col gap-2">
                <h4 className="font-medium text-sm">Campos para agendamento</h4>
                {config.settings?.bookingFields?.map(field => (
                  <SettingRow
                    key={field.id}
                    icon={getFieldIcon(field.name)}
                    title={field.label}
                    description={bookingFieldHint[field.name]}
                    control={
                      <Switch
                        checked={field.enabled}
                        onCheckedChange={checked => updateBookingField(field.id, checked)}
                      />
                    }
                  />
                ))}
              </section>
            </TabsPanel>
          </Tabs>
        )}
      </AgentIntegrationDialog>

      <ConfirmDialog
        open={confirmDisconnect}
        onOpenChange={setConfirmDisconnect}
        title={t('edit.integrations.disconnectConfirm.title', { name: 'Google Calendar' })}
        description={t('edit.integrations.disconnectConfirm.description', {
          name: 'Google Calendar',
        })}
        cancelLabel={t('edit.integrations.disconnectConfirm.cancel')}
        confirmLabel={t('edit.integrations.googleCalendar.disconnect') || 'Desconectar'}
        onConfirm={async () => {
          await handleDisconnect();
          setConfirmDisconnect(false);
        }}
      />
    </>
  );
};

/** Switch-gated block: header row with switch, extra controls revealed when on. */
function ToggleBlock({
  icon,
  title,
  description,
  checked,
  onCheckedChange,
  children,
}: {
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card px-3.5 py-3">
      <label className="flex cursor-pointer items-center justify-between gap-4">
        <span className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 text-muted-foreground [&_svg]:size-4">{icon}</span>
          <span className="flex flex-col gap-0.5">
            <span className="font-medium text-sm">{title}</span>
            {description && <span className="text-muted-foreground text-xs">{description}</span>}
          </span>
        </span>
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      </label>
      {checked && children && <div className="ps-7">{children}</div>}
    </div>
  );
}

function AmountUnit({
  value,
  unit,
  units,
  onValueChange,
  onUnitChange,
}: {
  value: number;
  unit: string;
  units: { value: string; label: string }[];
  onValueChange: (value: number) => void;
  onUnitChange: (unit: string) => void;
}) {
  return (
    <div className="flex gap-2">
      <Input
        type="number"
        min="1"
        className="w-24"
        value={value}
        onChange={e => onValueChange(parseInt(e.target.value) || 1)}
      />
      <Select
        items={units}
        value={unit}
        onValueChange={next => next && onUnitChange(next as string)}
      >
        <SelectTrigger className="w-32 min-w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectPopup>
          {units.map(item => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
    </div>
  );
}

export default GoogleCalendarConfigDialog;
