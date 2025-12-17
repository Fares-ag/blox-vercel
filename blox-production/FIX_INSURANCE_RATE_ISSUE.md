# 🔧 Fix: Insurance Rate Foreign Key Error

## Problem
You're getting this error:
```
insert or update on table "offers" violates foreign key constraint "offers_insurance_rate_id_fkey"
Key is not present in table "insurance_rates"
```

This happens because:
- You're trying to create an offer with `insurance_rate_id: "INS001"`
- But "INS001" doesn't exist in the `insurance_rates` table in Supabase
- The foreign key constraint prevents creating offers with non-existent insurance rates

## Solutions

### Option 1: Leave Insurance Rate Empty (Recommended for now)
When creating an offer, **don't select an insurance rate** if it doesn't exist in Supabase. The offer will be created without an insurance rate reference.

### Option 2: Create Insurance Rates in Supabase First
1. Go to **Supabase Dashboard** → **Table Editor**
2. Select the `insurance_rates` table
3. Click **Insert** → **Insert row**
4. Create insurance rates with IDs like:
   - `insurance-rate-1`
   - `insurance-rate-2`
   - Or use your existing IDs like `INS001`

### Option 3: Migrate Insurance Rates from localStorage
If you have insurance rates in localStorage that you want to migrate:

1. Open browser console (F12)
2. Run this script:

```javascript
// Get insurance rates from localStorage
const rates = JSON.parse(localStorage.getItem('insurance-rates') || '[]');

// Import Supabase (adjust path if needed)
const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Insert each rate
for (const rate of rates) {
  try {
    const { error } = await supabase.from('insurance_rates').insert({
      id: rate.id, // Keep existing ID
      name: rate.name,
      description: rate.description || null,
      annual_rate: rate.annualRate || rate.annual_rate,
      annual_rate_provider: rate.annualRateProvider || rate.annual_rate_provider,
      coverage_type: rate.coverageType || rate.coverage_type || null,
      min_vehicle_value: rate.minVehicleValue || rate.min_vehicle_value || null,
      max_vehicle_value: rate.maxVehicleValue || rate.max_vehicle_value || null,
      min_tenure: rate.minTenure || rate.min_tenure || null,
      max_tenure: rate.maxTenure || rate.max_tenure || null,
      status: rate.status || 'active',
      is_default: rate.isDefault || rate.is_default || false,
    });
    
    if (error) {
      console.error(`Error inserting ${rate.id}:`, error);
    } else {
      console.log(`✅ Inserted: ${rate.id}`);
    }
  } catch (err) {
    console.error(`Error with ${rate.id}:`, err);
  }
}
```

## What I Fixed

1. ✅ Updated `AddOfferPage` to load insurance rates from Supabase first
2. ✅ Made `insurance_rate_id` optional - if empty, it will be set to `null`
3. ✅ Added validation to prevent foreign key errors

## Next Steps

1. **Try creating an offer without selecting an insurance rate** - it should work now
2. **Or create insurance rates in Supabase first**, then select them when creating offers
3. **Or migrate your existing insurance rates** using the script above

The offer creation should work now! 🎉

