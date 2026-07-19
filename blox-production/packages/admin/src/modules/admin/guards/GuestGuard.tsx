import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { Config } from '@shared/config/app.config';
import { Loading } from '@shared/components';

interface GuestGuardProps {
  children: React.ReactNode;
}

export const GuestGuard = ({ children }: GuestGuardProps) => {
  const { isAuthenticated, user, initialized } = useAppSelector((state) => state.auth);
  const location = useLocation();

  if (Config.bypassGuards) {
    return <>{children}</>;
  }

  // Wait for AuthInitializer before redirecting — avoids bouncing on sync hydrate
  // before role kick / signOut completes.
  if (!initialized) {
    return <Loading fullScreen message="Loading..." />;
  }

  // Allow access to reset password page even when authenticated
  // (Supabase creates a temporary session when user clicks reset link)
  if (location.pathname === '/admin/auth/reset-password') {
    return <>{children}</>;
  }

  // Only redirect to dashboard if user is authenticated AND is an admin
  // Non-admin users should stay on login page (they'll be blocked by login handler anyway)
  if (isAuthenticated && (user?.role === 'admin' || user?.role === 'super_admin')) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <>{children}</>;
};
