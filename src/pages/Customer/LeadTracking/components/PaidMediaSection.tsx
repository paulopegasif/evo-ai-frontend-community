import { Eye, MessageCircle, MousePointerClick, Percent, Receipt, UserPlus } from 'lucide-react';
import DashboardMetricCard from '@/pages/Customer/Dashboard/components/DashboardMetricCard';
import type { LeadTrackingKPIs } from '@/types/leadTracking';
import type { KpiComparer } from '../compare';
import { currencyOrDash, formatNumber, percentOrDash } from './format';

interface PaidMediaSectionProps {
  kpis: LeadTrackingKPIs;
  compare: KpiComparer;
}

const ACCENT = 'bg-primary/15 text-primary';
const currency = (value: number | null) => currencyOrDash(value);
const count = (value: number | null) => formatNumber(value);
const percent = (value: number | null) => percentOrDash(value);

const META_NOTE =
  'Medido pela Meta (atribuição de 7 dias após o clique no anúncio). Não é o mesmo número de leads registrados no CRM.';

/** Delivery and results reported by Meta, then what those ads produced in the CRM. */
const PaidMediaSection = ({ kpis, compare }: PaidMediaSectionProps) => {
  const isClickToWhatsApp = kpis.conversations > 0 && kpis.meta_leads === 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DashboardMetricCard
          title="Conversas iniciadas na Meta"
          value={formatNumber(kpis.conversations)}
          subtitle={`${currencyOrDash(kpis.cost_per_conversation)} por conversa`}
          icon={MessageCircle}
          accentClassName={ACCENT}
          importance="primary"
          tooltip={{ title: 'Conversas iniciadas', content: META_NOTE }}
          comparison={compare('conversations', count)}
        />
        {isClickToWhatsApp ? (
          <DashboardMetricCard
            title="Taxa Conversa → Lead CRM"
            value={percentOrDash(kpis.lead_capture_rate)}
            subtitle={`${formatNumber(kpis.ad_leads)} leads de anúncio no CRM`}
            icon={Percent}
            accentClassName={ACCENT}
            importance="primary"
            tooltip={{
              title: 'Taxa de Captação no CRM',
              content:
                'Percentual de conversas do WhatsApp que geraram cadastro de lead no CRM (leads de anúncio ÷ conversas × 100). Em campanhas Click-to-WhatsApp, os leads chegam diretamente pelo chat em vez de formulários nativos da Meta.',
            }}
            comparison={compare('lead_capture_rate', percent)}
          />
        ) : (
          <DashboardMetricCard
            title="Leads na Meta"
            value={formatNumber(kpis.meta_leads)}
            subtitle={`${currencyOrDash(kpis.cost_per_meta_lead)} por lead (formulários)`}
            icon={UserPlus}
            accentClassName={ACCENT}
            tooltip={{ title: 'Leads na Meta', content: `Leads de formulário instantâneo. ${META_NOTE}` }}
            comparison={compare('meta_leads', count)}
          />
        )}
      </div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <DashboardMetricCard
        title="Impressões"
        value={formatNumber(kpis.impressions)}
        subtitle={`CPM ${currencyOrDash(kpis.cpm)}`}
        icon={Eye}
        accentClassName={ACCENT}
        tooltip={{ title: 'CPM', content: 'Custo por mil impressões: investimento ÷ impressões × 1.000.' }}
        comparison={compare('impressions', count)}
      />
      <DashboardMetricCard
        title="Cliques no link"
        value={formatNumber(kpis.link_clicks)}
        subtitle={`CPC ${currencyOrDash(kpis.cpc)}`}
        icon={MousePointerClick}
        accentClassName={ACCENT}
        tooltip={{ title: 'CPC', content: 'Custo por clique no link: investimento ÷ cliques no link.' }}
        comparison={compare('link_clicks', count)}
      />
      <DashboardMetricCard
        title="CTR"
        value={percentOrDash(kpis.ctr, 2)}
        subtitle="Cliques no link ÷ impressões"
        icon={Percent}
        accentClassName={ACCENT}
        comparison={compare('ctr', percent)}
      />
      <DashboardMetricCard
        title="CPC"
        value={currencyOrDash(kpis.cpc)}
        subtitle="Investimento ÷ cliques no link"
        icon={Receipt}
        accentClassName={ACCENT}
        comparison={compare('cpc', currency, 'lower_is_better')}
      />
    </div>

  </div>
  );
};

export default PaidMediaSection;
