import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, ShieldX } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardPanel } from '@/components/ui/card';
import { useLanguage } from '@/hooks/useLanguage';

const Unauthorized: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage('unauthorized');

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-destructive/8 text-destructive">
          <ShieldX className="size-7" />
        </div>
        <div className="space-y-1.5">
          <h1 className="font-semibold text-2xl">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Card className="text-left">
          <CardPanel className="space-y-4">
            <p className="text-sm">{t('description')}</p>
            <Alert variant="warning">
              <AlertTitle>{t('contactAdmin.title')}</AlertTitle>
              <AlertDescription>{t('contactAdmin.message')}</AlertDescription>
            </Alert>
          </CardPanel>
        </Card>
        <div className="flex flex-col justify-center gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft />
            {t('buttons.back')}
          </Button>
          <Button onClick={() => navigate('/')}>
            <Home />
            {t('buttons.goHome')}
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">{t('errorCode')}</p>
      </div>
    </main>
  );
};

export default Unauthorized;
