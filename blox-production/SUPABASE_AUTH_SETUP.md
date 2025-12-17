# Supabase Authentication Setup Complete ✅

## What Was Changed

### 1. Auth Services Updated
- **`packages/shared/src/services/auth.service.ts`** - Now uses Supabase Auth instead of REST API
- **`packages/customer/src/modules/customer/services/customerAuth.service.ts`** - Now uses Supabase Auth instead of REST API

### 2. Auth State Management
- **`packages/admin/src/modules/admin/store/slices/auth.slice.ts`** - Updated to use sync methods for initial state
- **`packages/customer/src/modules/customer/store/slices/auth.slice.ts`** - Updated to use sync methods for initial state
- **`packages/admin/src/modules/admin/components/AuthInitializer/AuthInitializer.tsx`** - New component that listens to Supabase auth state changes
- **`packages/customer/src/modules/customer/components/AuthInitializer/AuthInitializer.tsx`** - New component that listens to Supabase auth state changes

### 3. App Initialization
- **`packages/admin/src/App.tsx`** - Added `<AuthInitializer />` component
- **`packages/customer/src/App.tsx`** - Added `<AuthInitializer />` component

### 4. API Service
- **`packages/shared/src/services/api.service.ts`** - Updated to use Supabase session tokens for API requests

### 5. Password Reset
- **`packages/customer/src/modules/customer/features/auth/pages/ResetPasswordPage/ResetPasswordPage.tsx`** - Updated to work with Supabase password reset flow
- **`packages/admin/src/modules/admin/features/auth/pages/ResetPasswordPage/ResetPasswordPage.tsx`** - Updated to work with Supabase password reset flow
- **`packages/customer/src/modules/customer/hooks/useAuth.ts`** - Updated resetPassword signature
- **`packages/admin/src/modules/admin/hooks/useAuth.ts`** - Updated resetPassword signature

## Supabase Configuration Required

### Step 1: Enable Email Auth Provider

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Authentication** → **Providers**
4. Enable **Email** provider
5. Configure email templates if needed (optional)

### Step 2: Configure Redirect URLs

1. In Supabase Dashboard, go to **Authentication** → **URL Configuration**
2. Add the following redirect URLs:

**Site URL:**
- `http://localhost:5173` (for development)
- Your production URL (when deploying)

**Redirect URLs:**
- `http://localhost:5173/customer/auth/reset-password`
- `http://localhost:5173/admin/auth/reset-password`
- `http://localhost:5173/**` (wildcard for development)
- Your production URLs (when deploying)

### Step 3: Disable Guard Bypass (Optional)

To enable authentication guards, update your `.env` files:

```env
VITE_BYPASS_GUARDS=false
```

Or set it in `packages/shared/src/config/app.config.ts`:
```typescript
export const Config = {
  // ... other config
  bypassGuards: false,
};
```

### Step 4: Create User Profiles Table (Optional but Recommended)

If you want to store additional user data beyond what's in `user_metadata`, create a profiles table:

```sql
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  phone_number TEXT,
  qid TEXT,
  gender TEXT,
  nationality TEXT,
  role TEXT DEFAULT 'customer',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
```

## How It Works

### Authentication Flow

1. **Login**: User enters email/password → `supabase.auth.signInWithPassword()` → Session created → Redux store updated
2. **Signup**: User enters details → `supabase.auth.signUp()` → User created → Email confirmation sent (if enabled)
3. **Logout**: `supabase.auth.signOut()` → Session cleared → Redux store cleared
4. **Password Reset**: 
   - User requests reset → `supabase.auth.resetPasswordForEmail()` → Email sent
   - User clicks link → Supabase authenticates temporarily → User enters new password → `supabase.auth.updateUser()` → Password updated

### Session Management

- Supabase automatically handles session persistence
- Sessions are stored in localStorage with key `blox-supabase-auth`
- `AuthInitializer` components listen to auth state changes and update Redux store
- API service automatically includes Supabase session tokens in requests

### User Data

User data is stored in Supabase `user_metadata` during signup:
- `first_name`, `last_name`
- `phone_number`, `qid`, `gender`, `nationality`
- `role` (defaults to 'customer' or 'admin')

## Testing

1. **Test Login**:
   - Create a user in Supabase Dashboard or via signup
   - Try logging in with email/password

2. **Test Signup**:
   - Go to signup page
   - Fill in all fields
   - Submit and check Supabase Dashboard for new user

3. **Test Password Reset**:
   - Go to forgot password page
   - Enter email
   - Check email for reset link
   - Click link and reset password

4. **Test Session Persistence**:
   - Login
   - Refresh page
   - Should remain logged in

## Troubleshooting

### "Login failed" errors
- Check Supabase Dashboard → Authentication → Users to see if user exists
- Verify email/password are correct
- Check browser console for detailed error messages

### Password reset not working
- Verify redirect URLs are configured in Supabase
- Check email spam folder
- Verify email provider is enabled in Supabase

### Session not persisting
- Check browser localStorage for `blox-supabase-auth` key
- Verify `persistSession: true` in `supabase.service.ts`
- Check browser console for errors

### API requests failing with 401
- Verify Supabase session token is being included in requests
- Check API service interceptor is working
- Verify token is valid in Supabase Dashboard

## Next Steps

1. ✅ Configure Supabase Email provider
2. ✅ Set redirect URLs
3. ✅ Test authentication flows
4. ✅ (Optional) Create profiles table for additional user data
5. ✅ (Optional) Set up email templates in Supabase
6. ✅ (Optional) Configure social auth providers (Google, GitHub, etc.)

## Notes

- The old REST API auth endpoints are no longer used
- All authentication now goes through Supabase
- Session management is handled automatically by Supabase
- User metadata is stored in Supabase `user_metadata` field
- Password reset flow is handled entirely by Supabase

