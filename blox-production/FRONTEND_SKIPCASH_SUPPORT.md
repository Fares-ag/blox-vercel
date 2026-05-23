# Frontend SkipCash Support Status

## ✅ Currently Supported

1. **Payment Initiation**
   - ✅ Calls SkipCash API via Edge Function
   - ✅ Redirects to SkipCash payment page
   - ✅ Handles basic payment request (amount, name, phone, email, transactionId, custom1)

2. **Basic Fields**
   - ✅ Amount
   - ✅ First Name, Last Name
   - ✅ Phone, Email
   - ✅ Transaction ID
   - ✅ Custom1 (for application metadata)

## ❌ Missing Features

### 1. Return URL Handling
**Status**: Not implemented
**Issue**: When user completes payment on SkipCash and returns, there's no handler to:
- Verify payment status
- Show success/failure message
- Update UI with payment result

**Solution Needed**:
- Add return URL to payment request: `returnUrl: window.location.origin + '/customer/applications/${id}/payment-callback?transactionId=${transactionId}'`
- Create payment callback page that:
  - Reads transaction ID from URL params
  - Calls `skipCashService.verifyPayment()` to check status
  - Shows success/failure message
  - Redirects to appropriate page

### 2. Payment Verification
**Status**: Service method exists but not used
**Issue**: `skipCashService.verifyPayment()` exists but frontend never calls it

**Solution Needed**:
- Call `verifyPayment()` on return from SkipCash
- Use it to check payment status before showing confirmation

### 3. Optional SkipCash Fields
**Status**: Not supported
**Missing fields**:
- `subject` - Text displayed on SkipCash payment page
- `description` - Text displayed on SkipCash payment page  
- `returnUrl` - URL to redirect after payment (currently missing)
- `webhookUrl` - Callback URL (set in dashboard, but can override per request)
- `onlyDebitCard` - Force QPAY/Debit card flow

**Solution Needed**:
- Add optional fields to `SkipCashPaymentRequest` interface
- Pass them in payment request
- Add UI controls if needed (e.g., checkbox for "Only Debit Card")

### 4. Payment Status Polling
**Status**: Not implemented
**Issue**: If user closes browser after payment, no way to check status

**Solution Needed**:
- Poll payment status periodically after redirect
- Or rely on webhook to update status in background

## Recommended Implementation

### Step 1: Add Return URL Support

```typescript
// In PaymentPage.tsx
const skipCashRequest = {
  amount: paymentAmount,
  firstName: firstName,
  lastName: lastName,
  phone: application.customerPhone || '',
  email: application.customerEmail || '',
  transactionId: transactionId,
  returnUrl: `${window.location.origin}/customer/applications/${application.id}/payment-callback?transactionId=${transactionId}`,
  custom1: JSON.stringify({...}),
};
```

### Step 2: Create Payment Callback Page

Create `PaymentCallbackPage.tsx`:
- Reads `transactionId` from URL
- Calls `skipCashService.verifyPayment()`
- Shows success/failure
- Redirects to application detail page

### Step 3: Add Optional Fields

```typescript
// Update SkipCashPaymentRequest interface
export interface SkipCashPaymentRequest {
  // ... existing fields
  subject?: string;
  description?: string;
  returnUrl?: string;
  webhookUrl?: string;
  onlyDebitCard?: boolean;
}
```

### Step 4: Add Route

```typescript
// In AppRoutes.tsx
<Route 
  path="applications/:id/payment-callback" 
  element={<PaymentCallbackPage />} 
/>
```

## Current Flow

1. User clicks "Pay" → ✅ Works
2. Redirects to SkipCash → ✅ Works
3. User completes payment → ✅ Works (on SkipCash side)
4. User returns to app → ❌ No handler
5. Payment status update → ✅ Works (via webhook, but user doesn't see it)

## Priority

1. **High**: Return URL handling (users need feedback after payment)
2. **Medium**: Payment verification (better UX)
3. **Low**: Optional fields (nice to have)

