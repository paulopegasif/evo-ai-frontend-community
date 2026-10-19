import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  Users,
  CalendarCheck,
  CheckCircle2,
  DollarSign,
  BarChart3,
  PieChart as PieChartIcon,
  Layers,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { leadTrackingService } from '@/services/dashboard/leadTrackingService';
import { usersService } from '@/services/users';
import type {
  LeadTrackingDashboardResponse,
  LeadTrackingParams,
} from '@/types/leadTracking';
import { toast } from 'sonner';

export const LeadTrackingPage: React.FC = () => {
  const [data, setData] = useState<LeadTrackingDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodPreset, setPeriodPreset] = useState<'7d' | '30d' | 'month'>('30d');
  const [selectedUser, setSelectedUser] = useState<string>('__all__');
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);

  // Load Users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        if (usersService.getUsers) {
          const uList = await usersService.getUsers();
          if (Array.isArray(uList)) {
            setUsers(uList.map((u: any) => ({ id: u.id, name: u.name || u.display_name || u.email })));
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchUsers();
  }, []);

  const fetchTrackingData = useCallback(async () => {
    try {
      setLoading(true);
      const untilDate = new Date();
      const sinceDate = new Date();

      if (periodPreset === '7d') {
        sinceDate.setDate(untilDate.getDate() - 7);
      } else if (periodPreset === 'month') {
        sinceDate.setDate(1); // 1st of current month
      } else {
        sinceDate.setDate(untilDate.getDate() - 30);
      }

      const params: LeadTrackingParams = {
        since: Math.floor(sinceDate.getTime() / 1000),
        until: Math.floor(untilDate.getTime() / 1000),
      };

      if (selectedUser !== '__all__') {
        params.user_id = selectedUser;
      }

      const res = await leadTrackingService.getLeadTrackingData(params);
      setData(res);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar dados de tracking de leads.');
    } finally {
      setLoading(false);
    }
  }, [periodPreset, selectedUser]);

  useEffect(() => {
    fetchTrackingData();
  }, [fetchTrackingData]);

  // Lumom Brand Colors
  const LUMOM_PALETTE = ['#2A152F', '#5C2D63', '#967AB4', '#B8A1CF', '#E4D9F0', '#3B82F6', '#10B981', '#F59E0B'];

  const kpis = data?.kpis;
  const funnel = data?.funnel || [];
  const sources = data?.sources || [];
  const campaigns = data?.campaigns || [];
  const professionals = data?.professionals || [];
  const categories = data?.categories || [];
  const timeline = data?.timeline || [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-100 dark:bg-purple-950/60 rounded-xl text-purple-700 dark:text-purple-300 shadow-2xs">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              Tracking de Leads & Funil
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                Lumom Beauty
              </span>
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Rastreamento de campanhas UTM, conversão do funil de vendas, show rate e performance de procedimentos
            </p>
          </div>
        </div>

        {/* Controls: Period & Professional Filter */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Professional select */}
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-medium focus:ring-2 focus:ring-purple-500/20"
          >
            <option value="__all__">Todos os Profissionais</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          {/* Preset Buttons */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5 border border-zinc-200 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => setPeriodPreset('7d')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                periodPreset === '7d'
                  ? 'bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-300 shadow-2xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
              }`}
            >
              7 dias
            </button>
            <button
              type="button"
              onClick={() => setPeriodPreset('30d')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                periodPreset === '30d'
                  ? 'bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-300 shadow-2xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
              }`}
            >
              30 dias
            </button>
            <button
              type="button"
              onClick={() => setPeriodPreset('month')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                periodPreset === 'month'
                  ? 'bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-300 shadow-2xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
              }`}
            >
              Este Mês
            </button>
          </div>

          <button
            type="button"
            onClick={fetchTrackingData}
            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-all"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total Leads */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Total de Leads
            </span>
            <div className="p-1.5 bg-purple-50 dark:bg-purple-950/40 text-purple-600 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {kpis?.total_leads || 0}
            </span>
            <span className="text-xs text-purple-600 font-medium flex items-center">
              {kpis?.qualification_rate || 0}% qualificados
            </span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-400">
            {kpis?.total_qualified || 0} leads prontos para atendimento
          </div>
        </div>

        {/* Taxa de Agendamento */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Taxa de Agendamento
            </span>
            <div className="p-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-lg">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {kpis?.scheduling_rate || 0}%
            </span>
            <span className="text-xs text-zinc-500 font-medium">
              ({kpis?.total_scheduled || 0} agendados)
            </span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-400">
            {kpis?.total_confirmed || 0} confirmados na agenda
          </div>
        </div>

        {/* Show Rate */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Show Rate (Presença)
            </span>
            <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {kpis?.show_rate || 0}%
            </span>
            <span className="text-xs text-emerald-600 font-medium">
              {kpis?.total_attended || 0} atenderam
            </span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-400">
            {kpis?.total_no_show || 0} faltas (no-show) registradas
          </div>
        </div>

        {/* Taxa de Conversão */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Taxa de Conversão
            </span>
            <div className="p-1.5 bg-purple-50 dark:bg-purple-950/40 text-purple-600 rounded-lg">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {kpis?.conversion_rate || 0}%
            </span>
            <span className="text-xs text-purple-600 font-medium">
              {kpis?.total_won || 0} vendas
            </span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-400">
            Lead para procedimento fechado
          </div>
        </div>

        {/* Faturamento Total */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Faturamento Gerado
            </span>
            <div className="p-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              R$ {kpis?.total_revenue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-400">
            Ticket Médio: R$ {kpis?.average_ticket?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
          </div>
        </div>
      </div>

      {/* Funnel Visual Section */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-600" />
              Funil de Aquisição & Conversão Lumom
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Jornada de passagem do lead desde a captura até o procedimento realizado
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {funnel.map((f, idx) => (
            <div
              key={f.stage}
              className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex flex-col justify-between relative group hover:border-purple-300 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  {idx + 1}. {f.stage}
                </span>
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                  {f.percentage}%
                </span>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">
                  {f.count}
                </span>
                <span className="text-xs text-zinc-400 ml-1.5">leads</span>
              </div>
              <div className="mt-3 w-full bg-zinc-200 dark:bg-zinc-700 h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max(f.percentage, 5)}%`,
                    backgroundColor: f.color || '#967AB4',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Charts: Timeline & Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline Area Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-600" />
                Evolução Temporal: Leads x Agendamentos x Presenças
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Volume diário de novos contatos e atendimentos realizados na clínica
              </p>
            </div>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2A152F" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#2A152F" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorScheduled" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#967AB4" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#967AB4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorAttended" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="label" fontSize={11} stroke="#888888" />
                <YAxis fontSize={11} stroke="#888888" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(24, 24, 27, 0.95)',
                    borderColor: '#3f3f46',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="leads" name="Novos Leads" stroke="#2A152F" fillOpacity={1} fill="url(#colorLeads)" />
                <Area type="monotone" dataKey="scheduled" name="Agendados" stroke="#967AB4" fillOpacity={1} fill="url(#colorScheduled)" />
                <Area type="monotone" dataKey="attended" name="Compareceram (Show)" stroke="#10B981" fillOpacity={1} fill="url(#colorAttended)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Source Donut Chart (1 col) */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-purple-600" />
              Origem dos Leads (Canais)
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Distribuição por canal de entrada e campanhas
            </p>
          </div>

          <div className="h-[210px] w-full my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sources}
                  dataKey="leads"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                >
                  {sources.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={LUMOM_PALETTE[index % LUMOM_PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(24, 24, 27, 0.95)',
                    borderColor: '#3f3f46',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 border-t border-zinc-100 dark:border-zinc-800 pt-3">
            {sources.slice(0, 4).map((s, idx) => (
              <div key={s.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                    style={{ backgroundColor: LUMOM_PALETTE[idx % LUMOM_PALETTE.length] }}
                  />
                  <span className="truncate">{s.name}</span>
                </span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 ml-2">
                  {s.leads} leads ({s.conversion_rate}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tables: UTM Campaigns & Professional Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* UTM Campaigns Table */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Performance de Campanhas (UTMs)
            </h3>
            <span className="text-xs text-zinc-400">{campaigns.length} campanhas</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-semibold uppercase tracking-wider">
                  <th className="pb-2">Campanha</th>
                  <th className="pb-2 text-center">Leads</th>
                  <th className="pb-2 text-center">Agendados</th>
                  <th className="pb-2 text-center">Conv. %</th>
                  <th className="pb-2 text-right">Receita (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-zinc-400">
                      Nenhuma campanha encontrada no período.
                    </td>
                  </tr>
                ) : (
                  campaigns.map((c) => (
                    <tr key={c.name} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
                      <td className="py-2.5 font-medium text-zinc-900 dark:text-zinc-100">
                        <div>{c.name}</div>
                        <div className="text-[10px] text-zinc-400">{c.source}</div>
                      </td>
                      <td className="py-2.5 text-center font-semibold text-zinc-700 dark:text-zinc-300">
                        {c.leads}
                      </td>
                      <td className="py-2.5 text-center text-blue-600 dark:text-blue-400 font-semibold">
                        {c.scheduled}
                      </td>
                      <td className="py-2.5 text-center">
                        <span className="px-2 py-0.5 rounded-full font-bold bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 text-[11px]">
                          {c.conversion_rate}%
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-bold text-zinc-900 dark:text-zinc-100">
                        R$ {c.revenue.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Procedures Categories Breakdown */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Desempenho por Procedimento / Categoria
            </h3>
            <span className="text-xs text-zinc-400">{categories.length} categorias</span>
          </div>

          <div className="space-y-3">
            {categories.map((cat) => (
              <div key={cat.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block"
                      style={{ backgroundColor: cat.color }}
                    />
                    {cat.name}
                  </span>
                  <span className="text-zinc-600 dark:text-zinc-400 font-medium">
                    {cat.count} consultas • R$ {cat.revenue.toFixed(2)} ({cat.share_percentage}%)
                  </span>
                </div>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(cat.share_percentage, 5)}%`,
                      backgroundColor: cat.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Desempenho por Profissional */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-600" />
            Desempenho por Profissional & Taxa de Comparecimento
          </h3>
          <span className="text-xs text-zinc-400">{professionals.length} profissionais</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-semibold uppercase tracking-wider">
                <th className="pb-2">Profissional</th>
                <th className="pb-2 text-center">Total Consultas</th>
                <th className="pb-2 text-center">Compareceram</th>
                <th className="pb-2 text-center">Faltas (No-Show)</th>
                <th className="pb-2 text-center">Show Rate (%)</th>
                <th className="pb-2 text-right">Faturamento Gerado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {professionals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-zinc-400">
                    Nenhum atendimento registrado para os profissionais no período.
                  </td>
                </tr>
              ) : (
                professionals.map((p) => (
                  <tr key={p.user_id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
                    <td className="py-2.5 font-bold text-zinc-900 dark:text-zinc-100">
                      {p.name}
                    </td>
                    <td className="py-2.5 text-center font-semibold text-zinc-700 dark:text-zinc-300">
                      {p.total}
                    </td>
                    <td className="py-2.5 text-center text-emerald-600 dark:text-emerald-400 font-semibold">
                      {p.attended}
                    </td>
                    <td className="py-2.5 text-center text-rose-600 dark:text-rose-400 font-semibold">
                      {p.no_show}
                    </td>
                    <td className="py-2.5 text-center">
                      <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[11px]">
                        {p.show_rate}%
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-bold text-zinc-900 dark:text-zinc-100">
                      R$ {p.revenue.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LeadTrackingPage;
