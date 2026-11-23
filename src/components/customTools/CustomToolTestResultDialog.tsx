import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle2, XCircle, ChevronDown, Clock, Activity } from '@/components/icons';
import { useLanguage } from '@/hooks/useLanguage';
import type { CustomTool, CustomToolTestResponse } from '@/types/ai';

type TestResult = CustomToolTestResponse['test_result'] & {
  body?: unknown;
};

interface CustomToolTestResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tool: CustomTool | null;
  result: TestResult | null;
}

const statusColor = (code: number | undefined): string => {
  if (!code) return 'text-muted-foreground';
  if (code >= 200 && code < 300) return 'text-success-foreground';
  if (code >= 300 && code < 400) return 'text-info-foreground';
  if (code >= 400 && code < 500) return 'text-warning-foreground';
  return 'text-destructive-foreground';
};

const formatBody = (raw: unknown): string => {
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'string') {
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  }
  try {
    return JSON.stringify(raw, null, 2);
  } catch {
    return String(raw);
  }
};

export default function CustomToolTestResultDialog({
  open,
  onOpenChange,
  tool,
  result,
}: CustomToolTestResultDialogProps) {
  const { t } = useLanguage('customTools');
  const [headersOpen, setHeadersOpen] = useState(false);

  const isSuccess = !!result?.success;
  const hasStatusCode = !!result?.status_code;
  const hasHeaders = !!result?.headers && Object.keys(result.headers).length > 0;
  const hasBody = result?.body !== undefined && result?.body !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isSuccess ? (
              <CheckCircle2 className="size-5 text-success" />
            ) : (
              <XCircle className="size-5 text-destructive" />
            )}
            <span>{isSuccess ? t('testResult.titleSuccess') : t('testResult.titleError')}</span>
          </DialogTitle>
          {tool && (
            <DialogDescription>
              {tool.method} · {tool.name}
            </DialogDescription>
          )}
        </DialogHeader>

        <DialogPanel className="flex flex-col gap-4">
          {tool && (
            <div className="text-xs font-mono text-muted-foreground bg-muted/60 rounded-md px-3 py-2 break-all">
              {tool.endpoint}
            </div>
          )}

          {/* Top metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border bg-muted/40 px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Activity className="h-3.5 w-3.5" />
                {t('testResult.statusCode')}
              </div>
              <div className={`text-lg font-semibold ${statusColor(result?.status_code)}`}>
                {hasStatusCode ? result?.status_code : '—'}
              </div>
            </div>
            <div className="rounded-lg border bg-muted/40 px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Clock className="h-3.5 w-3.5" />
                {t('testResult.responseTime')}
              </div>
              <div className="text-lg font-semibold">
                {result?.response_time !== undefined && result.response_time > 0
                  ? `${Math.round(result.response_time * 1000)}ms`
                  : '—'}
              </div>
            </div>
          </div>

          {/* Error message */}
          {!isSuccess && result?.error && (
            <Alert variant="error">
              <XCircle />
              <AlertTitle>{t('testResult.errorLabel')}</AlertTitle>
              <AlertDescription className="break-words">{result.error}</AlertDescription>
            </Alert>
          )}

          {/* Headers */}
          {hasHeaders && (
            <Collapsible open={headersOpen} onOpenChange={setHeadersOpen}>
              <CollapsibleTrigger className="flex items-center gap-1 text-sm font-medium hover:text-foreground">
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${headersOpen ? 'rotate-180' : ''}`}
                />
                {t('testResult.responseHeaders')} ({Object.keys(result!.headers).length})
              </CollapsibleTrigger>
              <CollapsiblePanel className="mt-2 rounded-lg border bg-muted/40 p-3 font-mono text-xs space-y-1">
                {Object.entries(result!.headers).map(([k, v]) => (
                  <div key={k} className="break-all">
                    <span className="text-muted-foreground">{k}:</span> <span>{v}</span>
                  </div>
                ))}
              </CollapsiblePanel>
            </Collapsible>
          )}

          {/* Body */}
          {hasBody && (
            <div>
              <p className="text-sm font-medium mb-1.5">{t('testResult.responseBody')}</p>
              <pre className="rounded-lg border bg-muted/40 p-3 font-mono text-xs overflow-x-auto max-h-72">
                {formatBody(result?.body)}
              </pre>
            </div>
          )}

          {/* No data hint */}
          {!isSuccess && !result?.error && !hasStatusCode && (
            <p className="text-sm text-muted-foreground italic">{t('testResult.noData')}</p>
          )}
        </DialogPanel>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>{t('testResult.close')}</Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
