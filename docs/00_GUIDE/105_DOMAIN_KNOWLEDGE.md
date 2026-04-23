---
tags: ["domain"]
---

# 105_DOMAIN_KNOWLEDGE (물류 도메인 지식 베이스)

> **프로젝트**: ZENITH_LMS
> **문서번호**: Gov-05
> **오너**: CPO (Antigravity Gemini Low)
> **작성일**: 2026-04-23
> **버전**: v1.0
> **Source of Truth**: 모든 에이전트는 물류 업무 판단 시 본 문서를 최우선 참조한다.

> [!IMPORTANT]
> 본 문서에 없는 도메인 규칙이 필요한 경우, 에이전트는 임의로 판단하지 말고 **CPO에게 질의**하여 내용을 추가한 후 구현한다.

---

## 📖 1. 물류 용어 사전 (Glossary)

| 용어 (한글) | 용어 (영문) | 정의 | 비고 |
|:---|:---|:---|:---|
| **화주** | Shipper | 화물 운송을 의뢰하는 주체. 법인(Corporate) 또는 개인(Individual) | 플랫폼 상 org_type = 'SHIPPER' |
| **송하인** | Consignor | 화물을 발송하는 실제 당사자. 화주와 동일할 수 있음 | shipper_contact_name |
| **수하인** | Consignee | 화물을 수취하는 당사자 | recipient_name |
| **운송사** | Carrier | 화물을 실제 운송하는 기업 | org_type = 'CARRIER' |
| **하우스 오더** | House Order | 개별 화주의 단일 화물 운송 단위 | zen_orders 1개 레코드 |
| **마스터 오더** | Master Order | 다수의 House Order를 그룹화한 대량 출하 단위 (항공편/선박 단위) | zen_master_orders 1개 레코드 |
| **선하증권** | B/L (Bill of Lading) | 해상 운송 화물 수취 및 소유권 증명 서류 | SEA 모드 |
| **항공화물운송장** | AWB (Air Waybill) | 항공 화물 계약·수취 증명 서류. Prefix 3자리 + 8자리 번호 | AIR 모드 |
| **운임** | Freight | 화물 운송에 대한 기본 대가 | zen_order_costs.cost_type = 'FREIGHT' |
| **유류할증료** | Fuel Surcharge | 유가 변동에 따른 추가 부담금 | cost_type = 'FUEL' |
| **보안할증료** | Security Surcharge | 항공 보안 검색 비용 | cost_type = 'SECURITY' |
| **내륙운송비** | Trucking | 항만/공항↔창고 간 지상 운송 비용 | cost_type = 'TRUCKING' |
| **통관비** | Customs | 수출입 통관 처리 비용 | cost_type = 'CUSTOMS' |
| **청구 중량** | Chargeable Weight | 실제 중량과 부피 중량 중 큰 값. 실제 요금 산정 기준 | 아래 계산식 참조 |
| **부피 중량** | Volume Weight | 화물 부피를 중량으로 환산한 값 | AIR: CBM×166.67, SEA: CBM×1000 |
| **슬랩 요율** | Slab Rate | 중량 구간(Tier)별로 차등 적용되는 단가 체계 | weight_tier_min 기준 |
| **인코텀즈** | Incoterms | 국제 무역 거래 조건 표준 (FOB, CIF, EXW 등). 비용/위험 분담 기준 | 계약 조건에 영향 |
| **FCL** | Full Container Load | 컨테이너 전체를 사용하는 해상 화물 (20ft, 40ft) | unit_type = 'FCL_20', 'FCL_40' |
| **LCL** | Less than Container Load | 컨테이너 일부를 혼재 사용하는 해상 화물 | unit_type = 'LCL' |
| **CBM** | Cubic Meter | 부피 단위 (가로×세로×높이 미터) | unit_type = 'CBM' |
| **ETD** | Estimated Time of Departure | 예상 출항/출발 시각 | transport_schedules.etd |
| **ETA** | Estimated Time of Arrival | 예상 도착 시각 | transport_schedules.eta |
| **IATA** | Intl Air Transport Assoc. | 국제항공운송협회. 공항 코드(3자리) 표준 제정 | zen_ports.code (AIR) |
| **UNLOCODE** | UN Locode | 해상 항만 식별 코드 (5자리) | zen_ports.code (SEA) |
| **GS1-128** | GS1-128 Barcode | 물류 포장 단위 바코드 표준 (SSCC 포함) | 창고 입출고 식별 |
| **SSCC-18** | Serial Shipping Container Code | 18자리 고유 물류 단위 식별 코드 | GS1-128 기반 |
| **통관** | Customs Clearance | 수출입 화물에 대한 세관 신고 및 허가 절차 | org_type = 'CUSTOMS' |
| **PCCC** | Personal Customs Clearance Code | 한국 개인 통관 고유부호. B2C 수입 시 필수 | recipient_pccc |
| **VOC** | Voice of Customer | 고객 불만·문의·개선 요청. 별도 티켓 관리 | Phase 4 구현 예정 |

