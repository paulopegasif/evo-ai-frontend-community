import { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { useNavigate } from 'react-router-dom';
import { SettingsIntegrationsTour } from '@/tours';
import { Search, Puzzle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTab } from '@/components/ui/tabs';
import BaseHeader from '@/components/base/BaseHeader';
import { integrationsService } from '@/services/integrations';
import { metaAdsService } from '@/services/integrations/metaAdsService';
import { metaConversionsService } from '@/services/integrations/metaConversionsService';
import { Integration, IntegrationCategory } from '@/types/integrations';
import { IntegrationCard } from '@/components/integrations/base';
import { toast } from 'sonner';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useGlobalConfig } from '@/contexts/GlobalConfigContext';

// Integration categories for organization - will be translated
const getIntegrationCategories = (t: (key: string) => string): IntegrationCategory[] => [
  { id: 'all', name: t('categories.all'), icon: null },
  { id: 'crm', name: t('categories.crm'), icon: null },
  { id: 'communication', name: t('categories.communication'), icon: null },
  { id: 'productivity', name: t('categories.productivity'), icon: null },
  { id: 'ai', name: t('categories.ai'), icon: null },
  { id: 'custom', name: t('categories.custom'), icon: null },
];

// Map integration IDs to categories
const INTEGRATION_CATEGORY_MAP: Record<string, string> = {
  // CRM
  bms: 'crm',
  leadsquared: 'crm',
  hubspot: 'crm',
  meta_ads: 'crm',
  meta_conversions: 'crm',

  // Communication
  slack: 'communication',
  dyte: 'communication',
  google_translate: 'communication',

  // Productivity
  google_calendar: 'productivity',
  linear: 'productivity',
  shopify: 'productivity',

  // AI & Automation
  openai: 'ai',
  dialogflow: 'ai',

  // Custom
  webhook: 'custom',
  dashboard_apps: 'custom',
  oauth_applications: 'custom',
};

