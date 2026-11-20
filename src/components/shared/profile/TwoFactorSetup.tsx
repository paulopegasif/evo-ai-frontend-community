import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import ConfirmDialog from '@/components/base/ConfirmDialog';
import RadioCardGroup from '@/components/base/RadioCard';
import { Shield, Smartphone, Mail, AlertTriangle, Check, Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { twoFactorService } from '@/services/profile/twoFactorService';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/contexts/AuthContext';

interface TwoFactorSetupProps {
  onUpdate?: () => void;
}

const TwoFactorSetup = ({ onUpdate }: TwoFactorSetupProps) => {
  const { t } = useLanguage('profile');
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const mfaEnabled = user?.mfa_enabled ?? false;
  const mfaSetupIncomplete = user?.mfa_setup_incomplete ?? false;

  // Setup state
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'totp' | 'email'>('totp');
  const [setupStep, setSetupStep] = useState<'method' | 'configure' | 'verify' | 'backup'>('method');

  // TOTP setup
  const [qrCode, setQrCode] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  // Verification
  const [verificationCode, setVerificationCode] = useState('');

  // Disable dialog
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);

  const handleEnableMfa = async () => {
    setIsLoading(true);
    try {
      const response = await twoFactorService.enable(selectedMethod);

      if (selectedMethod === 'totp') {
        setQrCode(response.qr_code || '');
        setSecretKey(response.secret || '');
        setBackupCodes(response.backup_codes || []);
        setSetupStep('configure');
      } else {
        setSetupStep('verify');
        toast.success(t('twoFactor.notifications.emailCodeSent'));
      }
    } catch (error: unknown) {
      const apiError = error as { response?: { status?: number } };
      if (apiError.response?.status === 401) {
        toast.error(t('twoFactor.notifications.passwordIncorrect'));
      } else {
        toast.error(t('twoFactor.notifications.enableError'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length < 6) {
      toast.error(t('twoFactor.verify.errors.invalidCode'));
      return;
    }

    setIsLoading(true);
    try {
      await twoFactorService.verify(verificationCode, selectedMethod, true);

      if (selectedMethod === 'totp' && backupCodes.length > 0) {
        setSetupStep('backup');
      } else {
        toast.success(t('twoFactor.notifications.enabled'));
        setSetupDialogOpen(false);
        resetSetupState();
        onUpdate?.();
      }
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { attempts_remaining?: number } } };
      const attemptsRemaining = apiError.response?.data?.attempts_remaining;
      if (attemptsRemaining !== undefined) {
        toast.error(t('twoFactor.verify.errors.attemptsRemaining', { attempts: attemptsRemaining }));
      } else {
        toast.error(t('twoFactor.verify.errors.invalidCode'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableMfa = async () => {
    setIsLoading(true);
    try {
      await twoFactorService.disable();
      toast.success(t('twoFactor.notifications.disabled'));
      setDisableDialogOpen(false);
      onUpdate?.();
    } catch (error: unknown) {
      const apiError = error as { response?: { status?: number } };
      if (apiError.response?.status === 401) {
        toast.error(t('twoFactor.notifications.passwordIncorrect'));
      } else {
        toast.error(t('twoFactor.notifications.disableError'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateBackupCodes = async () => {
    setIsLoading(true);
    try {
      const response = await twoFactorService.regenerateBackupCodes();
      setBackupCodes(response.backup_codes);
      setSetupStep('backup');
      setSetupDialogOpen(true);
      toast.success(t('twoFactor.backupCodes.regenerated'));
    } catch {
      toast.error(t('twoFactor.notifications.backupCodesError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmailCode = async () => {
    setIsLoading(true);
    try {
      await twoFactorService.sendEmailCode();
      toast.success(t('twoFactor.notifications.emailCodeResent'));
    } catch (error: unknown) {
      const apiError = error as { response?: { status?: number } };
      if (apiError.response?.status === 429) {
        toast.error(t('twoFactor.notifications.emailCodeRateLimit'));
      } else {
        toast.error(t('twoFactor.notifications.emailCodeError'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t('accessToken.notifications.copied'));
    } catch {
      toast.error(t('accessToken.notifications.copyError'));
    }
  };

  const copyAllBackupCodes = async () => {
    const codesText = backupCodes.join('\n');
    await copyToClipboard(codesText);
  };

  const resetSetupState = () => {
    setSetupStep('method');
    setVerificationCode('');
    setQrCode('');
    setSecretKey('');
    setBackupCodes([]);
    setSelectedMethod('totp');
  };

  const closeSetup = () => {
    setSetupDialogOpen(false);
    resetSetupState();
  };

  const renderSetupDialog = () => {
    switch (setupStep) {
      case 'method':
        return (
          <>
            <DialogHeader>
              <DialogTitle>{t('twoFactor.setup.title')}</DialogTitle>
              <DialogDescription>{t('twoFactor.setup.description')}</DialogDescription>
            </DialogHeader>
            <DialogPanel className="flex flex-col gap-3">
              <Label id="mfa-method-label">{t('twoFactor.setup.methodSelection')}</Label>
              <RadioCardGroup
                aria-labelledby="mfa-method-label"
                className="grid-cols-1 sm:grid-cols-1"
                value={selectedMethod}
                onValueChange={setSelectedMethod}
                options={[
                  {
                    value: 'totp',
                    icon: <Smartphone />,
                    title: t('twoFactor.setup.totp.title'),
                    description: t('twoFactor.setup.totp.description'),
                  },
                  {
                    value: 'email',
                    icon: <Mail />,
                    title: t('twoFactor.setup.email.title'),
                    description: t('twoFactor.setup.email.description'),
                  },
                ]}
              />
            </DialogPanel>
            <DialogFooter>
              <Button variant="ghost" onClick={closeSetup}>
                {t('twoFactor.setup.actions.cancel')}
              </Button>
              <Button onClick={handleEnableMfa} loading={isLoading}>
                {isLoading ? t('twoFactor.setup.actions.processing') : t('twoFactor.setup.actions.continue')}
              </Button>
            </DialogFooter>
          </>
        );

      case 'configure':
        return (
          <>
            <DialogHeader>
              <DialogTitle>{t('twoFactor.configure.title')}</DialogTitle>
              <DialogDescription>{t('twoFactor.configure.description')}</DialogDescription>
            </DialogHeader>
            <DialogPanel className="flex flex-col gap-5">
              {qrCode ? (
                // QR codes need a white quiet zone to scan reliably in dark mode too.
                <div className="flex justify-center rounded-xl border bg-white p-4">
                  <div
                    dangerouslySetInnerHTML={{ __html: qrCode }}
                    className="flex items-center justify-center"
                    style={{ minHeight: '200px', minWidth: '200px' }}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-1 rounded-xl border bg-muted/48 p-6 text-center">
                  <p className="text-muted-foreground">{t('twoFactor.configure.qrCodeLoading')}</p>
                  <p className="text-muted-foreground text-sm">{t('twoFactor.configure.qrCodeError')}</p>
                </div>
              )}

              <Field>
                <FieldLabel htmlFor="mfa-secret-key">{t('twoFactor.configure.manualKey')}</FieldLabel>
                <div className="flex w-full gap-2">
                  <Input id="mfa-secret-key" value={secretKey || ''} readOnly className="font-mono" />
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => copyToClipboard(secretKey)}
                          aria-label={t('twoFactor.configure.copyKey')}
                        />
                      }
                    >
                      <Copy />
                    </TooltipTrigger>
                    <TooltipPopup>{t('twoFactor.configure.copyKey')}</TooltipPopup>
                  </Tooltip>
                </div>
                <FieldDescription>{t('twoFactor.configure.manualKeyDescription')}</FieldDescription>
              </Field>
            </DialogPanel>
            <DialogFooter>
              <Button variant="ghost" onClick={closeSetup}>
                {t('twoFactor.setup.actions.cancel')}
              </Button>
              <Button onClick={() => setSetupStep('verify')}>{t('twoFactor.configure.actions.configured')}</Button>
            </DialogFooter>
          </>
        );

      case 'verify':
        return (
          <>
            <DialogHeader>
              <DialogTitle>{t('twoFactor.verify.title')}</DialogTitle>
              <DialogDescription>
                {selectedMethod === 'totp'
                  ? t('twoFactor.verify.descriptionTotp')
                  : t('twoFactor.verify.descriptionEmail')}
              </DialogDescription>
            </DialogHeader>
            <DialogPanel className="flex flex-col gap-3">
              <Field>
                <FieldLabel htmlFor="verification-code">{t('twoFactor.verify.codeLabel')}</FieldLabel>
                <Input
                  id="verification-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={verificationCode}
                  onChange={e => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  size="lg"
                  className="text-center font-mono text-2xl tracking-widest"
                />
              </Field>

              {selectedMethod === 'email' && (
                <Button variant="link" onClick={handleResendEmailCode} disabled={isLoading} className="self-center">
                  <RefreshCw />
                  {t('twoFactor.verify.resendEmail')}
                </Button>
              )}
            </DialogPanel>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSetupStep(selectedMethod === 'totp' ? 'configure' : 'method')}>
                {t('twoFactor.verify.actions.back')}
              </Button>
              <Button onClick={handleVerifyCode} disabled={verificationCode.length !== 6} loading={isLoading}>
                {isLoading ? t('twoFactor.verify.actions.verifying') : t('twoFactor.verify.actions.verify')}
              </Button>
            </DialogFooter>
          </>
        );

      case 'backup':
        return (
          <>
            <DialogHeader>
              <DialogTitle>{t('twoFactor.backupCodes.title')}</DialogTitle>
              <DialogDescription>{t('twoFactor.backupCodes.description')}</DialogDescription>
            </DialogHeader>
            <DialogPanel className="flex flex-col gap-4">
              <Alert variant="warning">
                <AlertTriangle />
                <AlertDescription>{t('twoFactor.backupCodes.warning')}</AlertDescription>
              </Alert>

              <ol className="grid grid-cols-2 gap-2 rounded-xl border bg-muted/48 p-4">
                {backupCodes.map((code, index) => (
                  <li key={index} className="flex items-center gap-2 font-mono text-sm">
                    <span className="text-muted-foreground tabular-nums">{index + 1}.</span>
                    <span>{code}</span>
                  </li>
                ))}
              </ol>

              <Button variant="outline" onClick={copyAllBackupCodes} className="w-full">
                <Copy />
                {t('twoFactor.backupCodes.copyAll')}
              </Button>
            </DialogPanel>
            <DialogFooter>
              <Button
                onClick={() => {
                  setSetupDialogOpen(false);
                  resetSetupState();
                  onUpdate?.();
                  toast.success(t('twoFactor.notifications.enabled'));
                }}
              >
                <Check />
                {t('twoFactor.backupCodes.complete')}
              </Button>
            </DialogFooter>
          </>
        );
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Shield className="size-5 text-muted-foreground" />
              <CardTitle>{t('twoFactor.title')}</CardTitle>
            </div>
            {mfaEnabled && <Badge variant="success">{t('twoFactor.status.enabled')}</Badge>}
          </div>
          <CardDescription>{t('twoFactor.description')}</CardDescription>
        </CardHeader>
        <CardPanel className="flex flex-col gap-4">
          {!mfaEnabled ? (
            <>
              {mfaSetupIncomplete && (
                <Alert variant="error">
                  <AlertTriangle />
                  <AlertDescription>{t('twoFactor.setupIncompleteWarning')}</AlertDescription>
                </Alert>
              )}
              <Alert variant="info">
                <Shield />
                <AlertDescription>{t('twoFactor.info')}</AlertDescription>
              </Alert>
              <Button onClick={() => setSetupDialogOpen(true)} className="self-start">
                <Shield />
                {t('twoFactor.actions.enable')}
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
                <div>
                  <p className="font-medium text-sm">{t('twoFactor.status.title')}</p>
                  <p className="text-muted-foreground text-sm">{t('twoFactor.status.configured')}</p>
                </div>
                <Badge variant="success">
                  <Check />
                  {t('twoFactor.status.enabled')}
                </Badge>
              </div>

              <div className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-sm">{t('twoFactor.backupCodes.title')}</p>
                  <p className="text-muted-foreground text-sm">{t('twoFactor.backupCodes.regenerateDescription')}</p>
                </div>
                <Button size="sm" variant="outline" onClick={handleRegenerateBackupCodes} loading={isLoading}>
                  {!isLoading && <RefreshCw />}
                  {t('twoFactor.backupCodes.regenerate')}
                </Button>
              </div>

              <div className="flex justify-end">
                <Button variant="destructive-outline" onClick={() => setDisableDialogOpen(true)}>
                  {t('twoFactor.actions.disable')}
                </Button>
              </div>
            </>
          )}
        </CardPanel>
      </Card>

      <Dialog
        open={setupDialogOpen}
        onOpenChange={open => {
          if (!open) resetSetupState();
          setSetupDialogOpen(open);
        }}
      >
        <DialogPopup className="sm:max-w-md">{renderSetupDialog()}</DialogPopup>
      </Dialog>

      <ConfirmDialog
        open={disableDialogOpen}
        onOpenChange={setDisableDialogOpen}
        variant="destructive"
        title={t('twoFactor.disable.title')}
        description={t('twoFactor.disable.description')}
        cancelLabel={t('twoFactor.disable.actions.cancel')}
        confirmLabel={isLoading ? t('twoFactor.disable.actions.disabling') : t('twoFactor.disable.actions.disable')}
        onConfirm={handleDisableMfa}
        loading={isLoading}
      >
        <Alert variant="error">
          <AlertTriangle />
          <AlertDescription>{t('twoFactor.disable.warning')}</AlertDescription>
        </Alert>
      </ConfirmDialog>
    </>
  );
};

export default TwoFactorSetup;
