# 🚀 Migration Guide: Change Product IDs to vehicle-1, vehicle-2 format

## ⚠️ Important: Backup First!

Before running the migration:
1. Go to Supabase Dashboard → Table Editor → `products`
2. Export your data (or take a screenshot) as backup

## 📋 Steps to Migrate

### Step 1: Run the Migration Script

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** → **New Query**
4. Open the file: `supabase-migration-vehicle-ids.sql`
5. Copy the **entire contents** of the file
6. Paste into the SQL Editor
7. Click **Run** (or press Ctrl+Enter)
8. Wait for success message

### Step 2: Verify Migration

1. Go to **Table Editor** → `products`
2. Check that all products now have IDs like:
   - `vehicle-1`
   - `vehicle-2`
   - `vehicle-3`
   - etc.

### Step 3: Test Creating a New Product

1. Go to your app
2. Click **Add Vehicle**
3. Fill in the form and save
4. The new product should get an ID like `vehicle-4` (or the next number)

## ✅ What the Migration Does

1. **Converts existing UUIDs** to `vehicle-1`, `vehicle-2`, etc.
2. **Changes ID column type** from UUID to TEXT
3. **Creates auto-generation trigger** - new products automatically get sequential IDs
4. **Updates foreign keys** - fixes references in applications table

## 🐛 Troubleshooting

### "relation does not exist"
- Make sure you've run the original `supabase-schema.sql` first
- Check that the `products` table exists

### "constraint does not exist"
- This is okay - the script handles missing constraints
- The migration will still work

### "duplicate key value"
- This shouldn't happen, but if it does:
  - Check for duplicate IDs in the products table
  - You may need to manually fix duplicates

## 🎯 After Migration

- ✅ All existing products will have simple IDs: `vehicle-1`, `vehicle-2`, etc.
- ✅ New products automatically get the next sequential ID
- ✅ Your app will work exactly the same, just with cleaner IDs!

## 📝 Notes

- The migration preserves all your existing data
- Product order is based on `created_at` timestamp
- The first product created gets `vehicle-1`, second gets `vehicle-2`, etc.

