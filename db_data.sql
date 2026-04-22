SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict Kfa6i0SlnQsyR3KIbhP3GeGf8WPoglkwR9KLAASFWBhpDUHg1sPoP5Xcp6s7CuY

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: common_code_groups; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."common_code_groups" ("group_code", "group_name", "is_system", "description", "created_at", "updated_at") VALUES
	('MEMBER_STATUS', '회원 상태', true, '회원 계정의 활성/비활성 상태', '2026-04-17 08:12:29.725539+00', '2026-04-17 08:12:29.725539+00'),
	('SERVICE_TYPE', '운송 서비스 구분', true, '항공/해상/국제택배 등 서비스 유형', '2026-04-17 08:12:29.725539+00', '2026-04-17 08:12:29.725539+00'),
	('INVOICE_STATUS', '청구서 상태', true, '청구 금액의 수납 상태', '2026-04-17 08:12:29.725539+00', '2026-04-17 08:12:29.725539+00'),
	('USER_ROLE', '사용자 역할 권한', true, '시스템 8대 표준 역할', '2026-04-20 06:37:23.900349+00', '2026-04-20 06:37:23.900349+00'),
	('ORDER_STATUS', '오더 상태', true, '주문 처리 단계별 상태', '2026-04-20 06:40:09.133711+00', '2026-04-20 06:40:09.133711+00'),
	('ORDER_TYPE', '오더 유형', true, '주문 성격에 따른 분류', '2026-04-20 06:40:09.133711+00', '2026-04-20 06:40:09.133711+00');


--
-- Data for Name: common_codes; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."common_codes" ("group_code", "code_value", "code_name_ko", "code_name_en", "code_name_zh", "code_name_ja", "sort_order", "is_active", "description", "created_at", "updated_at") VALUES
	('MEMBER_STATUS', 'ACTIVE', '활성', 'Active', '活跃', '有効', 1, true, NULL, '2026-04-17 08:12:29.73609+00', '2026-04-17 08:12:29.73609+00'),
	('MEMBER_STATUS', 'INACTIVE', '비활성', 'Inactive', '不活跃', '無効', 2, true, NULL, '2026-04-17 08:12:29.73609+00', '2026-04-17 08:12:29.73609+00'),
	('MEMBER_STATUS', 'WITHDRAWN', '탈퇴', 'Withdrawn', '已注销', '退会', 3, true, NULL, '2026-04-17 08:12:29.73609+00', '2026-04-17 08:12:29.73609+00'),
	('SERVICE_TYPE', 'AIR', '항공운송', 'Air Freight', '空运', '航空輸送', 1, true, NULL, '2026-04-17 08:12:29.73609+00', '2026-04-17 08:12:29.73609+00'),
	('SERVICE_TYPE', 'SEA', '해상운송', 'Sea Freight', '海运', '海上輸送', 2, true, NULL, '2026-04-17 08:12:29.73609+00', '2026-04-17 08:12:29.73609+00'),
	('SERVICE_TYPE', 'CIR', '국제택배', 'Courier', '国际快递', '国際宅配', 3, true, NULL, '2026-04-17 08:12:29.73609+00', '2026-04-17 08:12:29.73609+00'),
	('SERVICE_TYPE', 'CCL', '통관서비스', 'Customs Clearance', '报关服务', '通関サービス', 4, true, NULL, '2026-04-17 08:12:29.73609+00', '2026-04-17 08:12:29.73609+00'),
	('INVOICE_STATUS', 'UNPAID', '미납', 'Unpaid', '未付', '未払い', 1, true, NULL, '2026-04-17 08:12:29.73609+00', '2026-04-17 08:12:29.73609+00'),
	('INVOICE_STATUS', 'PARTIAL', '부분입금', 'Partial', '部分支付', '一部支払い', 2, true, NULL, '2026-04-17 08:12:29.73609+00', '2026-04-17 08:12:29.73609+00'),
	('INVOICE_STATUS', 'PAID', '완납', 'Paid', '已付', '支払い済み', 3, true, NULL, '2026-04-17 08:12:29.73609+00', '2026-04-17 08:12:29.73609+00'),
	('USER_ROLE', 'ZENITH_SUPER_ADMIN', '전역 어드민', 'Super Admin', NULL, NULL, 1, true, NULL, '2026-04-20 06:37:23.900349+00', '2026-04-20 06:37:23.900349+00'),
	('USER_ROLE', 'ADMIN', '조직 관리자', 'Admin', NULL, NULL, 2, true, NULL, '2026-04-20 06:37:23.900349+00', '2026-04-20 06:37:23.900349+00'),
	('USER_ROLE', 'MANAGER', '운영 매니저', 'Manager', NULL, NULL, 3, true, NULL, '2026-04-20 06:37:23.900349+00', '2026-04-20 06:37:23.900349+00'),
	('USER_ROLE', 'OPERATOR', '물류 운영자', 'Operator', NULL, NULL, 4, true, NULL, '2026-04-20 06:37:23.900349+00', '2026-04-20 06:37:23.900349+00'),
	('USER_ROLE', 'CARRIER', '운송 파트너', 'Carrier', NULL, NULL, 5, true, NULL, '2026-04-20 06:37:23.900349+00', '2026-04-20 06:37:23.900349+00'),
	('USER_ROLE', 'CORPORATE', '법인 화주', 'Corporate', NULL, NULL, 6, true, NULL, '2026-04-20 06:37:23.900349+00', '2026-04-20 06:37:23.900349+00'),
	('USER_ROLE', 'INDIVIDUAL', '개인 화주', 'Individual', NULL, NULL, 7, true, NULL, '2026-04-20 06:37:23.900349+00', '2026-04-20 06:37:23.900349+00'),
	('USER_ROLE', 'USER', '일반 사용자', 'User', NULL, NULL, 8, true, NULL, '2026-04-20 06:37:23.900349+00', '2026-04-20 06:37:23.900349+00'),
	('ORDER_STATUS', 'REGISTERED', '접수완료', 'Registered', NULL, NULL, 1, true, NULL, '2026-04-20 06:40:09.133711+00', '2026-04-20 06:40:09.133711+00'),
	('ORDER_STATUS', 'PENDING', '보류', 'Pending', NULL, NULL, 2, true, NULL, '2026-04-20 06:40:09.133711+00', '2026-04-20 06:40:09.133711+00'),
	('ORDER_STATUS', 'CONFIRMED', '확정', 'Confirmed', NULL, NULL, 3, true, NULL, '2026-04-20 06:40:09.133711+00', '2026-04-20 06:40:09.133711+00'),
	('ORDER_STATUS', 'CANCELLED', '취소', 'Cancelled', NULL, NULL, 4, true, NULL, '2026-04-20 06:40:09.133711+00', '2026-04-20 06:40:09.133711+00'),
	('ORDER_TYPE', 'B2B', 'B2B (기업용)', 'B2B', NULL, NULL, 1, true, NULL, '2026-04-20 06:40:09.133711+00', '2026-04-20 06:40:09.133711+00'),
	('ORDER_TYPE', 'B2C', 'B2C (개인용)', 'B2C', NULL, NULL, 2, true, NULL, '2026-04-20 06:40:09.133711+00', '2026-04-20 06:40:09.133711+00');


