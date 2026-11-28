-- ============================================================================
-- TASK-1174 / DEF-161 (Issue #1470): zen_invoice_history 접근 제어 정렬
--
-- 목적:
--   인보이스 상태 변경 감사 이력 테이블 zen_invoice_history 에 RLS 가 없고(정책 0건)
--   테이블 권한이 과도하게 부여되어 있다. 앱은 이 테이블에 INSERT 만 한다(조회 코드 없음,
--   모두 로그인 세션 클라이언트, changed_by = 행위자 본인).
--
-- 변경:
--   1) RLS 활성화.
--   2) 테이블 권한 정리: PUBLIC·anon 전부 회수, authenticated 는 SELECT·INSERT 만
--      (감사 이력이므로 UPDATE·DELETE·TRUNCATE 등은 회수). service_role 권한은 그대로.
--   3) 정책 2개:
--      - SELECT: 관리자 계열(ADMIN·ZENITH_SUPER_ADMIN·MANAGER) 또는 해당 인보이스를 볼 수 있는 사용자
--        (zen_invoices 의 RLS 를 그대로 따른다).
--      - INSERT: changed_by 가 본인이고, 관리자 계열이거나 해당 인보이스를 볼 수 있는 사용자.
--
-- 주의:
--   - 컬럼·데이터 불변. 앱 코드 변경 없음.
--   - FK ON DELETE CASCADE(인보이스 삭제 시 이력 삭제)는 RLS·권한의 영향을 받지 않는다(RI 액션).
--   - MANAGER 의 zen_invoices 정책(TASK-B-382)과는 독립이다: 관리자 계열 조건을 명시했다.
--
-- 롤백 SQL (원래 상태 복원 — RLS 비활성, 정책 0건, anon·authenticated 전체 권한):
--   DROP POLICY IF EXISTS "invoice_history_select" ON public.zen_invoice_history;
--   DROP POLICY IF EXISTS "invoice_history_insert" ON public.zen_invoice_history;
--   ALTER TABLE public.zen_invoice_history DISABLE ROW LEVEL SECURITY;
--   GRANT ALL ON public.zen_invoice_history TO anon;
--   GRANT ALL ON public.zen_invoice_history TO authenticated;
--   NOTIFY pgrst, 'reload schema';
-- ============================================================================

ALTER TABLE public.zen_invoice_history ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.zen_invoice_history FROM PUBLIC;
REVOKE ALL ON public.zen_invoice_history FROM anon;
REVOKE ALL ON public.zen_invoice_history FROM authenticated;
GRANT SELECT, INSERT ON public.zen_invoice_history TO authenticated;

DROP POLICY IF EXISTS "invoice_history_select" ON public.zen_invoice_history;
CREATE POLICY "invoice_history_select"
  ON public.zen_invoice_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.zen_profiles AS p
      WHERE p.id = auth.uid()
        AND p.role = ANY (ARRAY['ADMIN'::text, 'ZENITH_SUPER_ADMIN'::text, 'MANAGER'::text])
    )
    OR EXISTS (
      SELECT 1
      FROM public.zen_invoices AS i
      WHERE i.id = zen_invoice_history.invoice_id
    )
  );

DROP POLICY IF EXISTS "invoice_history_insert" ON public.zen_invoice_history;
CREATE POLICY "invoice_history_insert"
  ON public.zen_invoice_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    changed_by = auth.uid()
    AND (
      EXISTS (
        SELECT 1
        FROM public.zen_profiles AS p
        WHERE p.id = auth.uid()
          AND p.role = ANY (ARRAY['ADMIN'::text, 'ZENITH_SUPER_ADMIN'::text, 'MANAGER'::text])
      )
      OR EXISTS (
        SELECT 1
        FROM public.zen_invoices AS i
        WHERE i.id = zen_invoice_history.invoice_id
      )
    )
  );

NOTIFY pgrst, 'reload schema';
