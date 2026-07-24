import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '@admin-module/store/hooks';
import { Config } from '@shared/config/app.config';
import { Loading } from '@shared/components';
import { isCreditPortalRole } from '@shared/utils/rbac';

export const GuestGuard = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, user, initialized } = useAppSelector((state) => state.auth);
  const location = useLocation();

  if (Config.bypassGuards) return <>{children}</>;
  if (!initialized) return <Loading fullScreen message="Loading..." />;
  if (location.pathname === '/credit/auth/reset-password') return <>{children}</>;
  if (isAuthenticated && isCreditPortalRole(user?.role)) {
    return <Navigate to="/credit/queue" replace />;
  }
  return <>{children}</>;
};
