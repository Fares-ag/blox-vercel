import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthGuard } from '../guards/AuthGuard';
import { GuestGuard } from '../guards/GuestGuard';
import { CustomerLayout } from '../layouts/CustomerLayout/CustomerLayout';
import { CustomerNavWrapper } from '../components/CustomerNavWrapper/CustomerNavWrapper';

// Auth Pages
const LoginPage = React.lazy(() => import('../features/auth/pages/LoginPage/LoginPage').then(m => ({ default: m.LoginPage })));
const SignUpPage = React.lazy(() => import('../features/auth/pages/SignUpPage/SignUpPage').then(m => ({ default: m.SignUpPage })));
const ForgotPasswordPage = React.lazy(() => import('../features/auth/pages/ForgotPasswordPage/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = React.lazy(() => import('../features/auth/pages/ResetPasswordPage/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));

// Main Routes
const ApplicationsListPage = React.lazy(() => import('../features/applications/pages/ApplicationsListPage/ApplicationsListPage').then(m => ({ default: m.ApplicationsListPage })));
const ApplicationDetailPage = React.lazy(() => import('../features/applications/pages/ApplicationDetailPage/ApplicationDetailPage').then(m => ({ default: m.ApplicationDetailPage })));
const CreateApplicationPage = React.lazy(() => import('../features/applications/pages/CreateApplicationPage/CreateApplicationPage').then(m => ({ default: m.CreateApplicationPage })));

// Payment Routes
const PaymentPage = React.lazy(() => import('../features/payments/pages/PaymentPage/PaymentPage').then(m => ({ default: m.PaymentPage })));
const PaymentCallbackPage = React.lazy(() => import('../features/payments/pages/PaymentCallbackPage/PaymentCallbackPage').then(m => ({ default: m.PaymentCallbackPage })));
const PaymentConfirmationPage = React.lazy(() => import('../features/payments/pages/PaymentConfirmationPage/PaymentConfirmationPage').then(m => ({ default: m.PaymentConfirmationPage })));
const PaymentCalendarPage = React.lazy(() => import('../features/payments/pages/PaymentCalendarPage/PaymentCalendarPage').then(m => ({ default: m.PaymentCalendarPage })));
const PaymentHistoryPage = React.lazy(() => import('../features/payments/pages/PaymentHistoryPage/PaymentHistoryPage').then(m => ({ default: m.PaymentHistoryPage })));

// Dashboard Routes
const DashboardPage = React.lazy(() => import('../features/dashboard/pages/DashboardPage/DashboardPage').then(m => ({ default: m.DashboardPage })));

// Document Routes
const DocumentUploadPage = React.lazy(() => import('../features/documents/pages/DocumentUploadPage/DocumentUploadPage').then(m => ({ default: m.DocumentUploadPage })));

// Profile Routes
const ProfilePage = React.lazy(() => import('../features/profile/pages/ProfilePage/ProfilePage').then(m => ({ default: m.ProfilePage })));
const ChangePasswordPage = React.lazy(() => import('../features/profile/pages/ChangePasswordPage/ChangePasswordPage').then(m => ({ default: m.ChangePasswordPage })));

// Help Routes
const FAQPage = React.lazy(() => import('../features/help/pages/FAQPage/FAQPage').then(m => ({ default: m.FAQPage })));
const ContactSupportPage = React.lazy(() => import('../features/help/pages/ContactSupportPage/ContactSupportPage').then(m => ({ default: m.ContactSupportPage })));

// Contract Routes
const ContractSigningPage = React.lazy(() => import('../features/contracts/pages/ContractSigningPage/ContractSigningPage').then(m => ({ default: m.ContractSigningPage })));

// Membership Routes
const CreditTopUpCallbackPage = React.lazy(() => import('../features/membership/pages/CreditTopUpCallbackPage/CreditTopUpCallbackPage').then(m => ({ default: m.CreditTopUpCallbackPage })));

// Home/Landing Routes (Public - No Auth Required)
const LandingPage = React.lazy(() => import('../features/home/pages/LandingPage/LandingPage').then(m => ({ default: m.LandingPage })));

// Vehicle Routes (Public - No Auth Required)
const VehicleBrowsePage = React.lazy(() => import('../features/vehicles/pages/VehicleBrowsePage/VehicleBrowsePage').then(m => ({ default: m.VehicleBrowsePage })));
const VehicleDetailPage = React.lazy(() => import('../features/vehicles/pages/VehicleDetailPage/VehicleDetailPage').then(m => ({ default: m.VehicleDetailPage })));

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route
        path="/customer/auth/login"
        element={
          <GuestGuard>
            <LoginPage />
          </GuestGuard>
        }
      />
      <Route
        path="/customer/auth/signup"
        element={
          <GuestGuard>
            <SignUpPage />
          </GuestGuard>
        }
      />
      <Route
        path="/customer/auth/forgot-password"
        element={
          <GuestGuard>
            <ForgotPasswordPage />
          </GuestGuard>
        }
      />
      <Route
        path="/customer/auth/reset-password"
        element={
          <GuestGuard>
            <ResetPasswordPage />
          </GuestGuard>
        }
      />

      {/* Public Routes - No Auth Required */}
      <Route
        path="/customer/home"
        element={
          <CustomerNavWrapper>
            <LandingPage />
          </CustomerNavWrapper>
        }
      />
      <Route
        path="/customer/vehicles"
        element={
          <CustomerNavWrapper>
            <VehicleBrowsePage />
          </CustomerNavWrapper>
        }
      />
      <Route
        path="/customer/vehicles/:id"
        element={
          <CustomerNavWrapper>
            <VehicleDetailPage />
          </CustomerNavWrapper>
        }
      />

      {/* Protected Routes - Requires Auth */}
      <Route
        path="/customer"
        element={
          <AuthGuard>
            <CustomerLayout />
          </AuthGuard>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="my-applications" element={<ApplicationsListPage />} />
        <Route path="my-applications/:id" element={<ApplicationDetailPage />} />
        <Route path="applications/new" element={<CreateApplicationPage />} />
        <Route path="applications/:id/payment" element={<PaymentPage />} />
        <Route path="applications/:id/payment/:paymentId" element={<PaymentPage />} />
        <Route path="applications/:id/payment-callback" element={<PaymentCallbackPage />} />
        <Route path="applications/:id/payment-confirmation" element={<PaymentConfirmationPage />} />
        <Route path="applications/:id/documents/upload" element={<DocumentUploadPage />} />
        <Route path="applications/:id/contract/sign" element={<ContractSigningPage />} />
        <Route path="payment-calendar" element={<PaymentCalendarPage />} />
        <Route path="payment-history" element={<PaymentHistoryPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="profile/change-password" element={<ChangePasswordPage />} />
        <Route path="credit-topup-callback" element={<CreditTopUpCallbackPage />} />
      </Route>

      {/* Help Routes - Can be accessed without auth */}
      <Route
        path="/customer/help/faq"
        element={
          <CustomerNavWrapper>
            <FAQPage />
          </CustomerNavWrapper>
        }
      />
      <Route
        path="/customer/help/contact"
        element={
          <CustomerNavWrapper>
            <ContactSupportPage />
          </CustomerNavWrapper>
        }
      />

      {/* Default Redirect */}
      <Route path="/" element={<Navigate to="/customer/home" replace />} />
      <Route path="/customer" element={<Navigate to="/customer/home" replace />} />
      <Route path="*" element={<Navigate to="/customer/home" replace />} />
    </Routes>
  );
};

