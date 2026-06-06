# An-11 — Phase 6 설계: 신규 서비스 역할 모델 + 멀티 서비스 배정 구조

> **문서번호**: An-11
> **작성일**: 2026-06-06
> **작성자**: Aiden (Claude, ZEN_CEO)
> **기반**: 고객 리뷰 20260606 (`docs/80_RawData/고객 Review 20260606.md`)
> **승인 상태**: ✅ 설계 확정 — Edward 승인 완료 (2026-06-06)
> **관련 Phase**: Phase 6 신규 등재 예정

---

## 1. 설계 배경 및 범위

### 1-1. 고객 리뷰 핵심 요구사항 (3개 영역)

| # | 영역 | 핵심 변경 사항 |
|:--|:-----|:-------------|
| 1 | 운송 서비스 관리 | 운송/통관/배송 서비스별 요율 등록, 역할별 접근 제어 |
| 2 | 운송 요청 (Order) | 서비스 조합 선택 + 조합별 요율 조회 → Order 등록 |
| 3 | 운송 조회 | 역할별 데이터 격리 (화주/운송사/통관사/배송사/ADMIN) |

### 1-2. 설계 방향 결정 (Edward 확정, 2026-06-06)

| 항목 | 결정 | 비고 |
|:----|:----|:----|
| 역할 모델 | **방안 A** — `org_type`에 `CUSTOMS`, `DELIVERY` 추가 | 기존 RBAC 확장 |
| 오더-서비스 배정 | **방안 A** — `zen_order_services` 신규 중간 테이블 | 1:N 구조 |
| 요율 구조 | **별도 테이블** — 서비스 유형별 분리 | 화주 조회 시 통합 API 제공 |
| 서비스 조합 | 운송수단 + 통관 + 배송(Local) 조합 가능 | 배송(Total)도 포함 |
| **용어 변경** | **"서비스 요율"** — 운송+통관 서비스 비용 통합 개념 | UI/문서 전체 적용 |
| **서비스 요율 등록 주체** | CARRIER(운송사) + CUSTOMS_BROKER(통관사) + DELIVERY_AGENT(배송사) + ADMIN/MANAGER | 각 역할은 자사 요율만 입력/수정 |
| **화주 요율 접근** | Order 등록 화면에서 조회 및 서비스 선택만 (등록 불가) | CORPORATE / INDIVIDUAL |
| **배송(Total) 등록 주체** | DELIVERY_AGENT + ADMIN/MANAGER — ADMIN 별도 승인 없음 | 운송 요율과 동일 권한 |
| **노선/비용 미등록 처리** | **완전 차단** — 요청 불가 메시지 표출 | 고객 리뷰 원문 준수 |
| **carrier_id 마이그레이션** | **전체 일괄 마이그레이션** — 기존 오더 포함 zen_order_services로 이관 | 단계: 테이블 생성 → 데이터 이관 → carrier_id NULL 허용 |

> **용어 참고 (코드↔한국어 매핑)**
> - `CARRIER` role / `org_type='CARRIER'` = **운송사** (항공사, 선사 등 운송을 제공하는 회사)
> - `CORPORATE` / `INDIVIDUAL` role / `org_type='SHIPPER'` = **화주** (운송을 의뢰하는 회사/개인)
> - 영문 "shipper"는 화주를 의미하나, 코드베이스에서 운송사를 CARRIER로 명시함

---

## 2. 역할 모델 확장 (방안 A)

### 2-1. `zen_organizations.type` 값 추가

| 현재 값 | 신규 추가 값 |
|:--------|:-----------|
| `PLATFORM`, `CARRIER`, `SHIPPER`, `CORPORATE`, `INDIVIDUAL` | `CUSTOMS` (통관사), `DELIVERY` (배송사) |

### 2-2. `zen_profiles.role` (USER_ROLES) 추가