export default function Integrations() {
  const { t } = useLanguage('integrations');
  const { can, isReady: permissionsReady } = usePermissions();
  const { openaiConfigured } = useGlobalConfig();
  const navigate = useNavigate();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const hasLoaded = useRef(false);

  // Load integrations
  const loadIntegrations = useCallback(async () => {
    if (!can('integrations', 'read')) {
      toast.error(t('messages.permissionDenied.read'));
      return;
    }

    setLoading(true);
    try {
      const response = await integrationsService.getIntegrations();
      setIntegrations(response.data);
    } catch (error) {
      console.error('Error loading integrations:', error);
      toast.error(t('messages.loadError'));
    } finally {
      setLoading(false);
    }
  }, [can, t]);

  useEffect(() => {
    if (!permissionsReady) {
      return;
    }

    if (!hasLoaded.current) {
      hasLoaded.current = true;
      loadIntegrations();
    }
  }, [permissionsReady, loadIntegrations]);

  // Handle integration toggle
  const handleToggleIntegration = async (integration: Integration) => {
    if (!can('integrations', 'update')) {
      toast.error(t('messages.permissionDenied.update'));
      return;
    }
    setProcessingId(integration.id);
    try {
      if (integration.enabled) {
        // Special handling for different integration types
        if (integration.id === 'meta_ads') {
          // Dedicated endpoint: drops the encrypted token, keeps imported campaigns
          await metaAdsService.disconnect();
        } else if (integration.id === 'meta_conversions') {
          await metaConversionsService.disconnect();
        } else if (['slack', 'hubspot', 'linear', 'shopify'].includes(integration.id)) {
          // OAuth integrations have specific delete endpoints
          await integrationsService.deleteIntegration(integration.id);
        } else if (
          ['openai', 'bms', 'leadsquared', 'google_translate', 'dialogflow', 'google_calendar'].includes(
            integration.id,
          )
        ) {
          // Hook-based integrations - need to delete the hook
          const hook = await integrationsService.getIntegrationHook(integration.id);
          if (hook) {
            await integrationsService.deleteIntegrationHook(hook.id);
          }
        } else {
          await integrationsService.toggleIntegration(integration.id, false);
        }
        toast.success(t('messages.disconnected', { name: integration.name }));
      } else {
        // Check if it's an OAuth integration that needs redirect
        if (integration.action && integration.action.startsWith('http')) {
          // OAuth flow - redirect to provider
          window.location.href = integration.action;
          return;
        } else {
          // Navigate to configuration page
          handleConfigureIntegration(integration);
          return;
        }
      }

      // Reload integrations
      await loadIntegrations();
    } catch (error) {
      console.error('Error toggling integration:', error);
      toast.error(t('messages.toggleError'));
    } finally {
      setProcessingId(null);
    }
  };

  // Handle integration configuration
  const handleConfigureIntegration = (integration: Integration) => {
    if (!can('integrations', 'update')) {
      toast.error(t('messages.permissionDenied.update'));
      return;
    }
    // Special routes for custom integrations
    if (integration.id === 'webhook') {
      navigate(`/settings/integrations/webhooks`);
    } else if (integration.id === 'dashboard_apps') {
      navigate(`/settings/integrations/dashboard-apps`);
    } else if (integration.id === 'oauth_applications') {
      navigate(`/settings/integrations/oauth-apps`);
    } else if (integration.id === 'google_calendar') {
      navigate(`/settings/integrations/google_calendar`);
    } else if (integration.id === 'meta_ads') {
      navigate(`/settings/integrations/meta_ads`);
    } else if (integration.id === 'meta_conversions') {
      navigate(`/settings/integrations/meta_conversions`);
    } else {
      // Generic integration configuration page
      navigate(`/settings/integrations/${integration.id}`);
    }
  };

  const visibleIntegrations = integrations.filter(
    integration => !(integration.id === 'openai' && openaiConfigured),
  );

  // Filter integrations
  const filteredIntegrations = visibleIntegrations.filter(integration => {
    // Category filter
    if (selectedCategory !== 'all') {
      const category = INTEGRATION_CATEGORY_MAP[integration.id] || 'custom';
      if (category !== selectedCategory) return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        integration.name.toLowerCase().includes(query) ||
        integration.description.toLowerCase().includes(query)
      );
    }

    return true;
  });

  // Count integrations by category
  const getCategoryCount = (categoryId: string) => {
    if (categoryId === 'all') return visibleIntegrations.length;

    return visibleIntegrations.filter(integration => {
      const category = INTEGRATION_CATEGORY_MAP[integration.id] || 'custom';
      return category === categoryId;
    }).length;
  };

  // Check if integration is config-only
  const isConfigOnlyIntegration = (integrationId: string) => {
    return ['webhook', 'dashboard_apps', 'oauth_applications'].includes(integrationId);
  };

  const categories = getIntegrationCategories(t).filter(
    category => category.id === 'all' || getCategoryCount(category.id) > 0,
  );

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-4 md:p-6" data-tour="settings-integrations-page">
      <SettingsIntegrationsTour />
      <div data-tour="settings-integrations-header">
        <BaseHeader title={t('title')} subtitle={t('subtitle')} />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div data-tour="settings-integrations-categories" className="-mx-1 overflow-x-auto px-1">
          <Tabs value={selectedCategory} onValueChange={value => setSelectedCategory(String(value))}>
            <TabsList>
              {categories.map(category => (
                <TabsTab key={category.id} value={category.id}>
                  {category.name}
                  <Badge variant="outline" size="sm" className="tabular-nums">
                    {getCategoryCount(category.id)}
                  </Badge>
                </TabsTab>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <InputGroup className="lg:max-w-xs" data-tour="settings-integrations-search">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            aria-label={t('search.placeholder')}
            placeholder={t('search.placeholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </InputGroup>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="gap-0">
              <div className="flex items-start gap-3 p-5">
                <Skeleton className="size-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
              <div className="flex justify-end border-t px-5 py-3">
                <Skeleton className="h-7 w-24" />
              </div>
            </Card>
          ))}
        </div>
      ) : filteredIntegrations.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Puzzle />
            </EmptyMedia>
            <EmptyTitle>{t('empty.title')}</EmptyTitle>
            <EmptyDescription>
              {searchQuery ? t('empty.descriptionWithSearch') : t('empty.descriptionWithoutSearch')}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredIntegrations.map(integration => (
            <IntegrationCard
              key={integration.id}
              integration={{
                ...integration,
                enabled: isConfigOnlyIntegration(integration.id)
                  ? true
                  : integration.enabled && processingId !== integration.id,
              }}
              onConfigure={() => handleConfigureIntegration(integration)}
              onToggle={
                isConfigOnlyIntegration(integration.id) || !can('integrations', 'update')
                  ? undefined
                  : () => handleToggleIntegration(integration)
              }
              isProcessing={processingId === integration.id}
              configOnly={isConfigOnlyIntegration(integration.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
