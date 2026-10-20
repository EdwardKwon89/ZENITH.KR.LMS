import { logger } from '@/lib/logger';
import type { EstimateUpsFreightInput, UpsFreightEstimate } from '@/app/actions/ups/freight';

/**
 * TASK-B-339 (Issue #1254 / 결함 ③): UPS 오더 수정 후 운임 스냅샷 갱신.
 *
 * `updateOrder`는 저장 시 패키지·아이템을 전부 삭제 후 재삽입하므로, WAREHOUSED에서 중량·치수·
 * 상품·도착국·인코텀즈가 바뀌어도 스냅샷은 낡은 채 남는다(재계산은 실측 저장 함수에만 있음).
 * `zen_order_rate_snapshots`에는 `unique_order_snapshot(order_id)` 유일 인덱스가 있어 insert만 하면
 * 실패하므로 반드시 update-or-insert를 사용한다.
 *
 * 계약:
 * - 관리자가 수동 확정한 스냅샷(`is_manual=true`)은 덮어쓰지 않고 warn 후 건너뛴다.
 * - 계산에 필요한 값이 없으면(상품 없음·중량 0·국가 없음) warn(사유 포함) 후 스냅샷을 건드리지 않는다.
 * - 추정 함수(`estimateFn`)가 throw하면 **전파한다** — 호출자(`updateOrder`)가 잡아 기록한다.
 *   이 함수가 잡아 버리면 호출자가 실패를 인지하지 못하므로 잡지 않는다.
 */

interface QueryResult<T> {
  data: T | null;
  error: { message: string } | null;
}

interface RateSnapshotRow {
  order_id?: string;
  applied_unit_price: number;
  applied_currency: string;
  applied_rule: string;
  metadata: Record<string, unknown>;
  is_manual?: boolean;
}

interface RefreshUpsRateSnapshotParams {
  supabase: any;
  orderId: string;
  estimateFn: (args: EstimateUpsFreightInput) => Promise<UpsFreightEstimate>;
}

export async function refreshUpsRateSnapshot({
  supabase,
  orderId,
  estimateFn,
}: RefreshUpsRateSnapshotParams): Promise<void> {
  const { data: order, error: orderError } = (await supabase
    .from('zen_orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle()) as QueryResult<any>;

  if (orderError || !order) {
    logger.warn(
      `[RATE_SNAPSHOT_REFRESH] 오더 조회 실패로 스냅샷 갱신 생략: orderId=${orderId}, error=${orderError?.message ?? 'not found'}`
    );
    return;
  }

  const { data: packages, error: pkgError } = (await supabase
    .from('zen_order_packages')
    .select('length, width, height, gross_weight')
    .eq('order_id', orderId)) as QueryResult<any[]>;

  if (pkgError) {
    logger.warn(
      `[RATE_SNAPSHOT_REFRESH] 패키지 조회 실패로 스냅샷 갱신 생략: orderId=${orderId}, error=${pkgError.message}`
    );
    return;
  }

  const packageRows = packages ?? [];
  const totalWeight = packageRows.reduce(
    (sum: number, pkg: any) => sum + (Number(pkg?.gross_weight) || 0),
    0
  );
  if (!(totalWeight > 0)) {
    logger.warn(
      `[RATE_SNAPSHOT_REFRESH] 중량 0으로 스냅샷 갱신 생략: orderId=${orderId}, totalWeight=${totalWeight}`
    );
    return;
  }

  if (!order.ups_product_code) {
    logger.warn(`[RATE_SNAPSHOT_REFRESH] ups_product_code 없음으로 스냅샷 갱신 생략: orderId=${orderId}`);
    return;
  }

  const { data: product, error: productError } = (await supabase
    .from('zen_ups_products')
    .select('id')
    .eq('product_code', order.ups_product_code)
    .maybeSingle()) as QueryResult<{ id: string } | null>;

  if (productError || !product) {
    logger.warn(
      `[RATE_SNAPSHOT_REFRESH] UPS 상품 코드 미존재·조회 실패로 스냅샷 갱신 생략: orderId=${orderId}, product_code=${order.ups_product_code}, error=${productError?.message ?? 'not found'}`
    );
    return;
  }

  let destCountryCode: string | null = order.recipient_country_code ?? null;
  if (!destCountryCode && order.dest_port_id) {
    const { data: port } = (await supabase
      .from('zen_ports')
      .select('country_code')
      .eq('id', order.dest_port_id)
      .maybeSingle()) as QueryResult<{ country_code: string | null } | null>;
    destCountryCode = port?.country_code ?? null;
  }
  if (!destCountryCode) {
    logger.warn(
      `[RATE_SNAPSHOT_REFRESH] 목적지 국가 없음으로 스냅샷 갱신 생략: orderId=${orderId}, recipient_country_code=${order.recipient_country_code ?? 'null'}, dest_port_id=${order.dest_port_id ?? 'null'}`
    );
    return;
  }

  // 추정 함수 throw는 전파한다 — 호출자(updateOrder)가 잡아 logger.error로 기록한다.
  const estimate = await estimateFn({
    productId: product.id,
    destCountryCode,
    actualWeightKg: totalWeight,
    dimL: packageRows[0]?.length,
    dimW: packageRows[0]?.width,
    dimH: packageRows[0]?.height,
    incoterms: order.incoterms,
    agencyOrgId: order.agency_org_id ?? undefined,
    shipperOrgId: order.shipper_id,
    destStateProvince: order.recipient_state_province ?? undefined,
  });

  const { data: existingSnapshot, error: snapReadError } = (await supabase
    .from('zen_order_rate_snapshots')
    .select('id, is_manual')
    .eq('order_id', orderId)
    .maybeSingle()) as QueryResult<{ id: string; is_manual: boolean | null } | null>;

  if (snapReadError) {
    logger.warn(
      `[RATE_SNAPSHOT_REFRESH] 기존 스냅샷 조회 실패로 갱신 생략: orderId=${orderId}, error=${snapReadError.message}`
    );
    return;
  }

  if (existingSnapshot?.is_manual) {
    logger.warn(
      `[RATE_SNAPSHOT_REFRESH] 관리자 수동 확정(is_manual) 스냅샷 유지 — 자동 갱신 생략: orderId=${orderId}`
    );
    return;
  }

  const snapshotRow: RateSnapshotRow = {
    applied_unit_price: estimate.platform.totalSellingPrice,
    applied_currency: estimate.platform.currency ?? 'USD',
    applied_rule: 'UPS_3TIER',
    metadata: estimate as unknown as Record<string, unknown>,
  };

  if (existingSnapshot?.id) {
    const { error: updateError } = await supabase
      .from('zen_order_rate_snapshots')
      .update(snapshotRow)
      .eq('order_id', orderId);
    if (updateError) {
      throw new Error(`운임 스냅샷 갱신 실패: ${updateError.message}`);
    }
    return;
  }

  const { error: insertError } = await supabase
    .from('zen_order_rate_snapshots')
    .insert({ order_id: orderId, ...snapshotRow });
  if (insertError) {
    throw new Error(`운임 스냅샷 삽입 실패: ${insertError.message}`);
  }
}
