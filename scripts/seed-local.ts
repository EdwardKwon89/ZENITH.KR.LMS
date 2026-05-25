
import { createClient } from '@supabase/supabase-js';

// 로컬 Supabase 환경 설정
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; // 로컬 실행 시 환경변수 확인 필요

async function createUser(supabase: any, email: string, fullName: string, role: string, orgId: string | null = null, orgType: string = 'CUSTOMER') {
  console.log(`Creating/Updating user: ${email} (${role})...`);
  
  // 1. Auth 유저 생성 (이미 있으면 에러가 나지만 listUsers로 체크 가능)
  const { data: usersData } = await supabase.auth.admin.listUsers();
  let user = usersData.users.find((u: any) => u.email === email);
  
  if (!user) {
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: 'password1234',
      email_confirm: true,
      user_metadata: { full_name: fullName, role: role }
    });
    if (createError) {
      console.error(`  - Failed to create ${email}:`, JSON.stringify(createError, null, 2));
      return;
    }
    user = newUser.user;
    console.log(`  - Created new user: ${user.id}`);
  } else {
    console.log(`  - User already exists: ${user.id}`);
  }

  // 2. App Metadata 업데이트 (JWT 권한 반영용)
  await supabase.auth.admin.updateUserById(user.id, {
    app_metadata: { role, status: 'ACTIVE', org_type: orgType }
  });

  // 3. zen_profiles 동기화
  const { error: profileError } = await supabase
    .from('zen_profiles')
    .upsert({
      id: user.id,
      email: email,
      full_name: fullName,
      role: role,
      status: 'ACTIVE',
      org_id: orgId
    }, { onConflict: 'id' });

  if (profileError) {
    console.error(`  - Profile sync error for ${email}:`, profileError.message);
  } else {
    console.log(`  - Profile synced for ${email}`);
  }
}

async function getOrCreateOrg(supabase: any, name: string, type: string) {
  console.log(`Getting or creating organization: ${name} (${type})...`);
  
  // 1. 이름으로 기존 조직 조회
  const { data: existingOrg } = await supabase
    .from('zen_organizations')
    .select('id')
    .eq('name', name)
    .maybeSingle();

  if (existingOrg) {
    console.log(`  - Organization already exists: ${existingOrg.id}`);
    return existingOrg;
  }

  // 2. 없으면 생성
  const { data: newOrg, error: createError } = await supabase
    .from('zen_organizations')
    .insert({ name, type, status: 'ACTIVE' })
    .select('id')
    .single();

  if (createError) {
    throw new Error(`Failed to create organization ${name}: ${createError.message}`);
  }

  console.log(`  - Created new organization: ${newOrg.id}`);
  return newOrg;
}

