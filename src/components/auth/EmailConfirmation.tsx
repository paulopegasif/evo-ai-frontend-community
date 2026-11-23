import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardPanel } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { confirmEmail, resendConfirmation } from '@/services/auth/authService';

import { AppLogo } from '@/components/AppLogo';

const EmailConfirmation = () => {
  const { t } = useLanguage('auth');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationStatus, setConfirmationStatus] = useState<'pending' | 'success' | 'error'>(
    'pending',
  );
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  const confirmationToken = searchParams.get('confirmation_token');

  useEffect(() => {
    if (confirmationToken) {
      handleConfirmEmail();
    }
  }, [confirmationToken]);

  const handleConfirmEmail = async () => {
    if (!confirmationToken) {
      setConfirmationStatus('error');
      setMessage(t('auth.emailConfirmation.tokenNotFound'));
      return;
    }

    setIsLoading(true);
    try {
      await confirmEmail(confirmationToken);
      setConfirmationStatus('success');
      setMessage(t('auth.emailConfirmation.success'));

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/auth');
      }, 3000);
    } catch (error: any) {
      setConfirmationStatus('error');
      setMessage(error?.response?.data?.message || t('auth.emailConfirmation.error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      toast.error(t('auth.emailConfirmation.resend.enterEmail'));
      return;
    }

    setIsLoading(true);
    try {
      await resendConfirmation(email);
      toast.success(t('auth.emailConfirmation.resend.success'));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t('auth.emailConfirmation.resend.error'));
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = () => {
    switch (confirmationStatus) {
      case 'success':
        return <CheckCircle className="size-12 text-success" />;
      case 'error':
        return <XCircle className="size-12 text-destructive" />;
      default:
        return isLoading ? (
          <Loader2 className="size-12 text-primary animate-spin" />
        ) : (
          <Mail className="size-12 text-primary" />
        );
    }
  };

  const getStatusVariant = () => {
    switch (confirmationStatus) {
      case 'success':
        return 'success' as const;
      case 'error':
        return 'error' as const;
      default:
        return 'default' as const;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/40 relative">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <AppLogo className="h-9 mx-auto" />
        </div>

        {/* Card */}
        <Card>
          <CardPanel className="p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center mb-4">{getStatusIcon()}</div>
              <h2 className="font-semibold text-xl">{t('auth.emailConfirmation.title')}</h2>
              <p className="text-muted-foreground mt-2">
                {confirmationToken
                  ? t('auth.emailConfirmation.confirming')
                  : t('auth.emailConfirmation.confirm')}
              </p>
            </div>

            <div className="space-y-4">
              {message && (
                <Alert variant={getStatusVariant()}>
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              )}

              {confirmationStatus === 'success' && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    {t('auth.emailConfirmation.redirecting')}
                  </p>
                </div>
              )}

              {(confirmationStatus === 'error' || !confirmationToken) && (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                      {t('auth.emailConfirmation.resend.title')}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Input
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder={t('auth.emailConfirmation.resend.placeholder')}
                      aria-label={t('auth.emailConfirmation.resend.placeholder')}
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={!email}
                    loading={isLoading}
                    className="w-full"
                  >
                    {isLoading
                      ? t('auth.emailConfirmation.resend.sending')
                      : t('auth.emailConfirmation.resend.button')}
                  </Button>
                </div>
              )}

              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  onClick={() => navigate('/auth')}
                  className="text-sm"
                >
                  {t('auth.emailConfirmation.backToLogin')}
                </Button>
              </div>
            </div>
          </CardPanel>
        </Card>
      </div>
    </div>
  );
};

export default EmailConfirmation;
