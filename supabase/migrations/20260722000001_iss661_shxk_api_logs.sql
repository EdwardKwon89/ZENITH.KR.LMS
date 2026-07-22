-- Issue #661: SHXK API 호출 통합 감사 로그 테이블

CREATE TABLE IF NOT EXISTS public.zen_shxk_api_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  method text NOT NULL,
  reference_no text,
  request_params jsonb,
  response_body jsonb,
  success boolean NOT NULL,
  http_status int,
  error_message text,
  is_mock boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.zen_shxk_api_logs ENABLE ROW LEVEL SECURITY;

-- admin/service_role 전용 (어드민 조회용, 일반 유저 접근 불가)
CREATE POLICY "admin_all_zen_shxk_api_logs" ON public.zen_shxk_api_logs
  FOR ALL TO authenticated
  USING (public.get_my_role() IN ('ZENITH_SUPER_ADMIN', 'ADMIN', 'MANAGER'));

GRANT ALL ON public.zen_shxk_api_logs TO service_role;
GRANT INSERT ON public.zen_shxk_api_logs TO authenticated;

COMMENT ON TABLE public.zen_shxk_api_logs IS 'SHXK UPS API 호출 통합 감사 로그 (Issue #661)';
COMMENT ON COLUMN public.zen_shxk_api_logs.method IS 'ShxkServiceMethod: createorder/getnewlabel/removeorder/gettrack/gettrackingnumber';
COMMENT ON COLUMN public.zen_shxk_api_logs.reference_no IS '추적용 reference_no (params에서 추출)';
COMMENT ON COLUMN public.zen_shxk_api_logs.request_params IS '요청 paramsJson 원본';
COMMENT ON COLUMN public.zen_shxk_api_logs.response_body IS '응답 원문';
COMMENT ON COLUMN public.zen_shxk_api_logs.success IS '호출 성공 여부 (1=성공, 0=실패)';
COMMENT ON COLUMN public.zen_shxk_api_logs.http_status IS 'HTTP 상태 코드 (네트워크 오류 시 null)';
COMMENT ON COLUMN public.zen_shxk_api_logs.is_mock IS 'SHXK_TEST_MOCK=true 모드에서 호출된 경우 true';
COMMENT ON COLUMN public.zen_shxk_api_logs.created_at IS '호출 시각';
