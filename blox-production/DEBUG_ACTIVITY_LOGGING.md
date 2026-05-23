# Debug Activity Logging for Customers and Admins

## Problem
Only super admin logs are appearing in the Activity Logs page. No logs from customers or admins are being created.

## Diagnosis Steps

### 1. Check Browser Console
When a customer or admin performs an action (e.g., creates an application):

1. Open browser DevTools (F12)
2. Go to Console tab
3. Perform an action (create application, update something, etc.)
4. Look for these logs:
   - `[ActivityTracking] logActivity called with:` - confirms function is called
   - `[ActivityTracking] Current auth user:` - shows if user is authenticated
   - `[ActivityTracking] Attempting to insert activity log:` - shows insert attempt
   - `[ActivityTracking] Activity logged successfully:` - confirms success
   - `[ActivityTracking] Failed to log activity:` - shows errors
   - `[ActivityTracking] RLS Policy Error:` - indicates INSERT policy issue

### 2. Check INSERT Policy
Run this in Supabase SQL Editor:
```sql
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'activity_logs'
  AND cmd = 'INSERT';
```

Should show:
- `policyname`: "Authenticated users can create activity logs"
- `cmd`: "INSERT"
- `with_check`: `(auth.role() = 'authenticated'::text)`

### 3. Test INSERT Manually
Run `TEST_ACTIVITY_LOGS_INSERT_ALL_ROLES.sql` in Supabase SQL Editor while logged in as a customer or admin.

### 4. Common Issues

#### Issue 1: User not authenticated
**Symptom**: Console shows "No user found, skipping activity log"
**Fix**: Ensure user is logged in before performing actions

#### Issue 2: INSERT policy blocking
**Symptom**: Console shows "RLS Policy Error: INSERT is being blocked"
**Fix**: Run `FIX_ACTIVITY_LOGS_INSERT.sql` to fix the INSERT policy

#### Issue 3: User role is 'unknown'
**Symptom**: Logs are created but `user_role` is 'unknown'
**Fix**: Ensure user's role is set in `auth.users.raw_user_meta_data->>'role'`

#### Issue 4: Silent failure
**Symptom**: No console logs at all
**Fix**: Check if `logActivity` is being called. Add breakpoints in `activity-tracking.service.ts`

## Quick Fix

If INSERT policy is the issue, run:
```sql
DROP POLICY IF EXISTS "Authenticated users can create activity logs" ON activity_logs;

CREATE POLICY "Authenticated users can create activity logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'authenticated');
```

## Next Steps

1. Perform an action as a customer/admin
2. Check browser console for `[ActivityTracking]` logs
3. Share the console output to identify the exact issue
