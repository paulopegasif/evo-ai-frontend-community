import {
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
import type { LeadTrackingKPIs, TimelineDataPoint } from '@/types/leadTracking';
import { SERIES } from './chartConfig';
import type { KpiComparer } from '../compare';
import { currencyOrDash, formatCurrency, formatNumber, percentOrDash, plural, roasOrDash } from './format';

interface Props {
  kpis?: LeadTrackingKPIs;
  compare: KpiComparer;
  /** Period timeline, drawn as sparklines on the volume tiles. */
  timeline?: TimelineDataPoint[];
}

const ACCENT = 'bg-primary/10 text-primary';
const currency = (value: number | null) => currencyOrDash(value);
const count = (value: number | null) => formatNumber(value);

const Block = ({ title, description, children }: { title: string; description: string; children: React.ReactNode }) => (
  <section className="flex flex-col gap-3">
    <div>
      <h2 className="font-semibold text-base">{title}</h2>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">{children}</div>
  </section>
);

/** Acquisition → conversion → return, the three questions management asks. */
const ExecutiveSummary = ({ kpis, compare, timeline = [] }: Props) => {
  const ads = Boolean(kpis?.has_ad_spend);
  const series = (key: 'leads' | 'spend') => timeline.map((point) => point[key] ?? 0);
  const wonTicket = kpis?.total_won ? (kpis.cohort_revenue ?? 0) / kpis.total_won : null;

  return (
    <div className="space-y-6">
      <Block title="Aquisição" description="Quanto custa trazer cada contato">
        {ads && (
          <DashboardMetricCard
            loading={!kpis}
            title="Investimento"
            value={formatCurrency(kpis?.ad_spend ?? 0)}
            subtitle={`${formatNumber(kpis?.conversations ?? 0)} conversas iniciadas`}
            icon={Megaphone}
            accentClassName={ACCENT}
            importance="primary"
            comparison={compare('ad_spend', currency, 'neutral')}
            sparkline={series('spend')}
            sparklineColor={SERIES.spend.color}
          />
        )}
        {ads && (
          <DashboardMetricCard
            loading={!kpis}
            title="Custo por conversa"
            value={currencyOrDash(kpis?.cost_per_conversation)}
            subtitle={`${percentOrDash(kpis?.lead_capture_rate)} viraram lead no CRM`}
            icon={MessageCircle}
            accentClassName={ACCENT}
            comparison={compare('cost_per_conversation', currency, 'lower_is_better')}
          />
        )}
        <DashboardMetricCard
          loading={!kpis}
          title="Novos leads"
          value={kpis?.total_leads ?? 0}
          subtitle={`${formatNumber(kpis?.ad_leads ?? 0)} de anúncio · ${percentOrDash(kpis?.qualification_rate)} qualificados`}
          icon={Users}
          accentClassName={ACCENT}
          importance="primary"
          tooltip={{
            title: 'Novos leads',
            content:
              'Contatos que entraram no período por tráfego pago, outbound B2B e campanhas. Qualificados: chegaram a uma etapa marcada como qualificada no pipeline.',
          }}
          comparison={compare('total_leads', count)}
          sparkline={series('leads')}
          sparklineColor={SERIES.leads.color}
        />
        {ads && (
          <DashboardMetricCard
            loading={!kpis}
            title="Custo por lead (CPL)"
            value={currencyOrDash(kpis?.avg_cpl)}
            subtitle="Investimento ÷ leads de anúncio"
            icon={Target}
            accentClassName={ACCENT}
            comparison={compare('avg_cpl', currency, 'lower_is_better')}
          />
        )}
      </Block>

      <Block title="Conversão" description="Quantos leads avançam no funil comercial">
        <DashboardMetricCard
          loading={!kpis}
          title="Leads qualificados"
          value={kpis?.total_qualified ?? 0}
          subtitle={`${percentOrDash(kpis?.qualification_rate)} dos leads`}
          icon={CheckCircle2}
          accentClassName={ACCENT}
          tooltip={{ title: 'Leads qualificados', content: 'Leads do período com oportunidade ativa ou que chegaram a uma etapa marcada como qualificada.' }}
          comparison={compare('total_qualified', count)}
        />
        <DashboardMetricCard
          loading={!kpis}
          title="Assinantes"
          value={kpis?.total_won ?? 0}
          subtitle={`${percentOrDash(kpis?.conversion_rate)} dos leads`}
          icon={Sparkles}
          accentClassName={ACCENT}
          importance="primary"
          tooltip={{ title: 'Assinantes', content: 'Leads do período convertidos em clientes assinantes no pipeline.' }}
          comparison={compare('total_won', count)}
        />
      </Block>

      <Block title="Retorno" description="Se o investimento volta como receita">
        <DashboardMetricCard
          loading={!kpis}
          title="Receita dos novos leads"
          value={formatCurrency(kpis?.cohort_revenue ?? 0)}
          subtitle={plural(kpis?.total_won ?? 0, 'assinatura', 'assinaturas')}
          icon={TrendingUp}
          accentClassName={ACCENT}
          importance="primary"
          comparison={compare('cohort_revenue', currency)}
        />
        {ads && (
          <DashboardMetricCard
            loading={!kpis}
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
            loading={!kpis}
            title="CAC"
            value={currencyOrDash(kpis?.ad_cac)}
            subtitle={plural(kpis?.ad_won ?? 0, 'assinante de anúncio', 'assinantes de anúncio')}
            icon={Wallet}
            accentClassName={ACCENT}
            comparison={compare('ad_cac', currency, 'lower_is_better')}
          />
        )}
        <DashboardMetricCard
          loading={!kpis}
          title="Ticket médio"
          value={currencyOrDash(wonTicket)}
          subtitle="Receita ÷ assinantes dos novos leads"
          icon={Receipt}
          accentClassName={ACCENT}
        />
      </Block>
    </div>
  );
};

export default ExecutiveSummary;
