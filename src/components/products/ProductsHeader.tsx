import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusIcon, Search, Upload } from '@/components/icons';
import { Link } from 'react-router-dom';
import type { ProductKind, ProductStatus } from '@/types/products';

interface Props {
  search: string;
  kindFilter: ProductKind | 'all';
  statusFilter: ProductStatus | 'all';
  canCreate: boolean;
  onSearchChange: (value: string) => void;
  onKindChange: (value: ProductKind | 'all') => void;
  onStatusChange: (value: ProductStatus | 'all') => void;
  onCreate: () => void;
}

export default function ProductsHeader({
  search,
  kindFilter,
  statusFilter,
  canCreate,
  onSearchChange,
  onKindChange,
  onStatusChange,
  onCreate,
}: Props) {
  const { t } = useLanguage('products');

  const kindItems = [
    { value: 'all', label: t('header.filters.kindAll') },
    { value: 'physical', label: t('kind.physical') },
    { value: 'digital', label: t('kind.digital') },
  ];
  const statusItems = [
    { value: 'all', label: t('header.filters.statusAll') },
    { value: 'active', label: t('status.active') },
    { value: 'inactive', label: t('status.inactive') },
    { value: 'draft', label: t('status.draft') },
  ];

  return (
    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-2 md:flex-1 md:flex-row md:items-center">
        <InputGroup className="max-w-md flex-1">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            aria-label={t('header.searchPlaceholder')}
            placeholder={t('header.searchPlaceholder')}
            value={search}
            onChange={e => onSearchChange(e.target.value)}
          />
        </InputGroup>
        <Select items={kindItems} value={kindFilter} onValueChange={v => v && onKindChange(v as ProductKind | 'all')}>
          <SelectTrigger className="w-full md:w-44" aria-label={t('table.columns.kind')}>
            <SelectValue />
          </SelectTrigger>
          <SelectPopup>
            {kindItems.map(item => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
        <Select
          items={statusItems}
          value={statusFilter}
          onValueChange={v => v && onStatusChange(v as ProductStatus | 'all')}
        >
          <SelectTrigger className="w-full md:w-44" aria-label={t('table.columns.status')}>
            <SelectValue />
          </SelectTrigger>
          <SelectPopup>
            {statusItems.map(item => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
      </div>
      <div className="flex gap-2">
        {canCreate && (
          <Button variant="outline" render={<Link to="/products/import" />}>
            <Upload />
            {t('header.import')}
          </Button>
        )}
        <Button onClick={onCreate} disabled={!canCreate}>
          <PlusIcon />
          {t('header.new')}
        </Button>
      </div>
    </div>
  );
}
