import { ChevronRight, Layers } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from '@/components/ui/card';
import { TooltipInfo } from '@/components/base/TooltipInfo';
import type { FunnelStage } from '@/types/leadTracking';
import { percentOrDash } from './format';

interface FunnelCardProps {
  funnel: FunnelStage[];
}

const FunnelCard = ({ funnel }: FunnelCardProps) => {
  const leads = funnel[0]?.count || 0;

  return (
    <Card className="h-full">
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
      <CardPanel>
        {leads === 0 ? (
          <p className="py-6 text-center text-muted-foreground text-sm">Nenhum lead no período.</p>
        ) : (
          <ol className="space-y-2.5">
            {funnel.map((stage, idx) => (
              <li key={stage.key} className="grid grid-cols-[minmax(96px,170px)_minmax(0,1fr)_9.5rem] items-center gap-3">
                <span className="text-sm leading-tight text-muted-foreground break-words">{stage.stage}</span>
                <div className="h-7 w-full rounded-md bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-md bg-[var(--chart-1)] transition-all duration-500"
                    style={{ width: `${Math.max(((stage.count || 0) / leads) * 100, 1)}%`, opacity: 1 - idx * 0.12 }}
                  />
                </div>
                <div className="flex items-center gap-2 text-sm tabular-nums justify-end">
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
      </CardPanel>
    </Card>
  );
};

export default FunnelCard;
