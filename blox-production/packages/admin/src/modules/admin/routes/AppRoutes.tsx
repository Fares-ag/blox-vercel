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
const ForgotPasswordPage = React.lazy(() => 
  import('../features/auth/pages/ForgotPasswordPage/ForgotPasswordPage')
    .then(m => ({ default: m.ForgotPasswordPage }))
);
const ResetPasswordPage = React.lazy(() => 
  import('../features/auth/pages/ResetPasswordPage/ResetPasswordPage')
    .then(m => ({ default: m.ResetPasswordPage }))
);

// Main Pages
const DashboardPage = React.lazy(() => import('../features/dashboard/pages/DashboardPage/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ApplicationsListPage = React.lazy(() => import('../features/applications/pages/ApplicationsListPage/ApplicationsListPage').then(m => ({ default: m.ApplicationsListPage })));
const ApplicationDetailPage = React.lazy(() => import('../features/applications/pages/ApplicationDetailPage/ApplicationDetailPage').then(m => ({ default: m.ApplicationDetailPage })));
const AddApplicationPage = React.lazy(() => import('../features/applications/pages/AddApplicationPage/AddApplicationPage').then(m => ({ default: m.AddApplicationPage })));
const ProductsListPage = React.lazy(() => import('../features/products/pages/ProductsListPage/ProductsListPage').then(m => ({ default: m.ProductsListPage })));
const ProductDetailPage = React.lazy(() => import('../features/products/pages/ProductDetailPage/ProductDetailPage').then(m => ({ default: m.ProductDetailPage })));
const EditProductPage = React.lazy(() => import('../features/products/pages/EditProductPage/EditProductPage').then(m => ({ default: m.EditProductPage })));
const AddVehiclePage = React.lazy(() => import('../features/products/pages/AddVehiclePage/AddVehiclePage').then(m => ({ default: m.AddVehiclePage })));
const OffersListPage = React.lazy(() => import('../features/offers/pages/OffersListPage/OffersListPage').then(m => ({ default: m.OffersListPage })));
const OfferDetailPage = React.lazy(() => import('../features/offers/pages/OfferDetailPage/OfferDetailPage').then(m => ({ default: m.OfferDetailPage })));
const AddOfferPage = React.lazy(() => import('../features/offers/pages/AddOfferPage/AddOfferPage').then(m => ({ default: m.AddOfferPage })));
const EditOfferPage = React.lazy(() => import('../features/offers/pages/EditOfferPage/EditOfferPage').then(m => ({ default: m.EditOfferPage })));
const PromotionsListPage = React.lazy(() => import('../features/promotions/pages/PromotionsListPage/PromotionsListPage').then(m => ({ default: m.PromotionsListPage })));
const PromotionDetailPage = React.lazy(() => import('../features/promotions/pages/PromotionDetailPage/PromotionDetailPage').then(m => ({ default: m.PromotionDetailPage })));
const AddPromotionPage = React.lazy(() => import('../features/promotions/pages/AddPromotionPage/AddPromotionPage').then(m => ({ default: m.AddPromotionPage })));
const EditPromotionPage = React.lazy(() => import('../features/promotions/pages/EditPromotionPage/EditPromotionPage').then(m => ({ default: m.EditPromotionPage })));
const InsuranceRatesListPage = React.lazy(() => import('../features/insurance-rates/pages/InsuranceRatesListPage/InsuranceRatesListPage').then(m => ({ default: m.InsuranceRatesListPage })));
const InsuranceRateDetailPage = React.lazy(() => import('../features/insurance-rates/pages/InsuranceRateDetailPage/InsuranceRateDetailPage').then(m => ({ default: m.InsuranceRateDetailPage })));
const AddInsuranceRatePage = React.lazy(() => import('../features/insurance-rates/pages/AddInsuranceRatePage/AddInsuranceRatePage').then(m => ({ default: m.AddInsuranceRatePage })));
const EditInsuranceRatePage = React.lazy(() => import('../features/insurance-rates/pages/EditInsuranceRatePage/EditInsuranceRatePage').then(m => ({ default: m.EditInsuranceRatePage })));
const PackagesListPage = React.lazy(() => import('../features/packages/pages/PackagesListPage/PackagesListPage').then(m => ({ default: m.PackagesListPage })));
const PackageDetailPage = React.lazy(() => import('../features/packages/pages/PackageDetailPage/PackageDetailPage').then(m => ({ default: m.PackageDetailPage })));
const AddPackagePage = React.lazy(() => import('../features/packages/pages/AddPackagePage/AddPackagePage').then(m => ({ default: m.AddPackagePage })));
const EditPackagePage = React.lazy(() => import('../features/packages/pages/EditPackagePage/EditPackagePage').then(m => ({ default: m.EditPackagePage })));
const LedgersListPage = React.lazy(() => import('../features/ledgers/pages/LedgersListPage/LedgersListPage').then(m => ({ default: m.LedgersListPage })));
const ClearStoragePage = React.lazy(() => import('../features/dev-tools/pages/ClearStoragePage/ClearStoragePage').then(m => ({ default: m.ClearStoragePage })));
const UsersListPage = React.lazy(() => import('../features/users/pages/UsersListPage/UsersListPage').then(m => ({ default: m.UsersListPage })));
const UserDetailPage = React.lazy(() => import('../features/users/pages/UserDetailPage/UserDetailPage').then(m => ({ default: m.UserDetailPage })));

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route
        path="/admin/auth/login"
        element={
          <GuestGuard>
            <LoginPage />
          </GuestGuard>
        }
      />
      <Route
        path="/admin/auth/forgot-password"
        element={
          <GuestGuard>
            <ForgotPasswordPage />
          </GuestGuard>
        }
      />
      <Route
        path="/admin/auth/reset-password"
        element={
          <GuestGuard>
            <ResetPasswordPage />
          </GuestGuard>
        }
      />

      {/* Main Routes */}
      <Route
        path="/admin"
        element={
          <AuthGuard>
            <MainLayout />
          </AuthGuard>
        }
      >
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="applications" element={<ApplicationsListPage />} />
        <Route path="applications/add" element={<AddApplicationPage />} />
        <Route path="applications/view/:id" element={<ApplicationDetailPage />} />
        <Route path="vehicles" element={<ProductsListPage />} />
        <Route path="vehicles/add" element={<AddVehiclePage />} />
        <Route path="vehicles/:id" element={<ProductDetailPage />} />
        <Route path="vehicles/:id/edit" element={<EditProductPage />} />
        {/* Keep old routes for backwards compatibility */}
        <Route path="products" element={<ProductsListPage />} />
        <Route path="products/:id" element={<ProductDetailPage />} />
        <Route path="products/:id/edit" element={<EditProductPage />} />
        <Route path="offers" element={<OffersListPage />} />
        <Route path="offers/add" element={<AddOfferPage />} />
        <Route path="offers/:id" element={<OfferDetailPage />} />
        <Route path="offers/:id/edit" element={<EditOfferPage />} />
        <Route path="promotions" element={<PromotionsListPage />} />
        <Route path="promotions/add" element={<AddPromotionPage />} />
        <Route path="promotions/:id" element={<PromotionDetailPage />} />
        <Route path="promotions/:id/edit" element={<EditPromotionPage />} />
        <Route path="insurance-rates" element={<InsuranceRatesListPage />} />
        <Route path="insurance-rates/add" element={<AddInsuranceRatePage />} />
        <Route path="insurance-rates/:id" element={<InsuranceRateDetailPage />} />
        <Route path="insurance-rates/:id/edit" element={<EditInsuranceRatePage />} />
        <Route path="packages" element={<PackagesListPage />} />
        <Route path="packages/add" element={<AddPackagePage />} />
        <Route path="packages/:id" element={<PackageDetailPage />} />
        <Route path="packages/:id/edit" element={<EditPackagePage />} />
        <Route path="users" element={<UsersListPage />} />
        <Route path="users/:email" element={<UserDetailPage />} />
        <Route path="ledgers" element={<LedgersListPage />} />
        <Route path="dev-tools/clear-storage" element={<ClearStoragePage />} />
      </Route>

      {/* Default Redirect - only for root path */}
      <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
      {/* Catch-all for unmatched routes - but preserve current location if authenticated */}
      <Route 
        path="*" 
        element={
          <AuthGuard>
            <Navigate to="/admin/dashboard" replace />
          </AuthGuard>
        } 
      />
    </Routes>
  );
};
