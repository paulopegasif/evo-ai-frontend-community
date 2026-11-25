import { useAuthStore } from '@/store/authStore';
import { isAdminRole } from '@/constants/roles';

/** True when the signed-in user holds an administrative role (owner/admin/super admin). */
export function useIsAdmin(): boolean {
  const roleKey = useAuthStore(state => state.currentUser?.role?.key);
  return !!roleKey && isAdminRole(roleKey);
}
