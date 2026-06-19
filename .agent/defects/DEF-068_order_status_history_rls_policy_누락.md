# DEF-068: `order_status_history` SELECT RLS policy 누락

| 항목 | 내용 |
|:----|:----|
| **DEF#** | DEF-068 |
| **제목** | `order_status_history` SELECT RLS policy 누락 — ADMIN 포함 모든 인증 사용자 empty 반환 |
| **긴급도** | High |
| **발견 경위** | TASK-158 E2E-22 일마감 테스트 수행 중 GH Issue #39 분석 과정에서 Aiden 발견 |
| **발견일** | 2026-06-19 |
| **작성자** | Aiden (ZEN_CEO) |

---

## 현상

`/ko/ups/daily-close` 일마감 페이지에서 조회 버튼 클릭 시, 오더 데이터(RELEASED 상태)가 DB에 존재하더라도 조회 결과가 항상 비어 있음.

**영향 범위**: `getDailyOutboundSummary`, `getDailyRevenueSummary`, `getDailyCloseHistory` 3개 Server Action 전부.

---

## 원인

`order_status_history` 테이블은 migration `20260428235219_remote_schema.sql`에서:
- `ALTER TABLE "public"."order_status_history" ENABLE ROW LEVEL SECURITY;` — RLS 활성화
- `GRANT SELECT ON TABLE "public"."order_status_history" TO "authenticated";` — 역할 권한 부여

그러나 **SELECT에 대한 RLS policy가 단 하나도 없음** (전체 migration 파일 grep 확인).

Supabase PostgREST에서 RLS 활성화 + policy 없음 = **모든 SELECT 쿼리에 대해 빈 배열 반환** (오류 없음).

따라서 Server Action의 `order_status_history` 조회가 항상 `[]` → `orderIds.length === 0` → 모든 함수 early return.

---

## 영향 범위

- `src/lib/actions/ups-daily-close.ts` — 3개 Server Action
- `/ko/ups/daily-close` 일마감 페이지 전체 기능 불가
- ADMIN/MANAGER 역할 사용자 모두 영향

---

## 임시 조치

없음. 현재 일마감 기능은 완전히 비활성화 상태.

---

## 권장 조치

신규 migration 파일 작성:

```sql
-- migration: 20260619XXXXXX_fix_order_status_history_rls_policy.sql

-- ADMIN은 전체 조회 가능
CREATE POLICY "Admins can view all order status history"
  ON public.order_status_history
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'ZENITH_SUPER_ADMIN')
  );

-- MANAGER는 전체 조회 가능
CREATE POLICY "Managers can view all order status history"
  ON public.order_status_history
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'MANAGER'
  );
```

---

## 관련 파일

- `supabase/migrations/20260428235219_remote_schema.sql` (line 267: RLS 활성화, SELECT policy 없음)
- `src/lib/actions/ups-daily-close.ts` (3개 Server Action)
- GH Issue #39

---

## 담당 Task

TASK-158 재작업 시 D_Kai가 위 migration 추가.
