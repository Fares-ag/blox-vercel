import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { Config } from '@shared/config/app.config';

interface GuestGuardProps {
  children: React.ReactNode;
}

export const GuestGuard = ({ children }: GuestGuardProps) => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const location = useLocation();

  if (Config.bypassGuards) {
    return <>{children}</>;
  }

  // Allow access to reset password page even when authenticated
  // (Supabase creates a temporary session when user clicks reset link)
  if (location.pathname === '/customer/auth/reset-password') {
    return <>{children}</>;
  }

  if (isAuthenticated) {
    return <Navigate to="/customer/my-applications" replace />;
  }

  return <>{children}</>;
};