--
-- Data for Name: grade_master; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."grade_master" ("grade_code", "grade_name_ko", "grade_name_en", "grade_name_zh", "grade_name_ja", "discount_rate", "benefit_desc", "created_at", "updated_at") VALUES
	('FAMILY', '패밀리', 'Family', '家庭', 'ファミリー', 0.00, NULL, '2026-04-17 08:12:29.40674+00', '2026-04-17 08:12:29.40674+00'),
	('BRONZE', '브론즈', 'Bronze', '青铜', 'ブロンズ', 0.00, NULL, '2026-04-17 08:12:29.40674+00', '2026-04-17 08:12:29.40674+00'),
	('SILVER', '실버', 'Silver', '白银', 'シルバー', 0.00, NULL, '2026-04-17 08:12:29.40674+00', '2026-04-17 08:12:29.40674+00'),
	('GOLD', '골드', 'Gold', '黄金', 'ゴールド', 0.00, NULL, '2026-04-17 08:12:29.40674+00', '2026-04-17 08:12:29.40674+00'),
	('PLATINUM', '플래티넘', 'Platinum', '白金', 'プラチナ', 0.00, NULL, '2026-04-17 08:12:29.40674+00', '2026-04-17 08:12:29.40674+00');


--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."organizations" ("id", "parent_id", "org_code", "org_name_ko", "org_name_en", "org_name_zh", "org_name_ja", "org_type", "registration_no", "address", "is_active", "created_at", "updated_at", "corporate_id", "biz_no", "rep_name", "approval_date", "rejection_reason", "approval_comment", "status", "type") VALUES
	('19f0fb46-f3f2-4014-8374-df1692f4393c', NULL, NULL, 'ZENITH GOVERNANCE', NULL, NULL, NULL, 'PLATFORM', NULL, NULL, true, '2026-04-19 00:06:21.175294+00', '2026-04-19 00:06:21.175294+00', NULL, '999-99-99999', NULL, NULL, NULL, NULL, 'ACTIVE', 'SHIPPER'),
	('7dfb3e03-aceb-446a-a7ea-1b3bd1fde140', NULL, NULL, 'UAT 심사 운송사', NULL, NULL, NULL, 'CARRIER', NULL, NULL, true, '2026-04-19 04:04:05.07673+00', '2026-04-19 05:16:26.604891+00', '010001', '777-77-77777', NULL, '2026-04-19 05:16:26.604891+00', NULL, NULL, 'ACTIVE', 'CARRIER'),
	('d48e3bf2-148c-441f-85c9-f59eaf56fa1c', NULL, NULL, 'UAT Test Corp', NULL, NULL, NULL, 'SHIPPER', NULL, NULL, true, '2026-04-18 23:52:45.636812+00', '2026-04-19 12:39:54.823318+00', '010002', '1234567890', NULL, '2026-04-19 12:39:54.823318+00', NULL, NULL, 'ACTIVE', 'SHIPPER'),
	('9079dfa6-1085-427f-b047-023d8e53abf1', NULL, 'ZEN_GT', '(주) 제니스 글로벌', NULL, NULL, NULL, 'SHIPPER', NULL, NULL, true, '2026-04-21 07:26:54.583843+00', '2026-04-21 07:26:54.583843+00', NULL, NULL, NULL, NULL, NULL, NULL, 'APPROVED', 'SHIPPER');


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."profiles" ("id", "org_id", "email", "full_name", "role", "grade_code", "is_approved", "created_at", "updated_at", "status", "preferred_language") VALUES
	('d26d903c-5dc5-426e-a6c4-ac85e08caba0', '19f0fb46-f3f2-4014-8374-df1692f4393c', 'governance_master@zenith.kr', NULL, 'ADMIN', 'FAMILY', false, '2026-04-18 23:55:19.929603+00', '2026-04-19 00:20:20.917499+00', 'ACTIVE', 'ko'),
	('ef2041d4-c92e-41b7-bc75-a212edf405c7', '7dfb3e03-aceb-446a-a7ea-1b3bd1fde140', 'corporate_test@zenith.kr', 'UAT ', 'ADMIN', 'FAMILY', false, '2026-04-19 03:15:46.752784+00', '2026-04-19 05:16:26.604891+00', 'ACTIVE', 'ko'),
	('35ed18e4-e746-4975-9ce0-59d03f413472', 'd48e3bf2-148c-441f-85c9-f59eaf56fa1c', 'test_corp_001@zenith.kr', 'UAT Tester', 'ADMIN', 'FAMILY', false, '2026-04-18 23:52:45.636812+00', '2026-04-19 12:39:54.823318+00', 'ACTIVE', 'ko'),
	('72994ff3-304b-4b18-ba43-e14556f277c6', NULL, 'admin@zenith.kr', NULL, 'USER', 'FAMILY', false, '2026-04-19 13:32:54.82513+00', '2026-04-19 13:32:54.82513+00', 'ACTIVE', 'ko'),
	('6b474b1d-f96c-4fb8-b69e-e354e76c3174', NULL, 'temp_admin@zenith.kr', 'Zenith.Admin', 'ZENITH_SUPER_ADMIN', 'FAMILY', false, '2026-04-20 03:11:23.267578+00', '2026-04-20 06:40:09.133711+00', 'ACTIVE', 'ko'),
	('7f176112-9ddd-4e71-bb69-b98ce7383c82', '9079dfa6-1085-427f-b047-023d8e53abf1', 'edward2025.kwon@gmail.com', 'Edward Kwon', 'ADMIN', 'FAMILY', true, '2026-04-19 06:20:52.973132+00', '2026-04-21 07:26:54.583843+00', 'ACTIVE', 'ko');


