import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CircleCheck, TriangleAlert } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card, CardPanel } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import i18n from '@/i18n/config';
import { AppLogo } from '@/components/AppLogo';
import { cn } from '@/lib/utils';
import { getBrandIcon } from '@/components/BrandIcon';

interface CallbackPageProps {
  integrationName: string;
  onCallback: (code: string, state: string, agentId?: string) => Promise<{ success: boolean; error?: string; username?: string;[key: string]: any }>;
  onSuccess?: (response: any, agentId: string) => Promise<void> | void;
  redirectPath?: string | ((agentId: string) => string);
  iconPath?: string;
  iconPathDark?: string;
  integrationId?: string;
}

export default function CallbackPage({ integrationName, onCallback, onSuccess, redirectPath, iconPath, iconPathDark, integrationId }: CallbackPageProps) {
  const { t } = useLanguage('integrations');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('');
  const [hasProcessed, setHasProcessed] = useState(false);

  // Ensure language is initialized from localStorage if available
  useEffect(() => {
    const savedLang = localStorage.getItem('i18nextLng');
    if (savedLang && i18n.language !== savedLang) {
      i18n.changeLanguage(savedLang);
    }
  }, []);

  const handleCallback = async () => {
    // Prevent double execution in React Strict Mode
    if (hasProcessed) return;
    setHasProcessed(true);
    try {
      // Get URL parameters
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');
      const state = searchParams.get('state');

      if (error) {
        setStatus('error');
        const errorMsg = errorDescription || t('callback.error.authorizationError', { error });
        setMessage(errorMsg);
        toast.error(errorMsg);
        return;
      }

      if (!code || !state) {
        setStatus('error');
        const errorMsg = t('callback.error.codeNotFound');
        setMessage(errorMsg);
        toast.error(errorMsg);
        return;
      }

      setMessage(t('callback.processing.message', { name: integrationName }));

      // Decode the base64url state to get agent_id (if available)
      let agentIdFromState: string | undefined;

      try {
        const decodedState = atob(state.replace(/-/g, '+').replace(/_/g, '/'));
        const payload = JSON.parse(decodedState);
        agentIdFromState = payload.agent_id;
      } catch (e) {
        // Some integrations use different state structures - let onCallback handle it
        console.warn('Could not decode state, callback will handle it:', e);
      }

      // Call the provided callback function
      // Pass empty strings if not found - callback can decode state itself if needed
      const response = await onCallback(code, state, agentIdFromState || '');

      if (response.success) {
        setStatus('success');
        const usernameText = response.username ? t('callback.success.username', { username: response.username }) : '';
        const successMsg = t('callback.success.message', { name: integrationName, username: usernameText });
        setMessage(successMsg);
        toast.success(t('callback.success.message', { name: integrationName, username: '' }));

        // Execute custom success callback if provided
        if (onSuccess && agentIdFromState) {
          await onSuccess(response, agentIdFromState);
        }

        // Redirect after success
        setTimeout(() => {
          const path = typeof redirectPath === 'function'
            ? redirectPath(agentIdFromState || '')
            : redirectPath || (agentIdFromState ? `/agents/${agentIdFromState}/edit?tab=mcp-servers` : '/agents');
          navigate(path);
        }, 2000);
      } else {
        throw new Error(response.error || t('callback.error.connectionError', { name: integrationName }));
      }
    } catch (error: any) {
      console.error(`${integrationName} callback error:`, error);
      setStatus('error');
      const errorMsg = error.message || t('callback.error.processingError', { name: integrationName });
      setMessage(errorMsg);
      toast.error(errorMsg);
    }
  };

  useEffect(() => {
    handleCallback();
  }, []);

  const BrandIconComponent = integrationId ? getBrandIcon(integrationId) : undefined;

  const title =
    status === 'processing'
      ? t('callback.processing.title')
      : status === 'success'
        ? t('callback.success.title', { name: integrationName })
        : t('callback.error.title');
  const body =
    status === 'processing'
      ? message || t('callback.processing.message', { name: integrationName })
      : message;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="flex w-full max-w-md flex-col items-center gap-8">
        <AppLogo className="h-10" />

        <Card className="w-full">
          <CardPanel
            className="flex flex-col items-center gap-4 px-8 py-10 text-center"
            aria-live="polite"
            aria-busy={status === 'processing'}
          >
            <div className="relative">
              <span
                className={cn(
                  'flex size-14 items-center justify-center rounded-2xl border [&_svg]:size-7',
                  status === 'processing' && 'bg-muted/48 text-muted-foreground',
                  status === 'success' && 'border-success/24 bg-success/8 text-success-foreground',
                  status === 'error' && 'border-destructive/24 bg-destructive/8 text-destructive-foreground',
                )}
              >
                {status === 'processing' && <Spinner aria-label={t('callback.processing.title')} />}
                {status === 'success' && <CircleCheck />}
                {status === 'error' && <TriangleAlert />}
              </span>
              {status === 'success' && (BrandIconComponent || iconPath) && (
                <span className="absolute -end-2 -bottom-2 flex size-7 items-center justify-center rounded-lg border bg-card shadow-xs/5">
                  {BrandIconComponent ? (
                    <BrandIconComponent size={16} className="size-4" />
                  ) : (
                    <>
                      <img
                        src={iconPath}
                        alt={integrationName}
                        className={cn('size-4 object-contain', iconPathDark && 'dark:hidden')}
                      />
                      {iconPathDark && (
                        <img
                          src={iconPathDark}
                          alt={integrationName}
                          className="hidden size-4 object-contain dark:block"
                        />
                      )}
                    </>
                  )}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <h1 className="font-semibold text-lg">{title}</h1>
              {body && <p className="text-muted-foreground text-sm">{body}</p>}
            </div>

            {status === 'error' && (
              <Button onClick={() => navigate('/agents')} variant="outline" className="mt-2">
                <ArrowLeft />
                {t('callback.error.backToAgents')}
              </Button>
            )}
          </CardPanel>
        </Card>
      </div>
    </main>
  );
}
