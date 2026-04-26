# SAR_2026-04-26_013 — FIN-RLS-01: zen_invoices UPDATE 정책 누락

## 1. 기본 정보

| 항목 | 내용 |
|------|------|
| 버그 ID | BUG-FIN-RLS-01 |
| 발견일 | 2026-04-26 |
| 영향 범위 | TC-UAT-FIN.3 (결제 확인) 완전 블록 |
| 심각도 | Critical |
| 발견 경위 | UAT 브라우저 테스트 (Playwright) |

## 2. 문제 설명

`zen_invoices` 테이블에 RLS(Row Level Security)가 활성화되어 있으나, **SELECT 정책만 존재하고 UPDATE 정책이 없었음**.  
`updatePaymentStatus()` Server Action이 `supabase.update(...).select('metadata').single()`을 호출할 때, PostgREST가 UPDATE를 RLS로 차단 → 0행 반환 → `.single()` 실패.

## 3. 에러 메시지

```
⨯ Error: 결제 상태 업데이트 실패: Cannot coerce the result to a single JSON object
```

- HTTP 500 Internal Server Error (`POST /ko/settlement`)
- PostgREST `.single()`: "Cannot coerce the result to a single JSON object" = 0행 업데이트

## 4. 근본 원인

```sql
-- 존재한 정책 (SELECT만)
CREATE POLICY "Shippers can view their own zen_invoices" ON public.zen_invoices
    FOR SELECT USING (...);

-- 누락된 정책 (UPDATE 없음)
-- RLS 활성화 상태에서 UPDATE 정책 없으면 모든 UPDATE 차단
```

## 5. 수정 내용

**Migration**: `supabase/migrations/20260426050000_fix_invoices_rls_admin_update.sql`

```sql
CREATE POLICY "Admins can update zen_invoices" ON public.zen_invoices
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN'))
    )
    WITH CHECK (...same...);

CREATE POLICY "Admins can insert zen_invoices" ON public.zen_invoices
    FOR INSERT WITH CHECK (...same...);
```

## 6. 검증 결과

- TC-UAT-FIN.3: INV-UAT-001 UNPAID → PAID 변경 ✅
- 대시보드 카운터: Unpaid 1→0, Recently Paid 0→1 ✅
- 회귀 테스트: 109/109 ✅

## 7. 재발 방지

RLS 활성화 시 반드시 SELECT/INSERT/UPDATE/DELETE 모든 필요한 정책을 함께 작성할 것.  
체크리스트에 "RLS 테이블 생성 시 CRUD 전 정책 명시" 항목 추가.
