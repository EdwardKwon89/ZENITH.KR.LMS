# TASK-B-218: 입고처리 화면 — 부피/중량 실측값 별도 저장 버튼 + 예상운임 변경 표시

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#872](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/872) |
| **담당** | Dave (Team B) |
| **생성일** | 2026-07-26 |
| **우선순위** | P2 |
| **상태** | ⬜ |

## 개요

`/ko/warehouse/inbound`(`InboundProcessForm.tsx`)에서 부피/중량 실측 입력을 저장하는 명시적 기능이 없습니다 — 현재는 값을 수정해도 하단 "입고 확정" 버튼을 눌러야만(검수 상태 확정 + WAREHOUSED 전이와 함께) 저장됩니다. jungjs 지시로 **측정값만 별도로 저장하는 버튼을 신설**합니다. 또한 측정값 변경 시 `confirmInbound()`가 내부적으로 UPS 운임을 재계산하지만(`zen_order_rate_snapshots` 갱신 + 화주 이메일) 그 결과가 화면에 전혀 표시되지 않으므로, **재계산된 예상운임을 화면에 표시**합니다.

**Jaison이 설계를 확정했으므로 설계 판단 없이 아래 스펙대로 구현**하면 됩니다.

## 조치안 (Jaison 확정 설계 — 그대로 구현)

### 1. `src/app/actions/operations/orders.ts` — 공용 헬퍼 추출

기존 `confirmInbound()`의 710~880행(패키지 측정값 반영 + UPS 운임 재계산 로직 전체)을 아래 헬퍼 함수로 추출합니다. `confirmInbound()`가 이 헬퍼를 호출하도록 리팩터링하고, 신규 액션 `saveInboundMeasurements()`도 동일 헬퍼를 재사용합니다.

```ts
export interface PackageMeasurementUpdate {
  packageId: string;
  gross_weight?: number;
  length?: number;
  width?: number;
  height?: number;
}

export interface FreightEstimateResult {
  changed: boolean;
  oldFreight?: number;
  newFreight?: number;
  currency?: string;
}

async function applyPackageMeasurements(
  supabase: any,
  profile: { id: string; email?: string | null },
  orderId: string,
  packageUpdates: PackageMeasurementUpdate[],
): Promise<FreightEstimateResult> {
  let weightVolumeChanged = false;
  let oldFreight: number | undefined;
  let newFreight: number | undefined;
  let currency: string | undefined;

  const { data: existingSnapshot } = await supabase
    .from('zen_order_rate_snapshots')
    .select('metadata, applied_unit_price')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const previousSnapshot = existingSnapshot;

  const { data: orderMeta } = await supabase
    .from('zen_orders')
    .select('status, transport_mode, ups_product_code, dest_port_id, recipient_country_code, incoterms, shipper_id, order_no')
    .eq('id', orderId)
    .maybeSingle();

  for (const pkg of packageUpdates) {
    const { data: currentPkg } = await supabase
      .from('zen_order_packages')
      .select('gross_weight, length, width, height')
      .eq('id', pkg.packageId)
      .maybeSingle();

    if (!currentPkg) continue;

    const changed =
      (pkg.gross_weight !== undefined && pkg.gross_weight !== currentPkg.gross_weight) ||
      (pkg.length !== undefined && pkg.length !== currentPkg.length) ||
      (pkg.width !== undefined && pkg.width !== currentPkg.width) ||
      (pkg.height !== undefined && pkg.height !== currentPkg.height);

    if (changed) {
      weightVolumeChanged = true;

      const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
      if (pkg.gross_weight !== undefined) updateData.gross_weight = pkg.gross_weight;
      if (pkg.length !== undefined) updateData.length = pkg.length;
      if (pkg.width !== undefined) updateData.width = pkg.width;
      if (pkg.height !== undefined) updateData.height = pkg.height;

      await supabase.from('zen_order_packages').update(updateData).eq('id', pkg.packageId);

      await supabase.from('order_status_history').insert({
        order_id: orderId,
        new_status: orderMeta?.status ?? null,
        changed_by: profile.id,
        reason: `[입고 측정 변경] ${pkg.packageId.substring(0, 8)}: 중량 ${currentPkg.gross_weight}kg→${pkg.gross_weight ?? currentPkg.gross_weight}kg, 크기 ${currentPkg.length}x${currentPkg.width}x${currentPkg.height}cm→${pkg.length ?? currentPkg.length}x${pkg.width ?? currentPkg.width}x${pkg.height ?? currentPkg.height}cm`,
      });
    }
  }

  if (weightVolumeChanged && orderMeta?.transport_mode === 'UPS' && orderMeta.ups_product_code) {
    try {
      const { data: packages } = await supabase
        .from('zen_order_packages')
        .select('gross_weight, length, width, height')
        .eq('order_id', orderId);

      if (packages && packages.length > 0) {
        const totalWeight = packages.reduce((sum: number, p: any) => sum + (p.gross_weight || 0), 0);

        const { data: product } = await supabase
          .from('zen_ups_products')
          .select('id')
          .eq('product_code', orderMeta.ups_product_code)
          .maybeSingle();

        let destCountryCode = orderMeta.recipient_country_code;
        if (!destCountryCode && orderMeta.dest_port_id) {
          const { data: port } = await supabase
            .from('zen_ports')
            .select('country_code')
            .eq('id', orderMeta.dest_port_id)
            .maybeSingle();
          destCountryCode = port?.country_code;
        }

        if (product && destCountryCode && totalWeight > 0) {
          const newEstimate = await estimateUpsFreightFn({
            productId: product.id,
            destCountryCode,
            actualWeightKg: totalWeight,
            dimL: packages[0]?.length,
            dimW: packages[0]?.width,
            dimH: packages[0]?.height,
            incoterms: orderMeta.incoterms,
            shipperOrgId: orderMeta.shipper_id,
          });

          if (previousSnapshot) {
            await supabase
              .from('zen_order_rate_snapshots')
              .update({
                applied_unit_price: newEstimate.platform.totalSellingPrice,
                metadata: newEstimate as unknown as Record<string, unknown>,
              })
              .eq('order_id', orderId);
          } else {
            await supabase
              .from('zen_order_rate_snapshots')
              .insert({
                order_id: orderId,
                applied_unit_price: newEstimate.platform.totalSellingPrice,
                applied_currency: newEstimate.platform.currency ?? 'USD',
                applied_rule: 'UPS_3TIER',
                metadata: newEstimate as unknown as Record<string, unknown>,
              });
          }

          oldFreight = previousSnapshot?.metadata?.platform?.totalSellingPrice || 0;
          newFreight = newEstimate.platform.totalSellingPrice;
          currency = newEstimate.platform.currency ?? 'USD';

          if (oldFreight !== newFreight) {
            try {
              const { data: shipper } = await supabase
                .from('zen_organizations')
                .select('name')
                .eq('id', orderMeta.shipper_id)
                .maybeSingle();

              if (shipper) {
                await import('@/lib/notifications/email').then(mod =>
                  mod.sendFreightChangeEmail({
                    email: profile.email || '',
                    shipperName: shipper.name || '화주',
                    orderNo: orderMeta.order_no || orderId.substring(0, 8),
                    oldFreight: oldFreight!,
                    newFreight: newFreight!,
                    currency,
                    reason: `입고 시 부피/중량 재측정 (중량: ${totalWeight}kg)`,
                  })
                );
              }
            } catch (emailErr) {
              logger.warn('[INBOUND] Failed to send freight change email:', emailErr);
            }
          }
        }
      }
    } catch (snapErr) {
      logger.error('[INBOUND] Failed to recalculate rate snapshot:', snapErr);
    }
  }

  return { changed: weightVolumeChanged, oldFreight, newFreight, currency };
}
```

