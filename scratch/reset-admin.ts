import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function resetPassword() {
  const { data, error } = await supabase.auth.admin.updateUserById(
    '0b3f889c-4819-4820-911e-2877a760c6d9', // I need the ID
    { password: 'password123' }
  );

  if (error) {
    console.error('Error resetting password:', error);
  } else {
    console.log('Password reset successfully for:', data.user.email);
  }
}

// First, get the ID
async function getUserId() {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('Error listing users:', error);
    return;
  }
  const user = data.users.find(u => u.email === 'temp_admin@zenith.kr');
  if (user) {
    console.log('Found user ID:', user.id);
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: 'password123' }
    );
    if (updateError) console.error('Update error:', updateError);
    else console.log('Update success');
  } else {
    console.log('User not found');
  }
}

getUserId();