| 현재 역할 | 신규 추가 역할 | 설명 |
|:---------|:------------|:-----|
| ADMIN / MANAGER | — | 플랫폼 운영자 (모든 데이터 조회) |
| CARRIER | **CUSTOMS_BROKER** | 통관사 담당자 (소속 org_type=CUSTOMS) |
| CORPORATE / INDIVIDUAL | **DELIVERY_AGENT** | 배송사 담당자 (소속 org_type=DELIVERY) |

### 2-3. 역할별 접근 권한 (RBAC 확장)

| 역할 | 메뉴 경로 추가 |
|:----|:------------|
| `CUSTOMS_BROKER` | `/admin/customs-rates`, `/orders/assigned`, `/tracking`, `/voc`, `/mypage` |
| `DELIVERY_AGENT` | `/admin/delivery-rates`, `/orders/assigned`, `/tracking`, `/voc`, `/mypage` |

---

## 3. 요율 구조 설계 (별도 테이블)

### 3-1. 서비스 유형별 요율 테이블 매핑

| 서비스 유형 | 요율 테이블 | 담당 조직 | 비용 기준 |
|:----------|:----------|:---------|:---------|
| 운송 (AIR/SEA) | `zen_rate_cards` (기존) | CARRIER | 노선별, 무게/부피별 |
| 통관 (CUSTOMS) | `zen_customs_rates` (신규) | CUSTOMS | 도착 국가별, 무게/부피별 |
| 배송 Local | `zen_delivery_rates` (신규) | DELIVERY | 배송국 내, 무게/부피별 |
| 배송 Total | `zen_delivery_rates` (신규) | DELIVERY | 노선+무게/부피별 (All-in) |

### 3-2. `zen_customs_rates` 신규 테이블

```sql
CREATE TABLE public.zen_customs_rates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES zen_organizations(id),  -- 통관사 조직
  country_code    VARCHAR(3) NOT NULL,   -- ISO 3166 도착 국가 코드
  currency        VARCHAR(3) NOT NULL DEFAULT 'USD',
  cost_per_kg     NUMERIC(18,2),         -- 무게당 비용 (선택)
  cost_per_cbm    NUMERIC(18,2),         -- 부피당 비용 (선택)
  fixed_fee       NUMERIC(18,2) DEFAULT 0,  -- 건당 고정 비용
  transit_days    INT,                   -- 예상 통관 소요일 (일 단위)
  valid_from      DATE NOT NULL,
  valid_until     DATE,
  is_active       BOOLEAN DEFAULT TRUE,
  version_no      INT DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  created_by      UUID REFERENCES zen_profiles(id),
  UNIQUE(org_id, country_code, valid_from)
);
```

### 3-3. `zen_delivery_rates` 신규 테이블

```sql
CREATE TABLE public.zen_delivery_rates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES zen_organizations(id),  -- 배송사 조직
  service_type    VARCHAR(10) NOT NULL,  -- 'LOCAL' | 'TOTAL'
  -- LOCAL: 배송국 내
  country_code    VARCHAR(3),            -- LOCAL용 배송 국가
  -- TOTAL: 운송수단+노선 포함 종합
  transport_mode  VARCHAR(10),           -- TOTAL용: 'AIR' | 'SEA'
  origin_code     VARCHAR(10),           -- TOTAL용: 출발 port code
  dest_code       VARCHAR(10),           -- TOTAL용: 도착 port code
  -- 공통
  currency        VARCHAR(3) NOT NULL DEFAULT 'USD',
  cost_per_kg     NUMERIC(18,2),
  cost_per_cbm    NUMERIC(18,2),
  transit_days    INT,                   -- 예상 배송 소요일
  valid_from      DATE NOT NULL,
  valid_until     DATE,
  is_active       BOOLEAN DEFAULT TRUE,
  version_no      INT DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  created_by      UUID REFERENCES zen_profiles(id),
  CONSTRAINT chk_delivery_rates_type CHECK (
    (service_type = 'LOCAL' AND country_code IS NOT NULL)
    OR (service_type = 'TOTAL' AND transport_mode IS NOT NULL
        AND origin_code IS NOT NULL AND dest_code IS NOT NULL)
  )
);
```

