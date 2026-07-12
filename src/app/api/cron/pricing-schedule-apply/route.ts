import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { logger } from '@/lib/logger';

/**
 * UPS 요금 스케줄링 배치 — 매일 자정 실행
 * POST /api/cron/pricing-schedule-apply
 *
 * Vercel Cron 인증: x-vercel-cron 헤더 검증
 * 수동 트리거: x-api-key 헤더로 CRON_SECRET 대체 가능
 */
export async function POST(req: Request) {
  // Vercel Cron 인증 검증
  const authHeader = req.headers.get('authorization');
  const cronHeader = req.headers.get('x-vercel-cron');
  const apiKey = req.headers.get('x-api-key');

  if (cronHeader !== '1' && apiKey !== process.env.CRON_SECRET) {
    logger.warn('[pricing-schedule-cron] Unauthorized access attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createAdminClient();
    const today = new Date().toISOString().split('T')[0];
    const results = { applied: 0, expired: 0, errors: [] as string[] };

    // ─── 1. 적용 (valid_from <= 오늘 AND status='SCHEDULED') ───
    const { data: toApply, error: applyQueryError } = await supabase
      .from('zen_ups_pricing_schedule')
      .select('*')
      .eq('status', 'SCHEDULED')
      .lte('valid_from', today);

    if (applyQueryError) {
      logger.error('[pricing-schedule-cron] Apply query error:', applyQueryError);
      return NextResponse.json({ error: applyQueryError.message }, { status: 500 });
    }

    for (const schedule of toApply || []) {
      try {
        await applySchedule(supabase, schedule);
        results.applied++;
      } catch (err: any) {
        results.errors.push(`Apply ${schedule.id}: ${err.message}`);
        logger.error(`[pricing-schedule-cron] Apply failed for ${schedule.id}:`, err);
      }
    }

    // ─── 2. 만료 (valid_until < 오늘 AND 후속 예약 없음) ───
    const { data: toExpire, error: expireQueryError } = await supabase
      .from('zen_ups_pricing_schedule')
      .select('*')
      .eq('status', 'APPLIED')
      .not('valid_until', 'is', null)
      .lt('valid_until', today);

    if (expireQueryError) {
      logger.error('[pricing-schedule-cron] Expire query error:', expireQueryError);
    }

    for (const schedule of toExpire || []) {
      try {
        await expireSchedule(supabase, schedule);
        results.expired++;
      } catch (err: any) {
        results.errors.push(`Expire ${schedule.id}: ${err.message}`);
        logger.error(`[pricing-schedule-cron] Expire failed for ${schedule.id}:`, err);
      }
    }

    logger.info(`[pricing-schedule-cron] Batch complete:`, results);
    return NextResponse.json({ success: true, ...results });
  } catch (err: any) {
    logger.error('[pricing-schedule-cron] Fatal error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function applySchedule(supabase: any, schedule: any) {
  const { setting_type, target_ref, new_value, id } = schedule;

  // 기존 설정값 조회 (old_data용)
  let oldData: any = null;

  if (setting_type === 'AGENCY_DISCOUNT') {
    const { data: existing } = await supabase
      .from('zen_agency_pricing_policies')
      .select('discount_rate')
      .eq('agency_org_id', target_ref.agency_org_id)
      .eq('zone_id', target_ref.zone_id)
      .single();
    oldData = existing ? { discount_rate: existing.discount_rate } : null;

    const { error } = await supabase
      .from('zen_agency_pricing_policies')
      .upsert({
        agency_org_id: target_ref.agency_org_id,
        zone_id: target_ref.zone_id,
        discount_rate: new_value,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'agency_org_id,zone_id' });
    if (error) throw new Error(error.message);

  } else if (setting_type === 'SHIPPER_DISCOUNT') {
    const { data: existing } = await supabase
      .from('zen_agency_shipper_zone_discounts')
      .select('discount_rate')
      .eq('agency_org_id', target_ref.agency_org_id)
      .eq('shipper_org_id', target_ref.shipper_org_id)
      .eq('zone_id', target_ref.zone_id)
      .single();
    oldData = existing ? { discount_rate: existing.discount_rate } : null;

    const { error } = await supabase
      .from('zen_agency_shipper_zone_discounts')
      .upsert({
        agency_org_id: target_ref.agency_org_id,
        shipper_org_id: target_ref.shipper_org_id,
        zone_id: target_ref.zone_id,
        discount_rate: new_value,
        is_active: true,
        created_at: new Date().toISOString(),
      }, { onConflict: 'agency_org_id,shipper_org_id,zone_id' });
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
    changed_by: null, // 배치 시스템
  });
}

async function expireSchedule(supabase: any, schedule: any) {
  const { setting_type, target_ref, id, valid_until } = schedule;

  let oldData: any = null;

  if (setting_type === 'AGENCY_DISCOUNT') {
    const { data: existing } = await supabase
      .from('zen_agency_pricing_policies')
      .select('discount_rate')
      .eq('agency_org_id', target_ref.agency_org_id)
      .eq('zone_id', target_ref.zone_id)
      .single();
    oldData = existing ? { discount_rate: existing.discount_rate } : null;

    await supabase
      .from('zen_agency_pricing_policies')
      .delete()
      .eq('agency_org_id', target_ref.agency_org_id)
      .eq('zone_id', target_ref.zone_id);

  } else if (setting_type === 'SHIPPER_DISCOUNT') {
    const { data: existing } = await supabase
      .from('zen_agency_shipper_zone_discounts')
      .select('discount_rate')
      .eq('agency_org_id', target_ref.agency_org_id)
      .eq('shipper_org_id', target_ref.shipper_org_id)
      .eq('zone_id', target_ref.zone_id)
      .single();
    oldData = existing ? { discount_rate: existing.discount_rate } : null;

    await supabase
      .from('zen_agency_shipper_zone_discounts')
      .delete()
      .eq('agency_org_id', target_ref.agency_org_id)
      .eq('shipper_org_id', target_ref.shipper_org_id)
      .eq('zone_id', target_ref.zone_id);

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

// GET 핸들러 — 상태 확인용
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Pricing schedule cron endpoint is active',
    schedule: '0 0 * * * (daily at midnight UTC)',
  });
}
