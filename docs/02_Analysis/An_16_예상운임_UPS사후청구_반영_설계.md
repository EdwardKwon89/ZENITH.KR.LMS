# An_16: 예상운임 적용 로직 정리 + UPS 사후청구(실제 추가요금) 반영 설계

> **작성자**: Jaison | **작성일**: 2026-07-18 | **요청**: JSJung (상세 스키마/API 설계까지 진행 지시)

## 배경
JSJung 요청: "UPS 오더 등록화면 및 수정화면에서 예상운임 적용 로직 정리가 필요함. UPS는 최종 배송 완료 후 UPS측의 청구서가 발행되며, 이 청구서를 바탕으로 오더별 추가(부가) 운임 추가해야 함. 이전 처리한 바 있으나 어떻게 적용되었는지 알 수 없음."

## 1. 예상운임(estimate) 적용 로직 현황 — 코드로 확인 완료

### 등록 시점 스냅샷 저장
`saveOrderRateSnapshot()`(`src/app/actions/operations/orders.ts:28`)가 `createOrder()` 성공 직후(AGENCY_SHIPPER 역할 + `ups_product_code` 존재 시) `estimateUpsFreight()`(`src/app/actions/ups/freight.ts`)를 호출해 예상운임을 계산하고 `zen_order_rate_snapshots`(order_id, applied_unit_price, applied_currency, applied_rule, metadata)에 저장합니다. `metadata`에 `estimate` 전체(플랫폼가/화주가 breakdown 포함)가 통째로 들어갑니다.

### 정산 시점 — 예상운임을 그대로 청구 비용으로 전환
`SettlementEngine.calculateOrderCosts()`(`src/lib/finance/settlement/settlement.ts:63`)가 `transport_mode === 'UPS'`인 오더에 대해 **`zen_order_rate_snapshots.metadata`(예상운임)에서만** `zen_order_costs`(`BASE_FREIGHT`/`FUEL_SURCHARGE`/`SURGE_FEE`/`OTHER_CHARGE`)를 생성합니다. 기존 미청구 UPS 관련 cost는 삭제 후 재생성(멱등적이지만, 매번 **같은 예상운임 스냅샷**에서 다시 계산 — 실제 청구 정보를 반영할 여지가 코드에 없음).

### 인보이스 생성
`InvoiceGenerator.generateInvoice()`가 `zen_order_costs` 중 미청구분(`invoice_id IS NULL`)을 합산해 `zen_invoices`를 생성합니다. `updateOrderStatus()`가 `RELEASED` 전이 시 이를 자동 트리거합니다.

### 결론 — "이전 처리한 바 있으나 알 수 없다"의 실체
**예상운임 로직 자체는 정상 작동합니다** (등록 시 스냅샷 저장 → 정산 시 그대로 비용화 → 인보이스). 다만 **"UPS 실제 청구서 기반 추가요금 반영" 기능은 코드 전체를 검색해도 존재하지 않습니다** — `actual`, `carrier_invoice`, `billing_adjustment` 등 관련 키워드로 검색해도 매치 없음. 즉 "이전에 처리했다"는 기억은 예상운임 스냅샷 기능(이건 실제로 있음)과 혼동됐을 가능성이 높고, **UPS 사후청구 반영은 신규 기능**입니다.

## 2. 신규 기능 설계 — UPS 사후청구(실제 추가요금) 반영

### 설계 원칙
기존 정산 파이프라인(`zen_order_costs` → `InvoiceGenerator`)을 재사용합니다. 새 병렬 시스템을 만들지 않고, "실제 UPS 청구액과 예상운임의 차액"을 **새로운 `cost_type` 하나**로 기존 파이프라인에 얹는 방식 — blast radius 최소화.