> **기존 `zen_rate_cards` 재사용 검토 결과**: 운송 요율(AIR/SEA)은 기존 구조(carrier_id + tiers JSONB + TISA 3-tier) 유지. 통관/배송은 참조 키(org_id), 비용 기준(국가/노선), 플랫폼 수수료 적용 여부가 상이하여 별도 테이블로 분리 결정.

---

## 4. 오더-서비스 배정 구조 (방안 A)

### 4-1. `zen_order_services` 신규 중간 테이블

```sql
CREATE TABLE public.zen_order_services (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES zen_orders(id) ON DELETE CASCADE,
  service_type    VARCHAR(20) NOT NULL,
  --  'TRANSPORT_AIR' | 'TRANSPORT_SEA' | 'TRANSPORT_LAND' | 'TRANSPORT_EXP'
  --  | 'CUSTOMS' | 'DELIVERY_LOCAL' | 'DELIVERY_TOTAL'
  provider_id     UUID NOT NULL REFERENCES zen_organizations(id),  -- 서비스 제공사
  rate_card_id    UUID REFERENCES zen_rate_cards(id),              -- 운송 요율 참조
  customs_rate_id UUID REFERENCES zen_customs_rates(id),           -- 통관 요율 참조
  delivery_rate_id UUID REFERENCES zen_delivery_rates(id),         -- 배송 요율 참조
  quoted_cost     NUMERIC(18,2),      -- 화주 확인 시점 예상 비용
  currency        VARCHAR(3) DEFAULT 'USD',
  status          VARCHAR(20) DEFAULT 'REQUESTED',
  -- 'REQUESTED' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED'
  assigned_at     TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(order_id, service_type)      -- 오더당 서비스 유형 중복 불가
);
```

### 4-2. 지원 서비스 조합 (화주 선택 옵션)

| 조합 코드 | 구성 서비스 | zen_order_services 레코드 수 |
|:---------|:----------|:--------------------------|
| AIR_ONLY | AIR 운송 | 1개 (TRANSPORT_AIR) |
| AIR_CUSTOMS | AIR + 통관 | 2개 |
| AIR_DELIVERY_LOCAL | AIR + 배송(Local) | 2개 |
| AIR_CUSTOMS_LOCAL | AIR + 통관 + 배송(Local) | 3개 |
| DELIVERY_TOTAL | 배송(Total) All-in | 1개 (DELIVERY_TOTAL) |
| SEA_ONLY | SEA 운송 | 1개 (TRANSPORT_SEA) |
| SEA_CUSTOMS | SEA + 통관 | 2개 |
| SEA_CUSTOMS_LOCAL | SEA + 통관 + 배송(Local) | 3개 |

### 4-3. 기존 `zen_orders.carrier_id` 마이그레이션 (전체 일괄)

**결정**: 기존 오더 포함 전체 일괄 마이그레이션 → `zen_order_services`로 이관

**마이그레이션 3단계**:
```sql
-- Step 1: zen_order_services 테이블 생성
-- Step 2: 기존 carrier_id가 있는 모든 오더를 TRANSPORT 레코드로 이관
INSERT INTO zen_order_services (order_id, service_type, provider_id, status, assigned_at, created_at)
SELECT
  o.id,
  CASE o.transport_mode
    WHEN 'AIR' THEN 'TRANSPORT_AIR'
    WHEN 'SEA' THEN 'TRANSPORT_SEA'
    WHEN 'LAND' THEN 'TRANSPORT_LAND'
    ELSE 'TRANSPORT_AIR'
  END,
  o.carrier_id,
  'REQUESTED',
  o.created_at,
  o.created_at
FROM zen_orders o
WHERE o.carrier_id IS NOT NULL
ON CONFLICT (order_id, service_type) DO NOTHING;

-- Step 3: zen_orders.carrier_id → NULL 허용 유지 (컬럼 삭제는 Phase 7 이후 검토)
```

