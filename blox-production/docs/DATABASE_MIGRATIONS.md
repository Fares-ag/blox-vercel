# Database Migration Guide

## Overview

This document describes the database migration strategy for the Blox platform using Supabase.

## Migration Process

### 1. Create Migration Scripts

All migration scripts should be:
- Versioned with timestamps or sequential numbers
- Stored in the `supabase/migrations/` directory
- Named with format: `YYYYMMDDHHMMSS_description.sql`

Example: `20241213120000_add_user_preferences.sql`

### 2. Testing Migrations

1. **Test in Development First**
   - Run migration on local/development Supabase instance
   - Verify data integrity
   - Test rollback procedure

2. **Test in Staging**
   - Apply migration to staging environment
   - Run smoke tests
   - Monitor for performance issues

3. **Deploy to Production**
   - Schedule during low-traffic period
   - Have rollback plan ready
   - Monitor application after deployment

### 3. Rollback Procedures

Always create a rollback script alongside your migration:

```sql
-- Migration: add_new_column.sql
ALTER TABLE applications ADD COLUMN new_field VARCHAR(255);

-- Rollback: rollback_add_new_column.sql
ALTER TABLE applications DROP COLUMN IF EXISTS new_field;
```

### 4. Best Practices

- **Never modify existing migrations** - Create new ones instead
- **Use transactions** - Wrap migrations in transactions when possible
- **Add indexes separately** - Don't add indexes in the same transaction as schema changes
- **Test with production-like data** - Use anonymized production data for testing
- **Document breaking changes** - Clearly mark any breaking changes
- **Backup before migration** - Always backup before running migrations in production

### 5. Running Migrations

#### Using Supabase CLI

```bash
# Apply migrations
supabase db push

# Reset database (development only)
supabase db reset
```

#### Using Supabase Dashboard

1. Go to SQL Editor
2. Copy migration script
3. Run script
4. Verify results

### 6. Monitoring

After running migrations:
- Check query performance
- Monitor error rates
- Verify data integrity
- Check index usage

## Migration Checklist

- [ ] Migration script created and tested locally
- [ ] Rollback script created
- [ ] Migration tested in staging
- [ ] Performance impact assessed
- [ ] Backup created (production)
- [ ] Migration scheduled and communicated
- [ ] Post-migration verification completed

