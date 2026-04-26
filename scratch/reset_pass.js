const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ayowrwmufagzstqiqrnj.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5b3dyd211ZmFnenN0cWlxcm5qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjM5MjM0NywiZXhwIjoyMDkxOTY4MzQ3fQ._Zd-fP8wmFOE_Q22Y0xIO_4gLNJLlZopl_-RSvZgGZs';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
