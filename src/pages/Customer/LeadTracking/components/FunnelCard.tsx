import { ChevronRight, Layers } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@evoapi/design-system';
import { TooltipInfo } from '@/components/base/TooltipInfo';
import type { FunnelStage } from '@/types/leadTracking';
import { percentOrDash } from './format';

interface FunnelCardProps {
  funnel: FunnelStage[];
}

const FunnelCard = ({ funnel }: FunnelCardProps) => {
  const leads = funnel[0]?.count || 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          Funil de aquisição e conversão
          <TooltipInfo
            title="Como o funil é calculado"
            content="Acompanha as pessoas que viraram lead no período, em todas as consultas delas (inclusive futuras). Cada etapa é um subconjunto da anterior: agendaram = têm consulta não cancelada; compareceram = têm consulta realizada; converteram = compareceram e pagaram ou foram fechadas no pipeline."
          />
        </CardTitle>
        <CardDescription>Pessoas que entraram no período, da captura à venda</CardDescription>
      </CardHeader>
      <CardContent>
        {leads === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhum lead no período.</p>
        ) : (
          <ol className="space-y-2.5">
            {funnel.map((stage, idx) => (
              <li key={stage.key} className="grid grid-cols-[minmax(110px,160px)_1fr_auto] items-center gap-3">
                <span className="text-sm text-muted-foreground truncate">{stage.stage}</span>
                <div className="h-7 w-full rounded-md bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-md bg-[var(--chart-1)] transition-all duration-500"
                    style={{ width: `${Math.max(((stage.count || 0) / leads) * 100, 1)}%`, opacity: 1 - idx * 0.12 }}
                  />
                </div>
                <div className="flex items-center gap-2 text-sm tabular-nums justify-end min-w-[150px]">
                  <span className="font-semibold">{stage.count}</span>
                  <span className="text-muted-foreground w-12 text-right">{percentOrDash(stage.percentage)}</span>
                  <span
                    className="flex items-center text-xs text-muted-foreground w-16 justify-end"
                    title="Em relação à etapa anterior"
                  >
                    {stage.step_rate != null && (
                      <>
                        <ChevronRight className="h-3 w-3" />
                        {percentOrDash(stage.step_rate)}
                      </>
                    )}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
};

export default FunnelCard;