---

## 🔢 2. 핵심 계산 규칙 (Calculation Rules)

### 2-1. Chargeable Weight (청구 중량) 계산

요금 산정의 핵심. **실제 중량(Gross Weight)과 부피 중량(Volume Weight) 중 큰 값**을 사용한다.

```
Chargeable Weight = MAX(Gross Weight, Volume Weight)
```

| 운송 모드 | Volume Factor | 부피 중량 공식 | 예시 |
|:---|:---|:---|:---|
| **AIR** | 1 CBM = 166.67 kg | `CBM × 166.67` | 0.5 CBM → 83.34 kg |
| **SEA / LCL** | 1 CBM = 1,000 kg | `CBM × 1000` | 0.5 CBM → 500 kg |
| **EXP (Express)** | AIR 동일 | `CBM × 166.67` | AIR와 동일 적용 |
| **LAND** | 별도 협의 | 계약 조건에 따름 | 계약서 terms_metadata 참조 |

**예시**:
```
화물: 실제 중량 55 kg, 부피 0.6 CBM (AIR 운송)
부피 중량: 0.6 × 166.67 = 100.0 kg
Chargeable Weight: MAX(55, 100) = 100 kg → 100 kg 기준으로 요금 산정
```

> **구현 참조**: `src/lib/finance/settlement.ts` → `calculateChargeableWeight()`

---

### 2-2. Slab Rate (슬랩 요율) 매칭

중량 구간(Tier) 중 **Chargeable Weight 이상인 구간 중 가장 높은 weight_min**을 선택한다.

```
정렬: weight_min 내림차순
선택: Chargeable Weight >= weight_min 인 첫 번째 티어
```

**예시**:

| Tier | weight_min | unit_price |
|:---|:---|:---|
| Tier 3 | 100 kg | $7.00/kg |
| Tier 2 | 45 kg | $8.50/kg |
| Tier 1 | 0 kg | $10.00/kg |

```
Chargeable Weight = 55 kg
→ 55 >= 45 인 최고 구간: Tier 2 ($8.50/kg)
→ 총 운임: 55 × $8.50 = $467.50
```

> **구현 참조**: `src/lib/logistics/rate-engine.ts` → `calculateSlabRate()`

---

### 2-3. 요율 카드 우선순위 (Rate Card Priority)

동일 구간(Origin→Dest)에 복수의 Rate Card가 존재할 때 적용 우선순위:

```
1순위: priority 값이 높은 카드 (고객 전용 요율)
2순위: priority 동일 시 created_at 최신 카드
3순위: 일반 공개 요율 카드
```

> **구현 참조**: `supabase/migrations/0001_initial_schema.sql` → `rate_cards.priority`

---

### 2-4. 인보이스 번호 생성 규칙

```
형식: INV-YYYYMMDD-[Random 6자리]
예시: INV-20260423-A3F9K2
```

> **구현 참조**: `src/lib/finance/settlement.ts` → `InvoiceGenerator.generateInvoice()`

---

### 2-5. 마스터 오더 번호 생성 규칙

```
형식: M-YYMMDD-NNNN (4자리 시퀀스)
예시: M-260423-0001
```

> **구현 참조**: Supabase RPC → `generate_master_order_no()`

---

## 🔄 3. 오더 상태 전이 규칙 (Order State Machine)

### 3-1. 상태 정의