async function seedOrders(supabase: any, shipperOrgId: string) {
  console.log('\nSeeding E2E test orders...');

  // Fetch port IDs for ICN and LAX dynamically to ensure robustness
  const { data: ports } = await supabase
    .from('zen_ports')
    .select('id, code');
  
  const icnPort = ports?.find((p: any) => p.code === 'ICN');
  const laxPort = ports?.find((p: any) => p.code === 'LAX');
  const icnId = icnPort?.id || null;
  const laxId = laxPort?.id || null;

  const cargoDetails = { description: 'E2E test cargo', weight_kg: 1.0, total_weight: 10.0, total_volume: 0.05 };
  const testOrders = [
    { order_no: 'E2E-SEED-001', status: 'REGISTERED', recipient_name: 'E2E Test Recipient 1', recipient_phone: '010-9999-0001' },
    { order_no: 'E2E-SEED-002', status: 'REGISTERED', recipient_name: 'E2E Test Recipient 2', recipient_phone: '010-9999-0002' },
    { order_no: 'E2E-SEED-003', status: 'REGISTERED', recipient_name: 'E2E Test Recipient 3', recipient_phone: '010-9999-0003' },
    { order_no: 'E2E-SEED-004', status: 'WAREHOUSED', recipient_name: 'E2E Test Recipient 4', recipient_phone: '010-9999-0004' },
    { order_no: 'E2E-SEED-005', status: 'WAREHOUSED', recipient_name: 'E2E Test Recipient 5', recipient_phone: '010-9999-0005' },
    {
      id: 'd197352a-ba9f-4640-9176-c50c852d8138',
      order_no: 'Z-FIN-E2E05-01',
      status: 'REGISTERED',
      recipient_name: 'E2E Target Recipient',
      recipient_phone: '010-9999-0013',
      origin_port_id: icnId,
      dest_port_id: laxId,
      transport_mode: 'AIR',
      order_type: 'B2B'
    },
    {
      id: '3ff5b116-29cd-4d90-8dd0-0e99c36a2155',
      order_no: 'Z-HOU-E2E03-01',
      status: 'PACKED',
      order_type: 'B2B',
      transport_mode: 'AIR',
      recipient_name: 'E2E B2B Recipient',
      recipient_phone: '010-9999-0003',
      origin_port_id: icnId,
      dest_port_id: laxId
    },
  ];

  for (const order of testOrders) {
    if (order.id === '3ff5b116-29cd-4d90-8dd0-0e99c36a2155') {
      console.log(`  - Cleaning up conflicting order ID ${order.id} (from integration test)...`);
      await supabase.from('zen_tracking_events').delete().eq('order_id', order.id);
      await supabase.from('zen_tracking_raw_logs').delete().eq('order_id', order.id);
      await supabase.from('zen_tracking_configs').delete().eq('order_id', order.id);
      await supabase.from('zen_orders').delete().eq('id', order.id);
    }

    const { data: existing } = await supabase
      .from('zen_orders')
      .select('id')
      .eq('order_no', order.order_no)
      .maybeSingle();

    if (existing) {
      console.log(`  - Order exists: ${order.order_no}`);
      
      // Update existing orders to ensure they have correct ports/transport_mode set
      const { error: updateError } = await supabase
        .from('zen_orders')
        .update({
          origin_port_id: order.origin_port_id,
          dest_port_id: order.dest_port_id,
          transport_mode: order.transport_mode,
          order_type: order.order_type || 'B2B',
          cargo_details: cargoDetails
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error(`  - Failed to update order ports/mode: ${updateError.message}`);
      } else {
        console.log(`  - Updated ports/mode for existing order: ${order.order_no}`);
      }

      if (order.order_no === 'Z-HOU-E2E03-01') {
        const { data: configExists } = await supabase
          .from('zen_tracking_configs')
          .select('id')
          .eq('order_id', existing.id)
          .maybeSingle();
        if (!configExists) {
          console.log(`  - Seeding tracking config for existing order Z-HOU-E2E03-01...`);
          await supabase.from('zen_tracking_configs').insert({
            order_id: existing.id,
            provider_type: 'API',
            tracking_no: 'TRK-E2E04-API-01',
            is_active: true
          });
        }
      }
      continue;
    }

    const { data: insertedOrder, error } = await supabase
      .from('zen_orders')
      .insert({
        ...order,
        shipper_id: shipperOrgId,
        cargo_details: cargoDetails,
      })
      .select('id')
      .single();

    if (error) {
      console.error(`  - Failed: ${order.order_no}`, error.message);
    } else {
      console.log(`  - Created: ${order.order_no} [${order.status}]`);
      if (order.order_no === 'Z-HOU-E2E03-01') {
        console.log(`  - Seeding tracking config for new order Z-HOU-E2E03-01...`);
        await supabase.from('zen_tracking_configs').insert({
          order_id: insertedOrder.id,
          provider_type: 'API',
          tracking_no: 'TRK-E2E04-API-01',
          is_active: true
        });
      }
    }
  }
}

async function seedRateCards(supabase: any, carrierOrgId: string) {
  console.log('\nSeeding Rate Cards...');
  
  // check if any rate card already exists
  const { data: existingCards } = await supabase
    .from('zen_rate_cards')
    .select('id')
    .limit(1);

  if (existingCards && existingCards.length > 0) {
    console.log('  - Rate cards already exist. Skipping.');
    return;
  }

  // Insert a rate card for ICN -> LAX, AIR mode
  const { data: rateCard, error: cardError } = await supabase
    .from('zen_rate_cards')
    .insert({
      carrier_id: carrierOrgId,
      transport_mode: 'AIR',
      currency: 'USD',
      tiers: [
        { weight_min: 0, unit_price: 12.0, min_total_price: 50 },
        { weight_min: 100, unit_price: 10.5, min_total_price: 50 },
        { weight_min: 500, unit_price: 9.0, min_total_price: 50 }
      ],
      valid_from: new Date().toISOString().split('T')[0],
      is_active: true
    })
    .select('id')
    .single();

  if (cardError) {
    console.error('  - Failed to create rate card:', cardError.message);
    return;
  }

  console.log(`  - Created rate card: ${rateCard.id} for ICN -> LAX`);
}

async function seed() {
  if (!supabaseKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is missing. Please run with the key.');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. 기본 조직 생성 (플랫폼 운영사)
    const platformOrg = await getOrCreateOrg(supabase, 'Zenith Logistics', 'PLATFORM');

    // 2. 테스트용 화주/운송사 조직 생성
    const shipperOrg = await getOrCreateOrg(supabase, 'Global Shipper Corp', 'SHIPPER');
    const carrierOrg = await getOrCreateOrg(supabase, 'Fast Carrier Ltd', 'CARRIER');

    // 3. 역할별 테스트 계정 생성
    await createUser(supabase, 'manager@zenith.kr', 'Platform Manager', 'MANAGER', platformOrg.id, 'PLATFORM');
    await createUser(supabase, 'operator@zenith.kr', 'Platform Operator', 'OPERATOR', platformOrg.id, 'PLATFORM');
    await createUser(supabase, 'admin@zenith.kr', 'Tenant Admin', 'ADMIN', platformOrg.id, 'PLATFORM');
    await createUser(supabase, 'shipper@zenith.kr', 'Main Shipper', 'CORPORATE', shipperOrg.id, 'CUSTOMER');
    await createUser(supabase, 'carrier@zenith.kr', 'Main Carrier', 'CARRIER', carrierOrg.id, 'PARTNER');
    await createUser(supabase, 'individual@zenith.kr', 'Individual User', 'INDIVIDUAL', null, 'CUSTOMER');

    // 4. E2E 테스트용 오더 시드 데이터 생성
    await seedOrders(supabase, shipperOrg.id);

    // 5. 정산 요율 카드 시드 데이터 생성
    await seedRateCards(supabase, carrierOrg.id);

    console.log('\nSeed complete! All test accounts and E2E orders are ready.');
  } catch (err: any) {
    console.error('\nSeed process failed:', err.message);
    process.exit(1);
  }
}

seed();
