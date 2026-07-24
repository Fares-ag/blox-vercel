import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { Config } from '@shared/config/app.config';
import { Loading } from '@shared/components';
import { isFullAdminRole } from '@shared/utils/rbac';

interface AuthGuardProps {
  children: React.ReactNode;
}

/** Admin portal: admin or super_admin only. */
export const AuthGuard = ({ children }: AuthGuardProps) => {
  const { isAuthenticated, user, initialized } = useAppSelector((state) => state.auth);
  const location = useLocation();

  if (Config.bypassGuards) {
    return <>{children}</>;
  }

  if (!initialized) {
    return <Loading fullScreen message="Loading..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/auth/login" state={{ from: location }} replace />;
  }

  if (!isFullAdminRole(user?.role)) {
    return <Navigate to="/admin/auth/login?reason=not_admin" replace />;
  }

  return <>{children}</>;
};