### 2. `confirmInbound()` — 헬퍼 재사용하도록 축소

```ts
export async function confirmInbound(
  orderId: string,
  inspectStatus: 'NORMAL' | 'DAMAGED',
  note?: string,
  packageUpdates?: PackageMeasurementUpdate[]
) {
  const { supabase, profile } = await validateUserAction();
  if (!profile) throw new Error("User profile not found");

  const statusLabel = inspectStatus === 'NORMAL' ? '정상' : '손상';
  const formattedReason = `[검수: ${statusLabel}]${note ? ` ${note}` : ''}`;

  let freightEstimate: FreightEstimateResult | undefined;
  if (packageUpdates && packageUpdates.length > 0) {
    freightEstimate = await applyPackageMeasurements(supabase, profile, orderId, packageUpdates);
  }

  const result = await updateOrderStatus(orderId, OrderStatus.WAREHOUSED, formattedReason);
  return { ...result, freightEstimate };
}
```
기존 파라미터 타입(`packageUpdates?: { packageId: string; gross_weight?: number; ... }[]`)을 새 `PackageMeasurementUpdate[]` 타입으로 교체(구조는 동일, 이름만 통일).

### 3. 신규 액션 `saveInboundMeasurements()` — `confirmInbound()` 바로 아래에 추가

```ts
export async function saveInboundMeasurements(
  orderId: string,
  packageUpdates: PackageMeasurementUpdate[]
) {
  const { supabase, profile } = await validateUserAction();
  if (!profile) throw new Error("User profile not found");
  if (!packageUpdates || packageUpdates.length === 0) {
    return { success: false, error: '변경된 측정값이 없습니다.' };
  }

  const freightEstimate = await applyPackageMeasurements(supabase, profile, orderId, packageUpdates);
  revalidatePath("/(dashboard)/warehouse/inbound", "page");
  return { success: true, freightEstimate };
}
```

