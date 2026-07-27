# DEF-B-007: UPS 오더의 `zen_tracking_configs.tracking_no`에 가짜 값("ZN-" 접두사)이 실제 운송장번호처럼 노출

| 항목 | 내용 |
|:-----|:------|
| **발견일** | 2026-07-26 |
| **보고자** | jungjs (Jaison) — `/ko/tracking` Tracking Number 컬럼 실사용 확인 중 발견 |
| **긴급도** | Medium |
| **우선순위** | P2 |

## 현상 (실측 확인)

로컬 DB 직접 조회:
```
order_no          | transport_mode | status     | tracking_no          | provider_type
ZEN-2026-000001    | UPS            | REGISTERED | ZN-ZEN-2026-000001   | VIRTUAL
```

UPS 오더인데 `tracking_no`에 실제 UPS 운송장번호가 아니라 `ZN-ZEN-2026-000001` 같은 내부 가상 시뮬레이터용 값이 들어있고, 이 값이 `/ko/tracking` 대시보드의 "Tracking Number" 컬럼(및 오더 상세 화면)에 실제 운송장번호처럼 그대로 노출됩니다.

## 근본 원인

`create_order_atomic` RPC(`supabase/migrations/20260715000001_iss489_ups_order_schema_v5.sql:130-134`)가 **모든 오더 생성 시점에 transport_mode와 무관하게** `zen_tracking_configs`를 다음과 같이 삽입합니다:
```sql
INSERT INTO public.zen_tracking_configs (
  order_id, tracking_no, provider_type, provider_name
) VALUES (
  v_order_id, 'ZN-' || v_order_no, 'VIRTUAL', 'ZSim (Virtual)'
);
```
AIR/SEA/LAND 오더는 이 "ZN-" 값이 `VIRTUAL` 트래킹 시뮬레이터의 정상 식별자라 문제없지만, UPS 오더는 실제 SHXK 등록(PACKED 단계) 이후에야 진짜 운송장번호를 받습니다(`registerUpsOrder()`, DEF-123/TASK-B-195 동기화). `createOrder()`(`src/app/actions/operations/orders.ts:107-115`)는 UPS 오더 생성 시 `provider_type`/`provider_name`만 `MANUAL`로 정정할 뿐(DEF-B-004), `tracking_no`는 그대로 둬서 **SHXK 등록 전까지 가짜 "ZN-" 값이 진짜 운송장번호처럼 남아있습니다.**

TASK-B-212(DEF-B-006)에서 처리한 "tracking_no NULL → 공백" 수정은 이 케이스를 다루지 않습니다 — 값이 `NULL`이 아니라 가짜 문자열이 들어있는 경우이기 때문입니다.

## 조치안 (Jaison 확정 설계)

### 1. `createOrder()` — 향후 생성되는 UPS 오더 (Go-forward)

`src/app/actions/operations/orders.ts:107-115`:
```ts
if (validated.transport_mode === 'UPS') {
  const { error: trackingConfigError } = await supabase
    .from('zen_tracking_configs')
    .update({ provider_type: 'MANUAL', provider_name: 'MANUAL', tracking_no: null })
    .eq('order_id', orderId);
  if (trackingConfigError) {
    logger.error('[TRACKING_CONFIG] Failed to set UPS provider_type:', trackingConfigError);
  }
}
```
`tracking_no: null` 한 줄 추가. `zen_tracking_configs.tracking_no`는 `UNIQUE`이지만 `NOT NULL`이 아니라(원본 스키마 `20260422110000_zen_tracking_v1.sql:9`) NULL 여러 건이 공존해도 제약 위반 없음. 이후 `registerUpsOrder()`가 실제 SHXK 등록 시 진짜 운송장번호로 갱신합니다(기존 로직 그대로).

### 2. 백필 마이그레이션 — 기존 UPS 오더의 가짜 값 정리

신규 마이그레이션 파일(`YYYYMMDDHHMMSS_defb007_ups_tracking_no_backfill.sql`) 추가:
```sql
UPDATE public.zen_tracking_configs tc
SET tracking_no = NULL
FROM public.zen_orders o
WHERE tc.order_id = o.id
  AND o.transport_mode = 'UPS'
  AND tc.tracking_no LIKE 'ZN-%';
```
`ZN-` 접두사는 가상 시뮬레이터 전용 포맷이라 실제 SHXK 운송장번호와 절대 겹치지 않습니다 — 이미 실등록되어 진짜 번호가 들어간 UPS 오더는 건드리지 않고, 아직 미등록 상태로 가짜 값만 있는 오더만 정확히 골라 정리합니다.

## 검증 요구사항

- `createOrder()` 변경: `transport_mode='UPS'`일 때 `.update()` 호출 payload에 `tracking_no: null`이 포함되는지 mock 기반 behavioral 검증
- 백필 마이그레이션: **로컬 DB에 실제 적용 후** `SELECT` 직접 실행 — UPS+`ZN-%` 행은 `tracking_no IS NULL`로, UPS이면서 이미 실등록된 행(있다면)과 AIR/SEA/LAND 행은 그대로인지 실측 확인(toContain 소스 문자열 검사 금지 — 이 종류 마이그레이션은 실측 없이는 검증 불가하다는 게 이 프로젝트에서 반복 확인된 교훈)

## 관련 Task
- `TASK-B-213` (배정 예정) — 이 DEF의 수정 담당

## 관련 파일
- `src/app/actions/operations/orders.ts:107-115`
- `supabase/migrations/20260715000001_iss489_ups_order_schema_v5.sql:130-134` (원인, 수정 대상 아님 — 신규 백필 마이그레이션으로 정정)
