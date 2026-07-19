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
  // before role resolution / signOut completes.
  if (!initialized) {
    return <Loading fullScreen message="Loading..." />;
  }

  // Allow access to reset password page even when authenticated
  // (Supabase creates a temporary session when user clicks reset link)
  if (location.pathname === '/customer/auth/reset-password') {
    return <>{children}</>;
  }

  // Only redirect authenticated *customers*. Non-customers (admin / unknown) must stay
  // on login so AuthGuard's ?reason=not_customer does not loop with my-applications.
  if (isAuthenticated && user?.role === 'customer') {
    return <Navigate to="/customer/my-applications" replace />;
  }

  return <>{children}</>;
};