`src/app/actions/operations/index.ts`에 `saveInboundMeasurements` export 추가.

### 4. `src/components/warehouse/InboundProcessForm.tsx` — 프론트엔드

- import에 `saveInboundMeasurements` 추가
- 신규 state:
  ```ts
  const [savingMeasurements, setSavingMeasurements] = useState(false);
  const [freightEstimate, setFreightEstimate] = useState<{ changed: boolean; oldFreight?: number; newFreight?: number; currency?: string } | null>(null);
  ```
- 기존 `handleConfirmInbound`의 `updates` 구성 로직(99~107행)을 공용 함수 `buildPackageUpdates()`로 추출해 재사용
- 신규 핸들러:
  ```ts
  const handleSaveMeasurements = async () => {
    if (!order) return;
    const updates = buildPackageUpdates();
    if (updates.length === 0) {
      toast.info("변경된 측정값이 없습니다.");
      return;
    }
    setSavingMeasurements(true);
    try {
      const result = await saveInboundMeasurements(order.id, updates);
      if (result.success) {
        toast.success("측정값이 저장되었습니다.");
        setFreightEstimate(result.freightEstimate ?? null);
      } else {
        throw new Error(result.error || "저장 실패");
      }
    } catch (err: any) {
      toast.error(err.message || "측정값 저장 실패");
    } finally {
      setSavingMeasurements(false);
    }
  };
  ```
- "부피/중량 실측 입력" 카드(290행 부근) 안에 "측정값 저장" 버튼 추가(패키지 목록 아래, 기존 카드 내부):
  ```tsx
  <ZenButton
    onClick={handleSaveMeasurements}
    loading={savingMeasurements}
    disabled={savingMeasurements}
    variant="tactile"
    className="w-full mt-2 bg-slate-700 text-white hover:bg-slate-800 rounded-xl"
  >
    측정값 저장
  </ZenButton>
  ```
- 예상운임 변경 표시(같은 카드 내, 버튼 아래):
  ```tsx
  {freightEstimate?.changed && freightEstimate.oldFreight !== freightEstimate.newFreight && (
    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
      예상 운임 변경: {freightEstimate.currency} {freightEstimate.oldFreight?.toLocaleString()} → {freightEstimate.currency} {freightEstimate.newFreight?.toLocaleString()}
    </div>
  )}
  ```
- `handleConfirmInbound()` 성공 시에도 `confirmInbound()`가 반환하는 `freightEstimate`를 동일하게 `setFreightEstimate(...)`로 반영(입고 확정 경로로 측정값을 저장한 경우에도 동일하게 표시).

## 착수 체크리스트

- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 `feature/teamb-218-...` 브랜치 생성 (`./scripts/next-task-number.sh B` 직접 재확인 — 218 나와야 정상)
- [ ] `orders.ts` 헬퍼 추출 + `confirmInbound()` 리팩터링 + `saveInboundMeasurements()` 신규
- [ ] `operations/index.ts`에 신규 액션 export 추가
- [ ] `InboundProcessForm.tsx` 저장 버튼 + 예상운임 표시 UI 추가
- [ ] 회귀 테스트 추가 — **반드시 behavioral 기반**:
  - `saveInboundMeasurements()`가 실제로 `zen_order_packages` update + `zen_order_rate_snapshots` 갱신을 호출하는지(UPS 오더 케이스) mock 검증
  - `confirmInbound()`가 리팩터링 후에도 기존 동작(패키지 갱신+상태전이) 그대로인지 기존 테스트 유지/보강
  - `saveInboundMeasurements()`는 `updateOrderStatus`를 호출하지 않는지(상태 전이 없음) 검증
- [ ] `npm run build` · `npm run test:regression` 직접 실행 후 정확한 결과 기재
- [ ] 실제 UI에서 `/ko/warehouse/inbound` 접속해 UPS 오더 조회 → 측정값 변경 → "측정값 저장" 클릭 → 예상운임 변경 표시 확인 → 스크린샷(R-10)

## 완료 보고 절차 (R-17 준수)

1. 코드 커밋(`[Dave] feat: TASK-B-218 ...`) → 2. task file `[작업 결과]`(**커밋 해시 실제 값 기재 — TBD 금지**) + 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 872 --add-label status:review` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성 (`feature/* → TeamB_Dev`, `Closes #872`)

## 담당자 위반 이력 사전 경고

- Dave: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. 최근 이력: PR#780(채번 절차 누락 계열 — 이미 완료된 번호 재사용 + 회귀 테스트 0건), PR#780 재작업(그림자 컴포넌트 테스트 — 실제 컴포넌트 미경유). 이번 Task는 실제 UI 스크린샷(R-10)과 실제 함수 호출 기반 테스트가 필수입니다.

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음
