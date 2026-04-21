-- WBS 1.2: 공통 코드 및 마스터 데이터 인프라
-- 작성자: Antigravity
-- 날짜: 2026-04-18

-- 1. 공통 코드 그룹 테이블 (대분류)
CREATE TABLE common_code_groups (
    id TEXT PRIMARY KEY, -- 그룹 식별자 (e.g., 'CARGO_STATUS')
    name TEXT NOT NULL, -- 명칭
    description TEXT,
    is_system_reserved BOOLEAN DEFAULT false, -- 시스템 예약 여부
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
-- 2. 공통 코드 상세 테이블 (소분류)
CREATE TABLE common_codes (
    group_id TEXT REFERENCES common_code_groups(id) ON DELETE CASCADE,
    code TEXT NOT NULL, -- 실제 코드 값 (e.g., '10', 'AIR')
    name TEXT NOT NULL, -- 명칭 (e.g., '접수완료', '항공')
    description TEXT,
    sort_order INTEGER DEFAULT 0, -- 정렬 순서
    is_active BOOLEAN DEFAULT true, -- 활성화 여부
    metadata JSONB DEFAULT '{}'::jsonb, -- 추가 속성
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (group_id, code)
);
-- 3. Audit 필드 자동 업데이트 함수 (기존에 없으면 생성)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';
CREATE TRIGGER update_common_code_groups_modtime
    BEFORE UPDATE ON common_code_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_common_codes_modtime
    BEFORE UPDATE ON common_codes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- 4. 보안 설정 (RLS)
ALTER TABLE common_code_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE common_codes ENABLE ROW LEVEL SECURITY;
-- 모든 사용자는 코드 정보를 조회할 수 있음
CREATE POLICY "Common code groups are viewable by all authenticated users" ON common_code_groups
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Common codes are viewable by all authenticated users" ON common_codes
    FOR SELECT USING (auth.role() = 'authenticated');
-- 오직 ADMIN만 코드 정보를 수정할 수 있음 (profiles 테이블의 role 필드 참조)
CREATE POLICY "Only admins can modify code groups" ON common_code_groups
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
        )
    );
CREATE POLICY "Only admins can modify codes" ON common_codes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
        )
    );
