
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
      console.error(`  - Failed to create ${email}:`, createError.message);
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

    console.log('\nSeed complete! All test accounts are ready.');
  } catch (err: any) {
    console.error('\nSeed process failed:', err.message);
    process.exit(1);
  }
}

seed();
