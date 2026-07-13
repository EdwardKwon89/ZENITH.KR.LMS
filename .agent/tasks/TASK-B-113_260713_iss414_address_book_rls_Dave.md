# TASK-B-113: Issue #414 — 조직 소속 사용자 주소록 저장 불가 (zen_address_book RLS 정책 누락)

**담당**: Dave (DeepSeek V4 Flash Free)
**생성일**: 2026-07-13
**우선순위**: P1 (Critical)
**상태**: 🔔

---

## [설계]

### 문제
`zen_address_book` 테이블에 조직 기반 접근 정책(`zen_address_book_org_member_access`)이 생성되지 않음 (원 마이그레이션에서 `zen_organization_members` 테이블 존재 여부 조건 검사 → 테이블 없음 → 정책 미생성). 조직 소속 사용자(org_id 기반)의 주소록 INSERT/UPDATE가 전면 차단됨.

### 조치
신규 마이그레이션으로 정책 재생성 — 표준 패턴 사용:
```sql
DROP POLICY IF EXISTS zen_address_book_org_member_access ON public.zen_address_book;
CREATE POLICY zen_address_book_org_member_access ON public.zen_address_book
  FOR ALL TO authenticated
  USING (org_id IS NOT NULL AND org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid)
  WITH CHECK (org_id IS NOT NULL AND org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid);
```

---

## [작업 결과]

### 변경 파일
1. `supabase/migrations/20260713000000_iss414_address_book_org_rls.sql` (신규) — RLS 정책 재생성

### 검증
- **CI Regression Tests**: ✅ PASS
- **Task File Check**: ✅ PASS

### 커밋
- `TBD` — `[Dave] feat: TASK-B-113 Issue #414 — 조직 소속 사용자 주소록 RLS 정책 재생성`

### PR
- `TBD`

---

## [DoD Checklist]

- [x] 신규 마이그레이션 SQL 작성 (DROP + CREATE POLICY, USING+WITH CHECK 명시)
- [x] CI 회귀 테스트 PASS 확인
- [x] task file 생성 + ACTIVE_TASK.md 반영
- [x] check-R17-DoD 전항목 통과

---

## [발견 이슈]

없음
