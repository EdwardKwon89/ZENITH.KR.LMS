
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

  // Issue #605: SNTL → Sub-Agency 실제 공급가 정책 (docs/80_RawData/20260609 UPS 특송 요금 정보.xlsx 실측)
  // "수출_Express SAVER" 시트 1블록(SNTL 공급가) vs 2블록(UPS 공식 판매가)을 전 Zone·전 중량 대조한 결과:
  //   - 비서류(Non-Document, 21kg 초과 tier 포함): 전 Zone·전 중량 정확히 75.00% 할인(편차 0)
  //   - 서류(Document): 전 Zone 0% 할인(UPS 공식가와 동일가로 공급)
  // zen_agency_pricing_policies는 상품 구분이 없어(Issue #605 논의 중인 gap) 대표값으로 75%(비서류,
  // 물량 비중이 큰 상품 기준)를 등록 — 서류 주문은 이 rate 적용 시 실제(0%)보다 유리하게 계산되는
  // 오차가 있음(역마진 방향 아님, 과대할인 방향).
  const { data: zones } = await supabase.from('zen_ups_zones').select('id');
  for (const zone of zones ?? []) {
    await supabase
      .from('zen_agency_pricing_policies')
      .upsert(
        { agency_org_id: subAgencyOrg.id, zone_id: zone.id, discount_rate: 0.75, is_active: true },
        { onConflict: 'agency_org_id,zone_id' },
      );
  }
  console.log(`  - Registered SNTL->Sub-Agency zone discount policy (75%, ${zones?.length ?? 0} zones)`);
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
    if (route.transport_mode === 'LAND') continue;

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
    await createUser(supabase, 'carrier@zenith.kr', 'Main Carrier', 'CARRIER', carrierOrg.id, 'PARTNER');
    await createUser(supabase, 'individual@zenith.kr', 'Individual User', 'INDIVIDUAL', null, 'CUSTOMER');

    // 3-1. Agency/Agency_Shipper 테스트 계정 (UPS 특송 UAT 필수 — 2026-07-19 보완)
    await seedAgencyRelationship(supabase);

    // 3-2. SNTL 실 Agency 계정 (원가표.xlsx 연동 — 2026-07-19)
    await seedSntlAgency(supabase);

    // 4. E2E 테스트용 오더 시드 데이터 생성
    await seedOrders(supabase, shipperOrg.id);

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
