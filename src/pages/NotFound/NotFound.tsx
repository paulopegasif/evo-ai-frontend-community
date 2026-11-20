import { useNavigate } from 'react-router-dom';
import { Home, MapPinOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { useLanguage } from '@/hooks/useLanguage';

const NotFound = () => {
  const navigate = useNavigate();
  const { t } = useLanguage('notFound');

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MapPinOff />
          </EmptyMedia>
          <p className="font-semibold text-5xl text-muted-foreground/48 tabular-nums">404</p>
          <EmptyTitle className="text-xl">{t('title')}</EmptyTitle>
          <EmptyDescription>{t('description')}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={() => navigate('/')}>
            <Home />
            {t('button.backToHome')}
          </Button>
        </EmptyContent>
      </Empty>
    </main>
  );
};

export default NotFound;
