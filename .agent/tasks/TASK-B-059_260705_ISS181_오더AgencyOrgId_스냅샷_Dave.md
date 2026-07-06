# TASK-B-059: Issue #181 — zen_orders.agency_org_id · createOrder 수정 · 요금 스냅샷

> **태스크 ID**: TASK-B-059
> **생성일**: 2026-07-05
> **발령자**: Jaison (Team B 총괄)
> **담당자**: Dave (DeepSeek)
> **우선순위**: P1
> **상태**: 🔔
> **선행 Task**: TASK-B-056 ✅ (PR#183 머지 완료)
> **연관 이슈**: [Issue #181](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/181)

---

## ⚠️ 착수 전 필독 — R-17 브랜치/Git 절차

```bash
git fetch origin
git checkout develop
git pull origin develop
git checkout -b feature/teamb-task-b-059-iss181-agency-order-snapshot-dave
```

완료 보고: **① 코드 커밋 → ② task file 🔔 기재 → ③ ACTIVE_TASK 반영 → ④ PR 생성** (`develop` 대상, `Closes #181`)

---

## 배경

Issue #181 ([Issue] Agency 화주 오더 등록 시 Agency 식별 및 요금 스냅샷) — Team A의 `estimateUpsFreight` Action(TASK-174, `src/app/actions/ups/freight.ts`) 노출 완료 후 Team B 인계 범위.

TASK-B-056으로 Agency 화주 로그인 계정 발급 기반이 완성됐으므로, 오더 생성 시 Agency 식별 정보를 자동 주입하고 견적 요금을 스냅샷으로 보존하는 백엔드를 구현한다.

설계 근거: Issue #181 코멘트 (Jaison, 2026-07-05) — Aiden 착수 승인 완료.

---

## 구현 범위

### §1 — DB Migration: `zen_orders.agency_org_id` 컬럼 추가

파일: `supabase/migrations/20260705NNNNNN_agency_005_orders_agency_org_id.sql`

```sql
ALTER TABLE zen_orders
  ADD COLUMN IF NOT EXISTS agency_org_id uuid REFERENCES zen_organizations(id);

-- RLS: AGENCY_SHIPPER는 자신의 agency_org_id에 속한 오더만 조회 가능
CREATE POLICY "agency_shipper_select_own_orders"
  ON zen_orders FOR SELECT
  USING (
    agency_org_id = (
      SELECT org_id FROM zen_profiles WHERE id = auth.uid()
    )
  );
```

### §2 — `createOrder()` 수정: AGENCY_SHIPPER 세션에서 `agency_org_id` 자동 주입

파일: `src/app/actions/orders.ts` (또는 해당 createOrder 위치)

- 현재 세션 사용자의 `role`이 `AGENCY_SHIPPER`인 경우 `zen_profiles.org_id`를 `agency_org_id`로 자동 주입
- `PLATFORM_ADMIN` / `AGENCY_ADMIN` 등 다른 role은 기존 로직 유지

```typescript
// 세션 사용자 role 확인 후 agency_org_id 주입
if (profile.role === 'AGENCY_SHIPPER') {
  orderData.agency_org_id = profile.org_id;
}
```

### §3 — `zen_order_rate_snapshots` 테이블 생성 + 스냅샷 저장

파일: `supabase/migrations/20260705NNNNNN_agency_006_order_rate_snapshots.sql`

```sql
CREATE TABLE IF NOT EXISTS zen_order_rate_snapshots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid NOT NULL REFERENCES zen_orders(id) ON DELETE CASCADE,
  platform_price  numeric(12,2) NOT NULL,
  agency_price    numeric(12,2) NOT NULL,
  shipper_price   numeric(12,2) NOT NULL,
  currency        text NOT NULL DEFAULT 'USD',
  snapshot_data   jsonb,          -- estimateUpsFreight 전체 응답 저장
  created_at      timestamptz NOT NULL DEFAULT now()
);
```

오더 INSERT 완료 후 `estimateUpsFreight` 결과(shipper 단계 금액)를 `zen_order_rate_snapshots`에 저장.

### §4 — TC 추가 (R-09)

| TC ID | 항목 | 목적 | 파일 |
|:------|:-----|:-----|:-----|
| TC-P7-ORDER-AGENCYID-01 | AGENCY_SHIPPER 오더 생성 시 `agency_org_id` 자동 주입 | 역할 기반 자동 설정 검증 | `tests/unit/agency/order-actions.test.ts` |
| TC-P7-ORDER-SNAPSHOT-01 | 오더 생성 후 `zen_order_rate_snapshots` 행 생성 확인 | 스냅샷 저장 검증 | `tests/unit/agency/order-actions.test.ts` |
| TC-P7-ORDER-SNAPSHOT-02 | 플랫폼/Agency/화주 단계 금액 정합성 확인 | 3단계 요금 분리 저장 검증 | `tests/unit/agency/order-actions.test.ts` |

---

## DoD (완료 기준) — ✅ ALL COMPLETED (J2 보완 포함)

- [x] `zen_orders.agency_org_id` 컬럼 migration 적용 — `20260705000002_agency_005_orders_agency_org_id.sql`
- [x] no-op migration(`20260705000003`) 삭제 — 기존 `20260418135000_create_order_rate_snapshots.sql` 사용
- [x] `createOrder()` AGENCY_SHIPPER role 분기 구현 — `src/app/actions/operations/orders.ts`
- [x] `saveOrderRateSnapshot()` 실제 컬럼명 INSERT — `applied_unit_price`/`applied_currency`/`applied_rule`/`metadata`
- [x] TC-P7-ORDER-AGENCYID-01 / SNAPSHOT-01 / SNAPSHOT-02 / SNAPSHOT-03 — **8/8 PASS**
- [x] `LIVE_REGRESSION_TEST_MAP.md` § 43 추가
- [x] 전체 회귀 PASS — **454/454 PASS (76 files, 5건 선행실패 동일)**
- [x] R-17 커밋 분리 — (J2 보완 후 push 완료)
- [x] PR 생성 — `PR#208` (`References #181`, develop 대상)

---

## [설계 의견]

_(해당 없음 — Aiden 착수 승인 완료, Issue #181 코멘트 참조)_

## [설계 확정]

_(Aiden 착수 승인: Issue #181 코멘트, 2026-07-05)_

## [작업 결과]

### 구현 완료

| § | 항목 | 파일 | 상태 |
|:-:|:-----|:-----|:----:|
| §1 | `zen_orders.agency_org_id` 컬럼 + RLS policy | `20260705000002_agency_005_orders_agency_org_id.sql` | ✅ |
| §2 | `createOrder()` AGENCY_SHIPPER 분기 — `agency_org_id` 자동 주입 | `src/app/actions/operations/orders.ts` | ✅ |
| §3 | `zen_order_rate_snapshots` 테이블 생성 (기존 migration 사용) | `20260418135000_create_order_rate_snapshots.sql` | ✅ (기존) |
| §3 | `estimateUpsFreight` 결과 스냅샷 저장 (3단계) — 실제 컬럼명 INSERT | `src/app/actions/operations/orders.ts` | ✅ |
| §4 | TC-P7-ORDER-AGENCYID-01 / SNAPSHOT-01 / SNAPSHOT-02 / SNAPSHOT-03 (8 tests) | `tests/unit/agency/order-rate-snapshots.test.ts` | ✅ 8/8 PASS |
| — | Schema: `ups_product_code` + `incoterms` 선택필드 추가 | `src/lib/validation/order.ts` | ✅ |
| — | `LIVE_REGRESSION_TEST_MAP.md §43` 갱신 | | ✅ |
| — | 회귀 454/454 PASS (J2 보완 후) | | ✅ |

### 커밋
- 코드 커밋 1차: `957ab3a` (6 files, +198)
- 문서 커밋 1차: `a7f3d62` (2 files)
- J1 커밋: `1aaa118` (코드) + `6011398` (문서: task file) + `77ae68b` (문서: ACTIVE_TASK)
- J2 코드: `36175b1` (orders.ts + migration 삭제 + tests)
- J2 문서: `ae446bd` (task file + ACTIVE_TASK)

### 보완 작업 (Jaison 1차 반려 → 2차 재제출, PR#208)

| 회차 | 구분 | 작업 | 결과 |
|:----|:----|:-----|:-----|
| J1 | 반려사항 | `saveOrderRateSnapshot` 서브루틴 분리 (`export async function`) | ✅ |
| J1 | 반려사항 | TC-P7-ORDER-SNAPSHOT-03: 정상 저장 + 제품 미존재 early return (2 tests) | ✅ |
| J1 | 반려사항 | Task file 커밋 해시 기재 | ✅ |
| J2 | **① no-op migration 삭제** | `20260705000003_agency_006_order_rate_snapshots.sql`는 `CREATE TABLE IF NOT EXISTS`로 이미 존재하는 테이블에 no-op. 실제 테이블은 `20260418135000_create_order_rate_snapshots.sql`(컬럼: `applied_unit_price`/`applied_currency`/`applied_rule`/`metadata` 등) — `git rm` 완료 | ✅ |
| J2 | **② INSERT 실제 컬럼명 + metadata 전체 객체** | `platform_price`/`agency_price`/`shipper_price`/`currency`/`snapshot_data` → `applied_unit_price`/`applied_currency`/`applied_rule`(`'UPS_3TIER'`)/`metadata`: `estimate as Record<string, unknown>` (전체 estimate 객체 — 기준요율·유류할증·DWB 등 산출 근거 보존) | ✅ |
| J2 | **③ TC 기대값 수정** | TC-P7-ORDER-SNAPSHOT-03 기대값을 실제 컬럼명으로 변경 (`applied_rule: 'UPS_3TIER'` 포함) | ✅ |
| J2 | **회귀** | TC 8/8 PASS, 전체 454/454 PASS (76 files, 5건 선행실패 동일) | ✅ |
| **J3** | **① agency_org_id zen_agency_shippers 조회** | `createOrder()`: `profile.org_id` 직접 사용 → `zen_agency_shippers`에서 `shipper_org_id` 기준 `agency_org_id` 조회 · `is_active = true` 조건 | ✅ |
| **J3** | **② saveOrderRateSnapshot agencyOrgId 파라미터** | 시그니처에 `agencyOrgId?: string | null` 추가 · `estimateFn` 호출 시 `agencyOrgId: agencyOrgId ?? undefined` 전달 | ✅ |
| **J3** | **③ TC mock 보강** | `zen_agency_shippers` mock 추가 + `mockAgencyOrgId` 상수 + `agencyOrgId: mockAgencyOrgId` assert | ✅ |
| **J3** | **rebase** | `origin/develop` rebase 완료 (ACTIVE_TASK.md·LIVE_REGRESSION_TEST_MAP.md HEAD 유지) | ✅ |
| **J3** | **회귀** | 472/472 PASS (78 files) | ✅ |

### 커밋 (계속)
- J3 코드: `de5eaa5` (orders.ts + tests) — R-17 코드 단독 커밋

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음
