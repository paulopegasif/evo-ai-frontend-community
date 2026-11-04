import {
  CalendarCheck,
  CheckCircle2,
  DollarSign,
  Megaphone,
  MessageCircle,
  Receipt,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import DashboardMetricCard from '@/pages/Customer/Dashboard/components/DashboardMetricCard';
import type { LeadTrackingKPIs } from '@/types/leadTracking';
import type { KpiComparer } from '../compare';
import { currencyOrDash, formatCurrency, formatNumber, percentOrDash, plural, roasOrDash } from './format';

interface Props {
  kpis?: LeadTrackingKPIs;
  compare: KpiComparer;
}

const ACCENT = 'bg-primary/15 text-primary';
const currency = (value: number | null) => currencyOrDash(value);
const count = (value: number | null) => formatNumber(value);

const Block = ({ title, description, children }: { title: string; description: string; children: React.ReactNode }) => (
  <section className="space-y-3">
    <div>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">{children}</div>
  </section>
);

/** Acquisition → conversion → return, the three questions management asks. */
const ExecutiveSummary = ({ kpis, compare }: Props) => {
  const ads = Boolean(kpis?.has_ad_spend);
  // Same base as the funnel: leads of the period who attended ÷ who scheduled. The agenda's
  // show rate counts appointments of any lead and lives in the Agenda section.
  const scheduledToAttended = kpis?.total_scheduled
    ? ((kpis.total_attended ?? 0) / kpis.total_scheduled) * 100
    : null;

  return (
    <div className="space-y-6">
      <Block title="Aquisição" description="Quanto custa trazer cada pessoa">
        {ads && (
          <DashboardMetricCard
            title="Investimento"
            value={formatCurrency(kpis?.ad_spend ?? 0)}
            subtitle={`${formatNumber(kpis?.conversations ?? 0)} conversas iniciadas`}
            icon={Megaphone}
            accentClassName={ACCENT}
            importance="primary"
            comparison={compare('ad_spend', currency, 'neutral')}
          />
        )}
        {ads && (
          <DashboardMetricCard
            title="Custo por conversa"
            value={currencyOrDash(kpis?.cost_per_conversation)}
            subtitle={`${percentOrDash(kpis?.lead_capture_rate)} viraram lead no CRM`}
            icon={MessageCircle}
            accentClassName={ACCENT}
            comparison={compare('cost_per_conversation', currency, 'lower_is_better')}
          />
        )}
        <DashboardMetricCard
          title="Novos leads"
          value={kpis?.total_leads ?? 0}
          subtitle={`${formatNumber(kpis?.ad_leads ?? 0)} de anúncio · ${percentOrDash(kpis?.qualification_rate)} qualificados`}
          icon={Users}
          accentClassName={ACCENT}
          importance="primary"
          tooltip={{
            title: 'Novos leads',
            content:
              'Pessoas que entraram no período. Recompras não contam. Qualificados: agendaram avaliação ou chegaram a uma etapa marcada como qualificada.',
          }}
          comparison={compare('total_leads', count)}
        />
        {ads && (
          <DashboardMetricCard
            title="Custo por lead (CPL)"
            value={currencyOrDash(kpis?.avg_cpl)}
            subtitle="Investimento ÷ leads de anúncio"
            icon={Target}
            accentClassName={ACCENT}
            comparison={compare('avg_cpl', currency, 'lower_is_better')}
          />
        )}
      </Block>

      <Block title="Conversão" description="Onde o funil avança e quanto custa cada etapa">
        <DashboardMetricCard
          title="Agendaram"
          value={kpis?.total_scheduled ?? 0}
          subtitle={`${percentOrDash(kpis?.scheduling_rate)} dos leads${ads && kpis?.cost_per_scheduled != null ? ` · ${currencyOrDash(kpis.cost_per_scheduled)} por agendamento` : ''}`}
          icon={CalendarCheck}
          accentClassName={ACCENT}
          comparison={compare('total_scheduled', count)}
        />
        <DashboardMetricCard
          title="Compareceram"
          value={kpis?.total_attended ?? 0}
          subtitle={`${percentOrDash(scheduledToAttended)} dos que agendaram${ads && kpis?.cost_per_attended != null ? ` · ${currencyOrDash(kpis.cost_per_attended)} cada` : ''}`}
          icon={CheckCircle2}
          accentClassName={ACCENT}
          comparison={compare('total_attended', count)}
        />
        <DashboardMetricCard
          title="Vendas"
          value={kpis?.total_won ?? 0}
          subtitle={`${percentOrDash(kpis?.conversion_rate)} dos leads`}
          icon={Sparkles}
          accentClassName={ACCENT}
          importance="primary"
          comparison={compare('total_won', count)}
        />
        <DashboardMetricCard
          title="Sem desfecho"
          value={kpis?.total_no_outcome ?? 0}
          subtitle="Avaliações passadas sem status atualizado"
          icon={Receipt}
          accentClassName="bg-amber-500/15 text-amber-600"
          tooltip={{
            title: 'Sem desfecho',
            content: 'Agendamentos com data passada que continuam como agendados ou confirmados. Atualize na Agenda.',
          }}
        />
      </Block>

      <Block title="Retorno" description="Se o investimento volta como receita">
        <DashboardMetricCard
          title="Receita dos novos leads"
          value={formatCurrency(kpis?.cohort_revenue ?? 0)}
          subtitle={plural(kpis?.total_won ?? 0, 'venda', 'vendas')}
          icon={TrendingUp}
          accentClassName={ACCENT}
          importance="primary"
          comparison={compare('cohort_revenue', currency)}
        />
        {ads && (
          <DashboardMetricCard
            title="ROAS"
            value={roasOrDash(kpis?.roas)}
            subtitle={`${formatCurrency(kpis?.ad_revenue ?? 0)} vindos de anúncios`}
            icon={DollarSign}
            accentClassName={ACCENT}
            tooltip={{ title: 'ROAS', content: 'Receita dos leads de anúncio do período ÷ investimento.' }}
            comparison={compare('roas', roasOrDash)}
          />
        )}
        {ads && (
          <DashboardMetricCard
            title="CAC"
            value={currencyOrDash(kpis?.ad_cac)}
            subtitle={plural(kpis?.ad_won ?? 0, 'venda de anúncio', 'vendas de anúncio')}
            icon={Wallet}
            accentClassName={ACCENT}
            comparison={compare('ad_cac', currency, 'lower_is_better')}
          />
        )}
        <DashboardMetricCard
          title="Ticket médio"
          value={currencyOrDash(kpis?.won_ticket)}
          subtitle="Receita ÷ vendas dos novos leads"
          icon={Receipt}
          accentClassName={ACCENT}
          comparison={compare('won_ticket', currency)}
        />
      </Block>
    </div>
  );
};

export default ExecutiveSummary;
