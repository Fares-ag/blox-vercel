# Super Admin Package Setup

## Overview

The Super Admin package (`@blox/super-admin`) is a dedicated application for super administrators to monitor and track all user activities across the Blox platform.

## Features

1. **Activity Logs**: View all user actions with detailed filtering
2. **Activity Statistics**: Dashboard with charts showing activity patterns
3. **User Tracking**: Monitor what each user does in the application
4. **Super Admin Only Access**: Restricted to users with `super_admin` role

## Database Setup

Before using the super admin package, you need to run the database migration:

```sql
-- Run this in Supabase SQL Editor
-- File: supabase-activity-logs-schema.sql
```

This will:
- Create the `activity_logs` table
- Set up RLS policies (only super_admin can read)
- Update `is_admin()` function to include `super_admin`
- Create `is_super_admin()` function

## Creating a Super Admin User

To create a super admin user, update their role in Supabase:

```sql
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
  jsonb_build_object(
    'role', 'super_admin',
    'user_role', 'super_admin'
  )
WHERE email = 'your-super-admin@example.com';
```

## Running the Application

### Development

```bash
npm run dev:super-admin
```

The app will be available at `http://localhost:5173` (or the port Vite assigns)

### Build

```bash
npm run build:super-admin
```

## Routes

- `/super-admin/auth/login` - Login page (super admin only)
- `/super-admin/dashboard` - Activity statistics dashboard
- `/super-admin/activity-logs` - Detailed activity logs with filters

## Activity Tracking

The activity tracking service (`activityTrackingService`) is available in the shared package and can be used throughout the application to log user actions.

### Example Usage

```typescript
import { activityTrackingService } from '@shared/services';

// Log an activity
await activityTrackingService.logActivity('update', 'application', {
  resourceId: application.id,
  resourceName: `Application #${application.id.slice(0, 8)}`,
  description: `Application status updated to ${newStatus}`,
  metadata: {
    oldStatus: 'under_review',
    newStatus: 'active',
    changedBy: user.email,
  },
});
```

## Integration

To track activities in admin/customer packages, add activity logging to key operations:

1. **Application Updates**: Log when applications are created, updated, or status changes
2. **User Actions**: Log logins, logouts, profile updates
3. **File Operations**: Log uploads, downloads, exports
4. **Financial Transactions**: Log payments, refunds, adjustments

## Security

- Only users with `super_admin` role can access this package
- Activity logs are immutable (no updates/deletes)
- RLS policies ensure only super admins can read logs
- All activities are logged automatically when using the service

## Next Steps

1. Run the database migration (`supabase-activity-logs-schema.sql`)
2. Create a super admin user
3. Add activity tracking to key operations in admin/customer packages
4. Test the super admin interface
