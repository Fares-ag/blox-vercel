import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '@admin-module/store/hooks';
import { Config } from '@shared/config/app.config';
import { Loading } from '@shared/components';
import { isFinancePortalRole } from '@shared/utils/rbac';

export const GuestGuard = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, user, initialized } = useAppSelector((state) => state.auth);
  const location = useLocation();

  if (Config.bypassGuards) return <>{children}</>;
  if (!initialized) return <Loading fullScreen message="Loading..." />;
  if (location.pathname === '/finance/auth/reset-password') return <>{children}</>;
  if (isAuthenticated && isFinancePortalRole(user?.role)) {
    return <Navigate to="/finance/queue" replace />;
  }
  return <>{children}</>;
};
