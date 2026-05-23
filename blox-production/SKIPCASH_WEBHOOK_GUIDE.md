# SkipCash Webhook Implementation Guide

## Overview

The webhook handler has been fully implemented according to SkipCash's webhook specification. It handles:

- ✅ Signature verification using webhook key
- ✅ StatusId mapping (0-8) to database statuses
- ✅ Out-of-order webhook protection
- ✅ Duplicate transaction handling
- ✅ Settlement and single payment updates
- ✅ Proper HTTP 200 responses

## Webhook Payload Structure

SkipCash sends the following payload:

```json
{
  "PaymentId": "c0168532-8e71-4623-b73a-c06db5cbd865",
  "Amount": "1.00",
  "StatusId": 2,
  "TransactionId": "00bd9b86-0aa7-47ae-a568-0d7aa5d9fac6",
  "Custom1": "{\"applicationId\":\"...\",\"paymentScheduleId\":\"...\"}",
  "Custom2": null,
  "Custom3": null,
  "Custom4": null,
  "Custom5": null,
  "Custom6": null,
  "Custom7": null,
  "Custom8": null,
  "Custom9": null,
  "Custom10": null,
  "VisaId": "07082024100903646560",
  "TokenId": "NA",
  "CardType": "Debit Card",
  "CardNubmer": null,
  "RecurringSubscriptionId": "00000000-0000-0000-0000-000000000000"
}
```

## StatusId Mapping

The webhook handler maps SkipCash StatusId to database status:

| StatusId | SkipCash Status | Database Status |
|----------|----------------|-----------------|
| 0 | new | pending |
| 1 | pending | pending |
| 2 | paid | completed |
| 3 | canceled | cancelled |
| 4 | failed | failed |
| 5 | rejected | failed |
| 6 | refunded | completed |
| 7 | pending refund | pending |
| 8 | refund failed | failed |

## Signature Verification

The webhook handler verifies the Authorization header using HMAC SHA256:

1. **Combine fields** in order: `PaymentId,Amount,StatusId,TransactionId,Custom1,VisaId`
   - Required: PaymentId, Amount, StatusId
   - Optional: TransactionId, Custom1, VisaId (included if present)

2. **Generate hash**: HMAC SHA256 with webhook key, then Base64 encode

3. **Compare** with Authorization header

Example:
```
PaymentId=abc,Amount=100.00,StatusId=2,TransactionId=xyz,Custom1=...,VisaId=123
→ HMAC SHA256 (with webhook key) → Base64
→ Compare with Authorization header
```

## Out-of-Order Webhook Protection

The handler implements protection against out-of-order webhooks:

**Scenario**: Customer tries payment → fails → retries → succeeds
- Webhook for success might arrive before webhook for failure
- Without protection, status could incorrectly change from "completed" to "failed"

**Solution**: 
- Check current transaction status before updating
- If status is already "completed" and new status is "failed", ignore the update
- Log the ignored update for monitoring

## Duplicate Transaction Handling

SkipCash may create multiple transactions for the same merchant order:

1. **Shopper closes browser immediately**: Multiple transactions created, all auto-canceled after 1 hour
2. **Payment fails, shopper retries**: New transaction with different PaymentId created