--
-- Data for Name: grade_promotion_request; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: nations; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."nations" ("iso_alpha2", "iso_alpha3", "nation_name_ko", "nation_name_en", "nation_name_zh", "nation_name_ja", "phone_code", "is_active", "created_at", "updated_at") VALUES
	('KR', 'KOR', '대한민국', 'South Korea', '韩国', '韓国', '82', true, '2026-04-17 08:12:29.74646+00', '2026-04-17 08:12:29.74646+00'),
	('US', 'USA', '미국', 'United States', '美国', 'アメリカ', '1', true, '2026-04-17 08:12:29.74646+00', '2026-04-17 08:12:29.74646+00'),
	('CN', 'CHN', '중국', 'China', '中国', '中国', '86', true, '2026-04-17 08:12:29.74646+00', '2026-04-17 08:12:29.74646+00'),
	('JP', 'JPN', '일본', 'Japan', '日本', '日本', '81', true, '2026-04-17 08:12:29.74646+00', '2026-04-17 08:12:29.74646+00'),
	('HK', 'HKG', '홍콩', 'Hong Kong', '香港', '香港', '852', true, '2026-04-17 08:12:29.74646+00', '2026-04-17 08:12:29.74646+00'),
	('VN', 'VNM', '베트남', 'Vietnam', '越南', 'ベトナム', '84', true, '2026-04-17 08:12:29.74646+00', '2026-04-17 08:12:29.74646+00'),
	('SG', 'SGP', '싱가포르', 'Singapore', '新加坡', 'シンガポール', '65', true, '2026-04-17 08:12:29.74646+00', '2026-04-17 08:12:29.74646+00');


--
-- Data for Name: zen_organizations; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."zen_organizations" ("id", "parent_id", "name", "type", "metadata", "status", "created_at") VALUES
	('e4ce7a4a-ff7c-4428-b657-e1169fa20afb', NULL, 'ZENITH LOGISTICS CORE', 'PLATFORM', '{}', 'ACTIVE', '2026-04-17 13:51:47.195793+00'),
	('8899dc29-37b4-43d5-bffd-9540702c0469', NULL, 'SNTL CARRIER', 'CARRIER', '{}', 'ACTIVE', '2026-04-17 13:51:47.195793+00'),
	('5041126d-6c07-4716-9ad8-ea6719e2ee7b', NULL, 'GLOBAL SHIPPER KR', 'SHIPPER', '{}', 'ACTIVE', '2026-04-17 13:51:47.195793+00'),
	('1acc1747-0368-4d02-8765-9f297747fa3e', NULL, 'Eagle Express', 'CARRIER', '{"specialty": "AIR", "business_no": "123-45-67890"}', 'ACTIVE', '2026-04-17 14:43:32.060856+00'),
	('e6d08fe7-5c6e-47f3-adc7-47c8548039d2', NULL, 'Oceanic Logistics', 'CARRIER', '{"specialty": "SEA", "business_no": "987-65-43210"}', 'ACTIVE', '2026-04-17 14:43:32.060856+00'),
	('e8b8a8b8-c8b8-48b8-a8b8-d8b8a8b8c8d8', NULL, 'SYSTEM_INDIVIDUAL_SHIPPER', 'SHIPPER', '{}', 'ACTIVE', '2026-04-21 00:35:48.447442+00'),
	('9079dfa6-1085-427f-b047-023d8e53abf1', NULL, '(주) 제니스 글로벌', 'SHIPPER', '{}', 'ACTIVE', '2026-04-21 07:18:05.669769+00'),
	('d6e687c8-7f7c-4dae-b4a1-939ca319428d', NULL, 'Zenith Express', 'CARRIER', '{}', 'ACTIVE', '2026-04-21 07:18:05.669769+00');


