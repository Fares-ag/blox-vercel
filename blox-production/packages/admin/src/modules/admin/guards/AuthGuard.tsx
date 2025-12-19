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

  // Wait for auth to be initialized before making redirect decisions
  // This prevents redirects during the initial auth check on page refresh
  if (!initialized) {
    return <Loading fullScreen message="Loading..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/auth/login" state={{ from: location }} replace />;
  }

  // Admin app should be admin-only. If a customer logs in, RLS will deny writes anyway,
  // but this makes the UX explicit and avoids confusing 403s.
  if (user?.role && user.role !== 'admin') {
    return <Navigate to="/admin/auth/login?reason=not_admin" replace />;
  }

  return <>{children}</>;
};
