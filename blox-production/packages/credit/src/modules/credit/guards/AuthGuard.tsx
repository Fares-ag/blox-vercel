import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '@admin-module/store/hooks';
import { Config } from '@shared/config/app.config';
import { Loading } from '@shared/components';
import { isCreditPortalRole } from '@shared/utils/rbac';

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, user, initialized } = useAppSelector((state) => state.auth);
  const location = useLocation();

  if (Config.bypassGuards) return <>{children}</>;
  if (!initialized) return <Loading fullScreen message="Loading..." />;
  if (!isAuthenticated) {
    return <Navigate to="/credit/auth/login" state={{ from: location }} replace />;
  }
  if (!isCreditPortalRole(user?.role)) {
    return <Navigate to="/credit/auth/login?reason=not_credit" replace />;
  }
  return <>{children}</>;
};