| 상태 코드 | 한글명 | 설명 |
|:---|:---|:---|
| **REGISTERED** | 등록됨 | 오더 최초 접수 완료 |
| **SCHEDULED** | 배차 완료 | 운송 스케줄 확정 |
| **WAREHOUSED** | 입고됨 | 출발지 창고 입고 완료 |
| **PACKED** | 패킹 완료 | 출하 포장 및 라벨링 완료 |
| **RELEASED** | 출고됨 | 창고 출고 완료. **이 시점에 정산 비용 자동 계산** |
| **IN_TRANSIT** | 운송 중 | 운송 진행 중 |
| **DELIVERED** | 배송 완료 | 수하인 수취 완료 |
| **HELD** | 보류 | 문제 발생으로 처리 보류. 원인 해소 후 재처리 |
| **CANCELED** | 취소됨 | 오더 취소. 최종 상태 (복구 불가) |
| **RETURNED** | 반송됨 | 수취 거부 또는 배송 실패로 반송 |
| **MASTERED** | 마스터 결합됨 | 마스터 오더에 포함된 상태. 개별 상태 변경 불가 |

### 3-2. 상태 전이 허용 규칙

```
REGISTERED  → SCHEDULED, CANCELED, HELD
SCHEDULED   → WAREHOUSED, CANCELED, HELD
WAREHOUSED  → PACKED, HELD, RETURNED
PACKED      → RELEASED, HELD
RELEASED    → IN_TRANSIT, HELD
IN_TRANSIT  → DELIVERED, HELD, RETURNED
DELIVERED   → RETURNED
HELD        → REGISTERED, SCHEDULED, WAREHOUSED, PACKED, RELEASED, IN_TRANSIT, CANCELED
CANCELED    → (종료, 전이 없음)
RETURNED    → WAREHOUSED, CANCELED
MASTERED    → (전이 없음, Master Order 단위로 관리)
```

### 3-3. 역할별 상태 변경 권한

| 역할 | 변경 가능 목표 상태 |
|:---|:---|
| **OPERATOR** | SCHEDULED, HELD, CANCELED |
| **CARRIER** | IN_TRANSIT, DELIVERED |
| **CORPORATE (화주)** | REGISTERED, CANCELED |
| **ADMIN / ZENITH_SUPER_ADMIN** | 모든 상태 |

### 3-4. 수정 불가 상태 (Read-only)

아래 상태의 오더는 내용 수정 불가 (상태 변경만 허용):

```
WAREHOUSED, PACKED, RELEASED, IN_TRANSIT, DELIVERED, CANCELED, MASTERED
```

> **구현 참조**: `src/lib/logistics/status-machine.ts`

---

## 🌐 4. 항만/공항 마스터 데이터

### 4-1. 지원 포트 코드

| 코드 | 명칭 | 유형 | 국가 |
|:---|:---|:---|:---|
| **ICN** | 인천국제공항 | AIR | KR |
| **PUS** | 부산항 | SEA | KR |
| **LAX** | 로스앤젤레스국제공항 | AIR | US |
| **JFK** | 존 F. 케네디국제공항 | AIR | US |
| **ORD** | 오헤어국제공항 | AIR | US |
| **NRT** | 나리타국제공항 | AIR | JP |
| **HND** | 하네다국제공항 | AIR | JP |
| **HKG** | 홍콩국제공항 | AIR | HK |
| **PVG** | 상하이 푸둥국제공항 | AIR | CN |
| **SIN** | 창이국제공항 | AIR | SG |
| **LHR** | 런던 히스로공항 | AIR | GB |
| **FRA** | 프랑크푸르트국제공항 | AIR | DE |
| **CDG** | 파리 샤를드골공항 | AIR | FR |
| **DXB** | 두바이국제공항 | AIR | AE |

> **DB 참조**: `zen_ports` 테이블, `zen_ports.type` = 'AIR' | 'SEA' | 'LAND'

---

## 🏗️ 5. 조직 및 권한 체계

### 5-1. 조직 유형 (Organization Type)

