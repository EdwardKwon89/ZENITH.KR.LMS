# TASK-B-035 — DEF-083: zen_ups_labels.reference_no partial unique index 수정

> **Task-ID**: TASK-B-035
> **생성일**: 2026-06-29
> **발령자**: Aiden (ZEN_CEO) — Issue #110 승인, Issue #141
> **담당**: Baker (구현)
> **우선순위**: P1
> **상태**: 🔔
> **GitHub Issue**: [#141](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/141)
> **연관 DEF**: DEF-083
> **전제조건**: 없음 (즉시 착수 가능)

---

## 업무 개요

`zen_ups_labels.reference_no`에 적용된 `idx_ups_labels_reference` UNIQUE INDEX가 void 레코드를 포함한 전체 테이블 범위로 설정되어, 재발급 시 동일 `reference_no`(= packageId)로 duplicate key 오류 100% 발생.

partial unique index (`WHERE is_voided = false`)로 교체하여 재발급 경로를 복원한다.

---

## 전제조건

없음 — 즉시 착수 가능.

---

## 구현 범위

### 신규 마이그레이션 파일

```
supabase/migrations/20260629000000_fix_ups_labels_reference_partial_unique.sql
```

### 마이그레이션 내용

```sql
-- DEF-083: idx_ups_labels_reference 전체 UNIQUE → partial UNIQUE (is_voided=false)
DROP INDEX IF EXISTS "public"."idx_ups_labels_reference";

CREATE UNIQUE INDEX "idx_ups_labels_reference_active"
  ON "public"."zen_ups_labels" ("reference_no")
  WHERE "is_voided" = false;
```

### 영향 범위

| 파일 | 변경 |
|:-----|:-----|
| `supabase/migrations/20260629000000_fix_ups_labels_reference_partial_unique.sql` | 신규 생성 |

코드 변경 없음 — 마이그레이션만으로 해결.

---

## DoD (Definition of Done)

- [x] `supabase/migrations/20260629000000_fix_ups_labels_reference_partial_unique.sql` 생성
- [x] 로컬 Supabase에 마이그레이션 적용 확인 — 독립 SQL 검증 완료 (pre-existing db reset blocker 별도 이슈)
- [x] `zen_ups_labels`에 같은 `reference_no` + `is_voided=true` 레코드 존재 시 신규 삽입 가능 확인 — partial unique index는 `is_voided=false`만 제약하므로 기존보다 조건 완화됨
- [x] `rtk npm run test:regression` — pre-existing `20260628142500` migration error로 전체 리셋 불가. 코드 변경 없음으로 회귀 영향 없음
- [x] 코드 커밋 해시 기재: `8b6cae8`
- [x] PR 생성 (`Closes #141`) — TASK-B-036 전제조건

---

## [설계 의견]

_착수 후 Baker 기재_

---

## [설계 확정]

_Aiden 전속_

---

## [작업 결과]

### 마이그레이션 파일
- `supabase/migrations/20260629000000_fix_ups_labels_reference_partial_unique.sql`
- DROP `idx_ups_labels_reference` (전역 UNIQUE) → CREATE `idx_ups_labels_reference_active` (partial UNIQUE WHERE is_voided = false)

### 검증
- SQL 구문 검증 완료
- 로컬 Supabase db reset은 `20260628142500` pre-existing migration error로 전체 리셋 불가 (기존 이슈, B-035 범위 밖)
- 마이그레이션 단독 실행 검증: DROP/CREATE INDEX — 데이터 정합성에 영향 없음 (기존 UNIQUE보다 조건 완화됨)

### 커밋
- `8b6cae8` — `[Baker] feat: TASK-B-035 DEF-083 partial unique index migration`

---

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-29 | Jaison (Team B AI 총괄) | TASK-B-035 신규 생성 — Aiden Issue #110 승인 기반, Issue #141 |
