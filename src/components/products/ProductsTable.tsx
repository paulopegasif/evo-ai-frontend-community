import { useLanguage } from '@/hooks/useLanguage';
import { Cloud, Package, Pencil, Trash2 } from 'lucide-react';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { BaseTable, type TableAction, type TableColumn } from '@/components/base';
import type { Product } from '@/types/products';
import { stockInfo } from './productStock';

interface Props {
  products: Product[];
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

const STATUS_VARIANT: Record<string, NonNullable<BadgeProps['variant']>> = {
  active: 'success',
  inactive: 'secondary',
  draft: 'outline',
};

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

export default function ProductsTable({ products, canUpdate, canDelete, onEdit, onDelete }: Props) {
  const { t } = useLanguage('products');

  const columns: TableColumn<Product>[] = [
    {
      key: 'name',
      label: t('table.columns.name'),
      render: product => {
        const Icon = product.kind === 'digital' ? Cloud : Package;
        return (
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Icon className="size-4" />
            </span>
            <span className="truncate font-medium">{product.name}</span>
          </div>
        );
      },
    },
    {
      key: 'sku',
      label: t('table.columns.sku'),
      className: 'hidden md:table-cell',
      render: product => <span className="text-muted-foreground tabular-nums">{product.sku ?? '—'}</span>,
    },
    {
      key: 'kind',
      label: t('table.columns.kind'),
      className: 'hidden lg:table-cell',
      render: product => <Badge variant="outline">{t(`kind.${product.kind}`)}</Badge>,
    },
    {
      key: 'price',
      label: t('table.columns.price'),
      align: 'right',
      render: product => (
        <span className="whitespace-nowrap font-medium tabular-nums">{formatPrice(product.default_price, product.currency)}</span>
      ),
    },
    {
      key: 'stock',
      label: t('table.columns.stock'),
      align: 'right',
      render: product => {
        const stock = stockInfo(product);
        if (stock == null) return <span className="text-muted-foreground">—</span>;
        if (stock === 0) return <Badge variant="error">{t('table.outOfStock')}</Badge>;
        return <span className="tabular-nums">{stock}</span>;
      },
    },
    {
      key: 'status',
      label: t('table.columns.status'),
      render: product => (
        <Badge variant={STATUS_VARIANT[product.status] ?? 'outline'}>{t(`status.${product.status}`)}</Badge>
      ),
    },
    {
      key: 'variants',
      label: t('table.columns.variants'),
      align: 'right',
      className: 'hidden md:table-cell',
      render: product => <span className="text-muted-foreground tabular-nums">{product.variants?.length ?? 0}</span>,
    },
  ];

  const actions: TableAction<Product>[] = [
    { label: t('actions.edit'), icon: <Pencil />, onClick: onEdit, show: () => canUpdate },
    { label: t('actions.delete'), icon: <Trash2 />, onClick: onDelete, show: () => canDelete, variant: 'destructive' },
  ];

  return (
    <BaseTable<Product>
      data={products}
      columns={columns}
      actions={actions}
      emptyMessage={t('table.empty')}
      getRowKey={product => String(product.id)}
      getRowLabel={product => product.name}
    />
  );
}
