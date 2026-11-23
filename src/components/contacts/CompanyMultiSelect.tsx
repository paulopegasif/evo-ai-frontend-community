import { useState, useEffect } from 'react';
import { Building2, Search, X } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/hooks/useLanguage';
import { contactsService } from '@/services/contacts';

interface CompanyMultiSelectProps {
  selectedCompanyIds: string[];
  onChange: (companyIds: string[]) => void;
  disabled?: boolean;
}

export default function CompanyMultiSelect({
  selectedCompanyIds,
  onChange,
  disabled = false,
}: CompanyMultiSelectProps) {
  const { t } = useLanguage('contacts');
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Carregar todas as empresas uma única vez
  useEffect(() => {
    const loadCompanies = async () => {
      setLoading(true);
      try {
        const response = await contactsService.getCompaniesList();
        setCompanies(response);
      } catch (error) {
        console.error('Error loading companies:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCompanies();
  }, []);

  // Filtrar empresas em memória com base no termo de busca
  const filteredCompanies = (companies || []).filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Pegar empresas selecionadas para mostrar badges
  const selectedCompanies = (companies || []).filter(c => selectedCompanyIds.includes(c.id));

  // Toggle selection
  const handleToggle = (companyId: string) => {
    const newIds = selectedCompanyIds.includes(companyId)
      ? selectedCompanyIds.filter(id => id !== companyId)
      : [...selectedCompanyIds, companyId];

    onChange(newIds);
  };

  return (
    <div className="flex flex-col gap-2">
      <Label>{t('form.fields.companies.label')}</Label>

      {selectedCompanies.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedCompanies.map(company => (
            <Badge key={company.id} variant="outline" className="gap-1.5 pe-0.5">
              <Building2 />
              {company.name}
              <button
                type="button"
                onClick={() => handleToggle(company.id)}
                disabled={disabled}
                aria-label={company.name}
                className="inline-flex size-4 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border">
        <InputGroup className="rounded-none border-0 border-b shadow-none before:hidden">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={t('form.fields.companies.searchPlaceholder')}
            aria-label={t('form.fields.companies.searchPlaceholder')}
            disabled={disabled}
          />
        </InputGroup>

        <div className="max-h-48 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col gap-1 p-1.5" aria-busy="true">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="flex items-center gap-3 px-2 py-1.5">
                  <Skeleton className="size-4 rounded" />
                  <Skeleton className="h-3.5 w-40" />
                </div>
              ))}
            </div>
          ) : filteredCompanies.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground text-sm">
              {searchTerm ? t('form.fields.companies.noResults') : t('form.fields.companies.noCompanies')}
            </p>
          ) : (
            <div className="flex flex-col p-1.5">
              {filteredCompanies.map(company => (
                <label
                  key={company.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <Checkbox
                    checked={selectedCompanyIds.includes(company.id)}
                    onCheckedChange={() => handleToggle(company.id)}
                    disabled={disabled}
                  />
                  <span className="flex-1 truncate">{company.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
