# DEF-B-024: DEF-B-007 수정이 화주 본인 등록 시 RLS에 막혀 조용히 무효화됨 (tracking_no 가짜값 재발)

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | JSJung 요청으로 `/ko/tracking` 페이지를 Jaison이 직접 재현·근본원인 확인. DEF-B-007(이미 수정 완료 처리됨)과 동일 증상이 재발 |
| **긴급도** | High |
| **영향 범위** | `src/app/actions/operations/orders.ts`의 `createOrder()` — **화주 본인(SHIPPER 계열 role)이 직접 UPS 오더를 등록하는 모든 경우** |
| **관련 파일** | `src/app/actions/operations/orders.ts:107-113` |

## 현상 (실측 확인)

`/ko/tracking` 페이지에서 오더 `ZEN-2026-000001`(UPS, `jungjs@aventusm.com` 직접 등록)의 Tracking Number가 실제 운송장번호가 아니라 `ZN-ZEN-2026-000001`(내부 가상 시뮬레이터 값)로 그대로 노출됨. 같은 UPS 오더인 `UPS-SEED-AGENCY-001`은 정상적으로 `1Z-SEED-UPS-001` 형식을 보여줘 대조됨.

DB 직접 조회 결과:
```
order_no         | transport_mode | tracking_no          | provider_type
ZEN-2026-000001  | UPS            | ZN-ZEN-2026-000001   | VIRTUAL
```

`provider_type`도 `VIRTUAL`인 채로 `MANUAL`로 정정되지 않은 상태 — DEF-B-007이 추가한 수정 코드가 **전혀 실행되지 않은 것과 동일한 결과**.

## 근본 원인

DEF-B-007에서 추가한 `createOrder()`의 수정 코드:
```ts
if (validated.transport_mode === 'UPS') {
  const { error: trackingConfigError } = await supabase
    .from('zen_tracking_configs')
    .update({ provider_type: 'MANUAL', provider_name: 'MANUAL', tracking_no: null })
    .eq('order_id', orderId);
  ...
}
```
이 `supabase` 클라이언트는 **오더를 등록한 사용자 본인의 RLS 적용 세션**입니다. `zen_tracking_configs`의 실제 UPDATE RLS 정책을 확인한 결과:
- `"Admins have full access to tracking configs"` — ADMIN/MANAGER/ZENITH_SUPER_ADMIN만 해당
- `"Agency can update tracking configs for shipper orders"` — AGENCY가 **자기 소속 화주**의 오더를 관리하는 경우만 해당(`zen_orders.agency_org_id = 내 org_id`)
- **화주 본인(SHIPPER/AGENCY_SHIPPER/CORPORATE 등)이 자기 오더의 tracking_configs를 수정할 수 있는 UPDATE 정책이 전혀 없음** (SELECT 정책만 존재)

따라서 화주가 직접 UPS 오더를 등록하면 이 UPDATE가 RLS에 의해 **조용히 0건 적용**됨(Postgres RLS는 UPDATE 시 조건에 안 맞는 행을 그냥 걸러낼 뿐 에러를 던지지 않으므로 `trackingConfigError`도 발생하지 않음) — DEF-B-007의 수정 자체는 정확했지만, ADMIN/MANAGER/AGENCY가 대신 등록하는 시나리오에서만 실제로 동작하고 화주 본인 등록 시나리오에서는 처음부터 한 번도 동작한 적이 없었던 것으로 판단됨.

## 권장 조치

**RLS 정책을 추가하는 방식은 지양** — `tracking_no`/`provider_type`은 시스템이 내부적으로 관리해야 할 필드라 화주에게 직접 UPDATE 권한을 여는 것은 새로운 보안/데이터 정합성 리스크를 만듦. 대신:

1. `createOrder()`의 이 UPDATE 블록만 **서비스 롤 클라이언트**(`createAdminClient()`, `src/utils/supabase/server.ts:37`)로 실행하도록 변경 — RLS를 우회하는 시스템 내부 하우스키핑 작업이므로 적절함(레이트리밋 체크 등 기존 코드에서도 동일 패턴 사용 중).
2. 현재 이미 이 문제로 오염된 기존 UPS 오더(`ZN-%` 값이 남아있는 행)에 대한 백필 — DEF-B-007의 백필 마이그레이션은 그 시점 이전 데이터만 처리했으므로, 이후 화주 직접등록으로 재발한 행은 다시 정리 필요.

## 검증 요구사항

- `createOrder()`가 `createAdminClient()`로 tracking_configs를 업데이트하는지, 그리고 **화주 본인 role(예: CORPORATE/AGENCY_SHIPPER)의 세션으로 실제 오더를 생성**했을 때 `tracking_no`가 실제로 `NULL`이 되는지 실측(다른 role의 RLS 우회 테스트로는 이 버그를 재현할 수 없음 — 반드시 화주 role 세션으로 검증)
- 백필: `supabase db reset` 이후에도 남아있는 `ZN-%` UPS 오더가 있는지 재확인 후 정리
