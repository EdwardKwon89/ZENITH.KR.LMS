
import { createClient } from '@supabase/supabase-js';

// 기본값은 로컬 Supabase — SUPABASE_URL 환경변수 지정 시 그 대상으로 시드(예: 원격 데모 환경)
const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; // 실행 시 환경변수 확인 필요

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

  // 2. App Metadata 업데이트 (JWT 권한 반영용 — org_id 누락 시 RLS가 조용히 실패함, 2026-07-19 확인)
  await supabase.auth.admin.updateUserById(user.id, {
    app_metadata: { role, status: 'ACTIVE', org_type: orgType, org_id: orgId }
  });

  // 3. zen_profiles 동기화
  const { error: profileError } = await supabase
    .from('zen_profiles')
    .upsert({
      id: user.id,
      email: email,
      full_name: fullName,
      phone_number: '010-1234-5678',
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

async function seedRolePermissions(supabase: any) {
  console.log('\nSeeding zen_role_permissions (RBAC, DEF-B-017 등)...');

  const permissions = [
    { role_code: 'MANAGER', menu_id: 'ups_actual_charges', path: '/admin/ups-actual-charges', is_allowed: true },
    { role_code: 'AGENCY', menu_id: 'ups_actual_charges', path: '/admin/ups-actual-charges', is_allowed: true },
  ];

  for (const p of permissions) {
    const { data: existing } = await supabase
      .from('zen_role_permissions')
      .select('id')
      .eq('role_code', p.role_code)
      .eq('path', p.path)
      .maybeSingle();
    if (existing) { console.log(`  - Exists: ${p.role_code} → ${p.path}`); continue; }
    const { error } = await supabase.from('zen_role_permissions').insert(p);
    if (error) console.error(`  - Failed: ${p.role_code} → ${p.path}`, error.message);
    else console.log(`  - Created: ${p.role_code} → ${p.path}`);
  }
}

async function seedAgencyRelationship(supabase: any) {
  console.log('\nSeeding Agency/Agency_Shipper test accounts...');

  // 1. Agency 조직 및 계정 생성
  const agencyOrg = await getOrCreateOrg(supabase, 'Zenith Agency Partners', 'AGENCY');
  await createUser(supabase, 'agency@zenith.kr', 'Agency Operator', 'AGENCY', agencyOrg.id, 'AGENCY');

  // 2. Agency 소속 Shipper 조직 및 계정 생성 (AGENCY_SHIPPER)
  const agencyShipperOrg = await getOrCreateOrg(supabase, 'Agency Shipper Co', 'SHIPPER');
  await createUser(supabase, 'agency_shipper@zenith.kr', 'Agency Shipper', 'AGENCY_SHIPPER', agencyShipperOrg.id, 'SHIPPER');

  // 3. zen_agency_shippers 연결 (createAgencyShipper의 _linkShipperToAgency와 동일 구조)
  const { data: existingLink } = await supabase
    .from('zen_agency_shippers')
    .select('id')
    .eq('agency_org_id', agencyOrg.id)
    .eq('shipper_org_id', agencyShipperOrg.id)
    .maybeSingle();

  if (!existingLink) {
    const { error: linkError } = await supabase
      .from('zen_agency_shippers')
      .insert({
        agency_org_id: agencyOrg.id,
        shipper_org_id: agencyShipperOrg.id,
        shipper_type: 'CORPORATE',
        discount_rate: 0.05,
        is_active: true,
      });
    if (linkError) {
      console.error('  - Failed to link agency shipper:', linkError.message);
    } else {
      console.log('  - Linked agency_shipper to agency');
    }
  } else {
    console.log('  - Agency shipper link already exists');
  }
}

async function seedSntlAgency(supabase: any) {
  console.log('\nSeeding SNTL agency account (2026-07-19 원가표.xlsx 연동)...');

  // SNTL: 실제 UPS 원가표(KR-P) 기준 데이터가 연결되는 Master Agency 조직
  const sntlOrg = await getOrCreateOrg(supabase, 'SNTL', 'AGENCY');

  // Issue #605: SNTL은 Master Agency — UPS 특별할인을 받아 하위 대리점(Sub-Agency)에 재공급하는
  // 사업을 계획 중(Edward, 2026-07-19). 이를 위해 SNTL 계정을 SUB_ADMIN으로 전환.
  // (기존 AGENCY 역할이 아니라, 본인 관리 Sub-Agency의 zen_agency_pricing_policies만
  //  RLS로 제한된 범위에서 CRUD 가능한 역할 — is_managing_agency(), 20260719000400 참조)
  await createUser(supabase, 'sntl@zenith.kr', 'SNTL Master Agency Admin', 'SUB_ADMIN', sntlOrg.id, 'AGENCY');

  // 검증/데모용 Sub-Agency 1곳 — parent_id로 SNTL을 Master로 지정
  const subAgencyOrg = await getOrCreateOrg(supabase, 'SNTL Sub-Agency Test', 'AGENCY');
  await supabase
    .from('zen_organizations')
    .update({ parent_id: sntlOrg.id })
    .eq('id', subAgencyOrg.id)
    .is('parent_id', null);
  await createUser(supabase, 'sntl_sub1@zenith.kr', 'SNTL Sub-Agency Test Operator', 'AGENCY', subAgencyOrg.id, 'AGENCY');

  // Edward 지시(2026-07-20) 정책 시나리오: SNTL → SNTL Agency 공급가 = UPS 공식 판매가의 80%
  // (= discount_rate 0.20). 이전에 등록했던 75%(20260719 실측 대표값)는 이번 시나리오 검증을 위해
  // 0.20으로 대체 — 실측값이 아닌 Edward 지정 테스트 정책이므로 실측 근거 주석은 제거하지 않고
  // 이 시나리오가 임시 검증용임을 명시.
  const { data: zones } = await supabase.from('zen_ups_zones').select('id');
  for (const zone of zones ?? []) {
    await supabase
      .from('zen_agency_pricing_policies')
      .upsert(
        { agency_org_id: subAgencyOrg.id, zone_id: zone.id, discount_rate: 0.20, is_active: true },
        { onConflict: 'agency_org_id,zone_id' },
      );
  }
  console.log(`  - Registered SNTL->Sub-Agency zone discount policy (20% = 80% 공급가, ${zones?.length ?? 0} zones)`);

  // TestShipper: SNTL Agency 소속 화주 — Edward 지시 정책: 공급가 = UPS 공식 판매가의 88%
  // (= discount_rate 0.12). Agency→Shipper 판매가는 Agency 원가를 경유하지 않고 UPS 판매가에서
  // 직접 계산(Issue #310, shipper-pricing.ts 참조).
  // 역할은 AGENCY_SHIPPER이어야 함 — createOrder()가 agency_org_id 자동 연결(zen_agency_shippers
  // 조회)을 profile.role === AGENCY_SHIPPER인 경우에만 수행함(operations/orders.ts:110). CORPORATE로
  // 만들면 오더에 agency_org_id가 비어 rate snapshot/원가가 전혀 생성되지 않음(직접 확인, 2026-07-20).
  const testShipperOrg = await getOrCreateOrg(supabase, 'TestShipper', 'SHIPPER');
  await createUser(supabase, 'test_shipper@zenith.kr', 'TestShipper Operator', 'AGENCY_SHIPPER', testShipperOrg.id, 'SHIPPER');

  await supabase
    .from('zen_agency_shippers')
    .upsert(
      { agency_org_id: subAgencyOrg.id, shipper_org_id: testShipperOrg.id, shipper_type: 'CORPORATE', is_active: true },
      { onConflict: 'agency_org_id,shipper_org_id' },
    );

  for (const zone of zones ?? []) {
    await supabase
      .from('zen_agency_shipper_zone_discounts')
      .upsert(
        { agency_org_id: subAgencyOrg.id, shipper_org_id: testShipperOrg.id, zone_id: zone.id, discount_rate: 0.12, is_active: true },
        { onConflict: 'agency_org_id,shipper_org_id,zone_id' },
      );
  }
  console.log(`  - Registered SNTL Agency->TestShipper zone discount policy (12% = 88% 공급가, ${zones?.length ?? 0} zones)`);
}

/**
 * TASK-212: DEF-B-014/015/016(AGENCY RLS) + DEF-B-013(입고 재계산) + DEF-127(tisa.ts metadata)
 * 검증용 UPS 오더 픽스처 — 기존 시드에는 agency_org_id가 채워진 UPS 오더가 전혀 없어
 * 위 결함들을 실제 UI/RLS로 재현 확인할 방법이 없었음(2026-07-27 완성도 점검에서 발견).
 *
 * SNTL Sub-Agency Test(sntl_sub1@zenith.kr) 소속, TestShipper(test_shipper@zenith.kr) 화주로
 * agency_org_id가 정상 채워진 UPS 오더 1건 + 실측 가능한 치수(volumetric > actual weight로
 * 설정해 OVERSIZE/부피중량 로직도 함께 검증 가능) + rate snapshot(platform.totalSellingPrice
 * 포함) + UPS tracking config를 생성한다. SNTL Sub-Agency Test의 volumetric_divisor는
 * 기본값(5000)이 아닌 5500으로 설정해 DEF-B-016(대행사별 기준값 반영) 재현도 가능하게 한다.
 */
async function seedUpsAgencyOrder(supabase: any) {
  console.log('\nSeeding UPS agency order fixture (TASK-212, DEF-127/DEF-B-013~016 검증용)...');

  const { data: subAgencyOrg } = await supabase
    .from('zen_organizations')
    .select('id')
    .eq('name', 'SNTL Sub-Agency Test')
    .maybeSingle();
  const { data: testShipperOrg } = await supabase
    .from('zen_organizations')
    .select('id')
    .eq('name', 'TestShipper')
    .maybeSingle();

  if (!subAgencyOrg || !testShipperOrg) {
    console.error('  - SKIP: SNTL Sub-Agency Test 또는 TestShipper 조직을 찾을 수 없음 (seedSntlAgency 선행 필요)');
    return;
  }

  // 대행사별 부피중량 기준값 변형 — 기본값(5000)만 있으면 DEF-B-016 재현 불가
  await supabase
    .from('zen_organizations')
    .update({ volumetric_divisor: 5500 })
    .eq('id', subAgencyOrg.id);
  console.log('  - SNTL Sub-Agency Test volumetric_divisor = 5500 설정(기본값 변형 검증용)');

  const { data: destPort } = await supabase
    .from('zen_ports')
    .select('id')
    .eq('code', 'LAX')
    .maybeSingle();

  const orderNo = 'UPS-SEED-AGENCY-001';
  const { data: existingOrder } = await supabase
    .from('zen_orders')
    .select('id')
    .eq('order_no', orderNo)
    .maybeSingle();

  let orderId: string;
  if (existingOrder) {
    console.log(`  - Order exists: ${orderNo}`);
    orderId = existingOrder.id;
  } else {
    const { data: inserted, error } = await supabase
      .from('zen_orders')
      .insert({
        order_no: orderNo,
        shipper_id: testShipperOrg.id,
        agency_org_id: subAgencyOrg.id,
        status: 'WAREHOUSED',
        transport_mode: 'UPS',
        ups_product_code: 'WW_EXPEDITED',
        recipient_country_code: 'US',
        dest_port_id: destPort?.id ?? null,
        incoterms: 'DDU',
        delivery_method: 'DIRECT',
        recipient_name: 'DEF-B Verification Recipient',
        recipient_phone: '010-9999-0212',
        cargo_details: { description: 'TASK-212 seed fixture — AGENCY RLS/입고재계산 검증용' },
      })
      .select('id')
      .single();

    if (error) {
      console.error(`  - Failed: ${orderNo}`, error.message);
      return;
    }
    orderId = inserted.id;
    console.log(`  - Created: ${orderNo}`);
  }

  // 패키지: 실중량(3kg) < 부피중량(divisor 5500 기준 40x30x25/5500=5.45kg) — OVERSIZE/부피중량 로직 검증용
  const { data: existingPkg } = await supabase
    .from('zen_order_packages')
    .select('id')
    .eq('order_id', orderId)
    .limit(1);
  if (!existingPkg || existingPkg.length === 0) {
    await supabase.from('zen_order_packages').insert({
      order_id: orderId,
      packing_unit: 'BOX',
      packing_count: 1,
      gross_weight: 3,
      length: 40,
      width: 30,
      height: 25,
      content_type: 'GENERAL',
    });
    console.log('  - Seeded package (3kg, 40x30x25cm — volumetric > actual)');
  }

  // rate snapshot: DEF-127(tisa.ts metadata) + AGENCY RLS(SELECT/UPDATE/INSERT) 검증용
  const { data: existingSnapshot } = await supabase
    .from('zen_order_rate_snapshots')
    .select('id')
    .eq('order_id', orderId)
    .maybeSingle();
  if (!existingSnapshot) {
    await supabase.from('zen_order_rate_snapshots').insert({
      order_id: orderId,
      applied_unit_price: 249577,
      applied_currency: 'KRW',
      applied_rule: 'UPS_3TIER',
      metadata: {
        platform: {
          chargeableWeightKg: 5.45,
          billingWeightKg: 3,
          totalSellingPrice: 249577,
          totalCostPrice: 189577,
          currency: 'KRW',
          breakdown: { baseFreight: 200000, fuelSurcharge: 30000, surgeFee: 10000, extraCharges: 9577 },
        },
        agency: null,
        shipper: null,
      },
    });
    console.log('  - Seeded rate snapshot (platform.totalSellingPrice=249577 KRW)');
  }

  // tracking config: TrackingDashboard UPS provider 검증용(기존 유일 표본은 API/MockCarrier뿐)
  const { data: existingTracking } = await supabase
    .from('zen_tracking_configs')
    .select('id')
    .eq('order_id', orderId)
    .maybeSingle();
  if (!existingTracking) {
    await supabase.from('zen_tracking_configs').insert({
      order_id: orderId,
      provider_type: 'API',
      provider_name: 'UPS',
      tracking_no: '1Z-SEED-UPS-001',
      is_active: true,
    });
    console.log('  - Seeded UPS tracking config (1Z-SEED-UPS-001)');
  }
}

/**
 * 화주 인보이스 조회 화면(TASK-B-205) 검증용 — 로그인 가능한 화주 계정(shipper@zenith.kr,
 * test_shipper@zenith.kr)에 인보이스가 0건이라 화면은 뜨나 실데이터 확인이 불가했음(2026-07-27 발견).
 */
async function seedShipperInvoices(supabase: any, shipperOrgId: string) {
  console.log('\nSeeding shipper invoice fixtures (TASK-212, TASK-B-205 검증용)...');

  const { data: testShipperOrg } = await supabase
    .from('zen_organizations')
    .select('id')
    .eq('name', 'TestShipper')
    .maybeSingle();

  const invoiceTargets: Array<[string, string]> = [
    ['INV-SEED-SHIPPER-001', shipperOrgId],
    ...(testShipperOrg ? [['INV-SEED-TESTSHIPPER-001', testShipperOrg.id] as [string, string]] : []),
  ];

  for (const [invoiceNo, orgId] of invoiceTargets) {
    const { data: existing } = await supabase
      .from('zen_invoices')
      .select('id')
      .eq('invoice_no', invoiceNo)
      .maybeSingle();
    if (existing) {
      console.log(`  - Invoice exists: ${invoiceNo}`);
      continue;
    }
    const { error } = await supabase.from('zen_invoices').insert({
      invoice_no: invoiceNo,
      shipper_id: orgId,
      total_amount: 249577,
      currency: 'KRW',
      due_date: new Date(new Date().setDate(new Date().getDate() + 14)).toISOString().slice(0, 10),
      status: 'UNPAID',
    });
    if (error) {
      console.error(`  - Failed: ${invoiceNo}`, error.message);
    } else {
      console.log(`  - Created: ${invoiceNo}`);
    }
  }
}

/**
 * DEF-B-026~030 (Issue #957/958/960/964/966) 재검증용 — daily-billing/청구서 조회 화면의
 * 2단계 인보이스(ADMIN_TO_AGENCY 원가 / AGENCY_TO_SHIPPER 판매가) 티어 구분 버그들을 검증하려면
 * "대리점 소속 화주가 낸 UPS 오더 + 양쪽 티어 인보이스가 모두 존재"하는 시나리오가 필요한데,
 * 기존 시드에는 이런 조합이 없어 2026-07-28 세션에서 실제 UI/수동 SQL로 임시로 만들어 검증했음.
 * 리셋 시 사라지므로(CI/check-db-freshness.sh --fix) 동일 시나리오를 여기 이식한다.
 *
 * - Zenith Agency Partners(대리점) 소속 화주 2곳: jungjs72@gmail.com(shipperOrgId 재사용,
 *   role을 CORPORATE→AGENCY_SHIPPER로 전환 — 위 3-1 createUser 참조) + 신규 "Jongseok Jeong"
 *   개인 화주(jungjs@aventusm.com, 정상 자가등록 시나리오 재현용 실제 주소/사업자번호 포함)
 * - 오더 7건(ZEN-2026-000001~007), 각각 AGENCY_TO_SHIPPER(화주 판매가) + ADMIN_TO_AGENCY(대리점 원가)
 *   양쪽 티어 인보이스 보유 — DEF-B-027(상세 펼침 빈 목록)·DEF-B-028(화주에 원가 노출)·
 *   DEF-B-029(요약 breakdown 0)·DEF-B-030(색상) 전부 이 데이터로 재현/재검증 가능
 */
async function seedDailyBillingMultiTierFixtures(supabase: any, shipperOrgId: string) {
  console.log('\nSeeding daily-billing multi-tier invoice fixtures (DEF-B-026~030 검증용)...');

  const agencyOrg = await getOrCreateOrg(supabase, 'Zenith Agency Partners', 'AGENCY');
  await createUser(supabase, 'agency@zenith.kr', 'Zenith Agency Partners Operator', 'AGENCY', agencyOrg.id, 'AGENCY');

  const aventusmOrg = await getOrCreateOrg(supabase, 'Jongseok Jeong', 'SHIPPER');
  await supabase
    .from('zen_organizations')
    .update({
      biz_no: '215-46-56633',
      rep_name: '정대표',
      contact_name: 'Jongseok Jeong',
      contact_email: 'jungjs@aventusm.com',
      contact_phone: '010-4282-4027',
      country_code: 'KR',
      state_province: '11',
      city: 'Seongbuk-gu',
      address: '서울 성북구 동소문로 290-1',
      address_detail: 'bio venture tower 203',
      zipcode: '02734',
      address_english: '290-1 Dongsomun-ro, Seongbuk-gu, Seoul, Republic of Korea',
    })
    .eq('id', aventusmOrg.id);
  await createUser(supabase, 'jungjs@aventusm.com', 'Jongseok Jeong', 'AGENCY_SHIPPER', aventusmOrg.id, 'CUSTOMER');

  // jungjs72@gmail.com은 3-1 createUser에서 이미 AGENCY_SHIPPER로 생성됨(shipperOrgId 재사용) —
  // 여기서는 두 화주 org를 대리점에 연결만 한다(실측 discount_rate=0 그대로 반영).
  for (const linkedShipperOrgId of [shipperOrgId, aventusmOrg.id]) {
    await supabase
      .from('zen_agency_shippers')
      .upsert(
        { agency_org_id: agencyOrg.id, shipper_org_id: linkedShipperOrgId, shipper_type: 'CORPORATE', discount_rate: 0, is_active: true },
        { onConflict: 'agency_org_id,shipper_org_id' },
      );
  }
  console.log(`  - Linked Global Shipper Corp + Jongseok Jeong -> Zenith Agency Partners (discount_rate=0)`);

  // IMP-157 조사 중 실측 반영된 Zone별 할인율(대리점 20%/화주 25%) — 화주 할인율이 대리점 자체 할인율보다
  // 높아 역마진이 발생하는 시나리오(IMP-155 검증용)를 그대로 재현. 아래 오더 4~7번 픽스처의
  // adminToAgencyBreakdown 수치가 바로 이 할인율로 계산된 실측값(seedSntlAgency()와 동일 패턴).
  const { data: zonesForAgency } = await supabase.from('zen_ups_zones').select('id');
  for (const zone of zonesForAgency ?? []) {
    await supabase
      .from('zen_agency_pricing_policies')
      .upsert(
        { agency_org_id: agencyOrg.id, zone_id: zone.id, discount_rate: 0.20, is_active: true },
        { onConflict: 'agency_org_id,zone_id' },
      );
    for (const linkedShipperOrgId of [shipperOrgId, aventusmOrg.id]) {
      await supabase
        .from('zen_agency_shipper_zone_discounts')
        .upsert(
          { agency_org_id: agencyOrg.id, shipper_org_id: linkedShipperOrgId, zone_id: zone.id, discount_rate: 0.25, is_active: true },
          { onConflict: 'agency_org_id,shipper_org_id,zone_id' },
        );
    }
  }
  console.log(`  - Registered Admin->Zenith Agency Partners 20% + Agency->Shipper 25% zone discount policy (역마진 시나리오, ${zonesForAgency?.length ?? 0} zones)`);

  type CostRow = { cost_type: string; amount: number };
  type OrderFixture = {
    orderNo: string;
    shipperKey: 'global' | 'aventusm';
    status: string;
    upsProduct: string;
    recipientCountry: string;
    recipientState: string;
    recipientCity: string;
    recipientName: string;
    deliveryMethod: 'DIRECT' | 'PICKUP';
    packageDims: { l: number; w: number; h: number; kg: number };
    costs: CostRow[];
    adminToAgencyBreakdown: { baseFreight: number; fuelSurcharge: number; surgeFee: number; otherCharges: number };
  };

  const orderFixtures: OrderFixture[] = [
    {
      orderNo: 'ZEN-2026-000001', shipperKey: 'aventusm', status: 'DELIVERED', upsProduct: 'WW_SAVER_NONDOC',
      recipientCountry: 'JP', recipientState: '40', recipientCity: 'Buzen-shi', recipientName: 'brook shields',
      deliveryMethod: 'DIRECT', packageDims: { l: 60, w: 30, h: 30, kg: 8.63 },
      costs: [
        { cost_type: 'BASE_FREIGHT', amount: 337600 }, { cost_type: 'FUEL_SURCHARGE', amount: 62456 },
        { cost_type: 'SURGE_FEE', amount: 191.97 }, { cost_type: 'OTHER_CHARGE', amount: 30000 },
      ],
      adminToAgencyBreakdown: { baseFreight: 337600, fuelSurcharge: 62456, surgeFee: 191.97, otherCharges: 30000 },
    },
    {
      orderNo: 'ZEN-2026-000002', shipperKey: 'aventusm', status: 'DELIVERED', upsProduct: 'WW_SAVER_NONDOC',
      recipientCountry: 'US', recipientState: 'FL', recipientCity: 'Apopka', recipientName: 'james bonds',
      deliveryMethod: 'DIRECT', packageDims: { l: 35, w: 20, h: 10, kg: 2.69 },
      costs: [
        { cost_type: 'BASE_FREIGHT', amount: 384800 }, { cost_type: 'FUEL_SURCHARGE', amount: 71188 },
        { cost_type: 'SURGE_FEE', amount: 6397.3884 }, { cost_type: 'OTHER_CHARGE', amount: 30000 },
      ],
      adminToAgencyBreakdown: { baseFreight: 384800, fuelSurcharge: 71188, surgeFee: 6397.3884, otherCharges: 30000 },
    },
    {
      orderNo: 'ZEN-2026-000003', shipperKey: 'aventusm', status: 'DELIVERED', upsProduct: 'WW_SAVER_DOC',
      recipientCountry: 'AU', recipientState: 'NSW', recipientCity: 'Adamstown Heights', recipientName: 'bon jovi',
      deliveryMethod: 'PICKUP', packageDims: { l: 20, w: 15, h: 5, kg: 0.5 },
      costs: [
        { cost_type: 'BASE_FREIGHT', amount: 122100 }, { cost_type: 'FUEL_SURCHARGE', amount: 22588.5 },
        { cost_type: 'SURGE_FEE', amount: 0.2577 }, { cost_type: 'OTHER_CHARGE', amount: 30000 },
      ],
      adminToAgencyBreakdown: { baseFreight: 122100, fuelSurcharge: 22588.5, surgeFee: 0.2577, otherCharges: 30000 },
    },
    {
      orderNo: 'ZEN-2026-000004', shipperKey: 'global', status: 'IN_TRANSIT', upsProduct: 'WW_SAVER_NONDOC',
      recipientCountry: 'PH', recipientState: 'ALB', recipientCity: 'Abuyog', recipientName: 'james bonds',
      deliveryMethod: 'DIRECT', packageDims: { l: 45, w: 30, h: 20, kg: 6 },
      costs: [
        { cost_type: 'BASE_FREIGHT', amount: 166500 }, { cost_type: 'FUEL_SURCHARGE', amount: 41070 },
        { cost_type: 'SURGE_FEE', amount: 0.4716 },
      ],
      adminToAgencyBreakdown: { baseFreight: 222000, fuelSurcharge: 41070, surgeFee: 0.47163, otherCharges: 0 },
    },
    {
      orderNo: 'ZEN-2026-000005', shipperKey: 'global', status: 'IN_TRANSIT', upsProduct: 'WW_SAVER_DOC',
      recipientCountry: 'PH', recipientState: 'ALB', recipientCity: 'Abuyog', recipientName: 'james bonds',
      deliveryMethod: 'DIRECT', packageDims: { l: 20, w: 15, h: 5, kg: 0.5 },
      costs: [
        { cost_type: 'BASE_FREIGHT', amount: 60225 }, { cost_type: 'FUEL_SURCHARGE', amount: 14855.5 },
        { cost_type: 'SURGE_FEE', amount: 0.0806 },
      ],
      adminToAgencyBreakdown: { baseFreight: 80300, fuelSurcharge: 14855.5, surgeFee: 0.08058, otherCharges: 0 },
    },
    {
      orderNo: 'ZEN-2026-000006', shipperKey: 'global', status: 'IN_TRANSIT', upsProduct: 'WW_SAVER_NONDOC',
      recipientCountry: 'PH', recipientState: 'ALB', recipientCity: 'Abuyog', recipientName: 'james bonds',
      deliveryMethod: 'PICKUP', packageDims: { l: 40, w: 30, h: 20, kg: 5 },
      costs: [
        { cost_type: 'BASE_FREIGHT', amount: 208200 }, { cost_type: 'FUEL_SURCHARGE', amount: 51356 },
        { cost_type: 'SURGE_FEE', amount: 0.7418 },
      ],
      adminToAgencyBreakdown: { baseFreight: 277600, fuelSurcharge: 51356, surgeFee: 0.74181, otherCharges: 0 },
    },
    {
      orderNo: 'ZEN-2026-000007', shipperKey: 'aventusm', status: 'IN_TRANSIT', upsProduct: 'WW_SAVER_NONDOC',
      recipientCountry: 'FR', recipientState: '09', recipientCity: 'Paris', recipientName: 'brook shields',
      deliveryMethod: 'DIRECT', packageDims: { l: 50, w: 35, h: 25, kg: 10 },
      costs: [
        { cost_type: 'BASE_FREIGHT', amount: 317205 }, { cost_type: 'FUEL_SURCHARGE', amount: 61771.5 },
        { cost_type: 'SURGE_FEE', amount: 23903.346 },
      ],
      adminToAgencyBreakdown: { baseFreight: 333900, fuelSurcharge: 61771.5, surgeFee: 23903.346, otherCharges: 0 },
    },
  ];

  // createOrder()가 실제로 org 등록정보를 오더에 스냅샷 저장하는 shipper_contact_*/shipper_* 필드 —
  // 화주 계정별 실제 등록정보(위 aventusmOrg.update()/기존 base seed 3-1의 Global Shipper Corp 등록정보와 동일)
  const shipperSnapshots = {
    global: {
      contactName: 'JSJung Shipper Test', contactPhone: '010-1234-5678', contactEmail: 'jungjs72@gmail.com',
      address: '경기 김포시 하성면 마곡로 19', addressDetail: 'samsung electric', countryCode: 'KR',
      stateProvince: '41', city: 'Gimpo-si', zipcode: '10012', bizNo: '123-45-67890',
    },
    aventusm: {
      contactName: 'Jongseok Jeong', contactPhone: '010-4282-4027', contactEmail: 'jungjs@aventusm.com',
      address: '서울 성북구 동소문로 290-1', addressDetail: 'bio venture tower 203', countryCode: 'KR',
      stateProvince: '11', city: 'Seongbuk-gu', zipcode: '02734', bizNo: '215-46-56633',
    },
  } as const;

  for (const fx of orderFixtures) {
    const shipperOrgIdForOrder = fx.shipperKey === 'global' ? shipperOrgId : aventusmOrg.id;
    const snap = shipperSnapshots[fx.shipperKey];

    const { data: existingOrder } = await supabase
      .from('zen_orders')
      .select('id')
      .eq('order_no', fx.orderNo)
      .maybeSingle();

    let orderId: string;
    if (existingOrder) {
      console.log(`  - Order exists: ${fx.orderNo}`);
      orderId = existingOrder.id;
    } else {
      const { data: inserted, error } = await supabase
        .from('zen_orders')
        .insert({
          order_no: fx.orderNo,
          shipper_id: shipperOrgIdForOrder,
          agency_org_id: agencyOrg.id,
          status: fx.status,
          transport_mode: 'UPS',
          ups_product_code: fx.upsProduct,
          incoterms: 'DDP',
          delivery_method: fx.deliveryMethod,
          recipient_name: fx.recipientName,
          recipient_phone: '+8639383020288',
          recipient_address: 'sunshine st. 889-89',
          recipient_zipcode: '02750',
          recipient_country_code: fx.recipientCountry,
          recipient_state_province: fx.recipientState,
          recipient_city: fx.recipientCity,
          pickup_contact_name: fx.deliveryMethod === 'PICKUP' ? '정종석' : null,
          pickup_contact_tel: fx.deliveryMethod === 'PICKUP' ? '01042824027' : null,
          billing_status: 'INVOICED',
          shipper_contact_name: snap.contactName,
          shipper_contact_phone: snap.contactPhone,
          shipper_contact_email: snap.contactEmail,
          shipper_address: snap.address,
          shipper_address_detail: snap.addressDetail,
          shipper_country_code: snap.countryCode,
          shipper_state_province: snap.stateProvince,
          shipper_city: snap.city,
          shipper_zipcode: snap.zipcode,
          shipper_biz_no: snap.bizNo,
          pickup_country_code: snap.countryCode,
          cargo_details: { description: 'DEF-B-026~030 seed fixture — daily-billing/청구서 조회 다단계 인보이스 검증용' },
        })
        .select('id')
        .single();

      if (error) {
        console.error(`  - Failed: ${fx.orderNo}`, error.message);
        continue;
      }
      orderId = inserted.id;
      console.log(`  - Created: ${fx.orderNo}`);
    }

    const { data: existingPkg } = await supabase
      .from('zen_order_packages')
      .select('id')
      .eq('order_id', orderId)
      .limit(1);
    if (!existingPkg || existingPkg.length === 0) {
      await supabase.from('zen_order_packages').insert({
        order_id: orderId,
        packing_unit: 'BOX',
        packing_count: 1,
        gross_weight: fx.packageDims.kg,
        length: fx.packageDims.l,
        width: fx.packageDims.w,
        height: fx.packageDims.h,
        content_type: fx.upsProduct.endsWith('_DOC') ? 'DOC' : 'NONDOC',
      });
    }

    // 비용 항목은 인보이스 존재 여부와 무관하게 독립적으로 확인 — 인보이스 insert 성공 후 비용 insert가
    // 별도 이유로 실패해도(예: generated column 오insert) 재실행 시 인보이스만 있고 비용이 없는 상태로
    // 영구히 막히지 않도록 함(최초 구현 시 이 커플링으로 인해 실제로 발생했던 문제, 2026-07-28)
    const { data: existingCosts } = await supabase.from('zen_order_costs').select('id').eq('order_id', orderId).limit(1);
    if (!existingCosts || existingCosts.length === 0) {
      for (const c of fx.costs) {
        // 주의: total_amount는 generated column(unit_price*quantity) — insert에 넣으면 428C9 에러
        const { error: costErr } = await supabase.from('zen_order_costs').insert({
          order_id: orderId, cost_type: c.cost_type, unit_price: c.amount, quantity: 1,
          currency: 'KRW', is_revenue: true,
        });
        if (costErr) console.error(`  - Failed cost(${c.cost_type}) for ${fx.orderNo}:`, costErr.message);
      }
    }

    const agencyToShipperTotal = fx.costs.reduce((sum, c) => sum + c.amount, 0);
    const agencyInvoiceNo = `INV-SEED-${fx.orderNo.slice(-6)}-A2S`;
    const { data: existingA2S } = await supabase
      .from('zen_invoices')
      .select('id')
      .eq('invoice_no', agencyInvoiceNo)
      .maybeSingle();
    if (!existingA2S) {
      const { error: invErr } = await supabase.from('zen_invoices').insert({
        invoice_no: agencyInvoiceNo,
        shipper_id: shipperOrgIdForOrder,
        billed_org_id: shipperOrgIdForOrder,
        invoice_tier: 'AGENCY_TO_SHIPPER',
        total_amount: agencyToShipperTotal,
        currency: 'KRW',
        applied_exchange_rate: 1350,
        status: 'UNPAID',
        due_date: new Date(new Date().setDate(new Date().getDate() + 14)).toISOString().slice(0, 10),
        metadata: { order_no: fx.orderNo, source_order_id: orderId },
      });
      if (invErr) console.error(`  - Failed A2S invoice for ${fx.orderNo}:`, invErr.message);
    }

    const b = fx.adminToAgencyBreakdown;
    const adminToAgencyTotal = b.baseFreight + b.fuelSurcharge + b.surgeFee + b.otherCharges;
    const agencyCostInvoiceNo = `INV-SEED-${fx.orderNo.slice(-6)}-AD2A`;
    const { data: existingAd2A } = await supabase
      .from('zen_invoices')
      .select('id')
      .eq('invoice_no', agencyCostInvoiceNo)
      .maybeSingle();
    if (!existingAd2A) {
      const { error: invErr2 } = await supabase.from('zen_invoices').insert({
        invoice_no: agencyCostInvoiceNo,
        shipper_id: shipperOrgIdForOrder,
        billed_org_id: agencyOrg.id,
        invoice_tier: 'ADMIN_TO_AGENCY',
        total_amount: adminToAgencyTotal,
        currency: 'KRW',
        applied_exchange_rate: 1350,
        status: 'UNPAID',
        due_date: new Date(new Date().setDate(new Date().getDate() + 14)).toISOString().slice(0, 10),
        metadata: { order_no: fx.orderNo, source_order_id: orderId, platform_breakdown: b },
      });
      if (invErr2) console.error(`  - Failed ADMIN_TO_AGENCY invoice for ${fx.orderNo}:`, invErr2.message);
    }
  }

  console.log(`  - Seeded ${orderFixtures.length} UPS orders with dual-tier invoices (AGENCY_TO_SHIPPER + ADMIN_TO_AGENCY)`);
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
      await supabase.from('zen_order_items').delete().eq('order_id', order.id);
      await supabase.from('zen_order_packages').delete().eq('order_id', order.id);
      await supabase.from('zen_orders').delete().eq('id', order.id);
    }

    const { data: existing } = await supabase
      .from('zen_orders')
      .select('id')
      .eq('order_no', order.order_no)
      .maybeSingle();

    let orderId: string;

    if (existing) {
      console.log(`  - Order exists: ${order.order_no}`);
      orderId = existing.id;
      
      // Update existing orders to ensure they have correct ports/transport_mode set
      const { error: updateError } = await supabase
        .from('zen_orders')
        .update({
          origin_port_id: order.origin_port_id,
          dest_port_id: order.dest_port_id,
          transport_mode: order.transport_mode,
          order_type: order.order_type || 'B2B',
          cargo_details: { description: 'E2E test cargo' }
        })
        .eq('id', orderId);

      if (updateError) {
        console.error(`  - Failed to update order ports/mode: ${updateError.message}`);
      } else {
        console.log(`  - Updated ports/mode for existing order: ${order.order_no}`);
      }

      if (order.order_no === 'Z-HOU-E2E03-01') {
        const { data: configExists } = await supabase
          .from('zen_tracking_configs')
          .select('id')
          .eq('order_id', orderId)
          .maybeSingle();
        if (!configExists) {
          console.log(`  - Seeding tracking config for existing order Z-HOU-E2E03-01...`);
          await supabase.from('zen_tracking_configs').insert({
            order_id: orderId,
            provider_type: 'API',
            tracking_no: 'TRK-E2E04-API-01',
            is_active: true
          });
        }
      }
    } else {
      const { data: insertedOrder, error } = await supabase
        .from('zen_orders')
        .insert({
          ...order,
          shipper_id: shipperOrgId,
          cargo_details: { description: 'E2E test cargo' },
        })
        .select('id')
        .single();

      if (error) {
        console.error(`  - Failed: ${order.order_no}`, error.message);
        continue;
      }
      orderId = insertedOrder.id;
      console.log(`  - Created: ${order.order_no} [${order.status}]`);

      if (order.order_no === 'Z-HOU-E2E03-01') {
        console.log(`  - Seeding tracking config for new order Z-HOU-E2E03-01...`);
        await supabase.from('zen_tracking_configs').insert({
          order_id: orderId,
          provider_type: 'API',
          tracking_no: 'TRK-E2E04-API-01',
          is_active: true
        });
      }
    }

    // 패키지/품목 시드: 상세 화면 Total Weight/Volume/Package Details 표시 검증용
    const { data: existingPkg } = await supabase
      .from('zen_order_packages')
      .select('id')
      .eq('order_id', orderId)
      .limit(1);
    if (!existingPkg || existingPkg.length === 0) {
      const { data: newPkg } = await supabase
        .from('zen_order_packages')
        .insert({
          order_id: orderId,
          packing_unit: 'BOX',
          packing_count: 2,
          length: 40,
          width: 30,
          height: 20,
          gross_weight: 5.0,
        })
        .select('id')
        .single();
      if (newPkg) {
        await supabase.from('zen_order_items').insert([
          { order_id: orderId, package_id: newPkg.id, item_name: 'Sample Widget A', quantity: 10, unit_price: 15.50, currency: 'USD', hs_code: '8471.30' },
          { order_id: orderId, package_id: newPkg.id, item_name: 'Sample Widget B', quantity: 5, unit_price: 22.00, currency: 'USD', hs_code: '8471.60' },
        ]);
        console.log(`  - Seeded package + 2 items for order: ${order.order_no}`);
      }
    }

    // QnA 시드: Customer Support 탭 문의 내역 표시 검증용
    const { data: existingQna } = await supabase
      .from('zen_qna')
      .select('id')
      .eq('order_id', orderId)
      .limit(1);
    if (!existingQna || existingQna.length === 0) {
      // seed-local.ts가 service_role key로 실행되므로 auth.uid()가 없음 → shipper 프로필 ID를 created_by로 사용
      const { data: shipperProfile } = await supabase
        .from('zen_profiles')
        .select('id')
        .eq('email', 'uat02_corp_shipper@zenith.kr')
        .single();
      const { error: qnaErr } = await supabase.from('zen_qna').insert({
        order_id: orderId,
        org_id: shipperOrgId,
        created_by: shipperProfile?.id || '00000000-0000-0000-0000-000000000000',
        title: `${order.order_no} 배송 일정 문의`,
        content: `${order.order_no} 건의 현재 배송 상태와 예상 도착 일정을 확인 요청드립니다.`,
        status: 'PENDING',
      });
      if (qnaErr) {
        console.error(`  - QnA seed FAILED for ${order.order_no}: ${qnaErr.message}`);
      } else {
        console.log(`  - Seeded QnA for order: ${order.order_no}`);
      }
    }
  }
}

