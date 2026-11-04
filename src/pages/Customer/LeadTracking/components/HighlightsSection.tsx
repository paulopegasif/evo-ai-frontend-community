import type { LucideIcon } from 'lucide-react';
import { Award, BadgeDollarSign, MessageCircle, PiggyBank } from 'lucide-react';
import { Card, CardContent } from '@evoapi/design-system';
import {
  deltaToneClass,
  formatDelta,
  type MetricDirection,
} from '@/pages/Customer/Dashboard/components/metricComparison';
import type { CampaignPerformance } from '@/types/leadTracking';
import { variation } from '../periods';
import { currencyOrDash, formatNumber, roasOrDash } from './format';

interface HighlightsSectionProps {
  campaigns: CampaignPerformance[];
  /** Campaigns of the compared period, matched by campaign_key. */
  previousCampaigns?: CampaignPerformance[];
}

/** Fewer conversations than this make a cost per conversation too noisy to highlight. */
const MIN_CONVERSATIONS = 10;

interface Highlight {
  title: string;
  icon: LucideIcon;
  pick: (campaigns: CampaignPerformance[]) => CampaignPerformance | undefined;
  metric: (c: CampaignPerformance) => number | null;
  format: (value: number | null) => string;
  direction: MetricDirection;
}

const best = (
  campaigns: CampaignPerformance[],
  metric: (c: CampaignPerformance) => number | null,
  eligible: (c: CampaignPerformance) => boolean,
  lowest = false,
) =>
  campaigns
    .filter((c) => eligible(c) && metric(c) != null)
    .sort((a, b) => (lowest ? metric(a)! - metric(b)! : metric(b)! - metric(a)!))[0];

const HIGHLIGHTS: Highlight[] = [
  {
    title: 'Mais conversas',
    icon: MessageCircle,
    metric: (c) => c.conversations,
    pick: (cs) => best(cs, (c) => c.conversations, (c) => (c.conversations ?? 0) > 0),
    format: (v) => `${formatNumber(v)} conversas`,
    direction: 'higher_is_better',
  },
  {
    title: 'Menor custo por conversa',
    icon: PiggyBank,
    metric: (c) => c.cost_per_conversation,
    pick: (cs) => best(cs, (c) => c.cost_per_conversation, (c) => (c.conversations ?? 0) >= MIN_CONVERSATIONS, true),
    format: (v) => `${currencyOrDash(v)} por conversa`,
    direction: 'lower_is_better',
  },
  {
    title: 'Mais vendas no CRM',
    icon: Award,
    metric: (c) => c.won,
    pick: (cs) => best(cs, (c) => c.won, (c) => c.won > 0),
    format: (v) => `${formatNumber(v)} ${v === 1 ? 'venda' : 'vendas'}`,
    direction: 'higher_is_better',
  },
  {
    title: 'Melhor ROAS',
    icon: BadgeDollarSign,
    metric: (c) => c.roas,
    pick: (cs) => best(cs, (c) => c.roas, (c) => c.revenue > 0),
    format: (v) => `ROAS ${roasOrDash(v)}`,
    direction: 'higher_is_better',
  },
];

const HighlightsSection = ({ campaigns, previousCampaigns }: HighlightsSectionProps) => {
  const previousByKey = new Map(previousCampaigns?.map((c) => [c.campaign_key, c]));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {HIGHLIGHTS.map(({ title, icon: Icon, pick, metric, format, direction }) => {
        const campaign = pick(campaigns);
        const previous = campaign && previousByKey.get(campaign.campaign_key);
        const delta = campaign && previousCampaigns ? variation(metric(campaign), previous ? metric(previous) : null) : null;

        return (
          <Card key={title}>
            <CardContent className="p-4 space-y-1.5">
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Icon className="h-4 w-4 text-primary" />
                {title}
              </p>
              {campaign ? (
                <>
                  <p className="font-medium truncate" title={campaign.name}>
                    {campaign.name}
                  </p>
                  <p className="text-sm tabular-nums">
                    {format(metric(campaign))}
                    {previousCampaigns && (
                      <span className={`ml-2 text-xs ${deltaToneClass(delta, direction)}`}>
                        {delta == null ? 'sem base de comparação' : formatDelta(delta)}
                      </span>
                    )}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Sem dados suficientes</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default HighlightsSection;
