# DEF-B-164 | 기존 E2E `e2e-27`이 로컬 `seed-local` 데이터(PLATFORM org)에 의존 — 자기완결형 아님

| 항목 | 내용 |
|:-----|:-----|
| **발견 경위** | TASK-B-371(#1439) 착수 시 인프라 스모크로 `npx playwright test tests/e2e/e2e-27-order-settlement-ui.spec.ts` 실행 → `beforeAll`에서 즉시 실패 |
| **발견자 / 날짜** | Mike (Team B) / 2026-11-23 |
| **대상 파일** | `tests/e2e/e2e-27-order-settlement-ui.spec.ts:48-53` (Dave, TASK-369 / Issue #1425) — **본 Task 범위 밖** |
| **긴급도** | **Low** — 로컬에서 `scripts/seed-local.ts`를 실행하지 않은 환경에서만 발현 (수동 E2E 한정) |
| **상태** | OPEN — 본 Task에서 수정하지 않음(R-18). 자기완결형 fixture는 본 Task의 `tests/e2e/b371-fixture.ts`로 해결 |

## 현상 (재현)

```
TypeError: Cannot read properties of null (reading 'id')
    at tests/e2e/e2e-27-order-settlement-ui.spec.ts:71
      org_id: platformOrg!.id,   ← platformOrg이 null
```
원인 쿼리(`:48-53`):
```ts
const { data: platformOrg } = await supabase.from('zen_organizations')
  .select('id').eq('type', 'PLATFORM').limit(1).single();   // 로컬 DB에 PLATFORM org이 0건 → null
```

**실측 로컬 DB 상태(2026-11-23)**: `zen_organizations` 30건 중 **`type='PLATFORM'` 0건**, `zen_orders` 0건 → `seed-local.ts`가 실행된 적이 없는 상태.

## 영향

- `seed-local.ts` 미실행 환경(신규 클론·CI reset 후)에서 e2e-27이 **자기완결성 결여**로 실패 — 다른 테스트·코드 결함이 아니다.
- 본 Task(#1439)의 스펙은 이슈 지시대로 **`seed-local` 의존 없이** 자기완결형 fixture(`b371-fixture.ts`: PLATFORM org 신규 생성 + GoTrue admin API로 계정 생성 + afterAll 정리)를 써서 해당 의존을 피했다.

## 권장 조치

1. e2e-27도 `beforeAll`에서 PLATFORM org이 없으면 **직접 생성**(또는 `seed-local` 선행 실행을 전제로 문서화)하도록 수정.
2. E2E 공통 원칙으로 "자기완결 fixture"를 `docs/99_Manual/` 가이드에 명문화.

## 범위 밖 선언

본 Task(#1439)는 통합 **검증**이 목적이며 타 Task의 테스트 파일 수정을 하지 않는다(R-17 범위). 발견 즉시 R-18로 등록.

## 참조

- `.agent/tasks/TASK-B-371_261122_Issue1439BillingE2EVerification.md` `[발견 이슈]`
- 관련: DEF-B-161 (`createTestOrg`이 만든 사용자가 GoTrue에 안 보이는 문제 — 계정 생성 방식의 또 다른 결함)
