# Manual Logout Helper for Super Admin Portal

If the logout button isn't working, you can manually log out using one of these methods:

## Method 1: Browser Console (Recommended)

1. Open the browser console (F12)
2. Paste and run this code:

```javascript
// Clear Supabase session
localStorage.removeItem('blox-supabase-auth');
sessionStorage.removeItem('blox-supabase-auth');
localStorage.removeItem('sb-blox-supabase-auth-token');
sessionStorage.removeItem('sb-blox-supabase-auth-token');

// Clear all localStorage (if needed)
// localStorage.clear();

// Redirect to login
window.location.href = '/super-admin/auth/login';
```

## Method 2: Application Tab

1. Open DevTools (F12)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Expand **Local Storage** → your domain
4. Delete these keys:
   - `blox-supabase-auth`
   - `sb-blox-supabase-auth-token`
5. Expand **Session Storage** → your domain
6. Delete the same keys
7. Refresh the page

## Method 3: Clear All Site Data

1. Open DevTools (F12)
2. Go to **Application** tab
3. Click **Clear site data** button
4. Check all boxes
5. Click **Clear data**
6. Refresh the page

## After Logout

1. Navigate to `/super-admin/auth/login`
2. Log in as `ahmed@blox.market` (the super admin account)
3. Verify you can access Activity Logs

## Verify Super Admin Role

Run `VERIFY_SUPER_ADMIN_ROLE.sql` in Supabase SQL Editor to confirm `ahmed@blox.market` has `role: 'super_admin'` in their metadata.