| org_type | 한글명 | 시스템 내 역할 | 진입 경로 |
|:---|:---|:---|:---|
| **PLATFORM** | 플랫폼 운영사 | 시스템 전체 관리 | `/admin` |
| **SHIPPER** | 화주 | 오더 등록·관리, 청구서 확인 | `/orders` |
| **CARRIER** | 운송사 | 배차 수락, 운송 현황 관리 | `/terminal` |
| **CUSTOMS** | 통관사 | 통관 서류 처리 | `/customs` |
| **GUEST** | 미승인 회원 | 승인 대기 상태 | `/register/pending` |

### 5-2. 사용자 역할 (User Role) 및 권한

| role | 한글명 | 주요 접근 경로 | 기능 권한 |
|:---|:---|:---|:---|
| **ZENITH_SUPER_ADMIN** | 슈퍼 관리자 | 전체 | 시스템 설정, 전체 조직 관리, 마스터 데이터 편집 |
| **ADMIN** | 관리자 | `/master`, `/admin`, `/orders`, `/logistics`, `/billing` | 회원 승인, 오더 전체 조회, 인보이스 관리 |
| **MANAGER** | 매니저 | `/orders`, `/logistics`, `/billing`, `/reports` | 오더/창고/정산 관리 |
| **OPERATOR** | 운영자 | `/orders`, `/logistics` | 오더 상태 변경 (SCHEDULED·HELD·CANCELED) |
| **CARRIER** | 운송사 담당자 | `/logistics/delivery`, `/orders/assigned` | 운송 상태 변경 (IN_TRANSIT·DELIVERED) |
| **CORPORATE** | 법인 화주 | `/orders/register`, `/orders/history`, `/billing/invoice` | 오더 등록·조회, 청구서 열람 |
| **INDIVIDUAL** | 개인 화주 | `/orders/register`, `/orders/history` | 오더 등록·조회 |
| **USER** | 일반 사용자 | 제한적 | 프로필 조회, 대기 상태 확인 |

### 5-3. 멤버십 등급 및 할인율

| 등급 | 코드 | 할인율 | 비고 |
|:---|:---|:---|:---|
| **IRON** | IRON | 0% | 기본 |
| **BRONZE** | BRONZE | 5% | |
| **SILVER** | SILVER | 10% | |
| **GOLD** | GOLD | 15% | 최고 우대 |

> **DB 참조**: `common_codes` WHERE `group_id = 'MEMBERSHIP_LEVEL'`, `metadata.discount`

---

## 📦 6. 화물 단위 및 코드 체계

### 6-1. 단위 유형 (Unit Type)

| unit_type | 한글명 | 적용 모드 | 설명 |
|:---|:---|:---|:---|
| **KG** | 킬로그램 | AIR, EXP | Chargeable Weight 기준 |
| **CBM** | 입방미터 | SEA LCL | 부피 기준 |
| **LOT** | 로트 | 전체 | 일괄 단위 요율 |
| **FCL_20** | 20피트 컨테이너 | SEA | 컨테이너 단위 |
| **FCL_40** | 40피트 컨테이너 | SEA | 컨테이너 단위 |
| **LCL** | 혼재 화물 | SEA | CBM/KG 혼합 |

### 6-2. 포장 단위 (Packing Unit)

오더 등록 시 packages 배열에 사용:

| 코드 | 설명 |
|:---|:---|
| **BOX** | 박스 |
| **PLT** | 팔레트 |
| **BAG** | 백/포대 |
| **CRT** | 나무 상자(Crate) |
| **BDL** | 번들(묶음) |
| **EA** | 개별 품목 단위 (items 내 item_packing_unit) |

### 6-3. 비용 유형 (Cost Type)

`zen_order_costs.cost_type` 허용 값:

| cost_type | 한글명 | is_revenue | 설명 |
|:---|:---|:---|:---|
| **FREIGHT** | 기본 운임 | true | 주요 수익 항목 |
| **FUEL** | 유류할증료 | true | |
| **SECURITY** | 보안할증료 | true | 항공 전용 |
| **TRUCKING** | 내륙운송비 | true/false | 방향에 따라 상이 |
| **CUSTOMS** | 통관비 | true/false | 통관사 지급 시 false |

---

## 📡 7. 트래킹 이벤트 체계

### 7-1. 트래킹 이벤트 코드 (Tracking Event Code)

