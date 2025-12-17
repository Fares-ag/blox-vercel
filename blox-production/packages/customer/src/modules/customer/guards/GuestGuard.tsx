import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { Config } from '@shared/config/app.config';

interface GuestGuardProps {
  children: React.ReactNode;
}

export const GuestGuard = ({ children }: GuestGuardProps) => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  if (Config.bypassGuards) {
    return <>{children}</>;
  }

  if (isAuthenticated) {
    return <Navigate to="/customer/my-applications" replace />;
  }

  return <>{children}</>;
};

