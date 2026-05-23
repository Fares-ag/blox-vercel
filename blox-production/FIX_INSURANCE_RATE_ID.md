# 🔧 Fix: Insurance Rate ID Type Error

## Problem
You're getting this error:
```
invalid input syntax for type uuid: "INS001"
```

This happens because:
- `insurance_rates.id` is defined as `UUID`
- `offers.insurance_rate_id` is defined as `UUID`
- But you're trying to use simple IDs like "INS001" (TEXT)

## Solution

Run this SQL script in Supabase Dashboard → SQL Editor:

**File:** `supabase-fix-insurance-rate-ids.sql`

This script will:
1. ✅ Change `insurance_rates.id` from UUID to TEXT
2. ✅ Change `offers.insurance_rate_id` from UUID to TEXT
3. ✅ Update the foreign key constraint

## Steps

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Click **New Query**
3. Copy and paste the contents of `supabase-fix-insurance-rate-ids.sql`
4. Click **Run** (or press Ctrl+Enter)
5. Wait for "Success" message

## After Running

You'll be able to:
- ✅ Use simple IDs like "INS001" for insurance rates
- ✅ Reference them in offers using `insurance_rate_id: "INS001"`
- ✅ Create offers without UUID errors

## Note

If you have existing insurance rates with UUIDs, you'll need to either:
- Keep using UUIDs for existing records
- Or migrate them to simple IDs (like `insurance-rate-1`, `insurance-rate-2`, etc.)

For now, the fix allows you to use TEXT IDs going forward!

