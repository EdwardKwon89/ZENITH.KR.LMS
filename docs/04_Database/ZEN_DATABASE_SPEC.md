# 🛡️ ZENITH_LMS Definitive Database Specification (zen_*)

**Version**: 1.0
**Last Updated**: 2026-04-17
**Scope**: All Integrated Logistics Management System (LMS) core tables.


#### 7. zen_rate_tiers (슬랩 요율 상세)
운송 요율(Rate Card)에 종속된 중량 구간별 상세 단가를 관리합니다.
- `id` (uuid, PK): 고유 식별자
- `rate_card_id` (uuid, FK): 관련 요율 카드 ID
- `weight_min` (numeric): 해당 요율이 시작되는 최소 중량/부피 (ex: 45kg)
- `unit_price` (numeric): 해당 구간의 단위당 단가
- `min_total_price` (numeric): 해당 구간 적용 시 발생하는 최소 청구 금액
- `is_direct` (boolean): 직항 여부 (Default: true)
- `transit_days` (integer): 예상 상세 운송 소요 일수
- `valid_from` (timestamptz): 요율 유효 시작일
- `valid_to` (timestamptz): 요율 유효 종료일
- `remarks` (text): 특이사항 및 비고
- `created_at` (timestamp): 생성일시

## 1. zen_organizations (조직 관리)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | 고유 ID |
| parent_id | UUID | REFERENCES zen_organizations(id) | 계층 구조 (본사-지사) |
| name | TEXT | NOT NULL | 조직명 |
| type | TEXT | NOT NULL, CHECK (type IN ('PLATFORM', 'SHIPPER', 'CARRIER')) | 조직 유형 |
| metadata | JSONB | DEFAULT '{}' | 사업자번호, 설정값 등 |
| status | TEXT | DEFAULT 'PENDING' | 상태 (ACTIVE, PENDING 등) |
| created_at | TIMESTAMPTZ | DEFAULT now() | 생성일 |

## 2. zen_ports (항구/공항 마스터)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | 고유 ID |
| code | TEXT | UNIQUE, NOT NULL | IATA/UNLOCODE (ICN, PUS) |
| name | TEXT | NOT NULL | 항구/공항 국문/영문명 |
| type | TEXT | NOT NULL, CHECK (type IN ('AIR', 'SEA', 'LAND')) | 운송 수단 타입 |
| country_code| CHAR(2) | NOT NULL | ISO 2자리 국가 코드 (KR, US) |
| created_at | TIMESTAMPTZ | DEFAULT now() | 생성일 |

## 3. zen_rate_cards (요율 카드)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | 고유 ID |
| org_id | UUID | REFERENCES zen_organizations(id) | 요율 소유 조직 ID |
| origin_code | TEXT | NOT NULL | 출발지 항구 코드 (zen_ports.code와 연결) |
| dest_code | TEXT | NOT NULL | 도착지 항구 코드 (zen_ports.code와 연결) |
| mode | TEXT | NOT NULL, CHECK (mode IN ('AIR', 'SEA', 'LAND')) | 운송 모드 |
| unit_type | TEXT | NOT NULL | KG, CBM, LCL, FCL_20 등 |
| unit_price | NUMERIC | NOT NULL | 단가 |
| currency | TEXT | DEFAULT 'USD' | 화폐 단위 |
| created_at | TIMESTAMPTZ | DEFAULT now() | 생성일 |

## 4. zen_orders (예약/오더)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | 고유 ID |
| order_no | TEXT | UNIQUE, NOT NULL | 주문 번호 (e.g., ZN-20260417-001) |
| shipper_id | UUID | REFERENCES zen_organizations(id) | 화주 조직 ID |
| origin_port_id| UUID | REFERENCES zen_ports(id) | 출발지 ID |
| dest_port_id | UUID | REFERENCES zen_ports(id) | 도착지 ID |
| status | TEXT | DEFAULT 'REGISTERED' | 상태 |
| cargo_details | JSONB | NOT NULL | 중량, 부피, 품명 등 (LEGACY: 별도 테이블 권장) |
| created_at | TIMESTAMPTZ | DEFAULT now() | 생성일 |

## 5. zen_order_items (오더 상세 항목)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | 고유 ID |
| order_id | UUID | REFERENCES zen_orders(id) | 소속 오더 ID |
| sku_code | TEXT | - | 품목 코드 |
| item_name | TEXT | NOT NULL | 품목명 |
| quantity | INTEGER | DEFAULT 1 | 수량 |
| unit_price | NUMERIC | - | 단가 |
| currency | TEXT | DEFAULT 'USD' | 화폐 |
| weight | NUMERIC | - | 중량 (kg) |
| volume | NUMERIC | - | 부피 (CBM) |
| created_at | TIMESTAMPTZ | DEFAULT now() | 생성일 |
| updated_at | TIMESTAMPTZ | DEFAULT now() | 수정일 |