**Handling**:
- Use `TransactionId` (merchant's internal ID) as primary identifier
- If PaymentId is unknown but TransactionId matches, update existing transaction
- Ignore webhooks with unknown PaymentId if TransactionId doesn't match

## Webhook Retry Logic

SkipCash retries webhooks 3 times:
1. Immediately after transaction
2. 1 hour later
3. 1 day later

**Requirements**:
- Return HTTP 200 for successful processing
- Timeout: 10 seconds
- Any non-200 status is considered failure

**Implementation**:
- Always return HTTP 200 (even on errors)
- Log errors for debugging
- Prevent infinite retry loops

## Custom1 Field Usage

The `Custom1` field contains JSON with application context:

```json
{
  "applicationId": "uuid-of-application",
  "paymentScheduleId": "uuid-of-payment-schedule",
  "isSettlement": true,
  "paymentId": "payment-id",
  "transactionId": "merchant-transaction-id"
}
```

This allows the webhook to:
- Update the correct application
- Update specific payment schedule
- Handle settlement payments differently
- Look up transaction by TransactionId

## Payment Schedule Updates

### Single Payment
- Updates specific payment schedule by `paymentScheduleId`
- Marks that payment as "paid"
- Sets `paidDate` to current date

### Settlement Payment
- Updates all remaining payments in schedule
- Marks all unpaid payments as "paid"
- Sets `paidDate` for all updated payments

### No Schedule ID
- Updates first upcoming/active payment
- Fallback for cases where schedule ID is missing

## Testing Webhooks

### Using SkipCash Sandbox

1. Go to SkipCash Sandbox → **Webhooks Simulator**
2. Configure:
   - **Payment ID**: Use existing payment ID (optional)
   - **Event Type**: Choose scenario (success, failure, cancel)
   - **Amount**: Transaction amount
   - **Transaction ID**: Your merchant transaction ID
3. Click **Send**
4. Check **Webhook Events** tab for request/response logs

### Manual Testing

You can test the webhook endpoint directly:

```bash
curl -X POST https://[your-project-ref].supabase.co/functions/v1/skipcash-webhook \
  -H "Authorization: [calculated-hash]" \
  -H "Content-Type: application/json" \
  -d '{
    "PaymentId": "test-payment-id",
    "Amount": "100.00",
    "StatusId": 2,
    "TransactionId": "test-transaction-id",
    "Custom1": "{\"applicationId\":\"test-app-id\"}",
    "VisaId": "test-visa-id"
  }'
```

**Note**: You need to calculate the Authorization hash correctly for the test to work.

## Monitoring and Debugging

### Check Function Logs

1. Go to Supabase Dashboard → **Edge Functions** → `skipcash-webhook`
2. View **Logs** tab
3. Look for:
   - Signature verification failures
   - Database update errors
   - Out-of-order webhook warnings

### Database Queries

Check payment transactions:

```sql
SELECT * FROM payment_transactions 
WHERE transaction_id = 'your-transaction-id'
ORDER BY created_at DESC;
```

Check application payment schedule:

```sql
SELECT installment_plan 
FROM applications 
WHERE id = 'your-application-id';
```

## Error Handling

### Invalid Signature
- Returns HTTP 401
- Logs error with payment details
- Prevents unauthorized webhook calls

### Missing Fields
- Returns HTTP 400
- Lists missing required fields
- Helps identify configuration issues

### Database Errors
- Logs error but returns HTTP 200
- Prevents infinite retry loops
- Allows manual investigation

### Out-of-Order Webhooks
- Logs warning
- Returns HTTP 200
- Prevents incorrect status updates

## Configuration

### Required Environment Variables

```
SKIPCASH_WEBHOOK_KEY=7a189879-5091-4f43-a2cf-a542cf218827
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Webhook URL Configuration

In SkipCash Dashboard:
```
https://[your-project-ref].supabase.co/functions/v1/skipcash-webhook
```

## Best Practices

1. **Always verify signature**: Never trust webhooks without signature verification
2. **Handle out-of-order**: Check current status before updating
3. **Log everything**: Helps with debugging and monitoring
4. **Return 200 quickly**: Process asynchronously if needed
5. **Idempotent updates**: Same webhook can be processed multiple times safely
6. **Monitor failures**: Set up alerts for webhook processing errors

## Troubleshooting

### Webhook Not Receiving Calls

- Verify webhook URL is correct in SkipCash dashboard
- Check Supabase function is deployed
- Verify function is publicly accessible
- Check SkipCash webhook events log

### Signature Verification Failing

- Verify `SKIPCASH_WEBHOOK_KEY` matches SkipCash dashboard
- Check field order in signature calculation
- Ensure all fields are included correctly
- Compare calculated hash with received hash

### Status Not Updating

- Check webhook is being received (function logs)
- Verify transaction exists in database
- Check application ID in Custom1 field
- Verify payment schedule structure

### Duplicate Updates

- Check for multiple webhook calls (normal behavior)
- Verify idempotent update logic
- Check database constraints

## Support

For issues:
1. Check Supabase function logs
2. Review SkipCash webhook events
3. Verify environment variables
4. Test with webhook simulator
5. Contact SkipCash support for API issues

