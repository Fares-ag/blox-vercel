# Admin Access Troubleshooting Guide

## Problem: Admin Can't See Customer Applications

After applying secure RLS policies, admins might not be able to see applications if their role isn't set correctly.

## Quick Fix

### Step 1: Set Admin Role in Supabase

1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Find your admin user(s)
3. Click on the user
4. Scroll to **Raw User Meta Data**
5. Add or update:
   ```json
   {
     "role": "admin"
   }
   ```
6. Click **Save**

### Step 2: Re-authenticate

**IMPORTANT**: After setting the role, the admin user must:
1. **Log out** from the admin panel
2. **Log back in** (this refreshes the JWT token with the new role)
3. Now they should see all applications

## Alternative: Use SQL Script

Run `supabase-fix-admin-access.sql` in Supabase SQL Editor:

```sql
-- Set admin role for your admin email
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'
)
WHERE email = 'your-admin-email@example.com';
```

Then log out and log back in.

## Verify It's Working

### Check User Role in Database

```sql
SELECT 
  email,
  raw_user_meta_data->>'role' as role
FROM auth.users
WHERE email = 'your-admin-email@example.com';
```

Should return: `role: "admin"`

### Check JWT Contains Role

In browser console (while logged in as admin):

```javascript
// Get current session
const { data: { session } } = await supabase.auth.getSession();
console.log('User metadata:', session?.user?.user_metadata);
console.log('Role:', session?.user?.user_metadata?.role);
```

Should show: `role: "admin"`

### Test Application Access

After logging back in, try:

```javascript
// Should return all applications (not just own)
const { data, error } = await supabase
  .from('applications')
  .select('*');

console.log('Applications:', data);
console.log('Error:', error);
```

If you see applications, it's working! If you get a permission error, the role isn't set correctly.

## Common Issues

### Issue 1: "Role is set but still can't see applications"

**Solution**: 
- Log out completely
- Clear browser cache/cookies
- Log back in
- The JWT token needs to be refreshed

### Issue 2: "Role shows as 'admin' in database but not in JWT"

**Solution**:
- Supabase caches JWT tokens
- Force a new token by logging out and back in
- Or wait a few minutes for token refresh

### Issue 3: "Multiple admin users need access"

**Solution**: Update all admin emails at once:

```sql
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'
)
WHERE email IN (
  'admin1@blox.com',
  'admin2@blox.com',
  'admin3@blox.com'
);
```

### Issue 4: "Policy doesn't exist"

**Solution**: Re-run `supabase-secure-rls-policies.sql` to ensure policies are created.

## Verification Checklist

- [ ] Admin role set in `auth.users.raw_user_meta_data.role`
- [ ] Admin logged out and back in
- [ ] JWT contains role in `user_metadata.role`
- [ ] RLS policy "Admins can read all applications" exists
- [ ] Can query applications without errors
- [ ] See all applications, not just own

## Still Not Working?

1. **Check Supabase Logs**:
   - Go to **Logs** → **Postgres Logs**
   - Look for "row-level security policy" errors
   - Check the exact error message

2. **Test Policy Directly**:
   ```sql
   -- This should return true for admin users
   SELECT is_admin();
   ```

3. **Check Policy Conditions**:
   ```sql
   SELECT 
     policyname,
     qual as condition
   FROM pg_policies
   WHERE tablename = 'applications'
     AND policyname LIKE '%Admin%';
   ```

4. **Temporary Workaround** (for testing only):
   ```sql
   -- Allow all authenticated users temporarily
   CREATE POLICY "Temp: All authenticated" ON applications
     FOR SELECT USING (auth.role() = 'authenticated');
   ```
   **Remove this after fixing the real issue!**

## Need Help?

If still having issues:
1. Check the exact error message in browser console
2. Check Supabase logs for RLS violations
3. Verify the admin email matches exactly (case-sensitive)
4. Ensure you're using the correct Supabase project

