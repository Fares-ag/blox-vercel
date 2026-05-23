# Supabase Security Migration Guide

## Overview

This guide walks you through migrating from permissive RLS policies to secure, role-based policies.

## Migration Steps

### Step 1: Backup Your Database

**CRITICAL**: Always backup before making security changes.

```sql
-- In Supabase Dashboard -> Database -> Backups
-- Or use pg_dump for manual backup
```

### Step 2: Review Current Policies

Check existing policies:

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Step 3: Set User Roles

Before applying new policies, ensure users have roles in metadata:

```sql
-- Update existing users (run in Supabase SQL Editor)
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"customer"'
)
WHERE raw_user_meta_data->>'role' IS NULL;

-- Set specific users as admin
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  raw_user_meta_data,
  '{role}',
  '"admin"'
)
WHERE email = 'admin@blox.com';
```

### Step 4: Apply Secure Policies

Run the migration script:

1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `supabase-secure-rls-policies.sql`
3. Review the policies (especially for your use case)
4. Execute the script
5. Verify policies were created:

```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
```

### Step 5: Test Each Role

#### Test as Customer

```typescript
// Login as customer
const { data: { session } } = await supabase.auth.signInWithPassword({
  email: 'customer@example.com',
  password: 'password'
});

// Should work: Read own applications
const { data: myApps } = await supabase
  .from('applications')
  .select('*')
  .eq('customer_email', 'customer@example.com');

// Should fail: Read other's applications
const { data: othersApps } = await supabase
  .from('applications')
  .select('*')
  .neq('customer_email', 'customer@example.com');
```

#### Test as Admin

```typescript
// Login as admin
await supabase.auth.signInWithPassword({
  email: 'admin@blox.com',
  password: 'password'
});

// Should work: Read all applications
const { data: allApps } = await supabase
  .from('applications')
  .select('*');
```

### Step 6: Monitor and Adjust

1. **Monitor Error Logs**: Check for policy violations
2. **Review Access Patterns**: Ensure legitimate access works
3. **Adjust Policies**: Fine-tune based on actual usage

## Rollback Plan

If issues occur, you can temporarily restore permissive policies:

```sql
-- EMERGENCY ROLLBACK (use only if needed)
-- Restore permissive policies for specific table
CREATE POLICY "Emergency: Allow all" ON applications
  FOR ALL USING (true);
```

**Note**: Remove emergency policies immediately after fixing the issue.

## Verification Checklist

- [ ] Database backed up
- [ ] User roles set in metadata
- [ ] Secure policies applied
- [ ] Customer access tested
- [ ] Admin access tested
- [ ] Public access tested (where applicable)
- [ ] Error monitoring set up
- [ ] Rollback plan documented

## Common Issues and Solutions

### Issue: "Users can't see their own data"

**Solution**: Verify email matching in policies:
```sql
-- Check if email matches
SELECT customer_email, auth.jwt() ->> 'email' as user_email
FROM applications
LIMIT 1;
```

### Issue: "Admins can't access data"

**Solution**: Verify role in JWT:
```sql
-- Check JWT role
SELECT auth.jwt() ->> 'role' as user_role;
```

### Issue: "Public can't browse products"

**Solution**: Ensure public read policy exists:
```sql
CREATE POLICY "Public can read active products" ON products
  FOR SELECT USING (status = 'active');
```

## Next Steps

After migration:

1. **Enable Audit Logging**: Track all access attempts
2. **Set Up Alerts**: Notify on policy violations
3. **Regular Reviews**: Audit policies quarterly
4. **Documentation**: Keep policies documented

## Support

If you encounter issues:

1. Check Supabase logs
2. Review policy conditions
3. Test with different user roles
4. Consult Supabase documentation