**이후 처리 원칙**: 신규 오더 생성 시 `carrier_id` 업데이트 중단, `zen_order_services`만 사용

---

## 5. RLS 정책 설계

### 5-1. `zen_customs_rates`

```sql
-- 화주 및 ADMIN/운송사 담당은 활성 요율 조회 가능 (Order 등록 시 요율 선택용)
CREATE POLICY "customs_rates_select"
  ON zen_customs_rates FOR SELECT
  USING (
    is_active = TRUE
    AND (
      (auth.jwt()->'app_metadata'->>'role') IN ('ADMIN','MANAGER')
      OR org_id = (auth.jwt()->'app_metadata'->>'org_id')::uuid  -- 본인 통관사 (전체)
      OR (auth.jwt()->'app_metadata'->>'role') IN ('CORPORATE','INDIVIDUAL','CARRIER')  -- 화주/운송사 조회
    )
  );

-- 통관사 담당자(본인 org만) + ADMIN/MANAGER 등록/수정/삭제
CREATE POLICY "customs_rates_write"
  ON zen_customs_rates FOR INSERT UPDATE DELETE
  USING (
    (auth.jwt()->'app_metadata'->>'role') IN ('ADMIN','MANAGER')
    OR (
      (auth.jwt()->'app_metadata'->>'role') = 'CUSTOMS_BROKER'
      AND org_id = (auth.jwt()->'app_metadata'->>'org_id')::uuid
    )
  );
```

### 5-2. `zen_delivery_rates`

```sql
-- 화주 및 ADMIN은 활성 요율 조회 가능
CREATE POLICY "delivery_rates_select"
  ON zen_delivery_rates FOR SELECT
  USING (
    is_active = TRUE
    AND (
      (auth.jwt()->'app_metadata'->>'role') IN ('ADMIN','MANAGER')
      OR org_id = (auth.jwt()->'app_metadata'->>'org_id')::uuid  -- 본인 배송사 (전체)
      OR (auth.jwt()->'app_metadata'->>'role') IN ('CORPORATE','INDIVIDUAL','CARRIER')  -- 화주 조회
    )
  );

-- 배송사 담당자(본인 org만) + ADMIN/MANAGER 등록/수정/삭제 (Total 포함, 별도 승인 없음)
CREATE POLICY "delivery_rates_write"
  ON zen_delivery_rates FOR INSERT UPDATE DELETE
  USING (
    (auth.jwt()->'app_metadata'->>'role') IN ('ADMIN','MANAGER')
    OR (
      (auth.jwt()->'app_metadata'->>'role') = 'DELIVERY_AGENT'
      AND org_id = (auth.jwt()->'app_metadata'->>'org_id')::uuid
    )
  );
```

> **운송 요율 (`zen_rate_cards`) 등록 권한 변경**: 기존 ADMIN 전용 → **CARRIER role + ADMIN/MANAGER** 허용.
> CARRIER는 본인 `carrier_id` 요율만 입력/수정 가능 (RLS: `carrier_id`의 `zen_carriers.org_id = 본인 org_id`).

### 5-3. `zen_order_services`

```sql
-- 역할별 조회 격리
CREATE POLICY "order_services_select"
  ON zen_order_services FOR SELECT
  USING (
    -- ADMIN/MANAGER: 전체
    (auth.jwt()->'app_metadata'->>'role') IN ('ADMIN','MANAGER')
    -- 서비스 제공사: 본인 org에 배정된 것만
    OR provider_id = (auth.jwt()->'app_metadata'->>'org_id')::uuid
    -- 화주: 본인 오더만 (zen_orders JOIN 필요 → RLS function 또는 View 활용)
    OR order_id IN (
      SELECT id FROM zen_orders
      WHERE shipper_id = (auth.jwt()->'app_metadata'->>'org_id')::uuid
    )
  );
```

