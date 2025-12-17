# Supabase Security Guide

## Overview

This guide explains the security implementation for the Blox platform using Supabase Row Level Security (RLS).

## Security Architecture

### Authentication Flow

1. **User Login**: Uses Supabase Auth (`supabase.auth.signInWithPassword()`)
2. **JWT Token**: Contains user metadata including role
3. **RLS Policies**: Enforce access control at database level
4. **Frontend RBAC**: Additional layer for UI permissions

### Role-Based Access Control

#### Roles

- **Admin**: Full access to all resources
- **Customer**: Access limited to own data
- **Public**: Read-only access to active products/offers

#### Role Assignment

Roles are stored in Supabase Auth user metadata:

```typescript
// When creating/updating user
await supabase.auth.admin.updateUserById(userId, {
  user_metadata: {
    role: 'admin', // or 'customer'
    // ... other metadata
  }
});
```

## RLS Policies

### Policy Structure

All policies follow this pattern:

```sql
CREATE POLICY "policy_name" ON table_name
  FOR operation
  USING (condition);
```

### Key Policies

#### Products
- **Public**: Can read active products (for browsing)
- **Authenticated**: Can read all products
- **Admin**: Full CRUD access

#### Applications
- **Customer**: Can read/create/update own applications (draft only)
- **Admin**: Full access to all applications

#### Payment Data
- **Customer**: Can read own payment schedules/transactions
- **Admin**: Full access

#### Ledgers
- **Admin Only**: Financial data restricted to admins

## Security Best Practices

### 1. Always Use RLS

Never disable RLS in production. All tables should have:
```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

### 2. Principle of Least Privilege

- Grant minimum required permissions
- Use specific conditions in policies
- Avoid `USING (true)` in production

### 3. Validate User Input

- Sanitize all user inputs
- Use parameterized queries (Supabase handles this)
- Validate data types and formats

### 4. Secure JWT Claims

Store roles in JWT metadata:
```typescript
{
  "role": "admin",
  "email": "user@example.com",
  "permissions": ["read:applications", "write:applications"]
}
```

### 5. Monitor Access

- Enable Supabase audit logs
- Monitor failed policy checks
- Track suspicious access patterns

## Migration from Permissive Policies

### Before (Insecure)
```sql
CREATE POLICY "Allow public access" ON applications
  FOR ALL USING (true);
```

### After (Secure)
```sql
CREATE POLICY "Customers can read own applications" ON applications
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    customer_email = current_user_email()
  );
```

## Testing RLS Policies

### Test as Different Roles

```typescript
// Test as customer
const { data: { session } } = await supabase.auth.signInWithPassword({
  email: 'customer@example.com',
  password: 'password'
});

// Should only see own applications
const { data } = await supabase.from('applications').select('*');

// Test as admin
await supabase.auth.signInWithPassword({
  email: 'admin@example.com',
  password: 'password'
});

// Should see all applications
const { data: allApps } = await supabase.from('applications').select('*');
```

## Troubleshooting

### Common Issues

1. **"new row violates row-level security policy"**
   - Check INSERT policy conditions
   - Verify user has required role
   - Ensure user metadata is set correctly

2. **"permission denied for table"**
   - Verify RLS is enabled
   - Check SELECT policy exists
   - Confirm user is authenticated

3. **Can't see own data**
   - Verify email matches in policy
   - Check JWT contains correct email
   - Ensure policy condition is correct

## Security Checklist

- [ ] All tables have RLS enabled
- [ ] Permissive policies removed
- [ ] Role-based policies implemented
- [ ] User roles set in metadata
- [ ] Policies tested for each role
- [ ] Audit logging enabled
- [ ] Service role key secured (never expose)
- [ ] Anon key is public (safe for RLS-protected tables)

## Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Guide](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [JWT Best Practices](https://supabase.com/docs/guides/auth/jwts)

