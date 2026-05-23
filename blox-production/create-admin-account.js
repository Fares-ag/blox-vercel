/**
 * Create/Update Admin Account Script
 * 
 * This script creates or updates an admin account with auto-confirmed email
 * 
 * Usage:
 * 1. Install dependencies: npm install @supabase/supabase-js
 * 2. Set environment variables:
 *    - SUPABASE_URL=https://your-project.supabase.co
 *    - SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
 * 3. Run: node create-admin-account.js
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://YOUR_PROJECT.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';

if (supabaseUrl.includes('YOUR_PROJECT') || serviceRoleKey.includes('YOUR_SERVICE')) {
  console.error('❌ Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  console.error('');
  console.error('Example:');
  console.error('  export SUPABASE_URL=https://your-project.supabase.co');
  console.error('  export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  console.error('  node create-admin-account.js');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const ADMIN_EMAIL = 'mafifi@q-auto.com';
const ADMIN_PASSWORD = 'afifi9845';

async function createAdmin() {
  try {
    console.log('🔍 Checking if user exists...');
    
    // List all users to find existing one
    const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      throw listError;
    }

    const existingUser = usersData.users.find(u => u.email === ADMIN_EMAIL);

    if (existingUser) {
      console.log('✅ User exists. Updating password and role...');
      
      // Update existing user
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        {
          password: ADMIN_PASSWORD,
          email_confirm: true,
          user_metadata: {
            ...existingUser.user_metadata,
            role: 'admin',
            user_role: 'admin'
          }
        }
      );

      if (error) throw error;
      
      console.log('✅ Admin account updated successfully!');
      console.log('   Email:', data.user.email);
      console.log('   Role:', data.user.user_metadata?.role);
      console.log('   Confirmed:', data.user.email_confirmed_at ? 'Yes' : 'No');
    } else {
      console.log('📝 Creating new admin user...');
      
      // Create new user
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: {
          role: 'admin',
          user_role: 'admin'
        }
      });

      if (error) throw error;
      
      console.log('✅ Admin account created successfully!');
      console.log('   Email:', data.user.email);
      console.log('   Role:', data.user.user_metadata?.role);
      console.log('   Confirmed:', data.user.email_confirmed_at ? 'Yes' : 'No');
    }

    console.log('');
    console.log('🎉 Login credentials:');
    console.log('   Email:', ADMIN_EMAIL);
    console.log('   Password:', ADMIN_PASSWORD);
    console.log('');
    console.log('✅ The user can login immediately without email verification!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.status) {
      console.error('   Status:', error.status);
    }
    process.exit(1);
  }
}

createAdmin();
