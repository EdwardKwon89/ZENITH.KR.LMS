-- Issue #553: SHXK createorder 응답메시지 저장

ALTER TABLE public.zen_ups_labels
  ADD COLUMN shxk_response_message text;

CREATE TABLE public.zen_ups_label_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES zen_orders(id) ON DELETE CASCADE,
  shxk_code text,
  error_message text NOT NULL,
  attempted_by uuid REFERENCES zen_profiles(id),
  attempted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.zen_ups_label_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY zen_ups_label_errors_admin_all ON public.zen_ups_label_errors
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'MANAGER', 'ZENITH_SUPER_ADMIN'));
-- 참고: shipper/agency_shipper용 org-scoped 조회 정책은 미추가 (의도적) —
-- 내부 API 에러 메시지(코드·원인)는 화주에게 직접 노출되지 않아야 함.
-- 화주는 '라벨 발급 실패' 자체만 UI로 확인 가능

GRANT ALL ON public.zen_ups_label_errors TO service_role;