async function seedRouteNetwork(supabase: any, carrierOrgId: string) {
  console.log('\nSeeding Route Network...');

  // Find or create a carrier in zen_carriers
  let { data: carriers } = await supabase
    .from('zen_carriers')
    .select('id, code')
    .limit(1);

  let carrierId: string;
  if (carriers && carriers.length > 0) {
    carrierId = carriers[0].id;
  } else {
    const { data: newCarrier, error: carrierErr } = await supabase
      .from('zen_carriers')
      .insert({ id: carrierOrgId, code: 'SEED_CARRIER', name: 'Fast Carrier Ltd', transport_mode: 'AIR' })
      .select('id')
      .single();
    if (carrierErr || !newCarrier) {
      console.error('  - Failed to create carrier:', carrierErr?.message);
      return;
    }
    carrierId = newCarrier.id;
  }

  const routes = [
    { from_port_id: 'ICN', to_port_id: 'LAX', transport_mode: 'AIR', transit_days: 10 },
    { from_port_id: 'ICN', to_port_id: 'LAX', transport_mode: 'SEA', transit_days: 12 },
    { from_port_id: 'ICN', to_port_id: 'SIN', transport_mode: 'AIR', transit_days: 1 },
    { from_port_id: 'ICN', to_port_id: 'SIN', transport_mode: 'SEA', transit_days: 7 },
    { from_port_id: 'ICN', to_port_id: 'SIN', transport_mode: 'LAND', transit_days: 5 },
    { from_port_id: 'ICN', to_port_id: 'JFK', transport_mode: 'AIR', transit_days: 12 },
    { from_port_id: 'ICN', to_port_id: 'JFK', transport_mode: 'SEA', transit_days: 18 },
    { from_port_id: 'PVG', to_port_id: 'ICN', transport_mode: 'AIR', transit_days: 2 },
    { from_port_id: 'PVG', to_port_id: 'ICN', transport_mode: 'SEA', transit_days: 5 },
  ];

  let created = 0;
  for (const r of routes) {
    const { error: insertError } = await supabase
      .from('zen_route_network')
      .insert({ carrier_id: carrierId, ...r, is_active: true })
      .select('id');
    if (insertError && !insertError.message?.includes('duplicate key')) {
      console.error(`  - Failed to insert route ${r.from_port_id}->${r.to_port_id} ${r.transport_mode}:`, insertError.message);
    } else if (!insertError) {
      created++;
    }
  }
  console.log(`  - Route network: ${created} new, ${routes.length - created} already existed`);
}

