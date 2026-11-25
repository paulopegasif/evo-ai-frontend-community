import { useEffect, useId, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from '@/components/ui/dialog';
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import OptionSelect from '@/components/segments/ui/OptionSelect';
import { ChevronDown } from '@/components/icons';
import BrlAmountInput from './BrlAmountInput';
import { useLanguage } from '@/hooks/useLanguage';
import { useIsAdmin } from '@/hooks/dailyPanel/useIsAdmin';
import { salesService } from '@/services/dailyPanel/dailyPanelService';
import { productsService } from '@/services/products/productsService';
import { useDailyPanelStore } from '@/store/dailyPanelStore';
import { getApiErrorMessage } from '@/utils/apiHelpers';
import { fieldErrorsFrom } from '@/utils/dailyPanel/fieldErrors';
import { formatBRL, toCents } from '@/utils/dailyPanel/format';
import type { Product } from '@/types/products';
import type { Sale, SalePayload } from '@/types/dailyPanel';

const NO_PRODUCT = '__none__';

interface RecordSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId?: string | number | null;
  contactId?: string | number | null;
  onSuccess?: (sale: Sale) => void;
}

const todayInput = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Local-noon ISO for a past `YYYY-MM-DD`, so the day survives any timezone shift. */
const soldAtFromInput = (value: string): string | undefined => {
  if (!value || value === todayInput()) return undefined;
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0).toISOString();
};

