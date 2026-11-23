import { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardPanel } from '@/components/ui/card';
import { OTPField, OTPFieldInput, OTPFieldSeparator } from '@/components/ui/otp-field';
import { Shield, Smartphone, Mail, RefreshCw, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

import { AppLogo } from '@/components/AppLogo';

interface MfaVerificationProps {
  email: string;
  method: 'totp' | 'email';
  tempToken: string;
  onVerificationSuccess: (code: string) => Promise<void>;
  onResendEmailCode?: () => Promise<void>;
  onBack?: () => void;
  isLoading?: boolean;
}

const MfaVerification = ({
  email,
  method,
  onVerificationSuccess,
  onResendEmailCode,
  onBack,
  isLoading = false,
}: MfaVerificationProps) => {
  const { t } = useLanguage('auth');
  const [code, setCode] = useState('');
  const [attemptCount, setAttemptCount] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState(5);
  const [canResend, setCanResend] = useState(true);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Cooldown para reenvio de email
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (code.length !== 6) {
      toast.error(t('auth.mfa.code.complete'));
      return;
    }

    try {
      await onVerificationSuccess(code);
    } catch (error: unknown) {
      setAttemptCount(prev => prev + 1);

      const apiError = error as { response?: { data?: { attempts_remaining?: number }; status?: number } };
      if (apiError.response?.data?.attempts_remaining !== undefined) {
        setRemainingAttempts(apiError.response.data.attempts_remaining);
      }

      if (apiError.response?.status === 423) {
        toast.error(t('auth.mfa.accountLocked'));
      } else {
        toast.error(t('auth.mfa.code.invalid', { remaining: remainingAttempts - 1 }));
      }
    }
  };

  const handleResendCode = async () => {
    if (!onResendEmailCode || !canResend) return;

    try {
      await onResendEmailCode();
      setCanResend(false);
      setResendCooldown(60); // 1 minute cooldown
      toast.success(t('auth.mfa.email.codeSent'));
    } catch (error: unknown) {
      const apiError = error as { response?: { status?: number } };
      if (apiError.response?.status === 429) {
        toast.error(t('auth.mfa.email.waitBeforeResend'));
      } else {
        toast.error(t('auth.mfa.sendError'));
      }
    }
  };

  const handleCodeChange = (value: string) => {
    // Only allow numbers and limit to 6 digits
    const numericValue = value.replace(/\D/g, '').slice(0, 6);
    setCode(numericValue);
  };

  const isEmailMethod = method === 'email';
  const isTotpMethod = method === 'totp';

  return (
    <div className="relative flex min-h-screen flex-col bg-muted/40">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--color-primary)_16%,transparent),transparent_70%)]"
      />
      <main className="relative flex flex-1 items-start justify-center px-4 pt-[10vh] pb-12 sm:items-center sm:pt-0">
        <div className="w-full max-w-sm space-y-6">
          <AppLogo className="mx-auto h-9" />
          <Card>
            <CardPanel className="space-y-5 p-6 sm:p-8">
              {onBack && (
                <Button variant="ghost" size="sm" className="-ms-2 w-fit text-muted-foreground" onClick={onBack} disabled={isLoading}>
                  <ArrowLeft />
                  {t('auth.mfa.backToLogin')}
                </Button>
              )}
              <div className="space-y-1.5 text-center">
                <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-primary/12 text-primary">
                  {isTotpMethod ? <Smartphone className="size-6" /> : <Mail className="size-6" />}
                </div>
                <h1 className="font-semibold text-xl">{t('auth.mfa.title')}</h1>
                <p className="text-muted-foreground text-sm">
                  {isTotpMethod ? (
                    t('auth.mfa.totp.description')
                  ) : (
                    <>
                      {t('auth.mfa.email.description')} <strong className="font-medium text-foreground">{email}</strong>
                    </>
                  )}
                </p>
              </div>

              {attemptCount > 0 && remainingAttempts > 0 && (
                <Alert variant="error">
                  <Shield />
                  <AlertDescription>{t('auth.mfa.remainingAttempts', { count: remainingAttempts })}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="flex flex-col items-center gap-2">
                  <span id="verification-code-label" className="sr-only">
                    {t('auth.mfa.code.label')}
                  </span>
                  <OTPField
                    length={6}
                    size="lg"
                    value={code}
                    onValueChange={handleCodeChange}
                    validationType="numeric"
                    autoComplete="one-time-code"
                    aria-labelledby="verification-code-label"
                    disabled={isLoading}
                  >
                    <OTPFieldInput autoFocus />
                    <OTPFieldInput />
                    <OTPFieldInput />
                    <OTPFieldSeparator />
                    <OTPFieldInput />
                    <OTPFieldInput />
                    <OTPFieldInput />
                  </OTPField>
                  <p className="text-center text-muted-foreground text-xs">{t('auth.mfa.code.hint')}</p>
                </div>
                <Button type="submit" size="lg" loading={isLoading} disabled={code.length !== 6} className="w-full">
                  {isLoading ? t('auth.mfa.verifying') : t('auth.mfa.verify')}
                </Button>
              </form>

              {isEmailMethod && (
                <div className="text-center">
                  <Button variant="ghost" size="sm" onClick={handleResendCode} disabled={!canResend || isLoading}>
                    <RefreshCw />
                    {resendCooldown > 0
                      ? t('auth.mfa.email.resendIn', { seconds: resendCooldown })
                      : t('auth.mfa.email.resendButton')}
                  </Button>
                </div>
              )}

              <p className="text-center text-muted-foreground text-xs">
                {isTotpMethod ? t('auth.mfa.help.totp') : t('auth.mfa.help.email')}
              </p>
            </CardPanel>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default MfaVerification;
