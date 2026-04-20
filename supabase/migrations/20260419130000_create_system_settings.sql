-- 🛡️ [ZENITH_LMS System Governance Table]
-- Created: 2026-04-19
-- Description: 플랫폼 전역 운영 설정을 관리하는 거버넌스 테이블

-- 1. 테이블 생성
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'GENERAL',
    label TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. 보안 정책 (RLS)
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- 2-1. 조회 권한: 모든 인증된 사용자
DROP POLICY IF EXISTS "Enable read access for all users" ON public.system_settings;
CREATE POLICY "Enable read access for all users" ON public.system_settings
    FOR SELECT TO authenticated USING (true);

-- 2-2. 수정 권한: PLATFORM 관리자만 허용
DROP POLICY IF EXISTS "Enable update for platform admins only" ON public.system_settings;
CREATE POLICY "Enable update for platform admins only" ON public.system_settings
    FOR UPDATE TO authenticated
    USING ( (auth.jwt() -> 'app_metadata' ->> 'org_type')::text = 'PLATFORM' );

-- 3. [Policy Seeding] 초기 운영 정책 데이터
INSERT INTO public.system_settings (key, value, category, label, description) VALUES
('SESSION_IDLE_TIMEOUT_MIN', '10', 'AUTH', '세션 유휴 타임아웃', '사용자 활동이 없을 경우 세션이 만료되는 시간 (분 단위)'),
('PLATFORM_VERSION', 'v2.1 Premium Governance', 'UI', '플랫폼 버전', '시스템 전반에 노출되는 브랜딩 버전 정보'),
('AUTH_REDIRECT_LOGIN', '/login', 'AUTH', '로그인 리다이렉트 경로', '미인증 사용자를 유도할 엔드포인트'),
('AUTH_REDIRECT_PENDING', '/register/pending', 'AUTH', '승인 대기 리다이렉트 경로', '가입 승인 대기자를 유도할 엔드포인트')
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    updated_at = now();
