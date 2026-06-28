# DEF-083 — `zen_ups_labels.reference_no` UNIQUE INDEX로 재발급 시 duplicate key

> **발견일**: 2026-06-28
> **발견자**: Baker (Team B)
> **연관 Task**: TASK-B-029 (IMP-140), TASK-B-034
> **우선순위**: P1 — Production blocking
> **상태**: ⬜

## 증상

`issueUpsLabel` 서버 액션 실행 시 `saveInitialLabel()`에서 `duplicate key value violates unique constraint "idx_ups_labels_reference"` 에러 발생. void 처리된 label과 동일한 `reference_no`로 재발급 시도 시 무조건 실패.

## 재현 조건

1. 원본 UPS 레이블 발급 → `reference_no = packageId`
2. 해당 레이블을 void 처리 (`is_voided = true`)
3. 동일 package에 재발급 시도 → `issueUpsLabel` → `saveInitialLabel(supabase, orderId, packageId, packageId, ...)` 실행
4. `reference_no = packageId`가 `idx_ups_labels_reference` UNIQUE 제약에 위반 → DB 에러

## 원인

`supabase/migrations/20260621050000_zen_ups_labels.sql` (또는 관련 migration):
```sql
CREATE UNIQUE INDEX "idx_ups_labels_reference" ON "public"."zen_ups_labels" USING "btree" ("reference_no");
```

`reference_no`가 **전체 테이블 기준 UNIQUE**로 설정되어 있음. void 레코드도 포함되어 있어 동일 `reference_no` 재사용 불가.

`issueUpsLabel` → `saveInitialLabel(supabase, orderId, packageId, packageId, ...)` — 세 번째 인자가 `reference_no`로 사용됨 (packageId).

## 영향

- **Production**: 재발급(reissue) 기능 사용 시 100% 실패
- UI에서 재발급 버튼을 클릭해도 결국 서버 액션에서 duplicate key 에러 반환
- E2E-26-06 테스트: 실제 UI 버튼 클릭 방식으로는 통과 불가 (DB bypass 없이는 검증 불가)

## 임시 조치

E2E-26-06에서 Supabase admin client로 label 직접 insert 시 `reference_no`에 timestamp suffix 추가 (e.g., `packageId + '-R' + Date.now()`).

## 근본 해결

`idx_ups_labels_reference`를 **partial unique index**로 변경하여 void되지 않은 레코드만 UNIQUE 제약 적용:

```sql
DROP INDEX IF EXISTS "idx_ups_labels_reference";
CREATE UNIQUE INDEX "idx_ups_labels_reference_active" ON "public"."zen_ups_labels" ("reference_no") WHERE "is_voided" = false;
```

## 참조

- `src/app/actions/operations/ups-labels.ts`: `issueUpsLabel` → `saveInitialLabel` — production duplicate bug
- `tests/e2e/e2e-26-ups-label-flow.spec.ts`: E2E-26-06 DB insert bypass (`reference_no` suffix)
- Issue #110 (E2E-26 전체)
- PR #138 (Dave 재발급 버튼 UI)
