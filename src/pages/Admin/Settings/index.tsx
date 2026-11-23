import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { Mail, HardDrive, MessageSquare, Sparkles, Puzzle, Cable } from 'lucide-react';

const navItems = [
  { key: 'email', path: '/settings/admin/email', icon: Mail },
  { key: 'storage', path: '/settings/admin/storage', icon: HardDrive },
  { key: 'channels', path: '/settings/admin/channels', icon: MessageSquare },
  { key: 'openai', path: '/settings/admin/openai', icon: Sparkles },
  { key: 'integrations', path: '/settings/admin/integrations', icon: Puzzle },
  { key: 'evolutionHub', path: '/settings/admin/evolution-hub', icon: Cable },
] as const;

export default function AdminSettingsLayout() {
  const { t } = useLanguage('adminSettings');
  const location = useLocation();

  if (location.pathname === '/settings/admin' || location.pathname === '/settings/admin/') {
    return <Navigate to="/settings/admin/email" replace />;
  }

  return (
    <div className="flex h-full flex-col md:flex-row">
      <aside className="shrink-0 border-b p-3 md:w-60 md:border-r md:border-b-0 md:p-4">
        <h3 className="mb-3 hidden px-2 font-medium text-muted-foreground text-xs uppercase tracking-wider md:block">
          {t('title')}
        </h3>
        <nav className="flex gap-1 overflow-x-auto md:flex-col">
          {navItems.map(({ key, path, icon: Icon }) => (
            <NavLink
              key={key}
              to={path}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-accent font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`size-4 ${isActive ? 'text-primary' : ''}`} />
                  {t(`navigation.${key}`)}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}
