# Supabase Setup Guide

This guide will help you set up Supabase for your Blox Frontend application.

## ✅ Completed Steps

1. ✅ Installed `@supabase/supabase-js` package
2. ✅ Created Supabase service (`packages/shared/src/services/supabase.service.ts`)
3. ✅ Created Supabase API service (`packages/shared/src/services/supabase-api.service.ts`)
4. ✅ Updated environment variables with your Supabase credentials
5. ✅ Created database schema SQL script (`supabase-schema.sql`)

## 📋 Next Steps

### Step 1: Create Database Tables

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `zqwsxewuppexvjyakuqf`
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the entire contents of `supabase-schema.sql` file
6. Paste it into the SQL Editor
7. Click **Run** (or press Ctrl+Enter)
8. Wait for the success message - all tables should be created!

### Step 2: Verify Tables Created

1. In Supabase Dashboard, go to **Table Editor**
2. You should see these tables:
   - `products`
   - `insurance_rates`
   - `offers`
   - `packages`
   - `promotions`
   - `applications`
   - `payment_schedules`
   - `payment_transactions`
   - `payment_deferrals`
   - `ledgers`

### Step 3: Test the Connection

1. Start your development server:
   ```bash
   npm run dev
   ```

2. The Supabase client should automatically connect using the environment variables

3. Check the browser console - you should see no Supabase connection errors

## 🔧 Environment Variables

Your environment variables are already configured in:
- `.env.development` (root)
- `packages/admin/.env.development`
- `packages/customer/.env.development`

They contain:
```env
VITE_SUPABASE_URL=https://zqwsxewuppexvjyakuqf.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 📚 Using Supabase API Service

### Import the service:
```typescript
import { supabaseApiService } from '@shared/services';
```

### Example Usage:

```typescript
// Get all products
const response = await supabaseApiService.getProducts();
if (response.status === 'SUCCESS') {
  console.log('Products:', response.data);
}

// Create a product
const newProduct = await supabaseApiService.createProduct({
  make: 'Toyota',
  model: 'Camry',
  modelYear: 2024,
  condition: 'new',
  price: 50000,
  // ... other fields
});

// Update an application
await supabaseApiService.updateApplication(appId, {
  status: 'active',
  contractGenerated: true
});
```

## 🔄 Migrating from localStorage

Currently, your app uses localStorage as a fallback. To fully migrate to Supabase:

1. **Update API calls**: Replace localStorage fallbacks with Supabase calls
2. **Data migration**: Export existing localStorage data and import to Supabase
3. **Remove localStorage**: Once verified, remove localStorage fallback code

### Example Migration:

**Before (localStorage):**
```typescript
const apps = JSON.parse(localStorage.getItem('applications') || '[]');
```

**After (Supabase):**
```typescript
const response = await supabaseApiService.getApplications();
const apps = response.data || [];
```

## 🔒 Security Notes

⚠️ **Important**: The current database policies allow public read/write access. This is fine for development, but you should:

1. **Set up Authentication**: Use Supabase Auth for user authentication
2. **Update RLS Policies**: Restrict access based on user roles
3. **Use Service Role Key**: For admin operations, use the service role key (keep it secret!)

## 📝 Available API Methods

### Products
- `getProducts()` - Get all products
- `getProductById(id)` - Get single product
- `createProduct(product)` - Create new product
- `updateProduct(id, product)` - Update product
- `deleteProduct(id)` - Delete product

### Applications
- `getApplications()` - Get all applications
- `getApplicationById(id)` - Get single application
- `createApplication(application)` - Create new application
- `updateApplication(id, application)` - Update application

### Offers
- `getOffers()` - Get all offers
- `getOfferById(id)` - Get single offer
- `createOffer(offer)` - Create new offer
- `updateOffer(id, offer)` - Update offer

### Packages
- `getPackages()` - Get all packages
- `createPackage(pkg)` - Create new package
- `updatePackage(id, pkg)` - Update package

### Promotions
- `getPromotions()` - Get all promotions
- `createPromotion(promotion)` - Create new promotion

### Insurance Rates
- `getInsuranceRates()` - Get all insurance rates

### Ledgers
- `getLedgers()` - Get all ledgers

## 🐛 Troubleshooting

### "Supabase URL or Anon Key not found"
- Check that `.env.development` files exist
- Verify the environment variables are set correctly
- Restart your dev server after adding env variables

### "relation does not exist"
- Run the `supabase-schema.sql` script in Supabase SQL Editor
- Check that all tables were created successfully

### "permission denied"
- Check Row Level Security (RLS) policies in Supabase Dashboard
- Verify the policies allow the operations you're trying to perform

## 🚀 Next Steps

1. Run the SQL schema script
2. Test creating/reading data
3. Update your components to use Supabase API service
4. Gradually replace localStorage calls with Supabase

Need help? Check the Supabase documentation: https://supabase.com/docs

