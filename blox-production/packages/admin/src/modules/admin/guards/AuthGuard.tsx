import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { Config } from '@shared/config/app.config';
import { Loading } from '@shared/components';

interface AuthGuardProps {
  children: React.ReactNode;
}

/** Admin portal: admin or super_admin only. Missing/unknown role → deny. */
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

  const role = user?.role;
  const allowed = role === 'admin' || role === 'super_admin';
  if (!allowed) {
    return <Navigate to="/admin/auth/login?reason=not_admin" replace />;
  }

  return <>{children}</>;
};
