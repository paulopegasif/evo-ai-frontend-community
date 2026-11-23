import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import EmptyState from '@/components/base/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardPanel } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Skeleton } from '@/components/ui/skeleton';
import SectionHeader from './SectionHeader';
import { Package, Cloud, Search } from '@/components/icons';
import { productsService } from '@/services/products/productsService';
import type { Agent } from '@/types/agents';
import type { Product } from '@/types/products';

interface Props {
  agent: Agent;
}

export default function ProductsSection({ agent }: Props) {
  const { t } = useLanguage('aiAgents');
  const tp = useLanguage('products').t;
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [attachedIds, setAttachedIds] = useState<Set<string>>(new Set());
  const [originalIds, setOriginalIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!agent?.id) return;
    setLoading(true);
    try {
      const [allRes, attachedRes] = await Promise.all([
        productsService.getProducts({ per_page: 500, status: 'active' }),
        productsService.listAgentProducts(agent.id),
      ]);
      setAllProducts(allRes.data ?? []);
      const ids = new Set((attachedRes ?? []).map((p) => p.id));
      setAttachedIds(ids);
      setOriginalIds(new Set(ids));
    } catch (error) {
      console.error(error);
      toast.error(tp('messages.loadError'));
    } finally {
      setLoading(false);
    }
  }, [agent?.id, tp]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (id: string) => {
    setAttachedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isDirty =
    attachedIds.size !== originalIds.size ||
    Array.from(attachedIds).some((id) => !originalIds.has(id));

  const handleSave = async () => {
    if (!agent?.id) return;
    setSaving(true);
    try {
      const toAttach = Array.from(attachedIds).filter((id) => !originalIds.has(id));
      const toDetach = Array.from(originalIds).filter((id) => !attachedIds.has(id));

      if (toAttach.length > 0) {
        await productsService.attachProductsToAgent(agent.id, toAttach);
      }
      for (const productId of toDetach) {
        await productsService.detachProductFromAgent(agent.id, productId);
      }

      setOriginalIds(new Set(attachedIds));
      toast.success(t('edit.products.saveSuccess') || 'Saved');
    } catch (error) {
      console.error(error);
      toast.error(t('edit.products.saveError') || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = allProducts.filter((p) =>
    search.trim() === '' ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        icon={Package}
        title={t('edit.products.title') || 'Produtos do agente'}
        description={
          t('edit.products.subtitle') ||
          'Selecione os produtos que este agente pode recomendar durante conversas. Eles serão injetados no system prompt automaticamente.'
        }
        action={
          <Button onClick={handleSave} disabled={!isDirty} loading={saving}>
            {saving ? t('edit.products.saving') || 'Salvando...' : t('edit.products.save') || 'Salvar'}
          </Button>
        }
      />

      <Card>
        <CardHeader className="flex-row items-center gap-3">
          <InputGroup className="max-w-md flex-1">
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              aria-label={tp('header.searchPlaceholder')}
              placeholder={tp('header.searchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </InputGroup>
          <Badge variant="secondary" className="tabular-nums">
            {attachedIds.size}/{allProducts.length}
          </Badge>
        </CardHeader>
        <CardPanel className="p-0">
          {loading ? (
            <div className="flex flex-col divide-y border-t" aria-busy="true">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <Skeleton className="size-4 rounded-sm" />
                  <Skeleton className="size-4 rounded-sm" />
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Skeleton className="h-3.5 w-1/3" />
                    <Skeleton className="h-3 w-1/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="border-t">
              <EmptyState icon={Package} title={tp('table.empty')} description="" />
            </div>
          ) : (
            <div className="flex max-h-[60vh] flex-col divide-y overflow-y-auto border-t">
              {filteredProducts.map(product => {
                const Icon = product.kind === 'digital' ? Cloud : Package;
                const checked = attachedIds.has(product.id);
                return (
                  <label
                    key={product.id}
                    className="flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent/50 has-data-checked:bg-primary/4"
                  >
                    <Checkbox checked={checked} onCheckedChange={() => toggle(product.id)} />
                    <Icon className="size-4 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-sm">{product.name}</div>
                      <div className="text-muted-foreground text-xs">
                        {tp(`kind.${product.kind}`)} · {product.currency}{' '}
                        {Number(product.default_price).toFixed(2)}
                      </div>
                    </div>
                    {product.sku && (
                      <span className="font-mono text-muted-foreground text-xs">{product.sku}</span>
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </CardPanel>
      </Card>
    </div>
  );
}
