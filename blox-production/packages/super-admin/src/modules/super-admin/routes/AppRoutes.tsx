import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthGuard } from '../guards/AuthGuard';
import { GuestGuard } from '../guards/GuestGuard';
import { MainLayout } from '../layouts/MainLayout/MainLayout';

// Auth Pages
const LoginPage = React.lazy(() => 
  import('../features/auth/pages/LoginPage/LoginPage')
    .then(m => ({ default: m.LoginPage }))
    .catch(err => {
      console.error('Error loading LoginPage:', err);
      throw err;
    })
);

// Main Pages
const DashboardPage = React.lazy(() => 
  import('../features/dashboard/pages/DashboardPage/DashboardPage')
    .then(m => ({ default: m.DashboardPage }))
);
const ActivityLogsPage = React.lazy(() => 
  import('../features/activity-logs/pages/ActivityLogsPage/ActivityLogsPage')
    .then(m => ({ default: m.ActivityLogsPage }))
);

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route
        path="/super-admin/auth/login"
        element={
          <GuestGuard>
            <LoginPage />
          </GuestGuard>
        }
      />

      {/* Main Routes */}
      <Route
        path="/super-admin"
        element={
          <AuthGuard>
            <MainLayout />
          </AuthGuard>
        }
      >
        <Route index element={<Navigate to="/super-admin/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="activity-logs" element={<ActivityLogsPage />} />
      </Route>

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/super-admin/dashboard" replace />} />
    </Routes>
  );
};
