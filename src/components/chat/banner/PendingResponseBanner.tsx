import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, CheckCircle2, XCircle, RefreshCw } from '@/components/icons';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import FacebookModerationService from '@/services/channels/facebookModerationService';
import { FacebookCommentModeration } from '@/types';

interface PendingResponseBannerProps {
  moderation: FacebookCommentModeration;
  onModerationUpdated?: () => void;
}

export default function PendingResponseBanner({
  moderation,
  onModerationUpdated,
}: PendingResponseBannerProps) {
  const { t } = useLanguage('chat');
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      await FacebookModerationService.approveModeration(moderation.id);
      toast.success(t('messages.moderation.banner.approved'));
      onModerationUpdated?.();
    } catch (error) {
      console.error('Error approving moderation:', error);
      toast.error(t('messages.moderation.banner.approveError'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    try {
      await FacebookModerationService.rejectModeration(moderation.id, rejectionReason);
      toast.success(t('messages.moderation.banner.rejected'));
      setRejectionReason('');
      onModerationUpdated?.();
    } catch (error) {
      console.error('Error rejecting moderation:', error);
      toast.error(t('messages.moderation.banner.rejectError'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRegenerate = async () => {
    setIsProcessing(true);
    try {
      await FacebookModerationService.regenerateResponse(moderation.id);
      toast.success(t('messages.moderation.banner.regenerated'));
      onModerationUpdated?.();
    } catch (error) {
      console.error('Error regenerating response:', error);
      toast.error(t('messages.moderation.banner.regenerateError'));
    } finally {
      setIsProcessing(false);
    }
  };

  if (!moderation.response_content) {
    return null;
  }

  return (
    <div className="mx-4 mb-4 rounded-xl border border-primary/24 bg-primary/4 p-3">
      <div className="flex items-start gap-3">
        <div className="flex size-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/12">
          <Shield className="size-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="info">
              {t('messages.moderation.banner.pendingApproval')}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {t('messages.moderation.banner.responseReady')}
            </span>
          </div>
          <div className="mb-3 rounded-lg border bg-background p-3">
            <p className="text-sm font-medium mb-1 text-foreground">
              {t('messages.moderation.banner.generatedResponse')}
            </p>
            <p className="text-sm text-muted-foreground">{moderation.response_content}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={handleApprove}
              disabled={isProcessing}
            >
              <CheckCircle2 />
              {t('messages.moderation.banner.approve')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRegenerate}
              disabled={isProcessing}
            >
              <RefreshCw className={isProcessing ? 'animate-spin' : undefined} />
              {t('messages.moderation.banner.regenerate')}
            </Button>
            <Button
              size="sm"
              variant="destructive-outline"
              onClick={handleReject}
              disabled={isProcessing}
            >
              <XCircle />
              {t('messages.moderation.banner.reject')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
