import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { hasAnyPermission, hasPermission } from '../../utils/rbac';
import AccessDenied from './AccessDenied';
import LoadingSpinner from './LoadingSpinner';

export default function PermissionRoute({ children, permission, anyOf = [] }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  const allowed = permission
    ? hasPermission(user, permission)
    : hasAnyPermission(user, anyOf);

  if (!allowed) {
    return (
      <AccessDenied
        message="You do not have the required permission to access this page."
      />
    );
  }

  return children;
}