--
-- Data for Name: zen_ports; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."zen_ports" ("id", "code", "name", "type", "country_code", "created_at") VALUES
	('02193782-3eb5-4c02-a865-a11a403bdeb5', 'PUS', 'Busan Port', 'SEA', 'KR', '2026-04-17 13:51:47.195793+00'),
	('1a2446c4-4283-403a-89b9-531986286097', 'SHA', 'Shanghai Port', 'SEA', 'CN', '2026-04-17 13:51:47.195793+00'),
	('7047a2ab-3b64-43e9-820c-0ff1edbb7b32', 'JFK', 'John F. Kennedy International Airport', 'AIR', 'US', '2026-04-17 14:43:32.060856+00'),
	('b137ec98-a6e3-4e98-aeee-bc3e0317eb71', 'HKG', 'Hong Kong International Airport', 'AIR', 'CN', '2026-04-17 14:43:32.060856+00'),
	('fb57cd94-2ede-463c-be51-0d0b7eb5ab0e', 'SGP', 'Singapore Changi Airport', 'AIR', 'SG', '2026-04-17 14:43:32.060856+00'),
	('955859b2-3182-44be-97ab-004502b51f98', 'ICN', 'Incheon Int''l Airport', 'AIR', 'KR', '2026-04-17 13:51:47.195793+00'),
	('b9aab26c-caa2-491e-bff4-1590ea6f0aa9', 'LAX', 'Los Angeles Int''l Airport', 'AIR', 'US', '2026-04-17 13:51:47.195793+00'),
	('3b729def-38f6-41e7-8a73-79e2d03ec68c', 'SIN', 'Singapore Changi Airport', 'AIR', 'SG', '2026-04-21 07:18:05.669769+00');


