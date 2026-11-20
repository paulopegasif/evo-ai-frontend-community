import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { integrationsService } from '@/services/integrations';
import { DashboardApp } from '@/types/integrations';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Generic page component for displaying embedded dashboard apps
 * Follows system layout pattern with header and iframe content
 */
export default function DashboardAppPage() {
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage('integrations');

  const [app, setApp] = useState<DashboardApp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadApp() {
      if (!appId) {
        setError('Missing required parameters');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await integrationsService.getDashboardApps();
        const foundApp = response.data.find(a => a.id === appId);

        if (!foundApp) {
          setError('Dashboard app not found');
          setLoading(false);
          return;
        }

        // Verify it's a sidebar type app
        if (foundApp.display_type !== 'sidebar') {
          setError('Invalid app type');
          setLoading(false);
          return;
        }

        setApp(foundApp);
      } catch (err) {
        console.error('Error loading dashboard app:', err);
        setError('Failed to load dashboard app');
      } finally {
        setLoading(false);
      }
    }

    loadApp();
  }, [appId]);

  // Loading state
  if (loading) {
    return (
      <div className="flex h-full flex-col gap-4 p-4 md:gap-6 md:p-6" aria-busy="true">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="w-full flex-1 rounded-xl" />
      </div>
    );
  }

  // Error state
  if (error || !app) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-4 md:p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <AlertCircle />
            </EmptyMedia>
            <EmptyTitle>{t('dashboardApps.page.error.heading')}</EmptyTitle>
            <EmptyDescription>
              {error || t('dashboardApps.page.error.notFound')}
              <br />
              {t('dashboardApps.page.error.description')}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft />
              {t('dashboardApps.page.error.goBack')}
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  // Get the URL from app content
  const appUrl = Array.isArray(app.content)
    ? app.content[0]?.url
    : (app.content as { url?: string })?.url;

  if (!appUrl) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-4 md:p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <AlertCircle />
            </EmptyMedia>
            <EmptyTitle>{t('dashboardApps.page.error.invalidUrl')}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  // Success - render app
  return (
    <div className="flex flex-col h-full">
      {/* Iframe Content */}
      <div className="flex-1 relative overflow-hidden">
        <iframe
          src={appUrl}
          title={app.title}
          className="absolute inset-0 w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
        />
      </div>
    </div>
  );
}