| event_code | 한글명 | 설명 | 매핑 오더 상태 |
|:---|:---|:---|:---|
| **BOOKED** | 예약 완료 | 운송 예약 접수 | SCHEDULED |
| **PICKED_UP** | 픽업 완료 | 화물 집화 | RELEASED |
| **TERMINAL_IN** | 터미널 반입 | 공항/항만 터미널 입고 | WAREHOUSED |
| **DEPARTED** | 출발 | 항공기/선박 출발 | IN_TRANSIT |
| **IN_TRANSIT** | 운송 중 | 운송 진행 중 | IN_TRANSIT |
| **ARRIVED** | 도착 | 목적지 도착 | IN_TRANSIT |
| **OUT_FOR_DELIVERY** | 배송 출발 | 최종 배송지로 출발 | IN_TRANSIT |
| **DELIVERED** | 배송 완료 | 수하인 수취 완료 | DELIVERED |
| **DELAYED** | 지연 | 운송 지연 발생 | HELD |
| **EXCEPTION** | 예외 상황 | 분실·파손·통관 문제 | HELD |

### 7-2. 트래킹 공급자 유형

| provider_type | 설명 | 사용 시점 |
|:---|:---|:---|
| **VIRTUAL** | 시뮬레이션 자동 생성 | 개발/테스트 환경, 실 운송사 미연계 시 |
| **MANUAL** | 관리자 수동 입력 | 외부 API 없는 소규모 운송사 |
| **API** | 외부 운송사 API 연계 | FedEx, DHL 등 실 운송사 연동 |

### 7-3. 가상 시나리오 이벤트 생성 규칙

오더 상태 변경 시 과거 이벤트를 자동 생성하는 시뮬레이션 규칙 (zen_tracking_scenarios):

| 트리거 상태 | 생성 이벤트 | 시간 오프셋 | 운송 모드 |
|:---|:---|:---|:---|
| RELEASED | BOOKED | -120분 | AIR |
| RELEASED | PICKED_UP | -60분 | AIR |
| RELEASED | TERMINAL_IN | -10분 | AIR |
| DELIVERED | ARRIVED | -30분 | AIR |
| DELIVERED | DELIVERED | 0분 | AIR |
| RELEASED | BOOKED | -240분 | SEA |
| RELEASED | PICKED_UP | -120분 | SEA |
| RELEASED | TERMINAL_IN | -30분 | SEA |
| DELIVERED | ARRIVED | -60분 | SEA |
| DELIVERED | DELIVERED | 0분 | SEA |

---

## 💰 8. 정산 및 인보이스 규칙

### 8-1. 정산 트리거

| 트리거 | 자동/수동 | 설명 |
|:---|:---|:---|
| 오더 상태 → **RELEASED** | 자동 | `settle_order_costs()` RPC 실행, zen_order_costs 생성 |
| 인보이스 생성 버튼 | 수동 | ADMIN/MANAGER가 RELEASED 이상 오더 대상으로 생성 |
| 입금 처리 | 수동 | paid_amount 입력 시 status 자동 업데이트 |

### 8-2. 인보이스 상태 전이

```
UNPAID → PARTIAL (부분 입금)
       → PAID (전액 입금)
       → OVERDUE (기한 초과)
       → CANCELED (취소)
PARTIAL → PAID
        → OVERDUE
OVERDUE → PAID
```

### 8-3. is_revenue 플래그 (AR vs AP)

| is_revenue | 구분 | 설명 |
|:---|:---|:---|
| **true** | AR (매출) | 화주에게 청구하는 수익 항목 |
| **false** | AP (매입) | 운송사·통관사에 지급하는 비용 항목 |

### 8-4. 데이터 정밀도 기준

- 금액 컬럼: `DECIMAL(19,4)` — 소수점 4자리까지 저장
- 중량: `NUMERIC(12,3)` — 소수점 3자리 (0.001 kg 단위)
- 부피: `NUMERIC(12,4)` — 소수점 4자리 (0.0001 CBM 단위)

---

## ⚠️ 9. 도메인 엣지케이스 카탈로그 (Edge Cases)

### 9-1. 오더 상태 관련

