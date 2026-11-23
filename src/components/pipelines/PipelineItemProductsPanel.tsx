import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import { ConfirmDialog } from '@/components/base';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2 } from '@/components/icons';
import { productsService } from '@/services/products/productsService';
import type {
  PipelineItemProductLink,
  Product,
  ProductCurrency,
} from '@/types/products';

interface Props {
  pipelineItemId: string;
  canEdit?: boolean;
}

function formatPrice(value: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export default function PipelineItemProductsPanel({ pipelineItemId, canEdit = true }: Props) {
  const { t } = useLanguage('products');
  // Removing a product from the deal confirms first.
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [links, setLinks] = useState<PipelineItemProductLink[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [currency, setCurrency] = useState<ProductCurrency>('BRL');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [productOptions, setProductOptions] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    if (!pipelineItemId) return;
    setLoading(true);
    try {
      const res = await productsService.listPipelineItemProducts(pipelineItemId);
      setLinks(res.data ?? []);
      setTotalValue(res.meta?.total_value ?? 0);
      const first = res.data?.[0]?.currency;
      if (first) setCurrency(first as ProductCurrency);
    } catch (error) {
      console.error(error);
      toast.error(t('messages.loadError'));
    } finally {
      setLoading(false);
    }
  }, [pipelineItemId, t]);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = async () => {
    try {
      const res = await productsService.getProducts({ per_page: 500, status: 'active' });
      setProductOptions(res.data ?? []);
      setSelectedProductId('');
      setSelectedVariantId('');
      setQuantity(1);
      setNotes('');
      setAddOpen(true);
    } catch (error) {
      console.error(error);
      toast.error(t('messages.loadError'));
    }
  };

  const selectedProduct = productOptions.find((p) => p.id === selectedProductId);
  const variants = selectedProduct?.variants ?? [];

  const handleAdd = async () => {
    if (!selectedProductId || quantity < 1) return;
    setBusy(true);
    try {
      await productsService.addProductToPipelineItem(pipelineItemId, {
        product_id: selectedProductId,
        product_variant_id: selectedVariantId || null,
        quantity,
        notes: notes || undefined,
      });
      toast.success(t('pipelinePanel.added'));
      setAddOpen(false);
      load();
    } catch (error) {
      console.error(error);
      toast.error(t('pipelinePanel.addError'));
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (linkId: string) => {
    setBusy(true);
    try {
      await productsService.removeProductFromPipelineItem(pipelineItemId, linkId);
      toast.success(t('pipelinePanel.removed'));
      load();
    } catch (error) {
      console.error(error);
      toast.error(t('pipelinePanel.removeError'));
    } finally {
      setBusy(false);
    }
  };

  const productItems = productOptions.map(p => ({
    value: p.id,
    label: `${p.name} (${formatPrice(p.default_price, p.currency)})`,
  }));
  const variantItems = [
    { value: null, label: t('pipelinePanel.noVariant') },
    ...variants.map(v => ({ value: v.id, label: v.name })),
  ];
  const linkToRemove = links.find(link => link.id === removeId);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-sm">{t('pipelinePanel.title')}</h3>
          <p className="text-muted-foreground text-xs">
            {links.length === 0
              ? t('pipelinePanel.empty')
              : t('pipelinePanel.summary', { count: links.length, total: formatPrice(totalValue, currency) })}
          </p>
        </div>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={openAdd} disabled={busy}>
            <Plus />
            {t('pipelinePanel.add')}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col divide-y rounded-lg border" aria-busy="true">
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5">
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      ) : links.length === 0 ? (
        <p className="rounded-lg border border-dashed py-6 text-center text-muted-foreground text-sm">
          {t('pipelinePanel.emptyList')}
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {links.map(link => (
            <li key={link.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">
                  {link.product?.name}
                  {link.product_variant?.name && (
                    <span className="ms-1 text-muted-foreground text-xs">/ {link.product_variant.name}</span>
                  )}
                </div>
                <div className="text-muted-foreground text-xs tabular-nums">
                  {link.quantity} × {formatPrice(link.locked_unit_price, link.currency)}
                </div>
              </div>
              <div className="font-medium tabular-nums">{formatPrice(link.subtotal, link.currency)}</div>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setRemoveId(link.id)}
                  disabled={busy}
                  className="text-muted-foreground hover:text-destructive-foreground"
                  aria-label={`${t('actions.delete')} ${link.product?.name ?? ''}`}
                >
                  <Trash2 />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={removeId !== null}
        onOpenChange={open => !open && !busy && setRemoveId(null)}
        title={t('actions.delete')}
        description={linkToRemove?.product?.name}
        cancelLabel={t('actions.cancel')}
        confirmLabel={t('actions.delete')}
        onConfirm={async () => {
          if (removeId) await handleRemove(removeId);
          setRemoveId(null);
        }}
        loading={busy}
        variant="destructive"
      />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogPopup className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('pipelinePanel.add')}</DialogTitle>
          </DialogHeader>
          <DialogPanel className="flex flex-col gap-4">
            <Field>
              <FieldLabel>{t('pipelinePanel.product')}</FieldLabel>
              <Select
                items={productItems}
                value={selectedProductId || null}
                onValueChange={value => setSelectedProductId(value ? String(value) : '')}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('pipelinePanel.selectProduct')} />
                </SelectTrigger>
                <SelectPopup>
                  {productItems.map(item => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </Field>

            {variants.length > 0 && (
              <Field>
                <FieldLabel>{t('pipelinePanel.variant')}</FieldLabel>
                <Select
                  items={variantItems}
                  value={selectedVariantId || null}
                  onValueChange={value => setSelectedVariantId(value ? String(value) : '')}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('pipelinePanel.selectVariant')} />
                  </SelectTrigger>
                  <SelectPopup>
                    {variantItems.map(item => (
                      <SelectItem key={item.value ?? '__none__'} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              </Field>
            )}

            <Field>
              <FieldLabel>{t('pipelinePanel.quantity')}</FieldLabel>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={e => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              />
            </Field>

            <Field>
              <FieldLabel>{t('pipelinePanel.notes')}</FieldLabel>
              <Input value={notes} onChange={e => setNotes(e.target.value)} />
            </Field>
          </DialogPanel>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)} disabled={busy}>
              {t('actions.cancel')}
            </Button>
            <Button onClick={handleAdd} disabled={!selectedProductId || quantity < 1} loading={busy}>
              {t('pipelinePanel.add')}
            </Button>
          </DialogFooter>
        </DialogPopup>
      </Dialog>
    </div>
  );
}
