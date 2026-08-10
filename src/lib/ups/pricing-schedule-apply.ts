/**
 * UPS 요금 스케줄 적용/만료 공용 로직 (Issue #1021)
 *
 * 기존 `src/app/api/cron/pricing-schedule-apply/route.ts`의 로컬 함수를
 * 로직 변경 없이 이관한 모듈. cron 배치와 서버 액션(`createPricingSchedule`/
 * `updatePricingSchedule`의 즉시 적용)이 함께 재사용해 로직 이원화를 방지한다.
 */

export async function applySchedule(supabase: any, schedule: any) {
  const { setting_type, target_ref, new_value, id } = schedule;

  // 기존 설정값 조회 (old_data용)
  let oldData: any = null;

  // Issue #1018: cargo_type은 target_ref에서 읽음 (없으면 'ALL' 기본값)
  const cargoType = target_ref.cargo_type || 'ALL';

  if (setting_type === 'AGENCY_DISCOUNT') {
    const { data: existing } = await supabase
      .from('zen_agency_pricing_policies')
      .select('discount_rate')
      .eq('agency_org_id', target_ref.agency_org_id)
      .eq('zone_id', target_ref.zone_id)
      .eq('cargo_type', cargoType)
      .single();
    oldData = existing ? { discount_rate: existing.discount_rate } : null;

    const { error } = await supabase
      .from('zen_agency_pricing_policies')
      .upsert({
        agency_org_id: target_ref.agency_org_id,
        zone_id: target_ref.zone_id,
        cargo_type: cargoType,
        discount_rate: new_value,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'agency_org_id,zone_id,cargo_type' });
    if (error) throw new Error(error.message);

  } else if (setting_type === 'SHIPPER_DISCOUNT') {
    const { data: existing } = await supabase
      .from('zen_agency_shipper_zone_discounts')
      .select('discount_rate')
      .eq('agency_org_id', target_ref.agency_org_id)
      .eq('shipper_org_id', target_ref.shipper_org_id)
      .eq('zone_id', target_ref.zone_id)
      .eq('cargo_type', cargoType)
      .single();
    oldData = existing ? { discount_rate: existing.discount_rate } : null;

    const { error } = await supabase
      .from('zen_agency_shipper_zone_discounts')
      .upsert({
        agency_org_id: target_ref.agency_org_id,
        shipper_org_id: target_ref.shipper_org_id,
        zone_id: target_ref.zone_id,
        cargo_type: cargoType,
        discount_rate: new_value,
        is_active: true,
        created_at: new Date().toISOString(),
      }, { onConflict: 'agency_org_id,shipper_org_id,zone_id,cargo_type' });
    if (error) throw new Error(error.message);

  } else if (setting_type === 'VOLUMETRIC_DIVISOR') {
    const { data: existing } = await supabase
      .from('zen_organizations')
      .select('volumetric_divisor')
      .eq('id', target_ref.agency_org_id)
      .single();
    oldData = existing ? { volumetric_divisor: existing.volumetric_divisor } : null;

    const { error } = await supabase
      .from('zen_organizations')
      .update({ volumetric_divisor: new_value })
      .eq('id', target_ref.agency_org_id);
    if (error) throw new Error(error.message);
  }

  // schedule 상태 APPLIED로 전환
  await supabase
    .from('zen_ups_pricing_schedule')
    .update({ status: 'APPLIED' })
    .eq('id', id);

  // audit_log APPLY 기록
  await supabase.from('zen_ups_pricing_setting_audit_log').insert({
    setting_type,
    target_ref,
    action: 'APPLY',
    old_data: oldData,
    new_data: { new_value },
    changed_by: null, // 배치 시스템 (또는 즉시 적용 트리거)
  });
}

export async function expireSchedule(supabase: any, schedule: any) {
  const { setting_type, target_ref, id, valid_until } = schedule;

  // Issue #1018: cargo_type은 target_ref에서 읽음 (없으면 'ALL' 기본값)
  const cargoType = target_ref.cargo_type || 'ALL';

  let oldData: any = null;

  if (setting_type === 'AGENCY_DISCOUNT') {
    const { data: existing } = await supabase
      .from('zen_agency_pricing_policies')
      .select('discount_rate')
      .eq('agency_org_id', target_ref.agency_org_id)
      .eq('zone_id', target_ref.zone_id)
      .eq('cargo_type', cargoType)
      .single();
    oldData = existing ? { discount_rate: existing.discount_rate } : null;

    await supabase
      .from('zen_agency_pricing_policies')
      .delete()
      .eq('agency_org_id', target_ref.agency_org_id)
      .eq('zone_id', target_ref.zone_id)
      .eq('cargo_type', cargoType);

  } else if (setting_type === 'SHIPPER_DISCOUNT') {
    const { data: existing } = await supabase
      .from('zen_agency_shipper_zone_discounts')
      .select('discount_rate')
      .eq('agency_org_id', target_ref.agency_org_id)
      .eq('shipper_org_id', target_ref.shipper_org_id)
      .eq('zone_id', target_ref.zone_id)
      .eq('cargo_type', cargoType)
      .single();
    oldData = existing ? { discount_rate: existing.discount_rate } : null;

    await supabase
      .from('zen_agency_shipper_zone_discounts')
      .delete()
      .eq('agency_org_id', target_ref.agency_org_id)
      .eq('shipper_org_id', target_ref.shipper_org_id)
      .eq('zone_id', target_ref.zone_id)
      .eq('cargo_type', cargoType);

  } else if (setting_type === 'VOLUMETRIC_DIVISOR') {
    const { data: existing } = await supabase
      .from('zen_organizations')
      .select('volumetric_divisor')
      .eq('id', target_ref.agency_org_id)
      .single();
    oldData = existing ? { volumetric_divisor: existing.volumetric_divisor } : null;

    await supabase
      .from('zen_organizations')
      .update({ volumetric_divisor: 5000 })
      .eq('id', target_ref.agency_org_id);
  }

  await supabase
    .from('zen_ups_pricing_schedule')
    .update({ status: 'CANCELLED' })
    .eq('id', id);

  await supabase.from('zen_ups_pricing_setting_audit_log').insert({
    setting_type,
    target_ref,
    action: 'EXPIRE',
    old_data: oldData,
    new_data: setting_type === 'VOLUMETRIC_DIVISOR' ? { volumetric_divisor: 5000 } : null,
    changed_by: null,
  });
}