--
-- Data for Name: zen_master_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: zen_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."zen_orders" ("id", "order_no", "shipper_id", "origin_port_id", "dest_port_id", "status", "cargo_details", "created_at", "order_date", "received_at", "confirmed_at", "carrier_id", "recipient_pccc", "recipient_contact", "recipient_email", "order_type", "delivery_notes", "recipient_name", "recipient_address", "recipient_phone", "recipient_zipcode", "shipper_contact_name", "shipper_contact_phone", "description", "transport_mode", "master_order_id", "billing_status") VALUES
	('3ff5b116-29cd-4d90-8dd0-0e99c36a2155', 'ZEN-2026-000001', '9079dfa6-1085-427f-b047-023d8e53abf1', '955859b2-3182-44be-97ab-004502b51f98', 'b9aab26c-caa2-491e-bff4-1590ea6f0aa9', 'REGISTERED', '{"commodity": "Electronics", "item_count": 1, "total_weight": 12.5}', '2026-04-20 06:55:13.470245+00', '2026-04-20 06:55:13.470245+00', NULL, NULL, NULL, NULL, '010-1234-0001', NULL, 'B2C_ECOM', 'Zenith Cloud Logistics Real-time Tracking Sample #1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'AIR', NULL, 'PENDING'),
	('01281340-5b0e-42d3-8e79-032dbc769b9e', 'ZEN-2026-000002', '9079dfa6-1085-427f-b047-023d8e53abf1', '955859b2-3182-44be-97ab-004502b51f98', 'b9aab26c-caa2-491e-bff4-1590ea6f0aa9', 'CONFIRMED', '{"commodity": "Electronics", "item_count": 1, "total_weight": 12.5}', '2026-04-20 06:55:13.470245+00', '2026-04-20 06:55:13.470245+00', NULL, NULL, NULL, NULL, '010-1234-0002', NULL, 'B2C_EXPRESS', 'Zenith Cloud Logistics Real-time Tracking Sample #2', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'AIR', NULL, 'PENDING'),
	('3fb92cc9-6b1a-41bb-bb49-7634b15d316c', 'ZEN-2026-000003', '9079dfa6-1085-427f-b047-023d8e53abf1', '955859b2-3182-44be-97ab-004502b51f98', 'b9aab26c-caa2-491e-bff4-1590ea6f0aa9', 'PENDING', '{"commodity": "Electronics", "item_count": 1, "total_weight": 12.5}', '2026-04-20 06:55:13.470245+00', '2026-04-20 06:55:13.470245+00', NULL, NULL, NULL, NULL, '010-1234-0003', NULL, 'B2B', 'Zenith Cloud Logistics Real-time Tracking Sample #3', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'AIR', NULL, 'PENDING'),
	('73ecd0be-ff5f-482b-9e44-cda55c54648b', 'ZEN-2026-000004', '9079dfa6-1085-427f-b047-023d8e53abf1', '955859b2-3182-44be-97ab-004502b51f98', 'b9aab26c-caa2-491e-bff4-1590ea6f0aa9', 'REGISTERED', '{"commodity": "Electronics", "item_count": 1, "total_weight": 12.5}', '2026-04-20 06:55:13.470245+00', '2026-04-20 06:55:13.470245+00', NULL, NULL, NULL, NULL, '010-1234-0004', NULL, 'B2C_ECOM', 'Zenith Cloud Logistics Real-time Tracking Sample #4', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'AIR', NULL, 'PENDING'),
	('b4c0cb43-08ea-4fa3-81e9-14df0f4b0eba', 'ZEN-2026-000005', '9079dfa6-1085-427f-b047-023d8e53abf1', '955859b2-3182-44be-97ab-004502b51f98', 'b9aab26c-caa2-491e-bff4-1590ea6f0aa9', 'REGISTERED', '{"commodity": "Electronics", "item_count": 1, "total_weight": 12.5}', '2026-04-20 06:55:13.470245+00', '2026-04-20 06:55:13.470245+00', NULL, NULL, NULL, NULL, '010-1234-0005', NULL, 'B2C_EXPRESS', 'Zenith Cloud Logistics Real-time Tracking Sample #5', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'AIR', NULL, 'PENDING'),
	('ea4650eb-c9d7-48c6-ae6b-f6343ec81ced', 'ZEN-2026-000006', '9079dfa6-1085-427f-b047-023d8e53abf1', '955859b2-3182-44be-97ab-004502b51f98', 'b9aab26c-caa2-491e-bff4-1590ea6f0aa9', 'REGISTERED', '{"commodity": "Electronics", "item_count": 1, "total_weight": 12.5}', '2026-04-20 06:55:13.470245+00', '2026-04-20 06:55:13.470245+00', NULL, NULL, NULL, NULL, '010-1234-0006', NULL, 'B2B', 'Zenith Cloud Logistics Real-time Tracking Sample #6', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'AIR', NULL, 'PENDING'),
	('7dc0002f-82c2-442e-a53d-fdfe91da9b8f', 'ZEN-2026-000007', '9079dfa6-1085-427f-b047-023d8e53abf1', '955859b2-3182-44be-97ab-004502b51f98', 'b9aab26c-caa2-491e-bff4-1590ea6f0aa9', 'REGISTERED', '{"commodity": "Electronics", "item_count": 1, "total_weight": 12.5}', '2026-04-20 06:55:13.470245+00', '2026-04-20 06:55:13.470245+00', NULL, NULL, NULL, NULL, '010-1234-0007', NULL, 'B2C_ECOM', 'Zenith Cloud Logistics Real-time Tracking Sample #7', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'AIR', NULL, 'PENDING'),
	('51fc4a31-7d26-429a-b4ee-4713745ff517', 'ZEN-2026-000008', '9079dfa6-1085-427f-b047-023d8e53abf1', '955859b2-3182-44be-97ab-004502b51f98', 'b9aab26c-caa2-491e-bff4-1590ea6f0aa9', 'REGISTERED', '{"commodity": "Electronics", "item_count": 1, "total_weight": 12.5}', '2026-04-20 06:55:13.470245+00', '2026-04-20 06:55:13.470245+00', NULL, NULL, NULL, NULL, '010-1234-0008', NULL, 'B2C_EXPRESS', 'Zenith Cloud Logistics Real-time Tracking Sample #8', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'AIR', NULL, 'PENDING'),
	('260a296a-203b-4179-b20e-506bdd70b868', 'ZEN-2026-000009', '9079dfa6-1085-427f-b047-023d8e53abf1', '955859b2-3182-44be-97ab-004502b51f98', 'b9aab26c-caa2-491e-bff4-1590ea6f0aa9', 'REGISTERED', '{"commodity": "Electronics", "item_count": 1, "total_weight": 12.5}', '2026-04-20 06:55:13.470245+00', '2026-04-20 06:55:13.470245+00', NULL, NULL, NULL, NULL, '010-1234-0009', NULL, 'B2B', 'Zenith Cloud Logistics Real-time Tracking Sample #9', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'AIR', NULL, 'PENDING'),
	('313ee5b1-752c-4a5a-8b7d-1938f3d76b2c', 'ZEN-2026-000010', '9079dfa6-1085-427f-b047-023d8e53abf1', '955859b2-3182-44be-97ab-004502b51f98', 'b9aab26c-caa2-491e-bff4-1590ea6f0aa9', 'REGISTERED', '{"commodity": "Electronics", "item_count": 1, "total_weight": 12.5}', '2026-04-20 06:55:13.470245+00', '2026-04-20 06:55:13.470245+00', NULL, NULL, NULL, NULL, '010-1234-0010', NULL, 'B2C_ECOM', 'Zenith Cloud Logistics Real-time Tracking Sample #10', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'AIR', NULL, 'PENDING'),
	('e55e5612-e1dc-4c8d-94b3-430eeebefec6', 'ORD-2026-0001', '9079dfa6-1085-427f-b047-023d8e53abf1', '955859b2-3182-44be-97ab-004502b51f98', 'b9aab26c-caa2-491e-bff4-1590ea6f0aa9', 'REGISTERED', '{}', '2026-04-21 07:18:05.669769+00', '2026-04-21 07:18:05.669769+00', NULL, NULL, NULL, NULL, NULL, NULL, 'B2B', NULL, 'John Doe', '123 Venice Blvd, LA, USA', NULL, NULL, NULL, NULL, NULL, 'AIR', NULL, 'PENDING'),
	('ad838680-37d5-4c8e-85b2-f14ec75bcc58', 'ORD-2026-0002', '9079dfa6-1085-427f-b047-023d8e53abf1', '955859b2-3182-44be-97ab-004502b51f98', 'b9aab26c-caa2-491e-bff4-1590ea6f0aa9', 'CONFIRMED', '{}', '2026-04-21 07:18:05.669769+00', '2026-04-21 07:18:05.669769+00', NULL, NULL, NULL, NULL, NULL, NULL, 'B2B', NULL, 'Jane Smith', '456 Hollywood St, LA, USA', NULL, NULL, NULL, NULL, NULL, 'AIR', NULL, 'PENDING'),
	('f09dca7a-e8a4-406c-a4ac-015a91f2c610', 'ORD-2026-0003', '9079dfa6-1085-427f-b047-023d8e53abf1', '955859b2-3182-44be-97ab-004502b51f98', '3b729def-38f6-41e7-8a73-79e2d03ec68c', 'REGISTERED', '{}', '2026-04-21 07:18:05.669769+00', '2026-04-21 07:18:05.669769+00', NULL, NULL, NULL, NULL, NULL, NULL, 'B2B', NULL, 'Robert Lee', '789 Orchard Rd, Singapore', NULL, NULL, NULL, NULL, NULL, 'AIR', NULL, 'PENDING');


--
-- Data for Name: order_status_history; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: order_status_master; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."order_status_master" ("status_code", "status_name_ko", "status_name_en", "status_name_zh", "status_name_ja", "description", "created_at", "updated_at") VALUES
	('REGISTERED', '접수', 'Registered', '已注册', '受領', '최초 오더 등록 상태', '2026-04-17 08:12:29.773475+00', '2026-04-17 08:12:29.773475+00'),
	('PACKED', '패킹완료', 'Packed', '已打包', 'パッキング完了', '마스터 오더 할당 및 합적 완료', '2026-04-17 08:12:29.773475+00', '2026-04-17 08:12:29.773475+00'),
	('WAREHOUSED', '입고완료', 'Warehoused', '已入库', '入庫完了', '창고 실물 확인 및 입고 처리', '2026-04-17 08:12:29.773475+00', '2026-04-17 08:12:29.773475+00'),
	('RELEASED', '출고완료', 'Released', '已出고', '出庫完了', '창고에서 운송 시작', '2026-04-17 08:12:29.773475+00', '2026-04-17 08:12:29.773475+00'),
	('DELIVERED', '배송완료', 'Delivered', '已送达', '配送完了', '최종 수하인에게 인도 완료', '2026-04-17 08:12:29.773475+00', '2026-04-17 08:12:29.773475+00'),
	('CANCELED', '취소', 'Canceled', '已取消', 'キャンセル', '오더 취소 상태', '2026-04-17 08:12:29.773475+00', '2026-04-17 08:12:29.773475+00'),
	('SCHEDULED', '스케줄배정', NULL, NULL, NULL, '운송 스케줄이 배정된 상태', '2026-04-21 14:15:50.206116+00', '2026-04-21 14:15:50.206116+00'),
	('HELD', '보류', NULL, NULL, NULL, '현장 이슈로 인해 프로세스가 일시 중단된 상태', '2026-04-21 14:15:50.206116+00', '2026-04-21 14:15:50.206116+00'),
	('RETURNED', '반송', NULL, NULL, NULL, '화주에게 화물이 반송된 상태', '2026-04-21 14:15:50.206116+00', '2026-04-21 14:15:50.206116+00'),
	('IN_TRANSIT', '운송중', NULL, NULL, NULL, '출고 후 실제 운송 수단에 의해 이동 중인 상태', '2026-04-21 14:15:50.206116+00', '2026-04-21 14:15:50.206116+00');


--
-- Data for Name: organization_documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."organization_documents" ("id", "org_id", "doc_type", "file_path", "status", "rejection_reason", "requested_at", "reviewed_at", "reviewed_by") VALUES
	('2470e17c-32e6-4590-a757-fb0bf9cf16e8', 'd48e3bf2-148c-441f-85c9-f59eaf56fa1c', 'BUSINESS_LICENSE', 'uat/dummy_biz_reg.pdf', 'PENDING', NULL, '2026-04-19 00:06:21.175294+00', NULL, NULL);


--
-- Data for Name: ports; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."ports" ("port_code", "nation_code", "port_name_ko", "port_name_en", "port_name_zh", "port_name_ja", "port_type", "is_active", "created_at", "updated_at") VALUES
	('ICN  ', 'KR', '인천국제공항', 'Incheon Int''l Airport', '仁川国际机场', '仁川国際空港', 'AIR', true, '2026-04-17 08:12:29.761009+00', '2026-04-17 08:12:29.761009+00'),
	('PUS  ', 'KR', '부산항', 'Busan Port', '釜山港', '釜山港', 'SEA', true, '2026-04-17 08:12:29.761009+00', '2026-04-17 08:12:29.761009+00'),
	('LAX  ', 'US', '로스앤젤레스 공항', 'Los Angeles Int''l Airport', '洛杉矶国际机场', 'ロサンゼルス国際空港', 'AIR', true, '2026-04-17 08:12:29.761009+00', '2026-04-17 08:12:29.761009+00'),
	('PVG  ', 'CN', '상하이 푸동 공항', 'Shanghai Pudong Int''l Airport', '上海浦东国际机场', '上海浦東国際空港', 'AIR', true, '2026-04-17 08:12:29.761009+00', '2026-04-17 08:12:29.761009+00'),
	('NRT  ', 'JP', '나리타 국제공항', 'Narita Int''l Airport', '成田国际机场', '成田国際空港', 'AIR', true, '2026-04-17 08:12:29.761009+00', '2026-04-17 08:12:29.761009+00'),
	('HKG  ', 'HK', '홍콩 국제공항', 'Hong Kong Int''l Airport', '香港国际机场', '香港国際空港', 'AIR', true, '2026-04-17 08:12:29.761009+00', '2026-04-17 08:12:29.761009+00'),
	('SGN  ', 'VN', '탄손누트 국제공항', 'Tan Son Nhat Int''l Airport', '新山一国际机场', 'タンソンニャット国際空港', 'AIR', true, '2026-04-17 08:12:29.761009+00', '2026-04-17 08:12:29.761009+00'),
	('KRICN', 'KR', '인천항', NULL, NULL, NULL, 'SEA', true, '2026-04-20 10:38:06.524784+00', '2026-04-20 10:38:06.524784+00'),
	('KRPUS', 'KR', '부산항', NULL, NULL, NULL, 'SEA', true, '2026-04-20 10:38:06.524784+00', '2026-04-20 10:38:06.524784+00');


--
-- Data for Name: rate_cards; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: rate_card_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: rate_slabs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: standard_code_mapping; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."standard_code_mapping" ("id", "category", "external_org", "external_code", "internal_code", "description", "is_active", "created_at", "updated_at") VALUES
	('37389040-a41f-48a3-9a45-3d097bda49c7', 'NATION', 'ISO', 'KOR', 'KR', 'ISO Alpha-3 to Alpha-2 mapping', true, '2026-04-17 08:12:29.784058+00', '2026-04-17 08:12:29.784058+00'),
	('1f144f79-1719-46fb-93ef-039b64b7dcf8', 'NATION', 'MOFA', 'KOR', 'KR', 'Ministry of Foreign Affairs mapping', true, '2026-04-17 08:12:29.784058+00', '2026-04-17 08:12:29.784058+00'),
	('774c5810-a7d9-4eaf-aed2-c55b584f4e42', 'PORT', 'IATA', 'ICN', 'ICN', 'IATA Port mapping', true, '2026-04-17 08:12:29.784058+00', '2026-04-17 08:12:29.784058+00'),
	('131104c3-c7f4-4f82-9098-551ccb156955', 'STATUS', 'CARRIER', 'DEL', 'DELIVERED', 'Carrier status mapping example', true, '2026-04-17 08:12:29.784058+00', '2026-04-17 08:12:29.784058+00');


--
-- Data for Name: system_config; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."system_config" ("config_key", "config_value", "description", "updated_at") VALUES
	('DEFAULT_PROFIT_RATE', '0.15', 'Default profit rate for logistics calculation (15%)', '2026-04-17 08:12:29.619331+00');


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."system_settings" ("key", "value", "category", "label", "description", "updated_at") VALUES
	('SESSION_IDLE_TIMEOUT_MIN', '10', 'AUTH', '세션 유휴 타임아웃', '사용자 활동이 없을 경우 세션이 만료되는 시간 (분 단위)', '2026-04-19 12:09:06.49347+00'),
	('PLATFORM_VERSION', 'v2.1 Premium Governance', 'UI', '플랫폼 버전', '시스템 전반에 노출되는 브랜딩 버전 정보', '2026-04-19 12:09:06.49347+00'),
	('AUTH_REDIRECT_LOGIN', '/login', 'AUTH', '로그인 리다이렉트 경로', '미인증 사용자를 유도할 엔드포인트', '2026-04-19 12:09:06.49347+00'),
	('AUTH_REDIRECT_PENDING', '/register/pending', 'AUTH', '승인 대기 리다이렉트 경로', '가입 승인 대기자를 유도할 엔드포인트', '2026-04-19 12:09:06.49347+00');


--
-- Data for Name: zen_contracts; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: zen_invoices; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: zen_order_costs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: zen_order_packages; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: zen_order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: zen_order_rate_snapshots; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: zen_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: zen_rate_cards; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."zen_rate_cards" ("id", "org_id", "origin_code", "dest_code", "mode", "unit_type", "unit_price", "currency", "created_at", "transit_days", "is_direct", "valid_from", "valid_to", "remarks", "version_no", "status", "priority", "customer_id") VALUES
	('b0d1ff95-f7be-4c98-9040-f7cedadfb73e', '8899dc29-37b4-43d5-bffd-9540702c0469', 'ICN', 'LAX', 'AIR', 'KG', 5.50, 'USD', '2026-04-17 13:51:47.195793+00', NULL, true, '2026-04-17 14:41:12.332617+00', NULL, NULL, 1, 'DRAFT', 0, NULL),
	('0015fae8-e00b-4c28-90ac-8d5b020bacba', '8899dc29-37b4-43d5-bffd-9540702c0469', 'PUS', 'SHA', 'SEA', 'CBM', 45.00, 'USD', '2026-04-17 13:51:47.195793+00', NULL, true, '2026-04-17 14:41:12.332617+00', NULL, NULL, 1, 'DRAFT', 0, NULL),
	('22132670-1d5a-4620-96c3-f22218bff8b2', '1acc1747-0368-4d02-8765-9f297747fa3e', 'ICN', 'LAX', 'AIR', 'KG', 5.5, 'USD', '2026-04-17 14:43:32.060856+00', 2, true, '2026-04-17 14:43:32.060856+00', NULL, NULL, 1, 'DRAFT', 0, NULL),
	('1fddbab9-5e14-4d4d-9f44-ba5049ce8f76', 'e6d08fe7-5c6e-47f3-adc7-47c8548039d2', 'PUS', 'LAX', 'SEA', 'CBM', 120.0, 'USD', '2026-04-17 14:43:32.060856+00', 15, true, '2026-04-17 14:43:32.060856+00', NULL, NULL, 1, 'DRAFT', 0, NULL),
	('73be888c-1e16-4379-b431-908dd0b22dc3', 'd6e687c8-7f7c-4dae-b4a1-939ca319428d', 'ICN', 'LAX', 'AIR', 'KG', 5.5, 'USD', '2026-04-21 07:18:05.669769+00', NULL, true, '2026-04-21 07:18:05.669769+00', NULL, NULL, 1, 'ACTIVE', 0, NULL);


--
-- Data for Name: zen_rate_tiers; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."zen_rate_tiers" ("id", "rate_card_id", "weight_min", "unit_price", "min_total_price", "created_at") VALUES
	('134d72ee-a0f9-4802-9ba0-43cc3508cd22', '22132670-1d5a-4620-96c3-f22218bff8b2', 0, 8.5, 50, '2026-04-17 14:43:32.060856+00'),
	('2f21fdc8-292f-461c-87d4-ef1548588975', '22132670-1d5a-4620-96c3-f22218bff8b2', 45, 6.2, 50, '2026-04-17 14:43:32.060856+00'),
	('62e19800-6437-429a-91e9-fa5b36ae584e', '22132670-1d5a-4620-96c3-f22218bff8b2', 100, 5.5, 50, '2026-04-17 14:43:32.060856+00'),
	('e14e533f-daf7-4638-a7f2-26e0ab072508', '1fddbab9-5e14-4d4d-9f44-ba5049ce8f76', 0, 150.0, 300, '2026-04-17 14:43:32.060856+00'),
	('c97ba0ee-0312-4d12-93f3-e27a22d66f7a', '1fddbab9-5e14-4d4d-9f44-ba5049ce8f76', 1, 120.0, 300, '2026-04-17 14:43:32.060856+00'),
	('30174fbf-4ef0-4604-9d45-38462e66a3f3', '1fddbab9-5e14-4d4d-9f44-ba5049ce8f76', 5, 100.0, 300, '2026-04-17 14:43:32.060856+00');


--
-- Data for Name: zen_role_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: zen_system_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."zen_system_settings" ("setting_key", "setting_value", "description", "created_at", "updated_at") VALUES
	('default_page_size', '20', '기본 오더 목록 노출 행 수', '2026-04-20 06:37:23.900349+00', '2026-04-20 06:37:23.900349+00');


--
-- Data for Name: zen_tracking_configs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: zen_tracking_events; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: zen_tracking_scenarios; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."zen_tracking_scenarios" ("id", "transport_mode", "order_status", "sequence_no", "event_code", "relative_minutes", "location_template", "description_template", "created_at") VALUES
	('243418a7-9eff-4b6b-8998-b98e42c92e0f', 'AIR', 'RELEASED', 1, 'BOOKED', -120, 'System', 'Air freight booking confirmed', '2026-04-22 01:33:53.667563+00'),
	('d978dab0-3bcf-4d6c-b42f-5130b95bddaa', 'AIR', 'RELEASED', 2, 'PICKED_UP', -60, 'Origin Warehouse', 'Cargo picked up from shipper', '2026-04-22 01:33:53.667563+00'),
	('409db30b-cb23-4400-9d8e-88f413a158e9', 'AIR', 'RELEASED', 3, 'TERMINAL_IN', -10, 'Incheon Airport (ICN)', 'Cargo arrived at airport terminal', '2026-04-22 01:33:53.667563+00'),
	('ddc971da-7d0c-4eae-8f55-870bd862269a', 'AIR', 'DELIVERED', 4, 'ARRIVED', -30, 'Los Angeles (LAX)', 'Cargo arrived at destination airport', '2026-04-22 01:33:53.667563+00'),
	('e507b4be-f1b4-4d18-9ae5-ebfb58dfbfe0', 'AIR', 'DELIVERED', 5, 'DELIVERED', 0, 'Recipient', 'Final delivery completed', '2026-04-22 01:33:53.667563+00');


--
-- Data for Name: zen_transport_schedules; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Name: corporate_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."corporate_id_seq"', 10002, true);


--
-- Name: master_order_no_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."master_order_no_seq"', 1, false);


--
-- PostgreSQL database dump complete
--

-- \unrestrict Kfa6i0SlnQsyR3KIbhP3GeGf8WPoglkwR9KLAASFWBhpDUHg1sPoP5Xcp6s7CuY

RESET ALL;