async function seedVesselSchedules(supabase: any, _carrierOrgId: string) {
  console.log('\nSeeding Vessel Schedules (DEF-043)...');

  const { data: routeNetwork } = await supabase
    .from('zen_route_network')
    .select('carrier_id, from_port_id, to_port_id, transport_mode');

  if (!routeNetwork || routeNetwork.length === 0) {
    console.warn('  - No route network found, skipping vessel schedules');
    return;
  }

  const allPortCodes = [...new Set(routeNetwork.flatMap((r: any) => [r.from_port_id, r.to_port_id]))];
  const { data: ports } = await supabase
    .from('zen_ports')
    .select('id, code')
    .in('code', allPortCodes);

  const portCodeToUuid = Object.fromEntries((ports || []).map((p: any) => [p.code, p.id]));

  const now = new Date();
  let created = 0;
  let skipped = 0;
  const seen = new Set<string>();

  for (const route of routeNetwork) {
    // LAND/EXP(UPS 특송)는 vessel schedule(선박/항공편 스케줄) 개념 자체가 없음
    if (route.transport_mode === 'LAND' || route.transport_mode === 'EXP') continue;

    const key = `${route.carrier_id}:${route.from_port_id}:${route.to_port_id}:${route.transport_mode}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const originUuid = portCodeToUuid[route.from_port_id];
    const destUuid = portCodeToUuid[route.to_port_id];
    if (!originUuid || !destUuid) {
      console.warn(`  - Unknown port: ${route.from_port_id}->${route.to_port_id}, skipping`);
      continue;
    }

    const { data: existing } = await supabase
      .from('zen_vessel_schedules')
      .select('id')
      .eq('carrier_id', route.carrier_id)
      .eq('origin_port_id', originUuid)
      .eq('destination_port_id', destUuid)
      .eq('service_type', route.transport_mode)
      .gte('etd', now.toISOString())
      .limit(1);

    if (existing && existing.length > 0) {
      skipped++;
      continue;
    }

    const etd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const eta = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const voyageNo = `VN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const { error: insertError } = await supabase
      .from('zen_vessel_schedules')
      .insert({
        carrier_id: route.carrier_id,
        service_type: route.transport_mode,
        origin_port_id: originUuid,
        destination_port_id: destUuid,
        vessel_name: `Vessel ${route.transport_mode} ${route.from_port_id}-${route.to_port_id}`,
        voyage_no: voyageNo,
        etd,
        eta,
        status: 'SCHEDULED',
      });

    if (insertError) {
      console.error(`  - Failed: ${route.from_port_id}->${route.to_port_id} ${route.transport_mode}: ${insertError.message}`);
    } else {
      created++;
    }
  }

  console.log(`  - Vessel schedules: ${created} created, ${skipped} already existed`);
}

