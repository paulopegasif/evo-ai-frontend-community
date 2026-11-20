import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogDescription, DialogPopup, DialogTitle } from '@/components/ui/dialog';
import { tourRegistry } from '@/tours/tourRegistry';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/store/authStore';

const TOUR_ROUTE = '/channels';

export function WelcomeTourModal() {
  const { t } = useTranslation('tours');
  const tours = useAuthStore(state => state.tours);
  const markTourCompleted = useAuthStore(state => state.markTourCompleted);
  const markTourSkipped = useAuthStore(state => state.markTourSkipped);

  const [pendingTour, setPendingTour] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissed = !!tours['onboarding:welcome'];

  // Only start the tour after we have navigated to TOUR_ROUTE
  useEffect(() => {
    if (!pendingTour) return;
    if (pathname !== TOUR_ROUTE) return;

    timerRef.current = setTimeout(() => {
      tourRegistry.start(TOUR_ROUTE);
      setPendingTour(false);
    }, 400);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pendingTour, pathname]);

  if (dismissed) return null;

  const handleDismiss = () => {
    markTourSkipped('onboarding:preference');
    markTourCompleted('onboarding:welcome');
  };

  const handleStartTour = () => {
    markTourCompleted('onboarding:preference');
    markTourCompleted('onboarding:welcome');
    navigate(TOUR_ROUTE);
    setPendingTour(true);
  };

  return (
    <Dialog open onOpenChange={open => !open && handleDismiss()}>
      <DialogPopup showCloseButton={false} bottomStickOnMobile={false} className="max-w-sm">
        <div className="flex flex-col items-center gap-5 p-6 pt-8 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <Map className="size-7" />
          </div>
          <div className="space-y-1.5">
            <DialogTitle className="text-lg">{t('welcome.title')}</DialogTitle>
            <DialogDescription>{t('welcome.description')}</DialogDescription>
          </div>
          <div className="flex w-full flex-col gap-2">
            <Button size="lg" onClick={handleStartTour} className="w-full">
              {t('welcome.startButton')}
            </Button>
            <Button variant="ghost" onClick={handleDismiss} className="w-full text-muted-foreground">
              {t('welcome.skipButton')}
            </Button>
          </div>
        </div>
      </DialogPopup>
    </Dialog>
  );
}
