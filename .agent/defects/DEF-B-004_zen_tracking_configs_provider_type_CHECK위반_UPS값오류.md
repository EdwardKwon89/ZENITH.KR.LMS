# DEF-B-004: zen_tracking_configs.provider_type='UPS' 는 CHECK 제약 위반 — PR#853(TASK-B-207) 실질 무효화

| 항목 | 내용 |
|:-----|:------|
| **발견일** | 2026-07-26 |
| **보고자** | jungjs (Jaison) — PR#853 병합 후 로컬 DB 적용 중 발견 |
| **긴급도** | High (이미 `TeamB_Dev`에 병합되어 신규 UPS 오더 생성마다 계속 재발 중) |
| **우선순위** | P1 |

## 원인 — Jaison 본인의 설계 오류

TASK-B-207/TASK-B-208을 배정하며 Jaison이 "구현 담당자는 판단 없이 구현만" 하도록 상세 스펙을 작성했는데, 그 스펙 자체에 오류가 있었음. **Baker는 지시받은 스펙을 정확히 그대로 구현했고 잘못이 없음.**

`zen_tracking_configs.provider_type`은 스키마 정의 시점부터 CHECK 제약으로 값이 고정되어 있음:
```sql
-- supabase/migrations/20260422110000_zen_tracking_v1.sql:10
provider_type TEXT NOT NULL CHECK (provider_type IN ('VIRTUAL', 'MANUAL', 'API'))
```
즉 `'UPS'`는애초에 허용되지 않는 값. 기존 설계 문서(`docs/02_Analysis/An_13_Phase8_UPS직접API연동_설계.md:217`)에도 이미 명시되어 있었음:
> `zen_tracking_configs` | `provider_type='API'`, `provider_name='SHXK_UPS'`로 신규 등록

Jaison이 TASK-B-207 배정 시 이 문서/제약을 확인하지 않고 `provider_type: 'UPS'`로 스펙을 잘못 작성함.

## 실제 영향 (실측 확인)

- **로컬 DB에 백필 마이그레이션 적용 시도 → 즉시 CHECK 제약 위반 에러로 트랜잭션 전체 롤백**(부분 반영 없음, 확인 완료)
- `createOrder()`(`orders.ts`, PR#853로 추가된 코드)의 신규 UPS 오더 provider_type 갱신 로직도 **매번 동일한 CHECK 위반으로 실패** — 단, 코드가 에러를 `logger.error()`로만 로깅하고 오더 생성은 계속 진행하도록 만들어져 있어(원래 설계 의도상 정상) **사용자에게는 실패가 전혀 보이지 않고 조용히 무효화됨**
- CI가 이를 못 잡은 이유: (1) 신규 테스트가 전부 mock 기반이라 실제 DB 제약을 거치지 않음 (2) CI fresh reset 환경엔 백필 대상(기존 UPS+VIRTUAL) 행이 없어 백필 UPDATE가 0건 처리되며 조용히 통과
- 결론: **PR#853은 병합됐지만 실질적으로 캐리어 배지 문제를 전혀 해결하지 못한 상태**(no-op)

## 조치안 (Jaison 정정 설계)

`provider_type`은 기존 3개 값 체계(`VIRTUAL`/`MANUAL`/`API`) 그대로 유지하고, UPS는 **`provider_type='API', provider_name='SHXK_UPS'`**로 설정(설계 문서 An_13 원안 그대로).

### 1. `src/app/actions/operations/orders.ts` (PR#853에서 추가된 블록 수정)
```ts
if (validated.transport_mode === 'UPS') {
  const { error: trackingConfigError } = await supabase
    .from('zen_tracking_configs')
    .update({ provider_type: 'API', provider_name: 'SHXK_UPS' })
    .eq('order_id', orderId);
  if (trackingConfigError) {
    logger.error('[TRACKING_CONFIG] Failed to set UPS provider_type:', trackingConfigError);
  }
}
```

### 2. 백필 마이그레이션 수정 (신규 마이그레이션으로 — 이미 적용된 걸로 잘못 알려질 수 있으니 기존 파일 수정 금지, 신규 파일 추가)
```sql
UPDATE public.zen_tracking_configs tc
SET provider_type = 'API', provider_name = 'SHXK_UPS'
FROM public.zen_orders o
WHERE tc.order_id = o.id
  AND o.transport_mode = 'UPS'
  AND tc.provider_type = 'VIRTUAL';
```
(이전 마이그레이션 `20260726110000_iss851_tracking_configs_ups_provider_backfill.sql`은 로컬 적용 시 트랜잭션 전체 롤백되어 실제로는 아무 것도 바뀌지 않았으므로, CI/타 환경에서도 동일하게 no-op였을 것 — 안전하게 새 마이그레이션 추가로 정정)

### 3. 테스트 수정
기존 `tests/unit/orders/tracking-configs-provider-type.test.ts`의 기대값(`provider_type: 'UPS'`)을 `provider_type: 'API', provider_name: 'SHXK_UPS'`로 수정. **또한 mock이 아닌 실제 로컬 DB에 마이그레이션 적용 후 CHECK 제약을 통과하는지 직접 확인 필수**(mock 테스트만으로는 이번처럼 스키마 제약 위반을 못 잡음 — 이번 사고의 교훈).

### 4. TrackingDashboard 배지 표시
`TrackingDashboard.tsx:219-223`는 이미 `provider_type === "API"`일 때 파란색 배지를 표시하도록 되어 있어 **별도 수정 불필요** — `provider_name`("SHXK_UPS")이 그 옆에 그대로 노출됨.

## 관련 Task
- `TASK-B-209` (Baker, 배정 예정) — 이 DEF의 수정 담당
- 원인 Task: `TASK-B-207`(PR#853, 이미 병합됨 — 되돌리지 않고 후속 수정으로 정정)

## 관련 파일
- `src/app/actions/operations/orders.ts`
- `supabase/migrations/20260422110000_zen_tracking_v1.sql` (CHECK 제약 원본)
- `docs/02_Analysis/An_13_Phase8_UPS직접API연동_설계.md:217` (원 설계 근거)
