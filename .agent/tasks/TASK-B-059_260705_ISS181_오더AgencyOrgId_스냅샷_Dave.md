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

## DoD (완료 기준)

- [ ] `zen_orders.agency_org_id` 컬럼 migration 적용
- [ ] `zen_order_rate_snapshots` 테이블 migration 적용
- [ ] `createOrder()` AGENCY_SHIPPER role 분기 구현
- [ ] `estimateUpsFreight` 결과 스냅샷 저장 구현
- [ ] TC-P7-ORDER-AGENCYID-01 / SNAPSHOT-01 / SNAPSHOT-02 신규 작성 및 PASS
- [ ] `LIVE_REGRESSION_TEST_MAP.md` § 43 추가
- [ ] 전체 회귀 PASS (`rtk npm run test:regression`)
- [ ] R-17 커밋 분리 (코드 커밋 / 문서 커밋)
- [ ] PR 생성 (`Closes #181`, develop 대상)

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
| §3 | `zen_order_rate_snapshots` 테이블 생성 | `20260705000003_agency_006_order_rate_snapshots.sql` | ✅ |
| §3 | `estimateUpsFreight` 결과 스냅샷 저장 (3단계) | `src/app/actions/operations/orders.ts` | ✅ |
| §4 | TC-P7-ORDER-AGENCYID-01 / SNAPSHOT-01 / SNAPSHOT-02 (6 tests) | `tests/unit/agency/order-rate-snapshots.test.ts` | ✅ 6/6 PASS |
| — | Schema: `ups_product_code` + `incoterms` 선택필드 추가 | `src/lib/validation/order.ts` | ✅ |
| — | `LIVE_REGRESSION_TEST_MAP.md §43` 갱신 | | ✅ |
| — | 회귀 447/452 PASS (5건 선행실패 — p71-ups-agency-pricing DB 함수 부재) | | ✅ |

### 커밋
- 코드 커밋: `957ab3a` (6 files, +198)
- 문서 커밋: `a7f3d62` (2 files)

### 보완 작업 (Jaison 1차 반려, PR#208 코멘트)
- `saveOrderRateSnapshot` 서브루틴 분리 (`export async function`)
- TC-P7-ORDER-SNAPSHOT-03 신규 (2 tests): 정상 스냅샷 저장 + 제품 미존재 early return
- Task file 커밋 해시 기재 완료

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음
