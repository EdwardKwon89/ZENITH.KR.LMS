import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function resetPassword() {
  const { data, error } = await supabase.auth.admin.updateUserById(
    'e0c25a74-8d4e-4e5c-9c7a-6b8c8d8e8f90', // I need the actual ID
    { password: 'password123' }
  );
  
  if (error) {
    console.error('Error resetting password:', error.message);
  } else {
    console.log('Password reset successfully for user');
  }
}

// I need to find the ID first
async function findUserAndReset() {
  const { data: users, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) {
    console.error('Error listing users:', userError.message);
    return;
  }
  
  const targetUser = users.users.find(u => u.email === 'temp_admin@zenith.kr');
  if (targetUser) {
    console.log('Found user:', targetUser.id);
    const { error } = await supabase.auth.admin.updateUserById(targetUser.id, { password: 'password123' });
    if (error) console.error('Reset error:', error.message);
    else console.log('Reset success');
  } else {
    console.log('User not found');
  }
}

findUserAndReset();