export default function RecordSaleDialog({
  open,
  onOpenChange,
  conversationId,
  contactId,
  onSuccess,
}: RecordSaleDialogProps) {
  const { t } = useLanguage('dailyPanel');
  const isAdmin = useIsAdmin();
  const invalidatePanel = useDailyPanelStore(s => s.invalidate);
  const ids = useId();
  const amountRef = useRef<HTMLInputElement>(null);

  const [cents, setCents] = useState(0);
  const [productId, setProductId] = useState(NO_PRODUCT);
  const [soldAt, setSoldAt] = useState(todayInput());
  const [sellerId, setSellerId] = useState('');
  const [notes, setNotes] = useState('');
  const [amountError, setAmountError] = useState<string | null>(null);
  const [sellerError, setSellerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [sellers, setSellers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!open) return;
    setCents(0);
    setProductId(NO_PRODUCT);
    setSoldAt(todayInput());
    setSellerId('');
    setNotes('');
    setAmountError(null);
    setSellerError(null);

    let cancelled = false;
    productsService
      .getProducts({ status: 'active', per_page: 100 })
      .then(res => !cancelled && setProducts(res.data ?? []))
      .catch(() => !cancelled && setProducts([]));
    if (isAdmin) {
      salesService
        .sellers()
        .then(list => !cancelled && setSellers((list ?? []).map(u => ({ id: String(u.id), name: u.name }))))
        .catch(() => !cancelled && setSellers([]));
    }
    return () => {
      cancelled = true;
    };
  }, [open, isAdmin]);

  const handleProductChange = (value: string) => {
    setProductId(value);
    const product = products.find(p => String(p.id) === value);
    if (product && Number(product.default_price) > 0) {
      setCents(toCents(product.default_price));
      setAmountError(null);
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!(cents > 0)) {
      setAmountError(t('recordSale.errors.amount'));
      amountRef.current?.focus();
      return;
    }
    const payload: SalePayload = { amount: cents / 100 };
    if (conversationId != null && conversationId !== '') payload.conversation_id = String(conversationId);
    if (contactId != null && contactId !== '') payload.contact_id = String(contactId);
    if (productId !== NO_PRODUCT) payload.product_id = productId;
    const soldAtIso = soldAtFromInput(soldAt);
    if (soldAtIso) payload.sold_at = soldAtIso;
    if (isAdmin && sellerId) payload.seller_id = sellerId;
    if (notes.trim()) payload.notes = notes.trim();

    setSubmitting(true);
    try {
      const sale = await salesService.create(payload);
      toast.success(t('recordSale.success', { amount: formatBRL(sale?.amount ?? payload.amount) }));
      invalidatePanel();
      onSuccess?.(sale);
      onOpenChange(false);
    } catch (error) {
      const byField = fieldErrorsFrom(error);
      const amountMsgs = byField.amount;
      if (amountMsgs?.length) {
        setAmountError(amountMsgs.join(' '));
        amountRef.current?.focus();
      } else if (byField.seller_id?.length) {
        setSellerError(byField.seller_id.join(' '));
      } else {
        toast.error(getApiErrorMessage(error, t('recordSale.errors.generic')));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const amountId = `${ids}-amount`;
  const amountErrorId = `${ids}-amount-error`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="sm:max-w-md" initialFocus={amountRef}>
        <form
          className="contents"
          noValidate
          onSubmit={e => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle>{t('recordSale.title')}</DialogTitle>
            <DialogDescription>{t('recordSale.description')}</DialogDescription>
          </DialogHeader>

          <DialogPanel className="flex flex-col gap-5">
            <Field>
              <FieldLabel htmlFor={amountId}>{t('recordSale.amount')}</FieldLabel>
              <BrlAmountInput
                ref={amountRef}
                id={amountId}
                cents={cents}
                onCentsChange={value => {
                  setCents(value);
                  if (value > 0) setAmountError(null);
                }}
                invalid={!!amountError}
                describedBy={amountError ? amountErrorId : undefined}
              />
              {amountError && (
                <p id={amountErrorId} role="alert" className="text-destructive-foreground text-xs">
                  {amountError}
                </p>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor={`${ids}-product`}>{t('recordSale.product')}</FieldLabel>
              <OptionSelect
                id={`${ids}-product`}
                className="w-full"
                value={productId}
                onValueChange={handleProductChange}
                options={[
                  { value: NO_PRODUCT, label: t('recordSale.noProduct') },
                  ...products.map(p => ({
                    value: String(p.id),
                    label: p.name,
                    content: (
                      <span className="flex w-full justify-between gap-3">
                        <span className="truncate">{p.name}</span>
                        <span className="text-muted-foreground tabular-nums">{formatBRL(p.default_price)}</span>
                      </span>
                    ),
                  })),
                ]}
              />
              <FieldDescription>{t('recordSale.productHint')}</FieldDescription>
            </Field>

            <Collapsible>
              <CollapsibleTrigger
                render={<Button type="button" variant="ghost" size="sm" className="-ms-2 group" />}
              >
                {t('recordSale.moreOptions')}
                <ChevronDown className="transition-transform group-data-[panel-open]:rotate-180" aria-hidden />
              </CollapsibleTrigger>
              <CollapsiblePanel>
                <div className="flex flex-col gap-5 pt-3">
                  <Field>
                    <FieldLabel htmlFor={`${ids}-date`}>{t('recordSale.soldAt')}</FieldLabel>
                    <Input
                      id={`${ids}-date`}
                      type="date"
                      max={todayInput()}
                      value={soldAt}
                      onChange={e => setSoldAt(e.target.value)}
                    />
                  </Field>
                  {isAdmin && (
                    <Field>
                      <FieldLabel htmlFor={`${ids}-seller`}>{t('recordSale.seller')}</FieldLabel>
                      <OptionSelect
                        id={`${ids}-seller`}
                        className="w-full"
                        value={sellerId}
                        onValueChange={value => {
                          setSellerId(value);
                          setSellerError(null);
                        }}
                        placeholder={t('recordSale.sellerPlaceholder')}
                        aria-invalid={!!sellerError}
                        options={sellers.map(s => ({ value: s.id, label: s.name }))}
                      />
                      {sellerError && (
                        <p role="alert" className="text-destructive-foreground text-xs">
                          {sellerError}
                        </p>
                      )}
                    </Field>
                  )}
                  <Field>
                    <FieldLabel htmlFor={`${ids}-notes`}>{t('recordSale.notes')}</FieldLabel>
                    <Textarea
                      id={`${ids}-notes`}
                      value={notes}
                      maxLength={500}
                      onChange={e => setNotes(e.target.value)}
                    />
                  </Field>
                </div>
              </CollapsiblePanel>
            </Collapsible>
          </DialogPanel>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="ghost" />} disabled={submitting}>
              {t('common.cancel')}
            </DialogClose>
            <Button type="submit" loading={submitting}>
              {t('recordSale.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}
