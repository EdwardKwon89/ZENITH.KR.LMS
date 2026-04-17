-- [ZENITH_LMS] 기초 기준 정보 데이터 (Master Data)
-- 작성일: 2026-04-17
-- 설명: 국가, 항구, 오더 상태 등 시스템 운영에 필요한 기초 마스터 데이터

-- 0. 공통 코드 그룹 (Common Code Groups)
INSERT INTO public.common_code_groups (group_code, group_name, is_system, description) VALUES
('MEMBER_STATUS', '회원 상태', true, '회원 계정의 활성/비활성 상태'),
('SERVICE_TYPE', '운송 서비스 구분', true, '항공/해상/국제택배 등 서비스 유형'),
('INVOICE_STATUS', '청구서 상태', true, '청구 금액의 수납 상태')
ON CONFLICT (group_code) DO UPDATE SET
    group_name = EXCLUDED.group_name,
    description = EXCLUDED.description;

-- 1. 공통 코드 상세 (Common Codes)
INSERT INTO public.common_codes (group_code, code_value, code_name_ko, code_name_en, code_name_zh, code_name_ja, sort_order) VALUES
-- 회원 상태
('MEMBER_STATUS', 'ACTIVE', '활성', 'Active', '活跃', '有効', 1),
('MEMBER_STATUS', 'INACTIVE', '비활성', 'Inactive', '不活跃', '無効', 2),
('MEMBER_STATUS', 'WITHDRAWN', '탈퇴', 'Withdrawn', '已注销', '退会', 3),
-- 서비스 유형
('SERVICE_TYPE', 'AIR', '항공운송', 'Air Freight', '空运', '航空輸送', 1),
('SERVICE_TYPE', 'SEA', '해상운송', 'Sea Freight', '海运', '海上輸送', 2),
('SERVICE_TYPE', 'CIR', '국제택배', 'Courier', '国际快递', '国際宅配', 3),
('SERVICE_TYPE', 'CCL', '통관서비스', 'Customs Clearance', '报关服务', '通関サービス', 4),
-- 청구서 상태
('INVOICE_STATUS', 'UNPAID', '미납', 'Unpaid', '未付', '未払い', 1),
('INVOICE_STATUS', 'PARTIAL', '부분입금', 'Partial', '部分支付', '一部支払い', 2),
('INVOICE_STATUS', 'PAID', '완납', 'Paid', '已付', '支払い済み', 3)
ON CONFLICT (group_code, code_value) DO UPDATE SET
    code_name_ko = EXCLUDED.code_name_ko,
    code_name_en = EXCLUDED.code_name_en,
    code_name_zh = EXCLUDED.code_name_zh,
    code_name_ja = EXCLUDED.code_name_ja,
    sort_order = EXCLUDED.sort_order;

-- 2. 국가 데이터 (Nations)
INSERT INTO public.nations (iso_alpha2, iso_alpha3, nation_name_ko, nation_name_en, nation_name_zh, nation_name_ja, phone_code) VALUES
('KR', 'KOR', '대한민국', 'South Korea', '韩国', '韓国', '82'),
('US', 'USA', '미국', 'United States', '美国', 'アメリカ', '1'),
('CN', 'CHN', '중국', 'China', '中国', '中国', '86'),
('JP', 'JPN', '일본', 'Japan', '日本', '日本', '81'),
('HK', 'HKG', '홍콩', 'Hong Kong', '香港', '香港', '852'),
('VN', 'VNM', '베트남', 'Vietnam', '越南', 'ベトナム', '84'),
('SG', 'SGP', '싱가포르', 'Singapore', '新加坡', 'シンガポール', '65')
ON CONFLICT (iso_alpha2) DO UPDATE SET
    nation_name_ko = EXCLUDED.nation_name_ko,
    nation_name_en = EXCLUDED.nation_name_en,
    nation_name_zh = EXCLUDED.nation_name_zh,
    nation_name_ja = EXCLUDED.nation_name_ja;

-- 3. 항구/공항 데이터 (Ports)
INSERT INTO public.ports (port_code, nation_code, port_name_ko, port_name_en, port_name_zh, port_name_ja, port_type) VALUES
('ICN', 'KR', '인천국제공항', 'Incheon Int''l Airport', '仁川国际机场', '仁川国際空港', 'AIR'),
('PUS', 'KR', '부산항', 'Busan Port', '釜山港', '釜山港', 'SEA'),
('LAX', 'US', '로스앤젤레스 공항', 'Los Angeles Int''l Airport', '洛杉矶国际机场', 'ロサンゼルス国際空港', 'AIR'),
('PVG', 'CN', '상하이 푸동 공항', 'Shanghai Pudong Int''l Airport', '上海浦东国际机场', '上海浦東国際空港', 'AIR'),
('NRT', 'JP', '나리타 국제공항', 'Narita Int''l Airport', '成田国际机场', '成田国際空港', 'AIR'),
('HKG', 'HK', '홍콩 국제공항', 'Hong Kong Int''l Airport', '香港国际机场', '香港国際空港', 'AIR'),
('SGN', 'VN', '탄손누트 국제공항', 'Tan Son Nhat Int''l Airport', '新山一国际机场', 'タンソンニャット国際空港', 'AIR')
ON CONFLICT (port_code) DO UPDATE SET
    port_name_ko = EXCLUDED.port_name_ko,
    port_name_en = EXCLUDED.port_name_en,
    port_name_zh = EXCLUDED.port_name_zh,
    port_name_ja = EXCLUDED.port_name_ja;

-- 4. 오더 상태 데이터 (Order Statuses)
INSERT INTO public.order_status_master (status_code, status_name_ko, status_name_en, status_name_zh, status_name_ja, description) VALUES
('REGISTERED', '접수', 'Registered', '已注册', '受領', '최초 오더 등록 상태'),
('PACKED', '패킹완료', 'Packed', '已打包', 'パッキング完了', '마스터 오더 할당 및 합적 완료'),
('WAREHOUSED', '입고완료', 'Warehoused', '已入库', '入庫完了', '창고 실물 확인 및 입고 처리'),
('RELEASED', '출고완료', 'Released', '已出고', '出庫完了', '창고에서 운송 시작'),
('DELIVERED', '배송완료', 'Delivered', '已送达', '配送完了', '최종 수하인에게 인도 완료'),
('CANCELED', '취소', 'Canceled', '已取消', 'キャンセル', '오더 취소 상태')
ON CONFLICT (status_code) DO UPDATE SET
    status_name_ko = EXCLUDED.status_name_ko,
    status_name_en = EXCLUDED.status_name_en,
    status_name_zh = EXCLUDED.status_name_zh,
    status_name_ja = EXCLUDED.status_name_ja;

-- 5. 외부 코드 매핑 예시 (Standard Code Mapping)
INSERT INTO public.standard_code_mapping (category, external_org, external_code, internal_code, description) VALUES
('NATION', 'ISO', 'KOR', 'KR', 'ISO Alpha-3 to Alpha-2 mapping'),
('NATION', 'MOFA', 'KOR', 'KR', 'Ministry of Foreign Affairs mapping'),
('PORT', 'IATA', 'ICN', 'ICN', 'IATA Port mapping'),
('STATUS', 'CARRIER', 'DEL', 'DELIVERED', 'Carrier status mapping example')
ON CONFLICT (category, external_org, external_code) DO NOTHING;
