import React from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; retry: () => void }>;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} retry={this.handleRetry} />;
      }

      return <DefaultErrorFallback error={this.state.error} retry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

interface DefaultErrorFallbackProps {
  error?: Error;
  retry: () => void;
}

const DefaultErrorFallback: React.FC<DefaultErrorFallbackProps> = ({ error, retry }) => {
  const { t } = useLanguage('common');

  return (
    <Empty className="min-h-[400px]">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="text-destructive-foreground">
          <AlertTriangle />
        </EmptyMedia>
        <EmptyTitle>{t('base.errorBoundary.title')}</EmptyTitle>
        <EmptyDescription>{t('base.errorBoundary.description')}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        {error && process.env.NODE_ENV === 'development' && (
          <details className="w-full max-w-md text-start">
            <summary className="mb-2 cursor-pointer text-muted-foreground text-sm">
              {t('base.errorBoundary.technicalDetails')}
            </summary>
            <pre className="max-h-64 overflow-auto rounded-lg bg-muted p-2 text-xs">
              {error.message}
              {error.stack && '\n\n' + error.stack}
            </pre>
          </details>
        )}
        <Button onClick={retry}>
          <RefreshCw />
          {t('base.errorBoundary.retry')}
        </Button>
      </EmptyContent>
    </Empty>
  );
};

export default ErrorBoundary;
