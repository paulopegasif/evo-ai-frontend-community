import { CircleAlert } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import { useLanguage } from '@/hooks/useLanguage';
import { ConnectionTest } from './ConnectionTest';

interface FormFooterProps {
  onCancel: () => void;
  onSubmit: () => void;
  onTest?: () => Promise<void>;
  isSubmitting: boolean;
  isTesting?: boolean;
  isDisabled?: boolean;
  showTestConnection?: boolean;
  submitText?: string;
  cancelText?: string;
  healthCheckPassed?: boolean | null;
}

export const FormFooter = ({
  onCancel,
  onSubmit,
  onTest,
  isSubmitting,
  isTesting = false,
  isDisabled = false,
  showTestConnection = false,
  submitText,
  cancelText,
  healthCheckPassed,
}: FormFooterProps) => {
  const { t } = useLanguage('channels');

  // Submit stays locked until the connection test passed (when a test applies).
  const isDisabledByHealthCheck = showTestConnection && healthCheckPassed !== true;
  const isButtonDisabled = isSubmitting || isTesting || isDisabled;

  const submitButton = (
    <Button onClick={onSubmit} disabled={isButtonDisabled} loading={isSubmitting} className="min-w-32">
      {isSubmitting ? t('newChannel.buttons.creating') : submitText || t('newChannel.buttons.createChannel')}
    </Button>
  );

  return (
    <div className="flex flex-col gap-3 border-t bg-muted/72 px-6 py-4">
      {isDisabledByHealthCheck && (
        <Alert variant="warning">
          <CircleAlert />
          <AlertDescription>{t('newChannel.messages.testConnectionFirst')}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {showTestConnection && onTest && (
            <ConnectionTest onTest={onTest} isLoading={isTesting} disabled={isSubmitting || isTesting} />
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button variant="ghost" onClick={onCancel} disabled={isSubmitting || isTesting}>
            {cancelText || t('newChannel.buttons.cancel')}
          </Button>
          {isDisabledByHealthCheck ? (
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex" />}>{submitButton}</TooltipTrigger>
              <TooltipPopup>{t('newChannel.messages.testConnectionFirst')}</TooltipPopup>
            </Tooltip>
          ) : (
            submitButton
          )}
        </div>
      </div>
    </div>
  );
};
