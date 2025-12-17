import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { Config } from '@shared/config/app.config';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const location = useLocation();

  if (Config.bypassGuards) {
    return <>{children}</>;
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
