import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthGuard } from '../guards/AuthGuard';
import { GuestGuard } from '../guards/GuestGuard';
import { MainLayout } from '../layouts/MainLayout';
const LoginPage = React.lazy(() =>
  import('../features/auth/LoginPage').then((m) => ({ default: m.LoginPage }))
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
const ApplicationsListPage = React.lazy(() =>
  import('@admin-module/features/applications/pages/ApplicationsListPage/ApplicationsListPage').then(
    (m) => ({ default: m.ApplicationsListPage })
  )
);
const ApplicationDetailPage = React.lazy(() =>
  import('@admin-module/features/applications/pages/ApplicationDetailPage/ApplicationDetailPage').then(
    (m) => ({ default: m.ApplicationDetailPage })
  )
);
const AddApplicationPage = React.lazy(() =>
  import('@admin-module/features/applications/pages/AddApplicationPage/AddApplicationPage').then(
    (m) => ({ default: m.AddApplicationPage })
  )
);
const ProductsListPage = React.lazy(() =>
  import('@admin-module/features/products/pages/ProductsListPage/ProductsListPage').then((m) => ({
    default: m.ProductsListPage,
  }))
);
const ProductDetailPage = React.lazy(() =>
  import('@admin-module/features/products/pages/ProductDetailPage/ProductDetailPage').then((m) => ({
    default: m.ProductDetailPage,
  }))
);
const AddVehiclePage = React.lazy(() =>
  import('@admin-module/features/products/pages/AddVehiclePage/AddVehiclePage').then((m) => ({
    default: m.AddVehiclePage,
  }))
);
const EditProductPage = React.lazy(() =>
  import('@admin-module/features/products/pages/EditProductPage/EditProductPage').then((m) => ({
    default: m.EditProductPage,
  }))
);

export const AppRoutes: React.FC = () => (
  <Routes>
    <Route
      path="/dealer/auth/login"
      element={
        <GuestGuard>
          <LoginPage />
        </GuestGuard>
      }
    />
    <Route
      path="/dealer/auth/forgot-password"
      element={
        <GuestGuard>
          <ForgotPasswordPage />
        </GuestGuard>
      }
    />
    <Route
      path="/dealer/auth/reset-password"
      element={
        <GuestGuard>
          <ResetPasswordPage />
        </GuestGuard>
      }
    />
    <Route
      path="/dealer"
      element={
        <AuthGuard>
          <MainLayout />
        </AuthGuard>
      }
    >
      <Route index element={<Navigate to="/dealer/applications" replace />} />
      <Route path="applications" element={<ApplicationsListPage />} />
      <Route path="applications/add" element={<AddApplicationPage />} />
      <Route path="applications/view/:id" element={<ApplicationDetailPage />} />
      <Route path="vehicles" element={<ProductsListPage />} />
      <Route path="vehicles/add" element={<AddVehiclePage />} />
      <Route path="vehicles/:id" element={<ProductDetailPage />} />
      <Route path="vehicles/:id/edit" element={<EditProductPage />} />
    </Route>
    <Route path="/" element={<Navigate to="/dealer/applications" replace />} />
    <Route path="*" element={<Navigate to="/dealer/applications" replace />} />
  </Routes>
);
