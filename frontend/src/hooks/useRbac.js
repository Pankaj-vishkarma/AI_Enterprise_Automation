import { useAuth } from '../context/AuthContext';
import { hasPermission, hasRole, hasAnyPermission } from '../utils/rbac';

export function useRbac() {
  const { user } = useAuth();

  return {
    user,
    role: user?.role,
    permissions: user?.permissions || [],
    hasRole: (...roles) => hasRole(user, ...roles),
    hasPermission: (permission) => hasPermission(user, permission),
    hasAnyPermission: (permissions) => hasAnyPermission(user, permissions),
    canManage: (permission) => hasPermission(user, permission),
  };
}
