import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { canAccessRoute } from '../../utils/rbac';
import AccessDenied from './AccessDenied';
import LoadingSpinner from './LoadingSpinner';

export default function RoleRoute({ children, roles, fallbackPath }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  const role = user?.role;
  const allowed = roles
    ? roles.includes(role) || role === 'SUPER_ADMIN'
    : canAccessRoute(location.pathname, role);

  if (!allowed) {
    if (fallbackPath) {
      return <AccessDenied message={`Your role (${role || 'unknown'}) cannot access this area.`} />;
    }
    return <AccessDenied message={`Your role (${role || 'unknown'}) cannot access this area.`} />;
  }

  return children;
}
