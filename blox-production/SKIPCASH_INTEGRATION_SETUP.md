# SkipCash Payment Gateway Integration Setup Guide

This guide will walk you through setting up the SkipCash payment gateway integration for your Blox application.

## Overview

The SkipCash integration has been implemented using:
- **Frontend**: React/TypeScript service (`skipcash.service.ts`)
- **Backend**: Supabase Edge Functions (secure server-side processing)
- **Payment Flow**: Card payments redirect to SkipCash hosted payment page

## Prerequisites

1. SkipCash merchant account with API credentials:
   - `secretKey`
   - `keyId`
   - `clientId`
2. Supabase project with Edge Functions enabled
3. Supabase CLI installed (for deploying Edge Functions)

## Step 1: Configure Supabase Environment Variables

Navigate to your Supabase project dashboard and set the following environment variables for Edge Functions:

### Required Variables

```
SKIPCASH_SECRET_KEY=your_secret_key_here
SKIPCASH_KEY_ID=your_key_id_here
SKIPCASH_CLIENT_ID=your_client_id_here
SKIPCASH_USE_SANDBOX=true
```

### Optional Variables (with defaults)

```
SKIPCASH_SANDBOX_URL=https://skipcashtest.azurewebsites.net
SKIPCASH_PRODUCTION_URL=https://api.skipcash.app
```

### How to Set Environment Variables

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Edge Functions**
3. Click on **Environment Variables**
4. Add each variable with its corresponding value
5. Click **Save**

**Important**: 
- Set `SKIPCASH_USE_SANDBOX=false` when ready for production
- Never commit these credentials to version control

## Step 2: Deploy Supabase Edge Functions

The following Edge Functions have been created:

1. **skipcash-payment** - Processes payment requests
2. **skipcash-verify** - Verifies payment status
3. **skipcash-webhook** - Handles payment callbacks from SkipCash

### Deploy Using Supabase CLI

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Deploy all functions
supabase functions deploy skipcash-payment
supabase functions deploy skipcash-verify
supabase functions deploy skipcash-webhook
```

### Deploy Using Supabase Dashboard

1. Go to **Edge Functions** in your Supabase dashboard
2. Click **Create a new function**
3. For each function:
   - Name: `skipcash-payment`, `skipcash-verify`, or `skipcash-webhook`
   - Copy the contents from `supabase/functions/[function-name]/index.ts`
   - Click **Deploy**

## Step 3: Configure SkipCash Webhook URL

In your SkipCash merchant dashboard, configure the webhook URL to point to your Supabase Edge Function:

```
https://[your-project-ref].supabase.co/functions/v1/skipcash-webhook
```

Replace `[your-project-ref]` with your actual Supabase project reference ID.

### Webhook Configuration

1. Log in to your SkipCash merchant dashboard
2. Navigate to **Settings** → **Webhooks**
3. Add webhook URL: `https://[your-project-ref].supabase.co/functions/v1/skipcash-webhook`
4. Select events to receive:
   - Payment completed
   - Payment failed
   - Payment cancelled
5. Save the configuration

## Step 4: Test the Integration

### Test in Sandbox Mode

1. Ensure `SKIPCASH_USE_SANDBOX=true` is set
2. Navigate to a payment page in your application
3. Select "Credit/Debit Card" as payment method
4. Fill in the payment form (use test card details from SkipCash)
5. Submit the payment
6. You should be redirected to SkipCash payment page
7. Complete the test payment
8. Verify that:
   - Payment transaction is created in `payment_transactions` table
   - Payment status is updated correctly
   - Application payment schedule is updated

### Test Cards (Sandbox)

Use the test card details provided by SkipCash for sandbox testing.

## Step 5: Production Deployment

### Before Going Live

1. **Switch to Production Mode**:
   - Set `SKIPCASH_USE_SANDBOX=false` in Supabase environment variables
   - Update webhook URL in SkipCash dashboard to production URL

