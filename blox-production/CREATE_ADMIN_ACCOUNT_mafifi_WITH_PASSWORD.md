# Create Admin Account: mafifi@q-auto.com

## Password: `afifi9845`

### Method 1: Using Supabase Dashboard (Easiest)

1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Click **"Add User"** or **"Invite User"**
3. Fill in:
   - **Email**: `mafifi@q-auto.com`
   - **Password**: `afifi9845`
   - **Auto Confirm User**: ✅ **Check this box** (important!)
4. In **User Metadata** section, add:
   ```json
   {
     "role": "admin",
     "user_role": "admin"
   }
   ```
5. Click **"Create User"**

### Method 2: Using Supabase Admin API (Programmatic)

Run this command in your terminal (replace `YOUR_PROJECT` and `YOUR_SERVICE_ROLE_KEY`):

```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/auth/v1/admin/users' \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "mafifi@q-auto.com",
    "password": "afifi9845",
    "email_confirm": true,
    "user_metadata": {
      "role": "admin",
      "user_role": "admin"
    }
  }'
```

**To get your Service Role Key:**
1. Go to Supabase Dashboard → Settings → API
2. Copy the **"service_role"** key (not the anon key!)

**To get your Project Reference:**
- It's in your Supabase URL: `https://YOUR_PROJECT.supabase.co`
- Or in Settings → API → Project URL

### Method 3: If User Already Exists - Update Password

If the user already exists, you can update the password using the Admin API:

```bash
# First, get the user ID
curl -X GET 'https://YOUR_PROJECT.supabase.co/auth/v1/admin/users?email=mafifi@q-auto.com' \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"

# Then update the password (replace USER_ID from above)
curl -X PUT 'https://YOUR_PROJECT.supabase.co/auth/v1/admin/users/USER_ID' \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "afifi9845",
    "email_confirm": true,
    "user_metadata": {
      "role": "admin",
      "user_role": "admin"
    }
  }'
```

### Method 4: Using Node.js Script

Create a file `create-admin.js`:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://YOUR_PROJECT.supabase.co';
const serviceRoleKey = 'YOUR_SERVICE_ROLE_KEY'; // Use service_role key, not anon key!

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdmin() {
  try {
    // Check if user exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers.users.find(u => u.email === 'mafifi@q-auto.com');

    if (existingUser) {
      // Update existing user
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        {
          password: 'afifi9845',
          email_confirm: true,
          user_metadata: {
            role: 'admin',
            user_role: 'admin'
          }
        }
      );

      if (error) throw error;
      console.log('✅ Admin account updated:', data.user.email);
    } else {
      // Create new user
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: 'mafifi@q-auto.com',
        password: 'afifi9845',
        email_confirm: true,
        user_metadata: {
          role: 'admin',
          user_role: 'admin'
        }
      });

      if (error) throw error;
      console.log('✅ Admin account created:', data.user.email);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createAdmin();
```

Run it:
```bash
node create-admin.js
```

---

## Verify the Account

After creating/updating, verify with this SQL in Supabase SQL Editor:

```sql
SELECT 
  email,
  email_confirmed_at IS NOT NULL as is_confirmed,
  raw_user_meta_data->>'role' as role,
  CASE 
    WHEN raw_user_meta_data->>'role' = 'admin' AND email_confirmed_at IS NOT NULL 
      THEN '✅ Ready to login'
    ELSE '⚠️ Needs setup'
  END as status
FROM auth.users
WHERE email = 'mafifi@q-auto.com';
```

---

## Login Credentials

- **Email**: `mafifi@q-auto.com`
- **Password**: `afifi9845`
- **Role**: Admin (auto-confirmed)

The user can login immediately without email verification!
