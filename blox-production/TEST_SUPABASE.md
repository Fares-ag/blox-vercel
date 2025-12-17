# Testing Supabase Connection

## ✅ Quick Test Steps

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Open the Admin Dashboard:**
   - Navigate to: `http://localhost:5173/admin/vehicles` (or your admin port)
   - The Products/Vehicles page should now try to load from Supabase first

3. **Check the Browser Console:**
   - Open Developer Tools (F12)
   - Go to Console tab
   - You should see:
     - ✅ If Supabase works: Products loading from Supabase
     - ⚠️ If Supabase fails: "Supabase not available, trying API..." (then falls back to localStorage)

4. **Verify in Supabase Dashboard:**
   - Go to: https://supabase.com/dashboard
   - Select your project
   - Click **Table Editor**
   - Check the `products` table - it should be empty initially

## 🧪 Test Creating a Product

1. **Via Supabase Dashboard (Quick Test):**
   - Go to Supabase Dashboard → Table Editor → `products`
   - Click **Insert row**
   - Fill in:
     - `make`: "Toyota"
     - `model`: "Camry"
     - `model_year`: 2024
     - `condition`: "new"
     - `price`: 50000
     - `status`: "active"
   - Click **Save**
   - Go back to your app and refresh - you should see the product!

2. **Via Your App:**
   - Click "Add Vehicle" button
   - Fill in the form and save
   - The product should be saved to Supabase

## 🔍 Verify Data Flow

### Check Supabase is Working:
1. Open Browser Console (F12)
2. Go to Network tab
3. Filter by "supabase"
4. You should see requests to: `https://zqwsxewuppexvjyakuqf.supabase.co/rest/v1/products`

### Check Data in Supabase:
1. Go to Supabase Dashboard
2. Table Editor → `products`
3. You should see any products you've created

## 🐛 Troubleshooting

### "Supabase URL or Anon Key not found"
- **Fix**: Check `.env.development` files have the correct variables
- Restart your dev server after adding env variables

### "relation 'products' does not exist"
- **Fix**: Run the `supabase-schema.sql` script in Supabase SQL Editor
- Make sure all tables were created successfully

### "permission denied"
- **Fix**: Check Row Level Security policies in Supabase
- The SQL script should have created public read/write policies

### Products not showing
- Check browser console for errors
- Verify Supabase connection in Network tab
- Check that data exists in Supabase Table Editor

## ✅ Success Indicators

You'll know Supabase is working when:
- ✅ No console errors about Supabase connection
- ✅ Products load from Supabase (check Network tab)
- ✅ Data appears in Supabase Table Editor
- ✅ Creating/updating products persists in Supabase

## 🎯 Next Steps

Once you verify Supabase is working:
1. Test creating a product via the app
2. Test updating a product
3. Test deleting a product
4. Gradually update other pages (Applications, Offers, etc.) to use Supabase