2. **Verify Database Schema**:
   Ensure your `payment_transactions` table has the following structure:
   ```sql
   CREATE TABLE IF NOT EXISTS payment_transactions (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
     payment_schedule_id UUID REFERENCES payment_schedules(id) ON DELETE SET NULL,
     amount DECIMAL(12, 2) NOT NULL,
     method VARCHAR(20) CHECK (method IN ('card', 'bank_transfer', 'wallet')) NOT NULL,
     status VARCHAR(20) CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')) DEFAULT 'pending',
     transaction_id VARCHAR(255),
     receipt_url TEXT,
     failure_reason TEXT,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     completed_at TIMESTAMPTZ
   );
   ```

3. **Test Production Flow**:
   - Make a small test payment
   - Verify webhook receives callback
   - Check database updates
   - Verify receipt generation

## Payment Flow

### Card Payment Flow

1. User selects "Credit/Debit Card" payment method
2. User fills in payment form (card details are validated client-side)
3. On submit:
   - Frontend calls `skipCashService.processPayment()`
   - Service invokes `skipcash-payment` Edge Function
   - Edge Function creates payment request with SkipCash API
   - SkipCash returns payment URL
   - User is redirected to SkipCash hosted payment page
4. User completes payment on SkipCash page
5. SkipCash sends webhook to `skipcash-webhook` Edge Function
6. Webhook handler:
   - Updates `payment_transactions` table
   - Updates payment schedule in application
   - Marks installments as paid

### Other Payment Methods

Bank transfer, wallet, and Blox Credit payments continue to use the existing flow (manual confirmation).

## Troubleshooting

### Payment Not Redirecting

- Check browser console for errors
- Verify Edge Function is deployed and accessible
- Check Supabase function logs for errors
- Verify environment variables are set correctly

### Webhook Not Receiving Callbacks

- Verify webhook URL is correct in SkipCash dashboard
- Check Supabase Edge Function logs
- Ensure webhook URL is publicly accessible
- Verify CORS headers are set correctly

### Payment Status Not Updating

- Check `payment_transactions` table for transaction records
- Verify webhook is being called (check function logs)
- Check database RLS policies allow updates
- Verify transaction_id matches between payment and webhook

### Environment Variable Issues

- Ensure all required variables are set
- Check variable names are exact (case-sensitive)
- Verify values don't have extra spaces
- Redeploy Edge Functions after changing variables

## Security Best Practices

1. **Never expose credentials**:
   - All SkipCash credentials are stored in Supabase environment variables
   - Never commit credentials to version control
   - Use different credentials for sandbox and production

2. **Validate payments server-side**:
   - Always verify payment status via webhook
   - Don't trust client-side payment confirmations
   - Validate amounts and transaction IDs

3. **Monitor payments**:
   - Set up alerts for failed payments
   - Monitor webhook delivery
   - Review payment transactions regularly

4. **Handle errors gracefully**:
   - Log all payment errors
   - Provide clear error messages to users
   - Have fallback payment methods

## Support

For issues with:
- **SkipCash API**: Contact SkipCash support
- **Supabase Edge Functions**: Check Supabase documentation
- **Integration Issues**: Review function logs and database records

## Files Modified/Created

### New Files
- `packages/shared/src/services/skipcash.service.ts` - Frontend service
- `supabase/functions/skipcash-payment/index.ts` - Payment processing function
- `supabase/functions/skipcash-verify/index.ts` - Payment verification function
- `supabase/functions/skipcash-webhook/index.ts` - Webhook handler function

### Modified Files
- `packages/shared/src/services/index.ts` - Added SkipCash service export
- `packages/shared/src/models/payment.model.ts` - Added SkipCash types
- `packages/customer/src/modules/customer/features/payments/pages/PaymentPage/PaymentPage.tsx` - Integrated SkipCash for card payments

## Next Steps

1. Set up environment variables in Supabase
2. Deploy Edge Functions
3. Configure webhook URL in SkipCash dashboard
4. Test in sandbox mode
5. Switch to production when ready

