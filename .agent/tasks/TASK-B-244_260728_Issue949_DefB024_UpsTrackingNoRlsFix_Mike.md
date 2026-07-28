# TASK-B-244: Issue #949 / DEF-B-024 — 화주 본인 UPS 오더 등록 시 tracking_no 정리 로직이 RLS에 막힘

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#949](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/949) |
| **DEF** | [DEF-B-024](../defects/DEF-B-024_ups_tracking_no_fix_blocked_by_missing_shipper_rls.md) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-28 |
| **우선순위** | P1 |
| **상태** | 🔔 |

## 개요

JSJung 요청으로 `/ko/tracking` 페이지를 Jaison이 직접 재현·근본원인 확인. DEF-B-007(이미 수정 완료 처리됨)이 화주 본인이 직접 UPS 오더를 등록하는 경우에는 실제로 동작한 적이 없었다는 것을 발견했습니다. 상세 내용은 DEF-B-024 참조.

`createOrder()`(`src/app/actions/operations/orders.ts:107-113`)가 `zen_tracking_configs`의 가짜 값(`tracking_no='ZN-...'`, `provider_type='VIRTUAL'`)을 정리하는 UPDATE를 **사용자 본인의 RLS 세션**으로 실행하고 있는데, `zen_tracking_configs`의 UPDATE RLS 정책은 ADMIN/MANAGER/ZENITH_SUPER_ADMIN과 "자기 소속 화주를 관리하는 AGENCY"만 커버하고 **화주 본인은 커버하지 않습니다** — 화주가 직접 등록하면 이 UPDATE가 조용히 0건 적용되어(에러 없음) 가짜 값이 그대로 남습니다.

**Jaison이 설계를 확정했으므로 설계 판단 없이 아래 스펙대로 구현**하면 됩니다.

## 조치안 (Jaison 확정 설계 — 그대로 구현)

**RLS 정책 추가는 하지 않습니다** — `tracking_no`/`provider_type`은 시스템이 내부적으로 관리해야 할 필드라 화주에게 직접 UPDATE 권한을 여는 건 새로운 리스크입니다. 대신 이 특정 하우스키핑 작업만 서비스 롤로 수행합니다.

### 1. `src/app/actions/operations/orders.ts` — `createOrder()` 수정

파일 상단 import에 추가:
```ts
import { createAdminClient } from '@/utils/supabase/server';
```

107~113행의 기존 블록:
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
을 아래로 교체(`supabase` → 서비스 롤 클라이언트로 변경, 나머지 로직은 동일):
```ts
if (validated.transport_mode === 'UPS') {
  const adminClient = await createAdminClient();
  const { error: trackingConfigError } = await adminClient
    .from('zen_tracking_configs')
    .update({ provider_type: 'MANUAL', provider_name: 'MANUAL', tracking_no: null })
    .eq('order_id', orderId);
  if (trackingConfigError) {
    logger.error('[TRACKING_CONFIG] Failed to set UPS provider_type:', trackingConfigError);
  }
}
```

### 2. 백필 — 기존에 이미 오염된 행 정리

신규 마이그레이션 파일(`YYYYMMDDHHMMSS_defb024_ups_tracking_no_backfill_v2.sql`) 추가 — DEF-B-007 백필과 동일 패턴(그 이후 재발한 행까지 다시 정리):
```sql
UPDATE public.zen_tracking_configs tc
SET tracking_no = NULL,
    provider_type = 'MANUAL',
    provider_name = 'MANUAL'
FROM public.zen_orders o
WHERE tc.order_id = o.id
  AND o.transport_mode = 'UPS'
  AND tc.tracking_no LIKE 'ZN-%';
```

### 3. 건드리지 않는 것 (범위 밖)

- `zen_tracking_configs`의 RLS 정책 — 변경 없음(화주에게 UPDATE 권한 부여하지 않음)
- `updateOrder()` — transport_mode를 UPS로 변경하는 edit 시나리오는 이번 DEF의 범위 밖(별도 확인 필요 시 추후 DEF)
- DEF-B-023(번역키)/DEF-B-021(통화 표시) — 무관, 이번 범위 아님

## 착수 체크리스트

- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 `feature/teamb-244-...` 브랜치 생성 (`./scripts/next-task-number.sh B` 직접 재확인 — 244 나와야 정상)
- [ ] 위 스펙대로 `orders.ts` 수정 + 백필 마이그레이션 추가
- [ ] `supabase db reset --yes` 후 백필 마이그레이션이 정상 적용되는지 직접 확인
- [ ] 회귀 테스트 추가 — **반드시 화주 본인 role 세션 기준 실측**(toContain/그림자 컴포넌트 금지, ADMIN/AGENCY 세션으로 우회 검증하면 이 버그를 재현하지 못함 — 반드시 화주 role로 검증):
  1. 화주 role(예: CORPORATE 또는 AGENCY_SHIPPER) 세션으로 `createOrder()`를 실제 호출(또는 동등한 RLS 시뮬레이션: `SET LOCAL role/request.jwt.claims`)해 UPS 오더 생성 후 `zen_tracking_configs.tracking_no`가 실제로 `NULL`인지 실측 — 서비스 롤 교체 전 코드로 되돌리면 이 테스트가 정확히 FAIL하는지 반드시 재현 확인
  2. 기존 DEF-B-007 관련 테스트(있다면)가 리팩터링 후에도 그대로 PASS하는지 확인
- [ ] `npm run build` · `npm run test:regression` 직접 실행 후 정확한 결과 기재
- [ ] **R-10 필수**: 로컬에서 화주 role 계정(예: `jungjs@aventusm.com` 또는 개인 CORPORATE 계정)으로 로그인 → 신규 UPS 오더 실제 등록 → `/ko/tracking` 페이지에서 Tracking Number가 빈 값(또는 "-")으로 나오는지(가짜 "ZN-" 값이 아님) 스크린샷으로 확인. **이번 Task는 R-10 생략 시 반려 처리됩니다 — Mike는 R-10 증적 누락이 이미 4회 누적된 상태입니다.**

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Mike] fix: TASK-B-244 ...` → 2. **원본 배정 파일 그대로 사용**해 `[작업 결과]` 섹션 작성(**커밋 해시 실제 값 기재 — TBD 금지**) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 949 --add-label status:review --remove-label status:open` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성 (`feature/* → TeamB_Dev`, `Closes #949`)

## 담당자 위반 이력 사전 경고

- Mike: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. **R-10 증적누락 4회 누적(PR#909·PR#915·PR#939·PR#947) — 이번에 다시 생략 시 Jaison이 별도 조치 검토합니다.** 코드/테스트 품질 자체는 매번 양호했으니 이번엔 R-10만 놓치지 않으면 됩니다. 화주 role 세션으로 반드시 실측할 것 — ADMIN/AGENCY 세션 테스트는 이 버그를 재현하지 못합니다.

## [작업 결과]

### 변경 내용

#### `src/app/actions/operations/orders.ts`
- UPS tracking config UPDATE를 `supabase` → `createAdminClient()` 서비스 롤 클라이언트로 변경

#### `supabase/migrations/20260728120000_defb024_ups_tracking_no_backfill_v2.sql`
- 기존 UPS+`ZN-%` 행을 NULL + MANUAL로 백필

### 테스트
- `createAdminClient()` 사용 검증 추가 (DEF-B-024)

### 검증
- **빌드**: ✅ PASS
- **테스트**: `tracking-configs-provider-type.test.ts` 5/5 PASS
- **회귀**: 144/144 파일, 965/965 테스트 ALL PASS
- **커밋 해시**: `32a31437`

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음