### 2-1. 신규 테이블 `zen_ups_actual_charges` (UPS 실제 청구 원본 — 감사 추적용)
```sql
CREATE TABLE zen_ups_actual_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES zen_orders(id) ON DELETE CASCADE,
  ups_invoice_no text,                    -- UPS 발행 청구서 번호(참고용, 필수 아님)
  charge_type text NOT NULL,              -- 'BASE'/'FUEL'/'RESIDENTIAL'/'ADDRESS_CORRECTION'/'DAS'/'PEAK_SEASON'/'OTHER'
  charge_amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  ups_invoice_date date,
  entered_by uuid REFERENCES zen_profiles(id),
  entered_at timestamptz NOT NULL DEFAULT now(),
  notes text
);
-- RLS: admin/manager 전체 CRUD, shipper/agency는 본인 오더 한정 SELECT만(is_org_member 패턴 재사용)
```
오더 1건에 여러 항목(UPS 실 청구서는 보통 여러 surcharge 라인으로 구성) — 1:N.

### 2-2. `zen_order_costs`에 신규 `cost_type` 추가
`'UPS_ACTUAL_ADJUSTMENT'` — `SUM(zen_ups_actual_charges.charge_amount) - (기존 BASE_FREIGHT+FUEL_SURCHARGE+SURGE_FEE+OTHER_CHARGE 합계)`로 계산한 **차액 1건**을 upsert. 음수(예상보다 실제가 적음)도 허용 — 크레딧/차감 처리.

### 2-3. 신규 서버 액션 (`src/app/actions/finance/ups-actual-charges.ts` 예상 위치)
```ts
recordUpsActualCharges(orderId: string, charges: { chargeType: string; amount: number; currency: string; upsInvoiceNo?: string; notes?: string }[]): Promise<{ success: boolean; adjustmentAmount?: number; error?: string }>
getUpsActualCharges(orderId: string): Promise<UpsActualCharge[]>
getUpsChargeReconciliation(orderId: string): Promise<{ estimated: number; actual: number; variance: number; currency: string }>
```
`recordUpsActualCharges`는 admin/manager 전용. 저장 후 `zen_order_costs`에 `UPS_ACTUAL_ADJUSTMENT` 행을 upsert하고, 이미 인보이스가 발행된 오더라면(기존 cost가 `invoice_id`로 마감된 상태) 이 조정분은 자동으로 **다음 `generateInvoicesForOrder()` 실행 시 별도 후속 인보이스**로 청구됩니다(기존 `unbilledCosts` 필터가 이미 이 동작을 지원 — 코드 변경 불필요).

### 2-4. UI
- 오더 상세(또는 관리자 전용 "UPS 정산 조정" 화면)에 실제 청구 항목 입력 폼 + 예상 vs 실제 vs 차액 비교 테이블
- 입력 시점: `DELIVERED` 상태 이후(UPS 청구서는 배송 완료 후 발행되므로) — 이전 상태에서는 입력 UI 비활성화 권장

### 타이밍 이슈 (설계상 반드시 고려)
`RELEASED` 전이 시 자동 인보이스 생성이 이미 발생하므로, 최초 인보이스는 **예상운임 기준**으로 나갑니다. UPS 실제 청구서는 배송 완료(`DELIVERED`) 이후 도착하므로, 사후청구 반영은 필연적으로 **추가/보정 인보이스**(2차 청구) 형태가 됩니다 — 기존 정산 구조상 자연스러운 흐름이라 별도 아키텍처 변경 없이 수용 가능.

## 3. 구현 착수 전 확인 필요 (R-11 API 설계 우선 원칙)
이 설계는 초안입니다. 실제 구현 착수 전 아래 확인 필요:
- `charge_type` enum 값의 정확한 목록(UPS 실제 청구서 surcharge 항목명 기준으로 확정 필요 — 지금은 추정치)
- 화주(shipper)에게 이 조정 내역을 언제/어떻게 통보할지(알림 트리거 여부)
- `zen_ups_actual_charges` RLS 정책 최종안

## 결론
예상운임 적용 로직은 정상 동작 중이며 정리가 필요한 "버그"는 아닙니다. UPS 사후청구 반영은 확인 결과 **완전 신규 기능**이며, 위 설계(기존 `zen_order_costs`/인보이스 파이프라인 재사용)로 진행 시 blast radius를 최소화할 수 있습니다.