| ID | 상황 | 처리 규칙 |
|:---|:---|:---|
| EC-O-01 | 오더가 MASTERED 상태일 때 내용 수정 시도 | 거부 (403). 마스터 오더에서 제거 후 수정 가능 |
| EC-O-02 | HELD 상태에서 직접 IN_TRANSIT 전이 시도 | 거부. HELD → 이전 상태 복구 → IN_TRANSIT 순서 필요 |
| EC-O-03 | CANCELED 상태 오더 복구 시도 | 불가. 새 오더 등록 필요 |
| EC-O-04 | 동일 화물에 이미 마스터 오더 있을 때 재결합 | 기존 마스터에서 제거 후 새 마스터 결합 가능 |
| EC-O-05 | CORPORATE 역할이 WAREHOUSED 이후 수정 시도 | 거부 (isOrderEditable() = false) |

### 9-2. 요율 계산 관련

| ID | 상황 | 처리 규칙 |
|:---|:---|:---|
| EC-R-01 | 해당 Origin-Dest 구간 Rate Card 없음 | 오더 등록 불가. "요율 미설정" 오류 반환 |
| EC-R-02 | Chargeable Weight = 0 (중량·부피 모두 미입력) | 오더 등록 불가. 최소 1개 package의 gross_weight 필수 |
| EC-R-03 | 여러 Rate Card의 유효기간 중첩 | 우선순위(priority DESC) → 최신 생성일(created_at DESC) 순 적용 |
| EC-R-04 | 부피 중량이 실제 중량의 5배 초과 | 검증 경고 표시 (데이터 입력 오류 가능성). 블로킹은 아님 |
| EC-R-05 | AIR 모드에서 CBM 단위 Rate Card 사용 시도 | 경고. AIR는 KG 단위 Rate Card 권장 |

### 9-3. 정산 관련

| ID | 상황 | 처리 규칙 |
|:---|:---|:---|
| EC-F-01 | 인보이스 생성 후 오더 비용 변경 | 기존 인보이스 CANCELED 처리 후 재발행 필요 |
| EC-F-02 | paid_amount > total_amount (초과 입금) | status = 'PAID', 차액은 별도 처리 (환불 또는 다음 인보이스 상계) |
| EC-F-03 | CORPORATE 역할이 결제 상태 직접 변경 시도 | 거부 (403). ADMIN/MANAGER만 가능 |
| EC-F-04 | 인보이스 발행 전 오더 CANCELED | 비용 레코드(zen_order_costs) 유지. 인보이스 미생성 |
| EC-F-05 | 다중 통화 혼재 오더 | USD 기준으로 환산하여 합산 (환율은 metadata에 기록) |

### 9-4. 트래킹 관련

| ID | 상황 | 처리 규칙 |
|:---|:---|:---|
| EC-T-01 | 다른 화주 오더의 트래킹 정보 조회 시도 | 거부 (RLS 정책 적용) |
| EC-T-02 | MANUAL 이벤트와 SYSTEM 이벤트 시간 충돌 | MANUAL 이벤트가 우선 표시 |
| EC-T-03 | 가상 트래킹 시나리오에 해당 모드 없음 | 기본 AIR 시나리오 적용 후 경고 로그 |
| EC-T-04 | 트래킹 이벤트 삭제 시도 | 불가. 감사 기록 보존 (source_type 표시) |

### 9-5. RBAC 관련

| ID | 상황 | 처리 규칙 |
|:---|:---|:---|
| EC-A-01 | 미승인 조직(GUEST) 사용자의 오더 등록 시도 | 거부. `/register/pending` 안내 |
| EC-A-02 | CARRIER 사용자가 타 운송사 오더 조회 시도 | 거부 (RLS. 자신에게 배정된 오더만 조회 가능) |
| EC-A-03 | INDIVIDUAL 사용자가 법인 멤버 관리 시도 | 거부 (CORPORATE 역할만 가능) |
| EC-A-04 | 조직 해체 후 남은 사용자 세션 | 강제 로그아웃 처리 (org.status != 'ACTIVE' 확인) |

---

## 🔄 10. 표준 비즈니스 프로세스 (End-to-End Flow)

### 10-1. 오더 생성 → 정산 표준 흐름

