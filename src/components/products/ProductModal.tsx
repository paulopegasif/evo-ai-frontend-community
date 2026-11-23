import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from '@/components/icons';
import type {
  Product,
  ProductFormData,
  ProductVariantFormData,
  ProductKind,
  ProductStatus,
  ProductCurrency,
} from '@/types/products';

// default_price is nullable in the form so an empty input stays empty (not 0),
// letting validation require an explicit price. It is coerced on submit.
type ProductFormState = Omit<ProductFormData, 'default_price'> & { default_price: number | null };

interface Props {
  open: boolean;
  product?: Product | null;
  loading: boolean;
  errors?: Record<string, string>;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: ProductFormData, files?: File[]) => Promise<void>;
}

const KINDS: ProductKind[] = ['physical', 'digital'];
const STATUSES: ProductStatus[] = ['active', 'inactive', 'draft'];
const CURRENCIES: ProductCurrency[] = ['BRL', 'USD', 'EUR'];
const URL_REGEX = /^https?:\/\/.+/i;

// Empty input → null; non-numeric input (e.g. a pasted string) → null instead of NaN,
// which would otherwise leak into the payload and bypass form validation.
function toNumberOrNull(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function emptyForm(): ProductFormState {
  return {
    name: '',
    kind: 'physical',
    description: '',
    sku: '',
    default_price: null,
    currency: 'BRL',
    purchase_url: '',
    status: 'active',
    stock_quantity: null,
    labels: [],
    variants_attributes: [],
  };
}

function variantToForm(variant: Product['variants'][number]): ProductVariantFormData {
  return {
    id: variant.id,
    name: variant.name,
    sku: variant.sku ?? '',
    price_override: variant.price_override ?? null,
    stock_quantity: variant.stock_quantity ?? null,
    position: variant.position,
    attributes_data: (variant.attributes as Record<string, unknown>) ?? {},
  };
}

export default function ProductModal({ open, product, loading, errors, onOpenChange, onSubmit }: Props) {
  const { t } = useLanguage('products');
  const [form, setForm] = useState<ProductFormState>(emptyForm());
  const [variants, setVariants] = useState<ProductVariantFormData[]>([]);
  const [labelsText, setLabelsText] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  const isEdit = useMemo(() => Boolean(product?.id), [product]);
  const isPhysical = form.kind === 'physical';

  useEffect(() => {
    if (!open) return;
    if (product) {
      setForm({
        name: product.name,
        kind: product.kind,
        description: product.description ?? '',
        sku: product.sku ?? '',
        default_price: product.default_price,
        currency: product.currency,
        purchase_url: product.purchase_url ?? '',
        status: product.status,
        stock_quantity: product.stock_quantity ?? null,
        labels: product.labels ?? [],
        variants_attributes: [],
      });
      setVariants((product.variants ?? []).map(variantToForm));
      setLabelsText((product.labels ?? []).join(', '));
    } else {
      setForm(emptyForm());
      setVariants([]);
      setLabelsText('');
    }
    setTouched({});
    setSubmitAttempted(false);
    setActiveTab('general');
  }, [open, product]);

  const clientErrors = useMemo<Record<string, string>>(() => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = t('validation.nameRequired');
    if (form.default_price == null) e.default_price = t('validation.priceRequired');
    else if (form.default_price < 0) e.default_price = t('validation.priceMin');
    if (form.purchase_url && !URL_REGEX.test(form.purchase_url)) e.purchase_url = t('validation.urlInvalid');
    return e;
  }, [form.name, form.default_price, form.purchase_url, t]);

  const fieldError = (key: string): string | undefined =>
    errors?.[key] ?? (submitAttempted || touched[key] ? clientErrors[key] : undefined);

  const markTouched = (key: string) => setTouched((prev) => ({ ...prev, [key]: true }));
  const canSubmit = Object.keys(clientErrors).length === 0;

  const handleAddVariant = () => {
    setVariants((prev) => [
      ...prev,
      { name: '', sku: '', price_override: null, stock_quantity: null, position: prev.length, attributes_data: {} },
    ]);
  };

  const handleVariantChange = (index: number, patch: Partial<ProductVariantFormData>) => {
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  };

  const handleVariantRemove = (index: number) => {
    setVariants((prev) =>
      prev.map((v, i) => {
        if (i !== index) return v;
        if (v.id) return { ...v, _destroy: true };
        return null as unknown as ProductVariantFormData;
      }).filter(Boolean) as ProductVariantFormData[],
    );
  };

  const handleSubmit = async () => {
    setSubmitAttempted(true);
    if (!canSubmit) {
      setActiveTab('general');
      return;
    }

    const labels = labelsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload: ProductFormData = {
      ...form,
      default_price: form.default_price ?? 0,
      stock_quantity: isPhysical ? form.stock_quantity : null,
      labels,
      variants_attributes: variants.map((v, idx) => ({
        ...v,
        stock_quantity: isPhysical ? v.stock_quantity : null,
        position: v.position ?? idx,
      })),
    };

    await onSubmit(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('modal.editTitle') : t('modal.createTitle')}</DialogTitle>
          <DialogDescription>{t('modal.subtitle')}</DialogDescription>
        </DialogHeader>

        <DialogPanel>
          <Tabs value={activeTab} onValueChange={value => setActiveTab(String(value))}>
            {/*
              Media tab intentionally omitted: product image upload is not wired
              end-to-end — the backend (products_controller#attach_images) only
              attaches ActiveStorage signed_ids and explicitly drops raw multipart
              files, which is all the client currently sends. Re-add a
              <TabsTab value="media"> + <TabsPanel value="media"> (file picker
              + product.images preview, see git history) once a direct-upload /
              signed_id flow exists.
            */}
            <TabsList className="w-full">
              <TabsTab value="general" className="flex-1">{t('modal.tabs.general')}</TabsTab>
              <TabsTab value="variants" className="flex-1">{t('modal.tabs.variants')}</TabsTab>
              <TabsTab value="labels" className="flex-1">{t('modal.tabs.labels')}</TabsTab>
            </TabsList>

            <TabsPanel value="general" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="p-name">
                    {t('fields.name')} <span aria-hidden="true">*</span>
                  </Label>
                  <Input
                    id="p-name"
                    aria-required="true"
                    aria-invalid={Boolean(fieldError('name'))}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    onBlur={() => markTouched('name')}
                    placeholder={t('fields.namePlaceholder')}
                  />
                  {fieldError('name') && <p className="text-destructive-foreground text-xs">{fieldError('name')}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="p-kind">{t('fields.kind')}</Label>
                  <Select
                    items={KINDS.map(k => ({ value: k, label: t(`kind.${k}`) }))}
                    value={form.kind}
                    onValueChange={(v) => {
                      if (v == null) return;
                      const kind = v as ProductKind;
                      setForm({ ...form, kind, stock_quantity: kind === 'physical' ? form.stock_quantity : null });
                    }}
                  >
                    <SelectTrigger id="p-kind" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectPopup>
                      {KINDS.map((k) => (
                        <SelectItem key={k} value={k}>
                          {t(`kind.${k}`)}
                        </SelectItem>
                      ))}
                    </SelectPopup>
                  </Select>
                  {!isPhysical && (
                    <p className="text-xs text-muted-foreground">{t('fields.digitalNoStockHint')}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="p-status">{t('fields.status')}</Label>
                  <Select
                    items={STATUSES.map(st => ({ value: st, label: t(`status.${st}`) }))}
                    value={form.status}
                    onValueChange={(v) => v != null && setForm({ ...form, status: v as ProductStatus })}
                  >
                    <SelectTrigger id="p-status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectPopup>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {t(`status.${s}`)}
                        </SelectItem>
                      ))}
                    </SelectPopup>
                  </Select>
                </div>

                <div className="col-span-2 grid grid-cols-3 gap-3 items-start">
                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="p-price">
                      {t('fields.defaultPrice')} <span aria-hidden="true">*</span>
                    </Label>
                    <Input
                      id="p-price"
                      type="number"
                      step="0.01"
                      min={0}
                      aria-required="true"
                      aria-invalid={Boolean(fieldError('default_price'))}
                      value={form.default_price ?? ''}
                      placeholder="0,00"
                      onChange={(e) =>
                        setForm({ ...form, default_price: toNumberOrNull(e.target.value) })
                      }
                      onBlur={() => markTouched('default_price')}
                    />
                    {fieldError('default_price') && (
                      <p className="text-destructive-foreground text-xs">{fieldError('default_price')}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="p-currency">{t('fields.currency')}</Label>
                    <Select
                      items={CURRENCIES.map(c => ({ value: c, label: t(`currency.${c}`) }))}
                      value={form.currency}
                      onValueChange={(v) => v != null && setForm({ ...form, currency: v as ProductCurrency })}
                    >
                      <SelectTrigger id="p-currency" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectPopup>
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {t(`currency.${c}`)}
                          </SelectItem>
                        ))}
                      </SelectPopup>
                    </Select>
                  </div>
                </div>

                <div className={isPhysical ? 'space-y-1.5' : 'col-span-2 space-y-1.5'}>
                  <Label htmlFor="p-sku">{t('fields.sku')}</Label>
                  <Input
                    id="p-sku"
                    aria-invalid={Boolean(fieldError('sku'))}
                    value={form.sku ?? ''}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    placeholder={t('fields.skuPlaceholder')}
                  />
                  {fieldError('sku') && <p className="text-destructive-foreground text-xs">{fieldError('sku')}</p>}
                </div>

                {isPhysical && (
                  <div className="space-y-1.5">
                    <Label htmlFor="p-stock">{t('fields.stockQuantity')}</Label>
                    <Input
                      id="p-stock"
                      type="number"
                      min={0}
                      value={form.stock_quantity ?? ''}
                      onChange={(e) =>
                        setForm({ ...form, stock_quantity: toNumberOrNull(e.target.value) })
                      }
                    />
                  </div>
                )}

                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="p-url">{t('fields.purchaseUrl')}</Label>
                  <Input
                    id="p-url"
                    type="url"
                    aria-invalid={Boolean(fieldError('purchase_url'))}
                    placeholder={t('fields.purchaseUrlPlaceholder')}
                    value={form.purchase_url ?? ''}
                    onChange={(e) => setForm({ ...form, purchase_url: e.target.value })}
                    onBlur={() => markTouched('purchase_url')}
                  />
                  {fieldError('purchase_url') && (
                    <p className="text-destructive-foreground text-xs">{fieldError('purchase_url')}</p>
                  )}
                </div>

                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="p-desc">{t('fields.description')}</Label>
                  <Textarea
                    id="p-desc"
                    rows={4}
                    value={form.description ?? ''}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder={t('fields.descriptionPlaceholder')}
                  />
                </div>
              </div>
            </TabsPanel>

            <TabsPanel value="variants" className="space-y-3 pt-4">
              {!isPhysical && (
                <p className="text-xs text-muted-foreground">{t('variants.digitalHint')}</p>
              )}

              <div className="space-y-2">
                {variants.filter((v) => !v._destroy).length === 0 && (
                  <p className="rounded-lg border border-dashed py-6 text-center text-muted-foreground text-sm">
                    {t('variants.empty')}
                  </p>
                )}
                {variants.map((variant, idx) => {
                  if (variant._destroy) return null;
                  return (
                    <div key={variant.id ?? `new-${idx}`} className="grid grid-cols-12 items-end gap-2 rounded-lg border p-3">
                      <div className="col-span-4 space-y-1.5">
                        <Label htmlFor={`p-variant-${idx}-name`} className="text-xs">{t('variants.name')}</Label>
                        <Input
                          id={`p-variant-${idx}-name`}
                          aria-required="true"
                          value={variant.name}
                          onChange={(e) => handleVariantChange(idx, { name: e.target.value })}
                          placeholder={t('variants.namePlaceholder')}
                        />
                      </div>
                      <div className={isPhysical ? 'col-span-3 space-y-1.5' : 'col-span-5 space-y-1.5'}>
                        <Label htmlFor={`p-variant-${idx}-sku`} className="text-xs">{t('variants.sku')}</Label>
                        <Input
                          id={`p-variant-${idx}-sku`}
                          value={variant.sku ?? ''}
                          onChange={(e) => handleVariantChange(idx, { sku: e.target.value })}
                        />
                      </div>
                      <div className={isPhysical ? 'col-span-2 space-y-1.5' : 'col-span-2 space-y-1.5'}>
                        <Label htmlFor={`p-variant-${idx}-price`} className="text-xs">{t('variants.priceOverride')}</Label>
                        <Input
                          id={`p-variant-${idx}-price`}
                          type="number"
                          step="0.01"
                          min={0}
                          value={variant.price_override ?? ''}
                          onChange={(e) =>
                            handleVariantChange(idx, {
                              price_override: toNumberOrNull(e.target.value),
                            })
                          }
                        />
                      </div>
                      {isPhysical && (
                        <div className="col-span-2 space-y-1.5">
                          <Label htmlFor={`p-variant-${idx}-stock`} className="text-xs">{t('variants.stock')}</Label>
                          <Input
                            id={`p-variant-${idx}-stock`}
                            type="number"
                            min={0}
                            value={variant.stock_quantity ?? ''}
                            onChange={(e) =>
                              handleVariantChange(idx, {
                                stock_quantity: toNumberOrNull(e.target.value),
                              })
                            }
                          />
                        </div>
                      )}
                      <div className="col-span-1 flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleVariantRemove(idx)}
                          className="text-destructive-foreground"
                          aria-label={t('actions.delete')}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button variant="outline" size="sm" onClick={handleAddVariant}>
                <Plus />
                {t('variants.add')}
              </Button>
            </TabsPanel>

            <TabsPanel value="labels" className="space-y-2 pt-4">
              <Label htmlFor="p-labels">{t('fields.labels')}</Label>
              <Textarea
                id="p-labels"
                rows={3}
                value={labelsText}
                onChange={(e) => setLabelsText(e.target.value)}
                placeholder={t('fields.labelsPlaceholder')}
              />
              <p className="text-xs text-muted-foreground">{t('fields.labelsHint')}</p>
            </TabsPanel>
          </Tabs>
        </DialogPanel>

        <DialogFooter className="items-center">
          <p
            className={`me-auto text-xs ${submitAttempted && !canSubmit ? 'text-destructive-foreground' : 'text-muted-foreground'}`}
          >
            {submitAttempted && !canSubmit ? t('validation.fixErrors') : t('validation.requiredLegend')}
          </p>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            {t('actions.cancel')}
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            {isEdit ? t('actions.update') : t('actions.create')}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
