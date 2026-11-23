import { useState, useMemo } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { BellOff, ChevronLeft, ChevronRight, ListCheck, Settings, X } from '@/components/icons';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import { useNotifications } from '@/contexts/NotificationsContext';
import { Notification } from '@/services/notifications/NotificationsService';
import NotificationItem from './NotificationItem';

interface NotificationPanelProps {
  onClose: () => void;
}

const PAGE_SIZE = 15;

export default function NotificationPanel({ onClose }: NotificationPanelProps) {
  const { t } = useLanguage('layout');
  const navigate = useNavigate();
  const { state, actions } = useNotifications();
  const [currentPage, setCurrentPage] = useState(1);

  const totalUnreadCount = state.meta.unreadCount;
  const totalCount = state.meta.count;

  // Show all notifications (read + unread); the unread dot is rendered by
  // NotificationItem so history stays visible after "mark all" (EVO-977 AC2).
  const paginatedNotifications = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return state.notifications.slice(startIndex, startIndex + PAGE_SIZE);
  }, [state.notifications, currentPage]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage >= totalPages;

  const handlePageChange = (page: number) => {
    const newPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(newPage);
    actions.fetchNotifications({ page: newPage });
  };

  const handleOpenNotification = async (notification: Notification) => {
    try {
      await actions.markAsRead(notification);
      if (notification.primary_actor?.id) {
        navigate(`/conversations/${notification.primary_actor.id}`);
        onClose();
      }
    } catch (error) {
      console.error('Error opening notification:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await actions.markAllAsRead();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleOpenSettings = () => {
    navigate('/profile/notifications');
    onClose();
  };

  const getNotificationTypeLabel = (type: string) => {
    const key = `notifications.panel.types.${type}`;
    const translated = t(key);
    return translated !== key ? translated : type;
  };

  const iconAction = (label: string, icon: React.ReactNode, onClick: () => void) => (
    <Tooltip>
      <TooltipTrigger render={<Button variant="ghost" size="icon-sm" onClick={onClick} aria-label={label} />}>
        {icon}
      </TooltipTrigger>
      <TooltipPopup>{label}</TooltipPopup>
    </Tooltip>
  );

  const isInitialLoad = state.uiFlags.isFetching && paginatedNotifications.length === 0;

  return (
    <div className="flex max-h-[min(36rem,80vh)] min-h-72 flex-col">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-base">{t('notifications.panel.title')}</h2>
          {totalUnreadCount > 0 && <Badge variant="secondary">{totalUnreadCount}</Badge>}
          {state.uiFlags.isFetching && paginatedNotifications.length > 0 && (
            <Spinner className="size-3.5 text-muted-foreground" aria-label={t('notifications.panel.loading')} />
          )}
        </div>
        <div className="flex items-center gap-1">
          {totalUnreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={state.uiFlags.isUpdating}
            >
              <ListCheck />
              {t('notifications.panel.markAllAsRead')}
            </Button>
          )}
          {iconAction(t('notifications.panel.settings'), <Settings />, handleOpenSettings)}
          {iconAction(t('notifications.panel.close'), <X />, onClose)}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isInitialLoad ? (
          <div className="space-y-1 p-2" aria-label={t('notifications.panel.loading')}>
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-start gap-3 p-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : paginatedNotifications.length === 0 ? (
          <Empty className="h-full">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BellOff />
              </EmptyMedia>
              <EmptyTitle>{t('notifications.panel.emptyTitle')}</EmptyTitle>
              <EmptyDescription>{t('notifications.panel.emptyDescription')}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="divide-y p-1">
            {paginatedNotifications.map(notification => (
              <li key={notification.id}>
                <NotificationItem
                  notification={notification}
                  onOpen={handleOpenNotification}
                  getTypeLabel={getNotificationTypeLabel}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {totalCount > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-3 py-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={isFirstPage}
            aria-label={t('notifications.panel.previousPage')}
          >
            <ChevronLeft />
          </Button>
          <span className="text-muted-foreground text-sm tabular-nums">
            {currentPage}
            {t('notifications.panel.pagination.separator')}
            {totalPages}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={isLastPage}
            aria-label={t('notifications.panel.nextPage')}
          >
            <ChevronRight />
          </Button>
        </div>
      )}
    </div>
  );
}
