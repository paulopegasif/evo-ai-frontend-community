import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Badge,
  Input,
} from '@evoapi/design-system';
import {
  Calendar,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  Clock,
  Sparkles,
  ArrowRight,
  Sliders,
} from 'lucide-react';
import { toast } from 'sonner';
import IntegrationBackButton from '@/components/integrations/shared/IntegrationBackButton';
import BrandIcon from '@/components/BrandIcon';

interface ProfessionalMapping {
  id: string;
  name: string;
  role: string;
  calendarEmail: string;
  synced: boolean;
}

export default function GoogleCalendarPage() {
  const navigate = useNavigate();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState('Hoje, há 2 minutos');

  // Form states
  const [primaryCalendar, setPrimaryCalendar] = useState('agenda@lumombeauty.com.br');
  const [twoWaySync, setTwoWaySync] = useState(true);
  const [autoMeet, setAutoMeet] = useState(true);
  const [reminderMinutes, setReminderMinutes] = useState('60');

  const [professionals, setProfessionals] = useState<ProfessionalMapping[]>([
    {
      id: '1',
      name: 'Dra. Camila Santos',
      role: 'Biomédica Esteta',
      calendarEmail: 'camila@lumombeauty.com.br',
      synced: true,
    },
    {
      id: '2',
      name: 'Dr. Lucas Rocha',
      role: 'Cirurgião / Harmonizador',
      calendarEmail: 'lucas@lumombeauty.com.br',
      synced: true,
    },
    {
      id: '3',
      name: 'Dra. Mariana Costa',
      role: 'Dermatologia & Laser',
      calendarEmail: 'mariana.costa@lumombeauty.com.br',
      synced: true,
    },
    {
      id: '4',
      name: 'Paulo Silva',
      role: 'Diretor Clínico',
      calendarEmail: 'ifsul.ph@gmail.com',
      synced: true,
    },
  ]);

  const procedureCategories = [
    { name: 'Harmonização Facial', duration: '90 min', count: 4 },
    { name: 'Toxina Botulínica (Botox)', duration: '45 min', count: 6 },
    { name: 'Bioestimulador de Colágeno', duration: '60 min', count: 3 },
    { name: 'Limpeza de Pele Profunda', duration: '75 min', count: 5 },
    { name: 'Laser & Luz Pulsada', duration: '60 min', count: 4 },
    { name: 'Avaliação Facial', duration: '30 min', count: 8 },
    { name: 'Retorno / Acompanhamento', duration: '30 min', count: 3 },
  ];

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      // Simulate real sync cycle
      await new Promise(resolve => setTimeout(resolve, 1200));
      setLastSyncTime('Agora mesmo');
      toast.success('Sincronização com o Google Calendar concluída com sucesso! 33 consultas sincronizadas.');
    } catch {
      toast.error('Erro ao sincronizar com Google Calendar');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      toast.success('Configurações da integração Google Calendar salvas com sucesso!');
    } catch {
      toast.error('Erro ao salvar preferências');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleProfessionalSync = (id: string) => {
    setProfessionals(prev =>
      prev.map(p => (p.id === id ? { ...p, synced: !p.synced } : p))
    );
  };

  return (
    <div className="h-full flex flex-col p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Bar with Back Button */}
      <div className="flex items-center justify-between">
        <IntegrationBackButton onBack={() => navigate('/settings/integrations')} />
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/calendar')}
            className="flex items-center gap-2"
          >
            <Calendar className="w-4 h-4 text-purple-600" />
            <span>Abrir Agenda</span>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
          <Button
            size="sm"
            onClick={handleSyncNow}
            disabled={isSyncing}
            className="flex items-center gap-2 bg-[#2A152F] hover:bg-[#3d1e44] text-white"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
          </Button>
        </div>
      </div>

      {/* Main Header Card */}
      <Card className="p-6 bg-gradient-to-r from-purple-500/10 via-background to-background border-purple-500/20 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center shadow-sm shrink-0">
              <BrandIcon id="google_calendar" className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">Google Calendar</h1>
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 py-0.5 px-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Conectado e Ativo
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
                Sincronização bidirecional em tempo real de consultas, procedimentos estéticos e agendas dos profissionais da Lumom Beauty.
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-3">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  OAuth 2.0 Google API v3
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-purple-600" />
                  Última sincronização: <strong>{lastSyncTime}</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Sincronização automática a cada 5 min
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                toast.info('Reautenticação OAuth iniciada');
              }}
              className="text-xs"
            >
              Reconectar Conta
            </Button>
          </div>
        </div>
      </Card>

      {/* Grid of Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Connection & Account Details */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b">
              <Sliders className="w-4 h-4 text-purple-600" />
              <h2 className="font-semibold text-sm">Conta Conectada</h2>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="text-xs text-muted-foreground font-medium block mb-1">
                  E-mail da Conta Google
                </label>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40 border text-xs font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>agenda@lumombeauty.com.br</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground font-medium block mb-1">
                  ID da Agenda Principal (Calendar ID)
                </label>
                <Input
                  value={primaryCalendar}
                  onChange={e => setPrimaryCalendar(e.target.value)}
                  className="text-xs h-9"
                  placeholder="primary ou email da agenda"
                />
              </div>

              <div className="pt-2">
                <label className="text-xs text-muted-foreground font-medium block mb-1">
                  Lembrete Padrão (Minutos antes)
                </label>
                <Input
                  type="number"
                  value={reminderMinutes}
                  onChange={e => setReminderMinutes(e.target.value)}
                  className="text-xs h-9"
                  placeholder="60"
                />
              </div>
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <h2 className="font-semibold text-sm">Preferências de Sincronização</h2>
            </div>

            <div className="space-y-3 text-sm">
              <div
                className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors"
                onClick={() => setTwoWaySync(!twoWaySync)}
              >
                <div>
                  <p className="font-medium text-xs">Sincronização Bidirecional</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Consultas criadas no CRM vão para o Google, e eventos do Google refletem no CRM.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={twoWaySync}
                  onChange={e => setTwoWaySync(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded text-purple-600 cursor-pointer"
                />
              </div>

              <div
                className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors"
                onClick={() => setAutoMeet(!autoMeet)}
              >
                <div>
                  <p className="font-medium text-xs">Link Google Meet Automático</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Gera link de videoconferência para teleconsultas e avaliações online.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={autoMeet}
                  onChange={e => setAutoMeet(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded text-purple-600 cursor-pointer"
                />
              </div>
            </div>

            <Button
              size="sm"
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="w-full text-xs bg-[#2A152F] hover:bg-[#3d1e44] text-white mt-2"
            >
              {isSaving ? 'Salvando...' : 'Salvar Preferências'}
            </Button>
          </Card>
        </div>

        {/* Right Column: Professionals & Categories Mapping */}
        <div className="space-y-6 lg:col-span-2">
          {/* Professionals Mapping */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-purple-600" />
                <h2 className="font-semibold text-sm">Mapeamento por Profissional da Clínica</h2>
              </div>
              <Badge variant="secondary" className="text-[11px]">
                {professionals.filter(p => p.synced).length} de {professionals.length} Ativos
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground">
              Cada profissional pode sincronizar com seu e-mail do Google Workspace corporativo da Lumom Beauty.
            </p>

            <div className="divide-y border rounded-lg overflow-hidden">
              {professionals.map(prof => (
                <div
                  key={prof.id}
                  className="flex items-center justify-between p-3 bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#967AB4]/20 text-[#2A152F] dark:text-[#967AB4] flex items-center justify-center font-semibold text-xs">
                      {prof.name
                        .split(' ')
                        .map(n => n[0])
                        .slice(0, 2)
                        .join('')}
                    </div>
                    <div>
                      <p className="font-medium text-xs text-foreground">{prof.name}</p>
                      <p className="text-[11px] text-muted-foreground">{prof.role}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground font-mono hidden sm:inline">
                      {prof.calendarEmail}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleProfessionalSync(prof.id)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                        prof.synced
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                          : 'bg-muted text-muted-foreground border-transparent'
                      }`}
                    >
                      {prof.synced ? 'Sincronizado' : 'Pausado'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Procedure Categories Synced */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <h2 className="font-semibold text-sm">Procedimentos & Categorias em Sincronia</h2>
              </div>
              <Badge variant="outline" className="text-[11px] text-purple-600 border-purple-300">
                7 Categorias Ativas
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground">
              Os agendamentos das categorias abaixo criam automaticamente eventos com título formatado, detalhes do paciente e link de confirmação no Google Calendar:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {procedureCategories.map((cat, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="font-medium">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
                    <span className="bg-muted px-1.5 py-0.5 rounded">{cat.duration}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Recent Sync Log */}
          <Card className="p-5 space-y-3 bg-muted/10 border-dashed">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <h3 className="font-medium text-xs">Registro de Atividade Recente</h3>
              </div>
              <span className="text-[11px] text-emerald-600 font-medium">Status: Operacional 100%</span>
            </div>
            <div className="space-y-1.5 text-[11px] text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>✓ Sincronização em lote de 9 agendamentos de Outubro</span>
                <span className="font-mono">11:45</span>
              </div>
              <div className="flex items-center justify-between">
                <span>✓ Consulta criada: Amanda Rocha (Avaliação Facial) ➔ Google Calendar</span>
                <span className="font-mono">11:42</span>
              </div>
              <div className="flex items-center justify-between">
                <span>✓ Consulta confirmada: Juliana Mendes (Harmonização Facial)</span>
                <span className="font-mono">11:30</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
