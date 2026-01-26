# Activity Logging Capabilities

## Overview
The activity logging system tracks user actions across the platform. Currently, activity logging is implemented in several key areas.

## Supported Action Types

The system supports these action types:
- `create` - Creating new resources
- `update` - Updating existing resources
- `delete` - Deleting resources
- `view` - Viewing resources
- `login` - User login
- `logout` - User logout
- `approve` - Approving resources
- `reject` - Rejecting resources
- `export` - Exporting data
- `download` - Downloading files
- `upload` - Uploading files
- `payment` - Payment transactions
- `sign_contract` - Contract signing
- `search` - Search operations
- `filter` - Filtering data

## Supported Resource Types

The system can track actions on these resource types:
- `application` - Loan applications
- `product` - Vehicle products
- `offer` - Loan offers
- `package` - Packages
- `promotion` - Promotions
- `payment` - Payments
- `user` - User accounts
- `contract` - Contracts
- `document` - Documents
- `credit` - Credit checks
- `settings` - Settings
- `dashboard` - Dashboard views
- `ledger` - Ledger entries

## Currently Implemented Tracking

### ✅ Authentication Actions
- **Login** (`login`, `user`) - When users log in
- **Logout** (`logout`, `user`) - When users log out

### ✅ Application Management
- **Create Application** (`create`, `application`) - When applications are created
  - Tracks: customer name, email, status, loan amount, origin (AI/manual)
- **Update Application** (`update`, `application`) - When applications are updated
  - Tracks: changes made, status updates
- **Delete Application** (`delete`, `application`) - When applications are deleted

### ✅ Product Management (Admin)
- **Create Product** (`create`, `product`) - When products are created
- **Update Product** (`update`, `product`) - When products are updated
- **Delete Product** (`delete`, `product`) - When products are deleted

### ✅ Offer Management (Admin)
- **Create Offer** (`create`, `offer`) - When offers are created
- **Update Offer** (`update`, `offer`) - When offers are updated
- **Delete Offer** (`delete`, `offer`) - When offers are deleted

### ✅ Package Management (Admin)
- **Create Package** (`create`, `package`) - When packages are created
- **Update Package** (`update`, `package`) - When packages are updated
- **Delete Package** (`delete`, `package`) - When packages are deleted

### ✅ Promotion Management (Admin)
- **Create Promotion** (`create`, `promotion`) - When promotions are created
- **Update Promotion** (`update`, `promotion`) - When promotions are updated
- **Delete Promotion** (`delete`, `promotion`) - When promotions are deleted

### ✅ Payment Actions (Admin)
- **Mark Installment as Paid** (`payment`, `payment`) - When installments are marked as paid
  - Tracks: application ID, payment amount, installment details

### ✅ Contract Actions
- **Contract Generated** (`create`, `contract`) - When contracts are generated
- **Contract Signed** (`sign_contract`, `contract`) - When contracts are signed/uploaded

### ✅ File Upload Actions
- **File Upload** (`upload`, `document`) - When files are uploaded via chatbot
  - Tracks: file name, document type, file size

## What Gets Logged

Each activity log includes:
- **User Information**: Email, role, user ID
- **Action Details**: Action type, resource type, description
- **Resource Information**: Resource ID, resource name
- **Metadata**: Additional context (changes, status, amounts, etc.)
- **Technical Info**: IP address, user agent, session ID
- **Timestamp**: When the action occurred

## Not Currently Tracked (But Can Be Added)

### Customer Actions
- Viewing applications
- Viewing dashboard
- Searching for vehicles
- Filtering applications
- Downloading documents
- Exporting data

### Admin Actions
- Viewing applications
- Viewing dashboard
- Searching/filtering
- Approving/rejecting applications
- Exporting reports
- Viewing analytics

### Additional Actions
- Password resets
- Email verifications
- Profile updates
- Settings changes
- Notification interactions

## How to Add New Tracking

To add activity tracking for a new action:

1. **Import the service**:
```typescript
const { activityTrackingService } = await import('./activity-tracking.service');
```

2. **Call logActivity**:
```typescript
await activityTrackingService.logActivity('action_type', 'resource_type', {
  resourceId: 'resource-id',
  resourceName: 'Human-readable name',
  description: 'What happened',
  metadata: {
    // Additional context
  },
});
```

3. **Wrap in try-catch** (activity logging should not break the app):
```typescript
try {
  await activityTrackingService.logActivity(...);
} catch (error) {
  console.error('Failed to log activity:', error);
}
```

## Example: Adding View Tracking

```typescript
// Track when user views an application
try {
  const { activityTrackingService } = await import('./activity-tracking.service');
  await activityTrackingService.logActivity('view', 'application', {
    resourceId: application.id,
    resourceName: `Application #${application.id.slice(0, 8)}`,
    description: `Viewed application for ${application.customerName}`,
    metadata: {
      status: application.status,
    },
  });
} catch (error) {
  console.error('Failed to log activity:', error);
}
```

## Current Status

**Working:**
- ✅ Login/Logout tracking
- ✅ Application CRUD operations
- ✅ Product/Offer/Package/Promotion CRUD operations
- ✅ Payment confirmations
- ✅ Contract generation and signing
- ✅ File uploads

**Needs Implementation:**
- ❌ View tracking (dashboard, applications, etc.)
- ❌ Search/Filter tracking
- ❌ Export/Download tracking
- ❌ Profile/Settings updates
- ❌ Password resets
- ❌ Email verifications

## Notes

- Activity logging is **non-blocking** - if it fails, the main action still proceeds
- Logs are stored in the `activity_logs` table in Supabase
- Only super admins can view all activity logs
- Logs include metadata for detailed tracking
- Session IDs help track user sessions across actions
