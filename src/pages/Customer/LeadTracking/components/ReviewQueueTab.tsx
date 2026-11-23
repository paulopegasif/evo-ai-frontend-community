import { useCallback, useEffect, useState } from 'react';
import { Inbox, Link2, Search, UserPlus, X } from '@/components/icons';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { contactsService } from '@/services/contacts/contactsService';
import { leadTrackingService } from '@/services/dashboard/leadTrackingService';
import type { UnlinkedSale } from '@/types/leadTracking';
import { formatCurrency } from './format';
import { formatDate } from './labels';

interface ContactHit {
  id: string;
  name: string;
  phone_number: string | null;
}

const REASONS: Record<UnlinkedSale['reason'], string> = {
  ambiguous_name: 'Mais de um lead com o mesmo nome',
  no_match: 'Nenhum lead com esse nome ou telefone',
};

const SaleCard = ({ sale, onResolved }: { sale: UnlinkedSale; onResolved: () => void }) => {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<ContactHit[]>([]);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<unknown>, message: string) => {
    setBusy(true);
    try {
      await action();
      toast.success(message);
      onResolved();
    } catch {
      toast.error('Não foi possível concluir a ação.');
    } finally {
      setBusy(false);
    }
  };

  const search = async () => {
    if (query.trim().length < 2) return;
    const response = await contactsService.searchContacts({ q: query.trim() });
    setHits((response.data ?? []).slice(0, 8).map((c) => ({ id: c.id, name: c.name, phone_number: c.phone_number ?? null })));
  };

  const options = [...sale.candidates, ...hits.filter((h) => !sale.candidates.some((c) => c.id === h.id))];

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs/5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{sale.customer_name}</p>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(sale.amount)} · {sale.category ?? 'Procedimento'} · {formatDate(sale.sold_at)}
          </p>
        </div>
        <Badge variant="warning">{REASONS[sale.reason]}</Badge>
      </div>

      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          placeholder="Buscar lead por nome ou telefone"
          aria-label="Buscar lead por nome ou telefone"
        />
        <Button variant="outline" size="icon" onClick={search} aria-label="Buscar">
          <Search />
        </Button>
      </div>

      {options.length > 0 && (
        <div className="divide-y overflow-hidden rounded-lg border">
          {options.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2 px-3 py-1.5">
              <span className="text-sm">
                {c.name} <span className="text-xs text-muted-foreground">{c.phone_number ?? 'sem telefone'}</span>
              </span>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => run(() => leadTrackingService.linkUnlinkedSale(sale.id, c.id), 'Venda ligada ao lead')}
              >
                <Link2 /> Ligar
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => run(() => leadTrackingService.createLeadFromSale(sale.id), 'Lead criado a partir da venda')}
        >
          <UserPlus /> Criar lead
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() => run(() => leadTrackingService.dismissUnlinkedSale(sale.id), 'Venda descartada')}
        >
          <X /> Descartar
        </Button>
      </div>
    </div>
  );
};

const ReviewQueueTab = () => {
  const [sales, setSales] = useState<UnlinkedSale[] | null>(null);

  const load = useCallback(() => {
    leadTrackingService
      .getUnlinkedSales()
      .then(setSales)
      .catch(() => toast.error('Erro ao carregar as vendas para revisão.'));
  }, []);

  useEffect(load, [load]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Vendas para revisão</CardTitle>
        <CardDescription>
          Vendas do Bitrix24 que não puderam ser ligadas a um lead automaticamente. Elas já contam no faturamento da agenda,
          mas só entram no retorno das campanhas depois de ligadas.
        </CardDescription>
      </CardHeader>
      <CardPanel className="flex flex-col gap-3">
        {!sales &&
          Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-36 w-full rounded-xl" />)}
        {sales?.map((sale) => <SaleCard key={sale.id} sale={sale} onResolved={load} />)}
        {sales && sales.length === 0 && (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Inbox />
              </EmptyMedia>
              <EmptyTitle>Nenhuma venda pendente.</EmptyTitle>
              <EmptyDescription>Vendas do Bitrix24 que não puderam ser ligadas a um lead automaticamente.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </CardPanel>
    </Card>
  );
};

export default ReviewQueueTab;
