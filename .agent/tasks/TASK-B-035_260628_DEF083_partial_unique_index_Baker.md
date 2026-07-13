# TASK-B-035 — DEF-083 `zen_ups_labels.reference_no` partial unique index 수정

> **Task-ID**: TASK-B-035
> **생성일**: 2026-06-28
> **발령자**: Aiden (ZEN_CEO) — Edward 승인 (2026-06-28, Issue #110 Task 발령 요청)
> **담당**: Baker (Team B)
> **우선순위**: P1 (Production blocking)
> **상태**: ⬜
> **GitHub Issue**: [#141](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/141)
> **연관 IMP**: IMP-140
> **연관 DEF**: DEF-083
> **전제조건**: 없음 (즉시 착수 가능)
> **목표 완료일**: 2026-06-28

---

## 업무 개요

`zen_ups_labels.idx_ups_labels_reference` UNIQUE INDEX가 void 포함 전체 테이블에 적용되어 재발급 시 동일 `reference_no`(= `packageId`)로 duplicate key 오류 100% 발생. `is_voided = false` 조건으로 partial unique index 전환하여 근본 해결.

---

## 전제조건

| 조건 | 상태 |
|:-----|:----:|
| 없음 — 즉시 착수 가능 | ✅ |

---

## 구현 범위

### §1 — Migration 파일 작성

신규 마이그레이션 파일 생성:
```
supabase/migrations/YYYYMMDDHHMMSS_ups_009_labels_reference_partial_unique.sql
```

내용:
```sql
-- DEF-083: idx_ups_labels_reference → partial unique index (is_voided = false)
DROP INDEX IF EXISTS "idx_ups_labels_reference";
CREATE UNIQUE INDEX "idx_ups_labels_reference_active"
  ON "public"."zen_ups_labels" ("reference_no")
  WHERE "is_voided" = false;
```

> **주의**: 기존 인덱스명 `idx_ups_labels_reference`를 DROP하고 새 이름 `idx_ups_labels_reference_active`로 생성. 향후 혼동 방지를 위해 명칭 변경.

### §2 — 로컬 마이그레이션 적용 및 검증

```bash
rtk supabase db push  # 또는 supabase migration apply
```

검증:
```sql
-- Supabase Studio에서 확인
SELECT indexname, indexdef FROM pg_indexes
WHERE tablename = 'zen_ups_labels' AND indexname LIKE '%reference%';
-- 결과: idx_ups_labels_reference_active ... WHERE (is_voided = false)
```

### §3 — 빌드 확인

```bash
rtk npm run build
```

### §4 — 회귀 테스트

```bash
rtk npm run test:regression
```

---

## DoD (Definition of Done)

- [ ] §1 migration 파일 작성 완료 (`ups_009_labels_reference_partial_unique.sql`)
- [ ] §2 로컬 마이그레이션 적용 + partial index 확인 (`pg_indexes` 쿼리)
- [ ] §3 `npm run build` PASS
- [ ] §4 `npm run test:regression` PASS + 결과 기재
- [ ] R-17 커밋 순서 준수 (코드 커밋 → 문서 커밋)
- [ ] 코드 커밋 해시 기재: _(구현 후 기재)_
- [ ] 문서 커밋 해시 기재: _(구현 후 기재)_
- [ ] PR 생성 (`Closes #141`)

---

## [설계 의견]

_Baker 기재_

---

## [설계 확정]

_Aiden 전속_

---

## [작업 결과]

_Baker 완료 후 기재_

---

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-28 | Aiden (ZEN_CEO) | TASK-B-035 신규 발령 — DEF-083 partial unique index fix · Baker · Issue #141 · Edward 승인 |
