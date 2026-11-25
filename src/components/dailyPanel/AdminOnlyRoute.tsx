import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useIsAdmin } from '@/hooks/dailyPanel/useIsAdmin';

/** Renders children only for administrators; agents go to /unauthorized. */
export default function AdminOnlyRoute({ children }: { children: ReactNode }) {
  const isAdmin = useIsAdmin();
  if (!isAdmin) return <Navigate to="/unauthorized" replace />;
  return <>{children}</>;
}
