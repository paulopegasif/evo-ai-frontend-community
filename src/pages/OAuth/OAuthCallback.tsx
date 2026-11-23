import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Loader2 } from '@/components/icons';
import { useLanguage } from '@/hooks/useLanguage';

export const OAuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { t } = useLanguage('oauth');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state');

    // Simular processamento
    const timer = setTimeout(() => {
      if (error) {
        setStatus('error');
        setMessage(`${t('callback.errors.oauthError')} ${error}`);
      } else if (code) {
        setStatus('success');
        setMessage(t('callback.success.message'));

        // Enviar mensagem para a janela pai (para casos de popup)
        if (window.opener) {
          window.opener.postMessage({
            type: 'oauth_callback',
            data: { code, state }
          }, '*');
          window.close();
        }
      } else {
        setStatus('error');
        setMessage(t('callback.errors.invalidCallback'));
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [searchParams, t]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/40">
      <div className="w-full max-w-md space-y-6">
        <div className="rounded-2xl border bg-card p-6 shadow-xs/5 sm:p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">{t('callback.title')}</h1>

          {status === 'loading' && (
            <div className="space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground">{t('callback.loading.processing')}</p>
            </div>
          )}

          {status === 'success' && (
            <Alert>
              <CheckCircle className="h-4 w-4 text-success-foreground" />
              <AlertTitle className="text-success-foreground">{t('callback.success.title')}</AlertTitle>
              <AlertDescription className="text-success-foreground">
                {message}
              </AlertDescription>
            </Alert>
          )}

          {status === 'error' && (
            <Alert variant="error">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t('callback.errors.title')}</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <div className="mt-6 text-xs text-muted-foreground">
            <p>{t('callback.footer.canClose')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OAuthCallback;
