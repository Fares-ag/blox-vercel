import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthGuard } from '../guards/AuthGuard';
import { GuestGuard } from '../guards/GuestGuard';
import { MainLayout } from '../layouts/MainLayout';

const LoginPage = React.lazy(() =>
  import('../features/auth/LoginPage').then((m) => ({ default: m.LoginPage }))
);
const FinanceQueuePage = React.lazy(() =>
  import('../features/queue/FinanceQueuePage').then((m) => ({
    default: m.FinanceQueuePage,
  }))
);
const ActiveBookPage = React.lazy(() =>
  import('../features/book/ActiveBookPage').then((m) => ({ default: m.ActiveBookPage }))
);
const PaymentsOverviewPage = React.lazy(() =>
  import('../features/payments/PaymentsOverviewPage').then((m) => ({
    default: m.PaymentsOverviewPage,
  }))
);
const SettlementsOverviewPage = React.lazy(() =>
  import('../features/settlements/SettlementsOverviewPage').then((m) => ({
    default: m.SettlementsOverviewPage,
  }))
);
const CreditsOverviewPage = React.lazy(() =>
  import('../features/credits/CreditsOverviewPage').then((m) => ({
    default: m.CreditsOverviewPage,
  }))
);
const FinanceExportPage = React.lazy(() =>
  import('../features/exports/FinanceExportPage').then((m) => ({
    default: m.FinanceExportPage,
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
      path="/finance/auth/login"
      element={
        <GuestGuard>
          <LoginPage />
        </GuestGuard>
      }
    />
    <Route
      path="/finance/auth/forgot-password"
      element={
        <GuestGuard>
          <ForgotPasswordPage />
        </GuestGuard>
      }
    />
    <Route
      path="/finance/auth/reset-password"
      element={
        <GuestGuard>
          <ResetPasswordPage />
        </GuestGuard>
      }
    />
    <Route
      path="/finance"
      element={
        <AuthGuard>
          <MainLayout />
        </AuthGuard>
      }
    >
      <Route index element={<Navigate to="/finance/queue" replace />} />
      <Route path="queue" element={<FinanceQueuePage />} />
      <Route path="book" element={<ActiveBookPage />} />
      <Route path="payments" element={<PaymentsOverviewPage />} />
      <Route path="settlements" element={<SettlementsOverviewPage />} />
      <Route path="credits" element={<CreditsOverviewPage />} />
      <Route path="exports" element={<FinanceExportPage />} />
      <Route path="applications/view/:id" element={<ApplicationDetailPage />} />
    </Route>
    <Route path="/" element={<Navigate to="/finance/queue" replace />} />
    <Route path="*" element={<Navigate to="/finance/queue" replace />} />
  </Routes>
);
