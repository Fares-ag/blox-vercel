import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { Config } from '@shared/config/app.config';
import { Loading } from '@shared/components';

interface AuthGuardProps {
  children: React.ReactNode;
}

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
    return <Navigate to="/super-admin/auth/login" state={{ from: location }} replace />;
  }

  // Super admin app should be super_admin-only
  if (user?.role && user.role !== 'super_admin') {
    return <Navigate to="/super-admin/auth/login?reason=not_super_admin" replace />;
  }

  return <>{children}</>;
};
