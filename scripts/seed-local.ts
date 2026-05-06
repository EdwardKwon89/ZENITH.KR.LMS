
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; // I need to find this

async function seed() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Create Admin User
  const { data: adminUser, error: adminError } = await supabase.auth.admin.createUser({
    email: 'admin@zenith.kr',
    password: 'password1234',
    email_confirm: true,
    user_metadata: { full_name: 'System Admin', role: 'ADMIN' }
  });

  if (adminError) console.error('Error creating admin:', adminError);
  else console.log('Admin created:', adminUser.user.id);

  // 2. Create Organizations
  const { data: org, error: orgError } = await supabase
    .from('zen_organizations')
    .insert({
      name: 'Zenith Logistics',
      type: 'PLATFORM',
      status: 'ACTIVE'
    })
    .select()
    .single();

  if (orgError) console.error('Error creating org:', orgError);
  
  // 3. Update Admin Profile & Metadata
  if (adminUser?.user) {
    await supabase.auth.admin.updateUserById(adminUser.user.id, {
      app_metadata: { role: 'ADMIN', status: 'ACTIVE', org_type: 'PLATFORM' }
    });

    await supabase
      .from('zen_profiles')
      .update({ org_id: org.id, role: 'ADMIN', status: 'ACTIVE' })
      .eq('id', adminUser.user.id);
  } else {
    // If user already exists, update them by email search
    const { data: users } = await supabase.auth.admin.listUsers();
    const existingUser = users.users.find(u => u.email === 'admin@zenith.kr');
    if (existingUser) {
      await supabase.auth.admin.updateUserById(existingUser.id, {
        app_metadata: { role: 'ADMIN', status: 'ACTIVE', org_type: 'PLATFORM' }
      });
      await supabase
        .from('zen_profiles')
        .update({ org_id: org.id, role: 'ADMIN', status: 'ACTIVE' })
        .eq('id', existingUser.id);
    }
  }

  // 4. Create Order
  const { data: order, error: orderError } = await supabase
    .from('zen_orders')
    .insert({
      id: 'd197352a-ba9f-4640-9176-c50c852d8138',
      order_no: 'Z-FIN-E2E05-01',
      shipper_id: org.id,
      status: 'WAREHOUSED',
      cargo_details: { description: 'Electronics', weight: 150, volume: 1.2 }
    })
    .select()
    .single();

  if (orderError) console.error('Error creating order:', orderError);
  else console.log('Order created:', order.order_no);
}

seed();
