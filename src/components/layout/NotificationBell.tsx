import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Bell } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Popover, PopoverPopup, PopoverTrigger } from '@/components/ui/popover';
import NotificationPanel from './NotificationPanel';
import { useNotifications } from '@/contexts/NotificationsContext';
import { cn } from '@/lib/utils';

export default function NotificationBell() {
  const { t } = useLanguage('layout');
  const [isOpen, setIsOpen] = useState(false);
  const { state, actions } = useNotifications();
  const location = useLocation();
  // Initialize with the current pathname so the effect only fires on actual
  // navigations — not on initial mount or re-mounts caused by state updates.
  const lastMarkedPathRef = useRef<string>(location.pathname);

  // Mark the notification as read when the user navigates to a conversation
  // without clicking the notification item (e.g., from the sidebar).
  useEffect(() => {
    const prevPath = lastMarkedPathRef.current;
    lastMarkedPathRef.current = location.pathname;

    // Skip if the path didn't actually change (mount / re-render on same route)
    if (prevPath === location.pathname) return;

    const match = location.pathname.match(/\/conversations\/([^/]+)/);
    if (!match) return;
    const conversationId = match[1];
    actions.markConversationAsRead(conversationId);
  }, [location.pathname, actions]);

  // Fetch notifications every time the dropdown opens.
  // `actions` is now memoized in the provider (deps=[]), so it's stable across
  // renders and safe to include here without causing re-fetch loops.
  useEffect(() => {
    if (isOpen) {
      actions.fetchNotifications({ page: 1 });
    }
  }, [isOpen, actions]);

  const unreadCount = state.meta.unreadCount;

  // Format unread count display
  const getUnreadCountDisplay = () => {
    if (unreadCount === 0) return '';
    return unreadCount < 100 ? unreadCount.toString() : '99+';
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('notifications.bell.ariaLabel')}
            className={cn(
              'relative text-sidebar-foreground hover:bg-sidebar-accent',
              isOpen && 'bg-sidebar-accent',
            )}
          />
        }
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-warning px-1 font-medium text-[10px] text-black tabular-nums ring-2 ring-sidebar">
            {getUnreadCountDisplay()}
          </span>
        )}
      </PopoverTrigger>
      <PopoverPopup
        align="end"
        sideOffset={8}
        className="w-[min(30rem,calc(100vw-1rem))] [&_[data-slot=popover-viewport]]:p-0"
      >
        <NotificationPanel onClose={() => setIsOpen(false)} />
      </PopoverPopup>
    </Popover>
  );
}
