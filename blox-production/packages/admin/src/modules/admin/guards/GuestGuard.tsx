import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { Config } from '@shared/config/app.config';

interface GuestGuardProps {
  children: React.ReactNode;
}

export const GuestGuard = ({ children }: GuestGuardProps) => {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  if (Config.bypassGuards) {
    return <>{children}</>;
  }

  // Only redirect to dashboard if user is authenticated AND is an admin
  // Non-admin users should stay on login page (they'll be blocked by login handler anyway)
  if (isAuthenticated && user?.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <>{children}</>;
};