```
1. [화주/CORPORATE] 오더 등록
   - 필수: 운송 모드, Origin/Dest 포트, 수하인 정보, 패키지(중량/부피)
   - 선택: 스케줄, 예상 비용, PCCC (B2C 수입 시 필수)
   → zen_orders.status = REGISTERED

2. [OPERATOR] 운송 스케줄 배정
   → zen_orders.status = SCHEDULED
   → zen_orders.schedule_id 연결

3. [OPERATOR/CARRIER] 창고 입고 확인
   → zen_orders.status = WAREHOUSED

4. [OPERATOR] 패킹 완료
   → zen_orders.status = PACKED

5. [OPERATOR] 출고 처리
   → zen_orders.status = RELEASED
   → [자동] settle_order_costs() 실행
      - Chargeable Weight 계산
      - Rate Card 매칭
      - zen_order_costs 생성

6. [CARRIER] 운송 시작
   → zen_orders.status = IN_TRANSIT
   → [자동] 트래킹 이벤트 생성 (DEPARTED)

7. [CARRIER] 배송 완료
   → zen_orders.status = DELIVERED
   → [자동] 트래킹 이벤트 생성 (DELIVERED)

8. [ADMIN/MANAGER] 인보이스 발행
   → zen_invoices 생성 (INV-YYYYMMDD-XXXXX)
   → zen_orders.billing_status = INVOICED

9. [ADMIN/MANAGER] 입금 처리
   → zen_invoices.paid_amount 업데이트
   → zen_invoices.status = PAID
   → zen_orders.billing_status = PAID
```

### 10-2. 마스터 오더 처리 흐름

```
1. 다수의 House Order가 REGISTERED~SCHEDULED 상태
2. [ADMIN/MANAGER] 마스터 오더 생성
   → zen_master_orders 생성 (M-YYMMDD-NNNN)
   → House Order → zen_orders.master_order_id 연결
   → House Order → status = MASTERED (개별 수정 불가)
3. 마스터 오더 단위로 스케줄·출고·운송 일괄 처리
4. 마스터 인보이스 또는 House Order별 개별 청구 선택
```

### 10-3. 이상 상태 처리 (HELD) 흐름

```
문제 발생 (통관 지연, 화물 파손, 주소 오류 등)
→ [OPERATOR/ADMIN] zen_orders.status = HELD
→ 문제 해결
→ [OPERATOR/ADMIN] 이전 적정 상태로 복구 (예: HELD → WAREHOUSED)
→ 정상 흐름 재개
```

---

## 🗂️ 11. 핵심 구현 파일 참조 맵

| 도메인 기능 | 파일 경로 | 주요 함수/클래스 |
|:---|:---|:---|
| 요율 계산 | `src/lib/logistics/rate-engine.ts` | `calculateSlabRate()`, `validateRateOverlap()` |
| 오더 상태 머신 | `src/lib/logistics/status-machine.ts` | `canChangeStatus()`, `isOrderEditable()` |
| 트래킹 엔진 | `src/lib/logistics/tracking.ts` | `TrackingManager`, `VirtualTrackingProvider` |
| 정산 엔진 | `src/lib/finance/settlement.ts` | `SettlementEngine`, `InvoiceGenerator` |
| RBAC | `src/lib/auth/rbac.ts` | `checkPermission()` |
| 오더 검증 | `src/lib/validation/order.ts` | `orderRegistrationSchema` |
| 라우팅 권한 | `src/config/routes.ts` | `ORG_ROUTE_MAP`, `PLATFORM_ACTIONS` |
| 공통 코드 | `common_codes` 테이블 | GROUP: CARGO_STATUS, TRANSPORT_MODE, UNIT_TYPE, MEMBERSHIP_LEVEL |

---

## 📝 개정 이력

| 버전 | 날짜 | 작성자 | 설명 |
|:---|:---|:---|:---|
| v1.0 | 2026-04-23 | Claude (CTO 지시, CPO 오너십) | 초기 도메인 지식 베이스 수립. 코드베이스 분석 기반으로 용어 사전·계산 규칙·상태 머신·RBAC·엣지케이스 카탈로그 작성. |

---

*문서 끝*
