import React, { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import usersService from '@/services/users/usersService';
import { CheckCircle, Info, XCircle, Mail } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface BulkInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkInviteModal({ isOpen, onClose, onSuccess }: BulkInviteModalProps) {
  const { t } = useLanguage('users');
  const [loading, setLoading] = useState(false);
  const [emailsText, setEmailsText] = useState('');
  const [result, setResult] = useState<{
    invited: Array<{ email: string; name: string }>;
    failed: Array<{ email: string; error: string }>;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!emailsText.trim()) {
      toast.error(t('bulkInvite.messages.enterEmail'));
      return;
    }

    // Extrair emails do texto
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = emailsText.match(emailRegex) || [];

    if (emails.length === 0) {
      toast.error(t('bulkInvite.messages.noValidEmail'));
      return;
    }

    // Remover duplicatas
    const uniqueEmails = [...new Set(emails)];

    setLoading(true);
    try {
      const response = await usersService.bulkInvite({
        emails: uniqueEmails,
      });

      setResult({
        invited: response.invited_users || [],
        failed: response.failed_invitations || [],
      });

      const successCount = response.invited_users?.length || 0;
      const failedCount = response.failed_invitations?.length || 0;

      if (successCount > 0 && failedCount === 0) {
        toast.success(t('bulkInvite.messages.allSuccess', { count: successCount }));
      } else if (successCount > 0 && failedCount > 0) {
        toast.success(t('bulkInvite.messages.partialSuccess', { successCount, failedCount }));
      } else if (failedCount > 0) {
        toast.error(t('bulkInvite.messages.allFailed', { count: failedCount }));
      }
    } catch (error: any) {
      console.error('Erro no convite em massa:', error);
      toast.error(error.message || t('bulkInvite.messages.sendError'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (result?.invited.length) {
      onSuccess();
    }
    setEmailsText('');
    setResult(null);
    onClose();
  };

  const handleStartNew = () => {
    setEmailsText('');
    setResult(null);
  };

  const onOpenChange = (open: boolean) => {
    if (!open) handleClose();
  };

  if (result) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogPopup className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="size-5 text-muted-foreground" />
              {t('bulkInvite.resultTitle')}
            </DialogTitle>
          </DialogHeader>

          <DialogPanel className="flex flex-col gap-4">
            {result.invited.length > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="flex items-center gap-2 font-medium text-sm text-success-foreground">
                  <CheckCircle className="size-4" />
                  {t('bulkInvite.results.invited', { count: result.invited.length })}
                </h3>
                <ul className="flex flex-col divide-y rounded-xl border border-success/24 bg-success/4 text-sm">
                  {result.invited.map((user, index) => (
                    <li key={index} className="px-3 py-2">
                      {user.email}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.failed.length > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="flex items-center gap-2 font-medium text-destructive-foreground text-sm">
                  <XCircle className="size-4" />
                  {t('bulkInvite.results.failed', { count: result.failed.length })}
                </h3>
                <ul className="flex flex-col divide-y rounded-xl border border-destructive/24 bg-destructive/4 text-sm">
                  {result.failed.map((failure, index) => (
                    <li key={index} className="flex flex-col gap-0.5 px-3 py-2">
                      <span className="font-medium">{failure.email}</span>
                      <span className="text-destructive-foreground text-xs">{failure.error}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </DialogPanel>

          <DialogFooter>
            <Button onClick={handleStartNew} variant="outline">
              {t('bulkInvite.actions.sendMore')}
            </Button>
            <Button onClick={handleClose}>{t('bulkInvite.actions.finish')}</Button>
          </DialogFooter>
        </DialogPopup>
      </Dialog>
    );
  }

  const emailCount = new Set(emailsText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []).size;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogPopup className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="size-5 text-muted-foreground" />
              {t('bulkInvite.title')}
            </DialogTitle>
          </DialogHeader>

          <DialogPanel className="flex flex-col gap-5">
            <Alert variant="info">
              <Info />
              <AlertTitle>{t('bulkInvite.howToUse.title')}</AlertTitle>
              <AlertDescription>
                <ul className="list-disc ps-4">
                  <li>{t('bulkInvite.howToUse.step1')}</li>
                  <li>{t('bulkInvite.howToUse.step2')}</li>
                  <li>{t('bulkInvite.howToUse.step3')}</li>
                  <li>{t('bulkInvite.howToUse.step4')}</li>
                </ul>
              </AlertDescription>
            </Alert>

            <Field>
              <div className="flex w-full items-center justify-between gap-2">
                <FieldLabel htmlFor="emails">
                  {t('bulkInvite.fields.emails.label')}
                  <span className="text-destructive-foreground">*</span>
                </FieldLabel>
                {emailCount > 0 && (
                  <Badge variant="secondary" className="tabular-nums">
                    <Mail />
                    {emailCount}
                  </Badge>
                )}
              </div>
              <Textarea
                id="emails"
                value={emailsText}
                onChange={e => setEmailsText(e.target.value)}
                placeholder={`usuario1@exemplo.com
usuario2@exemplo.com, usuario3@exemplo.com
usuario4@exemplo.com`}
                className="min-h-32 font-mono text-sm"
                disabled={loading}
              />
              <FieldDescription>{t('bulkInvite.fields.emails.hint')}</FieldDescription>
            </Field>
          </DialogPanel>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleClose} disabled={loading}>
              {t('bulkInvite.actions.cancel')}
            </Button>
            <Button type="submit" disabled={!emailsText.trim()} loading={loading}>
              {!loading && <Mail />}
              {loading ? t('bulkInvite.actions.sending') : t('bulkInvite.actions.sendInvites')}
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}