### 5-4. 플랫폼 수수료 격리 (`zen_rate_cards`)

```sql
-- CARRIER는 platform_fee_rate NULL로 응답하는 View 제공
CREATE OR REPLACE VIEW zen_rate_cards_public AS
SELECT
  id, carrier_id, transport_mode, currency, tiers,
  valid_from, valid_until, is_active,
  carrier_cost, margin_rate,
  CASE WHEN (auth.jwt()->'app_metadata'->>'role') = 'CARRIER'
    THEN NULL
    ELSE platform_fee_rate
  END AS platform_fee_rate
FROM zen_rate_cards;
```

---

## 6. API 변경 명세 (R-11 준수)

### 6-1. 신규 Server Actions

#### 통관 요율 관리
```typescript
// src/app/actions/admin/customs-rates.ts
createCustomsRate(data: CreateCustomsRateData): Promise<{ success: boolean; rate: CustomsRate }>
updateCustomsRate(id: string, data: Partial<CreateCustomsRateData>): Promise<{ success: boolean }>
getCustomsRates(orgId?: string): Promise<CustomsRate[]>
deleteCustomsRate(id: string): Promise<{ success: boolean }>
```

#### 배송 요율 관리
```typescript
// src/app/actions/admin/delivery-rates.ts
createDeliveryRate(data: CreateDeliveryRateData): Promise<{ success: boolean; rate: DeliveryRate }>
updateDeliveryRate(id: string, data: Partial<CreateDeliveryRateData>): Promise<{ success: boolean }>
getDeliveryRates(orgId?: string, serviceType?: 'LOCAL' | 'TOTAL'): Promise<DeliveryRate[]>
deleteDeliveryRate(id: string): Promise<{ success: boolean }>
```

#### 화주용 통합 요율 조회
```typescript
// src/app/actions/operations/service-rates.ts
getAvailableServiceRates(params: {
  originCode: string;       // 출발 port code
  destCode: string;         // 도착 port code
  destCountryCode: string;  // 도착 국가 (통관/Local 배송용)
  transportMode: 'AIR' | 'SEA';
  cargoWeight: number;      // kg
  cargoCbm: number;         // CBM
}): Promise<{
  transport: TransportRateOption[];   // zen_rate_cards 기반
  customs: CustomsRateOption[];       // zen_customs_rates 기반
  deliveryLocal: DeliveryRateOption[];  // zen_delivery_rates LOCAL
  deliveryTotal: DeliveryRateOption[];  // zen_delivery_rates TOTAL
}>
```

#### 오더-서비스 배정
```typescript
// src/app/actions/operations/order-services.ts
createOrderServices(orderId: string, services: ServiceSelection[]): Promise<{ success: boolean }>
getOrderServices(orderId: string): Promise<OrderService[]>
updateOrderServiceStatus(id: string, status: ServiceStatus): Promise<{ success: boolean }>
```

### 6-2. 기존 Actions 수정

| Action | 변경 내용 |
|:-------|:---------|
| `getOrders()` | RLS 변경으로 역할별 자동 필터 (코드 변경 최소) |
| `createOrganization()` | CUSTOMS/DELIVERY type 지원 추가 |
| `createRateCard()` | CARRIER role 허용 추가 (본인 carrier_id 요율만) |
| `updateRateCard()` | CARRIER role 허용 추가 (본인 carrier_id 요율만) |

### 6-3. 서비스 요율 조회 — 노선/비용 미등록 처리

```typescript
// getAvailableServiceRates 반환 시 빈 배열이면 완전 차단
// Order 등록 Step 2(서비스 선택)에서 선택 가능한 요율 0건 = 다음 Step 진입 불가
// 오류 메시지: "선택하신 노선/서비스에 등록된 비용 정보가 없습니다. 플랫폼 운영자에게 문의하세요."
```

