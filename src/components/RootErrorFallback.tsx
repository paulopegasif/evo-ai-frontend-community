import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@evoapi/design-system';
import { useLanguage } from '@/hooks/useLanguage';
import { isChunkLoadError, reloadOnceForStaleChunks } from '@/utils/chunkReload';

interface RootErrorFallbackProps {
  error?: Error;
  retry: () => void;
}

/**
 * Last-resort fallback for render errors anywhere in the app. Without it React
 * unmounts the whole tree and the user sees a blank page until they refresh.
 * Stale-chunk errors (after a deploy) trigger a one-time automatic reload.
 */
const RootErrorFallback: React.FC<RootErrorFallbackProps> = ({ error }) => {
  const { t } = useLanguage('common');

  useEffect(() => {
    if (isChunkLoadError(error)) reloadOnceForStaleChunks();
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <h2 className="mb-2 text-xl font-semibold">{t('base.errorBoundary.title')}</h2>
      <p className="mb-4 max-w-md text-muted-foreground">{t('base.errorBoundary.description')}</p>
      <Button onClick={() => window.location.reload()} className="gap-2">
        <RefreshCw className="h-4 w-4" />
        {t('base.errorBoundary.retry')}
      </Button>
    </div>
  );
};

export default RootErrorFallback;
