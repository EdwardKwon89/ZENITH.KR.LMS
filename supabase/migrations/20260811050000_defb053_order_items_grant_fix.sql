-- 20260811050000_defb053_order_items_grant_fix.sql
-- DEF-B-053 (Issue #1063): zen_order_items 권한 누락으로 update_order_status_atomic RPC 실패
--
-- 배경: PR#1061(TASK-B-280) CI에서 "permission denied for table zen_order_items" 발생.
--       undoUpsRegistration() → updateOrderStatus() → RPC update_order_status_atomic()
--       (SECURITY INVOKER, 20260520224100_imp047_atomic_transactions.sql)가 재고 조정을 위해
--       zen_order_items를 SELECT하는데, 이 테이블(20260420030201_20260420_orders_b2c_extension.sql
--       에서 생성)은 생성 이후 단 한 번도 명시적 GRANT를 받은 적이 없음.
--
-- 로컬 개발 DB에서는 재현되지 않음(오랜 기간 누적된 role 기본 권한으로 정상 동작) —
-- IMP-153(20260728110000)이 동일 근본 원인(CI의 fresh `supabase db reset`은 마이그레이션만
-- 재생하므로 GRANT 누락 테이블에서 실패)으로 이미 문서화한 패턴이 이 테이블에도 재발한 것.
-- IMP-153은 authenticated 롤에 SELECT만 소급 부여했고 이 마이그레이션(2026-04-20) 시점 이후
-- 생성된 테이블 기준이라 zen_order_items는 포함됐어야 하나, service_role 등 다른 롤 및
-- INSERT/UPDATE/DELETE 권한은 애초에 다루지 않았음 — 이번 건으로 명시적으로 보강.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.zen_order_items TO authenticated;
GRANT ALL ON public.zen_order_items TO service_role;
