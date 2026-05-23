import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { Config } from '@shared/config/app.config';

interface GuestGuardProps {
  children: React.ReactNode;
}

export const GuestGuard = ({ children }: GuestGuardProps) => {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const location = useLocation();

  if (Config.bypassGuards) {
    return <>{children}</>;
  }

  if (location.pathname === '/super-admin/auth/reset-password') {
    return <>{children}</>;
  }

  if (isAuthenticated && user?.role === 'super_admin') {
    return <Navigate to="/super-admin/dashboard" replace />;
  }

  return <>{children}</>;
};