---

## 7. UI 변경 계획

### 7-1. 신규 페이지

| 경로 | 접근 권한 | 설명 |
|:----|:---------|:----|
| `/admin/customs-rates` | ADMIN/MANAGER + CUSTOMS_BROKER | 통관 서비스 요율 등록/조회/수정 |
| `/admin/delivery-rates` | ADMIN/MANAGER + DELIVERY_AGENT | 배송 서비스 요율 등록/조회/수정 (LOCAL + TOTAL) |
| `/orders/assigned` | CARRIER + CUSTOMS_BROKER + DELIVERY_AGENT | 담당 오더 목록 (역할별 자동 필터) |

### 7-2. 기존 페이지 수정

| 경로 | 변경 내용 |
|:----|:---------|
| `/admin/rates` | CARRIER role 접근 허용 + 본인 요율만 표시 (운송 서비스 요율) |
| `/orders/new` | **서비스 조합 선택 단계** 추가 (화물정보 → 서비스선택 → 요율확인 → 제출) |
| `/orders` 목록 | CUSTOMS_BROKER/DELIVERY_AGENT RLS 역할별 자동 필터 |
| 회원 가입 | CUSTOMS/DELIVERY org_type 선택 추가 |

> **용어 통일**: UI에서 "운임 정보" / "운송 요율" → "**서비스 요율**"로 통일 (고객 리뷰 요청 반영)

---

## 8. Phase 6 구성 제안

### Phase 6 — 신규 서비스 역할 모델 및 멀티 서비스 배정 (v1.5.0)

| 스프린트 | 내용 | 담당 예정 |
|:---------|:----|:---------|
| SPR-01 | DB 스키마: org_type 확장 + 신규 요율 테이블 + zen_order_services + RLS | D_Kai |
| SPR-02 | 통관 요율 관리 (Actions + UI) | D_Kai |
| SPR-03 | 배송 요율 관리 (Actions + UI) | D_Kai |
| SPR-04 | 화주 서비스 선택 + 요율 조회 통합 API | D_Kai |
| SPR-05 | 오더 등록 UI 개선 (서비스 조합 선택 Step 추가) | D_Kai |
| SPR-06 | 오더 목록 RLS 역할별 격리 + CUSTOMS_BROKER/DELIVERY_AGENT UI | D_Kai |
| SPR-07 | 플랫폼 수수료 격리 (zen_rate_cards_public View + CARRIER RLS) | D_Kai |
| SPR-08 | 회귀 테스트 확장 + E2E 검증 | D_Kai / Aiden |

---

## 9. 확정된 설계 결정 사항 (2026-06-06)

| # | 항목 | 결정 내용 |
|:-|:----|:---------|
| 1 | 서비스 요율 등록 주체 | CARRIER (운송사) + ADMIN/MANAGER 직접 등록. 화주는 Order 화면 조회/선택만. |
| 2 | 배송(Total) 등록 주체 | DELIVERY_AGENT + ADMIN/MANAGER — 별도 승인 프로세스 없음 |
| 3 | 노선/비용 미등록 처리 | **완전 차단** — 요청 불가 메시지 표출 |
| 4 | carrier_id 마이그레이션 | **전체 일괄 마이그레이션** — 기존 오더 포함 zen_order_services로 이관 |

---

## 10. 개정 이력

| 버전 | 일자 | 작성자 | 내용 |
|:----|:----|:------|:----|
| v1.0 | 2026-06-06 | Aiden (Claude) | 초안 작성 — 고객 리뷰 20260606 기반 Phase 6 설계 |
| v1.1 | 2026-06-06 | Aiden (Claude) | Edward 확정 사항 4건 반영: 서비스 요율 등록 주체·배송Total 권한·차단 정책·전체 마이그레이션. 용어 "서비스 요율"로 변경. 설계 확정 처리. |
