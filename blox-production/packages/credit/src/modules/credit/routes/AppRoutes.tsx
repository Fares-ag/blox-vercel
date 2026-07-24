import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthGuard } from '../guards/AuthGuard';
import { GuestGuard } from '../guards/GuestGuard';
import { MainLayout } from '../layouts/MainLayout';
const LoginPage = React.lazy(() =>
  import('../features/auth/LoginPage').then((m) => ({ default: m.LoginPage }))
);
const CreditQueuePage = React.lazy(() =>
  import('../features/queue/CreditQueuePage').then((m) => ({
    default: m.CreditQueuePage,
  }))
);

const ForgotPasswordPage = React.lazy(() =>
  import('@admin-module/features/auth/pages/ForgotPasswordPage/ForgotPasswordPage').then((m) => ({
    default: m.ForgotPasswordPage,
  }))
);
const ResetPasswordPage = React.lazy(() =>
  import('@admin-module/features/auth/pages/ResetPasswordPage/ResetPasswordPage').then((m) => ({
    default: m.ResetPasswordPage,
  }))
);
const ApplicationDetailPage = React.lazy(() =>
  import('@admin-module/features/applications/pages/ApplicationDetailPage/ApplicationDetailPage').then(
    (m) => ({ default: m.ApplicationDetailPage })
  )
);

export const AppRoutes: React.FC = () => (
  <Routes>
    <Route
      path="/credit/auth/login"
      element={
        <GuestGuard>
          <LoginPage />
        </GuestGuard>
      }
    />
    <Route
      path="/credit/auth/forgot-password"
      element={
        <GuestGuard>
          <ForgotPasswordPage />
        </GuestGuard>
      }
    />
    <Route
      path="/credit/auth/reset-password"
      element={
        <GuestGuard>
          <ResetPasswordPage />
        </GuestGuard>
      }
    />
    <Route
      path="/credit"
      element={
        <AuthGuard>
          <MainLayout />
        </AuthGuard>
      }
    >
      <Route index element={<Navigate to="/credit/queue" replace />} />
      <Route path="queue" element={<CreditQueuePage />} />
      <Route path="applications/view/:id" element={<ApplicationDetailPage />} />
    </Route>
    <Route path="/" element={<Navigate to="/credit/queue" replace />} />
    <Route path="*" element={<Navigate to="/credit/queue" replace />} />
  </Routes>
);
