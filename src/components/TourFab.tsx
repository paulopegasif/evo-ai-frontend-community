import { useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';
import { CircleHelp } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import { tourRegistry, matchTourRoute } from '@/tours/tourRegistry';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/store/authStore';

export function TourFab() {
  const { t } = useTranslation('tours');
  const snapshot = useSyncExternalStore(
    tourRegistry.subscribe,
    tourRegistry.getSnapshot,
  );
  const { pathname } = useLocation();
  const tours = useAuthStore(state => state.tours);
  const matchedRoute = matchTourRoute(pathname, snapshot);

  if (!matchedRoute) return null;

  const tourKey = matchedRoute.slice(1);
  const tourSeen = tours[tourKey] === 'completed' || tours[tourKey] === 'skipped';

  const button = (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => tourRegistry.start(matchedRoute)}
      aria-label={t('viewPageTour')}
      data-tour="nav-tour-icon"
      className="text-sidebar-foreground hover:bg-sidebar-accent"
    />
  );

  // First visit: no tooltip, so the icon reads as an invitation rather than a hint.
  if (!tourSeen) {
    return (
      <Button {...button.props}>
        <CircleHelp className="size-5" />
      </Button>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger render={button}>
        <CircleHelp className="size-5" />
      </TooltipTrigger>
      <TooltipPopup>{t('viewPageTour')}</TooltipPopup>
    </Tooltip>
  );
}
