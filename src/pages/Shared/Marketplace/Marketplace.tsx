import { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardPanel } from '@/components/ui/card';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import EmptyState from '@/components/base/EmptyState';
import {
  Package,
  Search,
  Star,
  ExternalLink,
  Download,
  User,
  ImageIcon,
  Filter,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

interface MarketplaceProduct {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  author: string;
  version: string;
  tags: string[];
  rating: number;
  downloads: number;
  price: number;
  currency: string;
  external_url?: string;
}

interface MarketplacePagination {
  current_page: number;
  total_pages: number;
  total: number;
  per_page: number;
}

const Marketplace = () => {
  const { t } = useLanguage('marketplace');
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [pagination, setPagination] = useState<MarketplacePagination | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Simulated data for demonstration
  const mockProducts: MarketplaceProduct[] = [
    {
      id: '1',
      name: t('mockProducts.aiAssistant.name'),
      description: t('mockProducts.aiAssistant.description'),
      thumbnail: '',
      author: 'EvoAI Team',
      version: '1.2.0',
      tags: ['assistant', 'ai', 'research'],
      rating: 4.8,
      downloads: 1250,
      price: 0,
      currency: 'USD',
    },
    {
      id: '2',
      name: t('mockProducts.customerSupport.name'),
      description: t('mockProducts.customerSupport.description'),
      thumbnail: '',
      author: 'Support Solutions',
      version: '2.1.5',
      tags: ['customer-support', 'automation', 'chat'],
      rating: 4.6,
      downloads: 850,
      price: 29.99,
      currency: 'USD',
    },
    {
      id: '3',
      name: t('mockProducts.dataAnalysis.name'),
      description: t('mockProducts.dataAnalysis.description'),
      thumbnail: '',
      author: 'Data Corp',
      version: '1.0.3',
      tags: ['data-analysis', 'reports', 'analytics'],
      rating: 4.9,
      downloads: 425,
      price: 49.99,
      currency: 'USD',
    },
  ];

  // Simulated API call
  const loadProducts = async () => {
    try {
      setLoading(true);
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      setProducts(mockProducts);
      setPagination({
        current_page: 1,
        total_pages: 1,
        total: mockProducts.length,
        per_page: 10,
      });

      // Extract unique tags
      const allTags = mockProducts.flatMap(product => product.tags);
      setAvailableTags([...new Set(allTags)]);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error(t('messages.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => (prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]));
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTags =
      selectedTags.length === 0 || selectedTags.some(tag => product.tags.includes(tag));
    return matchesSearch && matchesTags;
  });

  const formatPrice = (price: number, currency: string) => {
    if (price === 0) return t('product.free');
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency === 'USD' ? 'USD' : 'BRL',
    }).format(price);
  };

  const ProductCard = ({ product }: { product: MarketplaceProduct }) => (
    <Card className="overflow-hidden">
      <div className="relative h-40 w-full border-b bg-muted/48">
        {product.thumbnail ? (
          <img src={product.thumbnail} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ImageIcon className="size-12 text-muted-foreground/48" />
          </div>
        )}
      </div>

      <CardPanel className="flex flex-1 flex-col gap-3">
        <div>
          <h3 className="line-clamp-1 font-semibold">{product.name}</h3>
          <p className="mt-1 line-clamp-2 text-muted-foreground text-sm">{product.description}</p>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <User className="size-4" />
          <span>{product.author}</span>
          <span aria-hidden="true">·</span>
          <span>v{product.version}</span>
        </div>

        <div className="flex flex-wrap gap-1">
          {product.tags.slice(0, 3).map(tag => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
          {product.tags.length > 3 && <Badge variant="outline">+{product.tags.length - 3}</Badge>}
        </div>

        <div className="mt-auto flex items-center justify-between">
          <div className="flex items-center gap-3 text-muted-foreground text-sm">
            <span className="flex items-center gap-1">
              <Star className="size-4 fill-warning text-warning" />
              <span className="font-medium text-foreground">{product.rating}</span>
            </span>
            <span className="flex items-center gap-1 tabular-nums">
              <Download className="size-4" />
              {product.downloads}
            </span>
          </div>
          <span className="font-semibold">{formatPrice(product.price, product.currency)}</span>
        </div>

        <div className="flex gap-2">
          <Button className="flex-1" size="sm">
            {t('product.install')}
          </Button>
          {product.external_url && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label={t('product.openExternal')}
                  />
                }
              >
                <ExternalLink />
              </TooltipTrigger>
              <TooltipPopup>{t('product.openExternal')}</TooltipPopup>
            </Tooltip>
          )}
        </div>
      </CardPanel>
    </Card>
  );

  const hasFilters = !!searchQuery || selectedTags.length > 0;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-semibold text-xl md:text-2xl">{t('header.title')}</h1>
          <Badge variant="secondary">
            <Package />
            {t('header.productsCount', { count: filteredProducts.length })}
          </Badge>
        </div>
        <p className="mt-1 text-muted-foreground text-sm">{t('header.subtitle')}</p>
      </div>

      <div className="flex flex-col gap-4 border-b p-4 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <InputGroup className="sm:max-w-md">
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              placeholder={t('search.placeholder')}
              aria-label={t('search.title')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </InputGroup>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="sm:ms-auto">
              <X />
              {t('search.clearFilters')}
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('search.tagsLabel')}>
          <span className="me-1 flex items-center gap-1.5 font-medium text-muted-foreground text-sm">
            <Filter className="size-4" />
            {t('search.tagsLabel')}
          </span>
          {availableTags.map(tag => (
            <Toggle
              key={tag}
              variant="outline"
              size="sm"
              pressed={selectedTags.includes(tag)}
              onPressedChange={() => handleTagToggle(tag)}
            >
              {tag}
            </Toggle>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" aria-busy="true">
            {[0, 1, 2].map(i => (
              <Skeleton key={i} className="h-96 rounded-2xl" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            icon={Package}
            title={t('empty.title')}
            description={t('empty.description')}
            action={{ label: t('empty.action'), onClick: clearFilters }}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>

      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between border-t p-4 md:px-6">
          <div className="text-muted-foreground text-sm">
            {t('pagination.pageInfo', {
              current: pagination.current_page,
              total: pagination.total_pages,
              count: pagination.total,
            })}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            >
              {t('pagination.previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === pagination.total_pages}
              onClick={() => setCurrentPage(prev => Math.min(pagination.total_pages, prev + 1))}
            >
              {t('pagination.next')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Marketplace;
