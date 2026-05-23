# API Documentation

## Overview

The Blox platform uses Supabase as the backend, providing a RESTful API and real-time capabilities.

## Base URL

- **Development**: `https://your-project.supabase.co`
- **Production**: `https://your-project.supabase.co`

## Authentication

All API requests require authentication via Supabase Auth. Include the access token in the Authorization header:

```
Authorization: Bearer <access_token>
```

## Services

### SupabaseApiService

Located in `packages/shared/src/services/supabase-api.service.ts`

#### Products

- `getProducts()` - Get all products
- `getProductById(id)` - Get product by ID
- `createProduct(product)` - Create new product
- `updateProduct(id, product)` - Update product
- `deleteProduct(id)` - Delete product

#### Applications

- `getApplications()` - Get all applications
- `getApplicationById(id)` - Get application by ID
- `createApplication(application)` - Create new application
- `updateApplication(id, application)` - Update application

#### Offers

- `getOffers()` - Get all offers
- `getOfferById(id)` - Get offer by ID
- `createOffer(offer)` - Create new offer
- `updateOffer(id, offer)` - Update offer
- `deleteOffer(id)` - Delete offer

#### Packages

- `getPackages()` - Get all packages
- `getPackageById(id)` - Get package by ID
- `createPackage(pkg)` - Create new package
- `updatePackage(id, pkg)` - Update package
- `deletePackage(id)` - Delete package

#### Promotions

- `getPromotions()` - Get all promotions
- `getPromotionById(id)` - Get promotion by ID
- `createPromotion(promotion)` - Create new promotion
- `updatePromotion(id, promotion)` - Update promotion
- `deletePromotion(id)` - Delete promotion

#### Insurance Rates

- `getInsuranceRates()` - Get all insurance rates
- `getInsuranceRateById(id)` - Get insurance rate by ID
- `createInsuranceRate(rate)` - Create new insurance rate
- `updateInsuranceRate(id, rate)` - Update insurance rate
- `deleteInsuranceRate(id)` - Delete insurance rate

#### Ledgers

- `getLedgers()` - Get all ledgers

#### Notifications

- `getNotifications(userEmail)` - Get notifications for user
- `createNotification(data)` - Create notification
- `markNotificationAsRead(notificationId)` - Mark notification as read
- `markAllNotificationsAsRead(userEmail)` - Mark all notifications as read

#### Users

- `getUsers()` - Get all users
- `getUserByEmail(email)` - Get user by email

## Error Handling

All API methods return an `ApiResponse<T>` object:

```typescript
interface ApiResponse<T> {
  status: 'SUCCESS' | 'ERROR';
  data?: T;
  message?: string;
}
```

## Rate Limiting

API requests are rate-limited:
- **Login**: 5 attempts per 15 minutes
- **Password Reset**: 3 attempts per hour
- **API Requests**: 100 per minute
- **File Uploads**: 10 per hour

