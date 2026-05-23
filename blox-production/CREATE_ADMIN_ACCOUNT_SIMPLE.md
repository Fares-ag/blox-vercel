# Create Auto-Confirmed Admin Account

## Quick Method: Using Supabase Dashboard

### Step 1: Create the User

1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Click **"Add User"** or **"Invite User"**
3. Fill in:
   - **Email**: `mafifi@q-auto.com`
   - **Password**: Set a secure password (user can change it later)
   - **Auto Confirm User**: ✅ Check this box (important!)
4. In **User Metadata** section, click **"Add Field"** and add:
   ```json
   {
     "role": "admin",
     "user_role": "admin"
   }
   ```
5. Click **"Create User"**

### Step 2: Verify the Account

Run this query in **Supabase Dashboard** → **SQL Editor**:

```sql
SELECT 
  email,
  email_confirmed_at IS NOT NULL as is_confirmed,
  raw_user_meta_data->>'role' as role,
  CASE 
    WHEN raw_user_meta_data->>'role' = 'admin' AND email_confirmed_at IS NOT NULL 
      THEN '✅ Ready to use'
    ELSE '⚠️ Needs setup'
  END as status
FROM auth.users
WHERE email = 'mafifi@q-auto.com';
```

You should see:
- `is_confirmed`: `true`
- `role`: `admin`
- `status`: `✅ Ready to use`

### Step 3: Login

1. Go to your admin login page
2. Use email: `mafifi@q-auto.com`
3. Use the password you set
4. You should be logged in as admin immediately (no email confirmation needed)

---

## Alternative: If User Already Exists

If the user already exists, run this SQL in **Supabase Dashboard** → **SQL Editor**:

```sql
-- Update existing user to admin and confirm email
UPDATE auth.users
SET 
  raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'role', 'admin',
      'user_role', 'admin'
    ),
  email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
  confirmed_at = COALESCE(confirmed_at, NOW()),
  updated_at = NOW()
WHERE email = 'mafifi@q-auto.com';

-- Verify
SELECT 
  email,
  email_confirmed_at IS NOT NULL as is_confirmed,
  raw_user_meta_data->>'role' as role
FROM auth.users
WHERE email = 'mafifi@q-auto.com';
```

**Important**: After updating, the user needs to **log out and log back in** to get a new JWT token with the admin role.

---

## Using Supabase Admin API (Programmatic)

If you want to create the user programmatically, use the Supabase Admin API:

```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/auth/v1/admin/users' \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "mafifi@q-auto.com",
    "password": "YourSecurePassword123!",
    "email_confirm": true,
    "user_metadata": {
      "role": "admin",
      "user_role": "admin"
    }
  }'
```

Replace:
- `YOUR_PROJECT`: Your Supabase project reference
- `YOUR_SERVICE_ROLE_KEY`: Your Supabase service role key (found in Settings → API)

---

## Troubleshooting

### User can't login
- Check that `email_confirmed_at` is set (not NULL)
- Verify password is correct
- Check that role is set to 'admin' in `raw_user_meta_data`

### User can login but doesn't have admin access
- User needs to **log out and log back in** to refresh JWT token
- Verify role is set: `raw_user_meta_data->>'role' = 'admin'`
- Check browser console for JWT token: `session?.user?.user_metadata?.role`

### Check current user status
```sql
SELECT 
  email,
  email_confirmed_at,
  raw_user_meta_data->>'role' as role,
  created_at
FROM auth.users
WHERE email = 'mafifi@q-auto.com';
```