async function seedRateCards(supabase: any, carrierOrgId: string) {
  console.log('\nSeeding Rate Cards...');
  
  // Find or create carrier in zen_carriers (mirrors seedRouteNetwork logic)
  let { data: carriers } = await supabase
    .from('zen_carriers')
    .select('id, code')
    .limit(1);

  let carrierId: string;
  if (carriers && carriers.length > 0) {
    carrierId = carriers[0].id;
  } else {
    const { data: newCarrier, error: carrierErr } = await supabase
      .from('zen_carriers')
      .insert({ id: carrierOrgId, code: 'SEED_CARRIER', name: 'Fast Carrier Ltd', transport_mode: 'AIR' })
      .select('id')
      .single();
    if (carrierErr || !newCarrier) {
      console.error('  - Failed to create carrier:', carrierErr?.message);
      return;
    }
    carrierId = newCarrier.id;
  }
  
  // Look up port UUIDs by code
  const { data: ports } = await supabase
    .from('zen_ports')
    .select('id, code')
    .in('code', ['ICN', 'LAX', 'JFK', 'SIN', 'PVG']);
  const portMap = Object.fromEntries((ports || []).map((p: any) => [p.code, p.id]));

  const rateCardDefs = [
    { from: 'ICN', to: 'LAX', mode: 'AIR', cost: 8.50, margin: 15.0, tiers: [
      { weight_min: 0, unit_price: 9.50, min_total_price: 5 },
      { weight_min: 100, unit_price: 8.00, min_total_price: 4 },
      { weight_min: 1000, unit_price: 5.50, min_total_price: 3 },
    ]},
    { from: 'ICN', to: 'LAX', mode: 'SEA', cost: 3.20, margin: 15.0, tiers: [
      { weight_min: 0, unit_price: 4.00, min_total_price: 2 },
      { weight_min: 5000, unit_price: 2.80, min_total_price: 1.5 },
    ]},
    { from: 'ICN', to: 'JFK', mode: 'AIR', cost: 10.00, margin: 15.0, tiers: [
      { weight_min: 0, unit_price: 12.00, min_total_price: 50 },
      { weight_min: 100, unit_price: 10.50, min_total_price: 50 },
      { weight_min: 500, unit_price: 9.00, min_total_price: 50 },
    ]},
    { from: 'ICN', to: 'JFK', mode: 'SEA', cost: 4.50, margin: 15.0, tiers: [
      { weight_min: 0, unit_price: 5.50, min_total_price: 30 },
      { weight_min: 1000, unit_price: 4.20, min_total_price: 20 },
    ]},
    { from: 'ICN', to: 'SIN', mode: 'AIR', cost: 6.00, margin: 12.0, tiers: [
      { weight_min: 0, unit_price: 7.50, min_total_price: 4 },
      { weight_min: 200, unit_price: 6.00, min_total_price: 3 },
    ]},
    { from: 'PVG', to: 'ICN', mode: 'AIR', cost: 4.00, margin: 12.0, tiers: [
      { weight_min: 0, unit_price: 5.00, min_total_price: 3 },
      { weight_min: 300, unit_price: 4.00, min_total_price: 2 },
    ]},
  ];

  const now = new Date().toISOString();
  const validUntil = '2999-12-31T23:59:59Z';
  let created = 0;
  let skipped = 0;

  for (const def of rateCardDefs) {
    const originPortId = portMap[def.from];
    const destPortId = portMap[def.to];

    if (!originPortId || !destPortId) {
      console.warn(`  - Unknown port: ${def.from}->${def.to}, skipping`);
      continue;
    }

    // Check if a rate card already exists for this carrier + route + mode
    const { data: existing } = await supabase
      .from('zen_rate_cards')
      .select('id')
      .eq('carrier_id', carrierId)
      .eq('transport_mode', def.mode)
      .eq('origin_port_id', originPortId)
      .eq('dest_port_id', destPortId)
      .limit(1);

    if (existing && existing.length > 0) {
      skipped++;
      continue;
    }

    const { error: insertError } = await supabase
      .from('zen_rate_cards')
      .insert({
        carrier_id: carrierId,
        transport_mode: def.mode,
        currency: 'USD',
        origin_port_id: originPortId,
        dest_port_id: destPortId,
        carrier_cost: def.cost,
        margin_rate: def.margin,
        platform_fee_rate: 5.0,
        tiers: def.tiers,
        is_active: true,
        valid_from: now,
        valid_until: validUntil,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error(`  - Failed to create rate card ${def.from}->${def.to} ${def.mode}:`, insertError.message);
    } else {
      created++;
    }
  }

  console.log(`  - Rate cards: ${created} created, ${skipped} already existed`);
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

  // 2-1. 레거시 organizations 테이블에 주소/사업자번호 동기화 (getCurrentUserAffiliation 호환)
  for (const [org, orgName, address, bizNo] of [
    [shipperOrg, 'Global Shipper Corp', '1201, 12F, Digital-ro 123, Geumcheon-gu, Seoul, South Korea', '123-45-67890'],
    [carrierOrg, 'Fast Carrier Ltd', '456 Freight Ave, Incheon, South Korea', '987-65-43210'],
    [platformOrg, 'Zenith Logistics', '789 Platform St, Gangnam-gu, Seoul', null],
  ] as const) {
    // zen_organizations에 address 추가 (컬럼 없으면 zen_organizations의 biz_no만 업데이트)
    if (bizNo) {
      await supabase.from('zen_organizations').update({ biz_no: bizNo }).eq('id', org.id);
    }
    // 레거시 organizations 테이블에 주소/사업자번호 저장
    const { data: legacyOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('id', org.id)
      .maybeSingle();
    if (!legacyOrg) {
      await supabase.from('organizations').insert({
        id: org.id,
        org_name_ko: orgName,
        org_name_en: orgName,
        org_type: 'SHIPPER',
        address: address,
        biz_no: bizNo,
        is_active: true,
        type: 'SHIPPER',
      });
    } else {
      await supabase.from('organizations').update({ address, biz_no: bizNo }).eq('id', org.id);
    }
  }

    // 3. 역할별 테스트 계정 생성
    await createUser(supabase, 'manager@zenith.kr', 'Platform Manager', 'MANAGER', platformOrg.id, 'PLATFORM');
    await createUser(supabase, 'operator@zenith.kr', 'Platform Operator', 'OPERATOR', platformOrg.id, 'PLATFORM');
    await createUser(supabase, 'admin@zenith.kr', 'Tenant Admin', 'ADMIN', platformOrg.id, 'PLATFORM');
    await createUser(supabase, 'uat02_corp_shipper@zenith.kr', 'UAT02 Corporate Shipper', 'CORPORATE', shipperOrg.id, 'CUSTOMER');
    await createUser(supabase, 'shipper@zenith.kr', 'Main Shipper', 'CORPORATE', shipperOrg.id, 'CUSTOMER');
    // DEF-B-026~030 검증 과정에서 CORPORATE→AGENCY_SHIPPER로 정정됨(2026-07-28) — createAgencyShipper()가
    // 실제로 신규 화주에게 항상 부여하는 role과 일치시켜 정상 등록 시나리오로 유지(seedDailyBillingMultiTierFixtures 참조)
    await createUser(supabase, 'jungjs72@gmail.com', 'JSJung Shipper Test', 'AGENCY_SHIPPER', shipperOrg.id, 'CUSTOMER');
    await createUser(supabase, 'carrier@zenith.kr', 'Main Carrier', 'CARRIER', carrierOrg.id, 'PARTNER');
    await createUser(supabase, 'individual@zenith.kr', 'Individual User', 'INDIVIDUAL', null, 'CUSTOMER');

    // 3-1. Agency/Agency_Shipper 테스트 계정 (UPS 특송 UAT 필수 — 2026-07-19 보완)
    await seedAgencyRelationship(supabase);
    await seedRolePermissions(supabase);

    // 3-2. SNTL 실 Agency 계정 (원가표.xlsx 연동 — 2026-07-19)
    await seedSntlAgency(supabase);

    // 4. E2E 테스트용 오더 시드 데이터 생성
    await seedOrders(supabase, shipperOrg.id);

    // 4-1. TASK-212: AGENCY RLS/입고재계산/DEF-127 검증용 UPS 오더 픽스처
    await seedUpsAgencyOrder(supabase);

    // 4-2. TASK-212: 화주 인보이스 조회 화면 검증용 픽스처
    await seedShipperInvoices(supabase, shipperOrg.id);

    // 4-3. DEF-B-026~030: daily-billing/청구서 조회 다단계 인보이스 검증용 픽스처
    await seedDailyBillingMultiTierFixtures(supabase, shipperOrg.id);

    // 5. 정산 요율 카드 시드 데이터 생성
    await seedRateCards(supabase, carrierOrg.id);

    // 5-1. 경로 네트워크 시드 데이터 생성
    await seedRouteNetwork(supabase, carrierOrg.id);

    // 5-2. DEF-043: 운항 스케줄 시드 데이터 생성
    await seedVesselSchedules(supabase, carrierOrg.id);

    // 6. 시드 데이터 무결성 검증
    await verifySeedData(supabase);

    console.log('\nSeed complete! All test accounts and E2E orders are ready.');
  } catch (err: any) {
    console.error('\nSeed process failed:', err.message);
    process.exit(1);
  }
}

// ──────────────────────────────────────
// 시드 데이터 무결성 검증
// ──────────────────────────────────────
async function verifySeedData(supabase: ReturnType<typeof createClient>) {
  console.log('\nVerifying seed data integrity...');
  let hasError = false;

  const { data: orders } = await supabase
    .from('zen_orders')
    .select(`
      id, order_no, status,
      zen_order_packages (
        id, packing_count, gross_weight, length, width, height,
        zen_order_items (id, item_name, quantity)
      )
    `)
    .in('order_no', [
      'E2E-SEED-001', 'E2E-SEED-002', 'E2E-SEED-003',
      'E2E-SEED-004', 'E2E-SEED-005',
      'Z-FIN-E2E05-01', 'Z-HOU-E2E03-01',
    ]);

  if (!orders) {
    console.error('  FAIL: No seed orders found in DB');
    return false;
  }

  for (const order of orders as any[]) {
    const pkgCount = (order.zen_order_packages || []).length;

    if (pkgCount === 0) {
      console.error(`  FAIL: ${order.order_no} has NO packages`);
      hasError = true;
      continue;
    }

    const pkg = order.zen_order_packages[0];
    const itemCount = (pkg.zen_order_items || []).length;

    if (itemCount === 0) {
      console.error(`  FAIL: ${order.order_no} → package has NO items`);
      hasError = true;
    }

    if (!pkg.gross_weight || pkg.gross_weight <= 0) {
      console.error(`  FAIL: ${order.order_no} → package gross_weight is empty/zero (${pkg.gross_weight})`);
      hasError = true;
    }

    if (!pkg.length || !pkg.width || !pkg.height) {
      console.error(`  FAIL: ${order.order_no} → package dimensions missing (L:${pkg.length} W:${pkg.width} H:${pkg.height})`);
      hasError = true;
    }

    if (!hasError) {
      const totalWt = (pkg.gross_weight || 0) * (pkg.packing_count || 1);
      const vol = ((pkg.length || 0) * (pkg.width || 0) * (pkg.height || 0)) / 1000000 * (pkg.packing_count || 1);
      console.log(`  PASS: ${order.order_no} → ${pkgCount}pkg, ${itemCount}items, ${totalWt}kg, ${vol.toFixed(3)}cbm`);
    }
  }

  // QnA 데이터 검증
  const { data: orderIds } = await supabase
    .from('zen_orders')
    .select('id, order_no')
    .in('order_no', ['E2E-SEED-001', 'E2E-SEED-002', 'E2E-SEED-003', 'E2E-SEED-004', 'E2E-SEED-005']);
  const e2eIdList = (orderIds || []).map((o: any) => o.id);
  const { data: qnas } = await supabase
    .from('zen_qna')
    .select('id, order_id, title')
    .in('order_id', e2eIdList);
  const qnaOrderIds = new Set((qnas || []).map((q: any) => q.order_id));
  for (const o of (orderIds || [])) {
    if (!(qnaOrderIds.has(o.id))) {
      console.error(`  FAIL: ${o.order_no} has NO QnA record`);
      hasError = true;
    }
  }
  if (!hasError) {
    const qnaCount = (qnas || []).length;
    console.log(`  PASS: QnA seeded for all test orders (${qnaCount} total)`);
  }

  if (hasError) {
    console.error('\n  ⚠ Seed data integrity FAILED — fix seed data before UAT');
    process.exit(1);
  }

  console.log('  All seed data integrity checks passed.');
  return true;
}

seed();
