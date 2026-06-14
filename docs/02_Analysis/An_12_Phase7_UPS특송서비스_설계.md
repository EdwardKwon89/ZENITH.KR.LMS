# An-12 — Phase 7 설계: UPS 국제 특송 서비스 전용 모듈

> **문서번호**: An-12
> **작성일**: 2026-06-14
> **작성자**: Aiden (Claude, ZEN_CEO)
> **기반**: 고객 리뷰 20260609 (`docs/80_RawData/고객 Review 20260609.md`) + IBC/UPS Interface 명세 (`docs/80_RawData/20260609 IBC和UPS Interface.pdf`)
> **승인 상태**: ✅ 설계 확정 — Edward 승인 완료 (2026-06-14)
> **관련 Phase**: Phase 7 (UPS 국제 특송)

---

## 1. 설계 배경 및 범위

### 1-1. 핵심 요구사항

| # | 영역 | 내용 |
|:--|:----|:----|
| R1 | UPS 요율 구조 | Zone 기반(10구간) × 문서/비문서 × 0.5kg 단위 / 원가·판매가 분리 |
| R2 | Agency 역할 모델 | 대리점(AGENCY) org_type 신규 + 대리점 하위 화주 계층 관리 |
| R3 | IBC/Pactrak Interface | 국제 운송번호 발부(Manifest API) + 화물 이벤트 수신(eTrack REST) |
| R4 | PKG REF_NO 관리 | 국내 택배번호 + 국제 UPS 번호를 PKG별로 별도 관리 |
| R5 | 오더 신규 기능 | 직접배송/픽업 선택, 주소록, 간이 송장 출력 |
| R6 | 창고 처리 확장 | 입고 시 국내 번호 확인, 출고 시 UPS 발송 연계 |
| R7 | 일마감 처리 | 당일 출고 집계, 매출/매입 일별 집계 |

### 1-2. 설계 방향 (Edward 확정, 2026-06-14)

| 항목 | 결정 | 비고 |
|:----|:----|:----|
| 개발 구조 | Phase 6 인프라 재활용 + UPS 전용 Phase 신설 | 기존 프로세스와 병행 운영 |
| UPS 요율 구조 | 전용 테이블 신설 (`zen_ups_*`) | zen_rate_cards 오염 방지 |
| Agency 역할 | `AGENCY` org_type + `AGENCY` role 신규 추가 | Phase 6 RBAC 확장 패턴 적용 |
| Agency 화주 | 대리점 관리 하에 등록 (직접 가입 불가) | zen_agency_shippers 중간 테이블 |
| Agency 원가/판매가 | Agency 자체 관리 가능 | 플랫폼 운영자와 완전 분리 |
| IBC Interface MVP | 수동 번호 입력 우선 → API 자동화 Go Live | 시범 운영(6/30) 일정 우선 |
| 멀티 팀 개발 | Team A(Aiden) + Team B(신규 개발자) 병행 | An-12 §7 파일 소유권 경계 |

---

## 2. Interface 구조 (IBC/Pactrak + UPS)

### 2-1. 전체 연동 흐름

```
[ZENITH 플랫폼]
      │
      ├─► [IBC Pactrak Manifest API]  ─► 국제 운송번호(intl_ref_no) 발부
      │     https://api.pactrak.com/tests/manifest
      │     (테스트 환경 제공됨)
      │
      ├─◄ [IBC eTrack REST API]        ◄─ 화물 이벤트 수신 (배송 상태)
      │     (주기적 폴링 또는 FTP/SFTP Push 수신)
      │
      └─► [UPS 포털]                   ─► 트래킹 조회
            https://shxk.rtb56.com
```

### 2-2. 국제 운송번호 발부 흐름

```
창고 입고 확인
    │
    ▼
[ZENITH] Pactrak Manifest API POST 호출
    │   payload: PKG 정보, 수하인, 중량, 품목
    ▼
[IBC/Pactrak] 검증 → 국제 운송번호 발부
    │
    ▼
[ZENITH] zen_order_packages.intl_ref_no 업데이트
         번호 발부 후 → 정보 변경 불가 잠금
         (변경 필요 시: 기존 번호 폐기 → 재발부 프로세스)
```

### 2-3. MVP vs Full 단계화

| 단계 | 기능 | 시점 |
|:----|:----|:----|
| **MVP** | 수동 번호 입력 + 수동 상태 업데이트 | 6/30 시범 운영 |
| **v1** | Pactrak Manifest API 자동 발부 + eTrack REST 폴링 | 7/20 Go Live |
| **v2** | FTP/SFTP Push 수신 (실시간 자동 상태 갱신) | 안정화 후 |

---

## 3. DB 스키마 설계 (Team A — Aiden 담당)

### 3-1. UPS 요율 테이블 신설

#### `zen_ups_zones` — 지역 구간 정의 (10구간)

```sql
CREATE TABLE public.zen_ups_zones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_code   VARCHAR(5) NOT NULL UNIQUE,   -- 'Z1'~'Z10'
  zone_name   TEXT NOT NULL,
  description TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  created_by  UUID REFERENCES zen_profiles(id)
);
```

#### `zen_ups_zone_countries` — 구간별 국가 매핑

```sql
CREATE TABLE public.zen_ups_zone_countries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id     UUID NOT NULL REFERENCES zen_ups_zones(id) ON DELETE CASCADE,
  country_code VARCHAR(3) NOT NULL,   -- ISO 3166-1 alpha-3
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  created_by  UUID REFERENCES zen_profiles(id),
  UNIQUE(country_code)                -- 국가는 1개 구간에만 속함
);
```

#### `zen_ups_products` — UPS 제품 코드

```sql
CREATE TABLE public.zen_ups_products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code    VARCHAR(20) NOT NULL UNIQUE,  -- 메인 상품 코드
  sub_code        VARCHAR(20),                  -- 부가 상품 코드
  product_name    TEXT NOT NULL,
  cargo_type      VARCHAR(10) NOT NULL CHECK (cargo_type IN ('DOC','NON_DOC','BOTH')),
  -- 'DOC'=서류, 'NON_DOC'=비서류
  ddu_available   BOOLEAN DEFAULT FALSE,
  ddp_available   BOOLEAN DEFAULT FALSE,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 초기 데이터:
-- UPS WorldWide Express (DOC/NON_DOC)
-- UPS WorldWide Express Saver (DOC/NON_DOC)
-- UPS WorldWide Express Expedited
-- UPS WorldWide Express Flight
```

#### `zen_ups_base_rates` — 기본 요금 (구간×화물유형×중량)

```sql
CREATE TABLE public.zen_ups_base_rates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES zen_ups_products(id),
  zone_id         UUID NOT NULL REFERENCES zen_ups_zones(id),
  weight_kg       NUMERIC(8,1) NOT NULL,   -- 0.5kg 단위 (0.5, 1.0, 1.5, ...)
  selling_price   NUMERIC(18,2) NOT NULL,  -- 판매가
  cost_price      NUMERIC(18,2) NOT NULL,  -- 원가
  currency        VARCHAR(3) DEFAULT 'KRW',
  valid_from      DATE NOT NULL,
  valid_until     DATE,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  created_by      UUID REFERENCES zen_profiles(id),
  UNIQUE(product_id, zone_id, weight_kg, valid_from)
);
```

#### `zen_ups_fuel_surcharges` — 유류 할증 (주별 갱신)

```sql
CREATE TABLE public.zen_ups_fuel_surcharges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID REFERENCES zen_ups_products(id),  -- NULL = 전체 적용
  effective_week  DATE NOT NULL,       -- 해당 주 월요일 기준
  selling_rate    NUMERIC(8,4) NOT NULL,  -- 판매가 할증률 (예: 0.2350 = 23.50%)
  cost_rate       NUMERIC(8,4) NOT NULL,  -- 원가 할증률 (별도 관리)
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  created_by      UUID REFERENCES zen_profiles(id),
  UNIQUE(product_id, effective_week)
);
```

#### `zen_ups_other_charges` — Other Charge 코드별 관리

```sql
CREATE TABLE public.zen_ups_other_charges (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_code             VARCHAR(20) NOT NULL UNIQUE,
  charge_name             TEXT NOT NULL,
  unit                    VARCHAR(20) NOT NULL,   -- 'PKG', 'KG', 'LOT', 등
  fuel_surcharge_applicable BOOLEAN DEFAULT FALSE, -- 유류할증 적용 여부
  selling_price           NUMERIC(18,2),          -- 기준 판매 단가
  cost_price              NUMERIC(18,2),          -- 기준 원가 단가
  currency                VARCHAR(3) DEFAULT 'KRW',
  is_active               BOOLEAN DEFAULT TRUE,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  created_by              UUID REFERENCES zen_profiles(id)
);
```

#### `zen_ups_flight_plans` — 항공기 배송 비행 계획

```sql
CREATE TABLE public.zen_ups_flight_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID REFERENCES zen_ups_products(id),
  flight_no       TEXT NOT NULL,
  origin_airport  VARCHAR(10) NOT NULL,   -- IATA 코드 (예: ICN)
  dest_airport    TEXT NOT NULL,
  etd             TIMESTAMPTZ,
  eta             TIMESTAMPTZ,
  frequency       TEXT,                   -- '매일', '주 3회' 등
  valid_from      DATE NOT NULL,
  valid_until     DATE,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  created_by      UUID REFERENCES zen_profiles(id)
);
```

### 3-2. Agency 관련 테이블 (Team B — 신규 개발자 담당)

#### `zen_ups_zones` RLS: AGENCY 자체 요율 관리용 `zen_agency_rate_overrides`

```sql
-- Agency가 자신의 판매가/원가를 관리하는 오버라이드 테이블
CREATE TABLE public.zen_agency_rate_overrides (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_org_id   UUID NOT NULL REFERENCES zen_organizations(id),
  base_rate_id    UUID NOT NULL REFERENCES zen_ups_base_rates(id),
  selling_price   NUMERIC(18,2) NOT NULL,  -- Agency 판매가
  cost_price      NUMERIC(18,2) NOT NULL,  -- Agency 원가
  valid_from      DATE NOT NULL,
  valid_until     DATE,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  created_by      UUID REFERENCES zen_profiles(id),
  UNIQUE(agency_org_id, base_rate_id, valid_from)
);
```

#### `zen_agency_shippers` — 대리점 하위 화주 연결

```sql
CREATE TABLE public.zen_agency_shippers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_org_id   UUID NOT NULL REFERENCES zen_organizations(id),   -- 대리점
  shipper_org_id  UUID NOT NULL REFERENCES zen_organizations(id),   -- 화주 org
  shipper_type    VARCHAR(10) NOT NULL CHECK (shipper_type IN ('INDIVIDUAL','CORPORATE')),
  discount_rate   NUMERIC(5,4) DEFAULT 0,    -- 등급별 할인율 (예: 0.05 = 5%)
  grade           VARCHAR(20),               -- 등급 코드
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agency_org_id, shipper_org_id)
);
```

### 3-3. 기존 테이블 컬럼 확장

#### `zen_organizations` — 고객별 부피중량상수 추가

```sql
ALTER TABLE zen_organizations
  ADD COLUMN volumetric_divisor INT DEFAULT 5000
  CHECK (volumetric_divisor IN (5000, 5500, 6000));
-- 원가 계산: 시스템 고정 6000
-- 판매가 계산: 고객별 5000 / 5500 / 6000
```

#### `zen_orders` — 배송 방식 및 픽업 정보 추가

```sql
ALTER TABLE zen_orders
  ADD COLUMN delivery_method VARCHAR(10) CHECK (delivery_method IN ('DIRECT','PICKUP')),
  ADD COLUMN pickup_location TEXT,
  ADD COLUMN pickup_contact_name TEXT,
  ADD COLUMN pickup_contact_tel TEXT;
```

#### `zen_order_packages` — REF_NO 필드 추가

```sql
ALTER TABLE zen_order_packages
  ADD COLUMN ref_seq INT,                      -- 01, 02, 03... (오더 내 순번)
  ADD COLUMN domestic_ref_no TEXT,             -- 국내 택배번호 (직접 배송 시)
  ADD COLUMN intl_ref_no TEXT,                 -- UPS 국제 운송번호
  ADD COLUMN intl_ref_issued_at TIMESTAMPTZ,   -- 국제번호 발부 시각
  ADD COLUMN intl_ref_locked BOOLEAN DEFAULT FALSE; -- 발부 후 변경 불가 잠금
```

### 3-4. RLS 정책

```sql
-- zen_ups_base_rates
-- ADMIN/MANAGER: 전체 조회/수정
-- AGENCY: 자신의 오버라이드만 (직접 테이블 수정 불가, 오버라이드 테이블 사용)
-- CORPORATE/INDIVIDUAL: 활성 요율 조회만 (판매가만, 원가 차단)

-- zen_agency_rate_overrides
-- ADMIN/MANAGER: 전체
-- AGENCY: 본인 agency_org_id 항목만 CRUD

-- zen_agency_shippers
-- ADMIN/MANAGER: 전체
-- AGENCY: 본인 agency_org_id 항목만 조회/수정
-- CORPORATE/INDIVIDUAL: 본인 shipper_org_id 조회만
```

---

## 4. Agency 역할 모델 (Team B 담당)

### 4-1. `zen_organizations.type` 확장

```
기존: PLATFORM, CARRIER, SHIPPER, CUSTOMS, DELIVERY
추가: AGENCY
```

### 4-2. `zen_profiles.role` (USER_ROLES) 추가

```typescript
// src/lib/auth/rbac.ts
AGENCY: 'AGENCY',  // 대리점 담당자
```

### 4-3. AGENCY 역할 접근 권한

```typescript
[USER_ROLES.AGENCY]: [
  '/orders',          // 대리점 오더 조회/등록
  '/ups-rates',       // UPS 요율 조회 + 자체 오버라이드 관리
  '/agency',          // 대리점 화주 관리
  '/tracking',        // 트래킹 조회
  '/settlement',      // 대리점 정산 조회
  '/voc',
  '/mypage',
],
```

### 4-4. 대리점 화주 등록 흐름

```
[대리점 담당자(AGENCY)]
    → /agency/shippers/new 화면에서 화주 정보 입력
    → zen_organizations INSERT (type='SHIPPER', sub_type에 따라 INDIVIDUAL/CORPORATE)
    → zen_agency_shippers 연결 레코드 생성
    → zen_profiles 에 로그인 계정 생성 (or 초대 이메일 발송)
```

---

## 5. API 명세 (R-11 준수)

### 5-1. 신규 Server Actions (Team A)

```typescript
// src/app/actions/ups/rates.ts
getUpsZones(): Promise<UpsZone[]>
getUpsProducts(): Promise<UpsProduct[]>
getUpsBaseRates(params: { zoneId, productId, weightKg }): Promise<UpsBaseRate>
getUpsFuelSurcharge(effectiveDate: Date): Promise<UpsFuelSurcharge>
getUpsOtherCharges(): Promise<UpsOtherCharge[]>

// src/app/actions/ups/rates-admin.ts  (ADMIN/MANAGER 전용)
createUpsBaseRate(data): Promise<{ success: boolean }>
updateUpsBaseRate(id, data): Promise<{ success: boolean }>
setUpsFuelSurcharge(data): Promise<{ success: boolean }>

// src/app/actions/ups/interface.ts  (IBC/Pactrak 연동)
issueIntlRefNo(orderId: string, pkgId: string): Promise<{ intlRefNo: string }>
getCargoEvents(intlRefNo: string): Promise<CargoEvent[]>
```

### 5-2. 신규 Server Actions (Team B)

```typescript
// src/app/actions/agency/shippers.ts
createAgencyShipper(agencyOrgId, shipperData): Promise<{ success: boolean }>
getAgencyShippers(agencyOrgId): Promise<AgencyShipper[]>
updateAgencyShipperGrade(id, grade, discountRate): Promise<{ success: boolean }>

// src/app/actions/agency/rate-overrides.ts
setAgencyRateOverride(data): Promise<{ success: boolean }>
getAgencyRateOverrides(agencyOrgId): Promise<AgencyRateOverride[]>
```

### 5-3. UPS 요금 계산 엔진

```typescript
// src/lib/ups/pricing-engine.ts (Team A)
calculateUpsFreight({
  productId,
  destCountryCode,
  actualWeightKg,
  dimL, dimW, dimH,
  volumetricDivisor,  // 고객별 5000/5500/6000
  deliveryMethod,     // DDU or DDP
  otherCharges[],
  effectiveDate,
}): {
  chargeableWeight,
  baseFreight,
  fuelSurcharge,
  otherChargesTotal,
  totalSelling,
  totalCost,
  breakdown,
}
```

---

## 6. UI 페이지 계획

### 6-1. 신규 페이지

| 경로 | 접근 권한 | 담당팀 | 설명 |
|:----|:---------|:-----:|:----|
| `/admin/ups-rates` | ADMIN/MANAGER | Team A | UPS 요율 등록/조회/수정 (Zone·제품·기본요금·유류할증·OC) |
| `/admin/ups-rates/flight-plans` | ADMIN/MANAGER | Team A | 항공 비행 계획 관리 |
| `/agency` | AGENCY | Team B | 대리점 대시보드 |
| `/agency/shippers` | AGENCY | Team B | 대리점 화주 목록 + 등록 |
| `/agency/rate-overrides` | AGENCY | Team B | 대리점 자체 요율 오버라이드 관리 |

### 6-2. 기존 페이지 수정

| 경로 | 변경 내용 | 담당팀 |
|:----|:---------|:-----:|
| `/orders/new` | 직접배송/픽업 선택 + 간이 송장 출력 | Team A |
| `/warehouse/inbound` | 국내 택배번호 확인 + 국제번호 발부 버튼 | Team A |
| `/warehouse/outbound` | UPS 발송 상태 연계 | Team A |
| 회원가입 | AGENCY org_type 선택 추가 | Team B |

---

## 7. 파일 소유권 경계 (멀티팀 충돌 방지)

| 경로/파일 | 소유 팀 | 비고 |
|:---------|:------:|:----|
| `supabase/migrations/ups_*` | **Team A** | UPS 요율 테이블 |
| `supabase/migrations/agency_*` | **Team B** | Agency 역할 테이블 |
| `src/app/actions/ups/` | **Team A** | 신규 디렉토리 |
| `src/app/actions/agency/` | **Team B** | 신규 디렉토리 |
| `src/app/[locale]/(dashboard)/admin/ups-rates/` | **Team A** | 신규 |
| `src/app/[locale]/(dashboard)/agency/` | **Team B** | 신규 |
| `src/lib/ups/` | **Team A** | UPS 요금 엔진 |
| `src/lib/auth/rbac.ts` | **Team B 선행** → Team A 참조 | AGENCY role 추가 |
| `src/types/ups.ts` | **Team A 선행 정의** | Team B import만 |
| `src/components/layout/NaviSidebar.tsx` | **선착 팀 수정 후 PR** | 동시 수정 금지 |
| `messages/*.json` | **각 팀 자기 키만** | 충돌 위험 파일 |

> **공유 파일 수정 규칙**: `NaviSidebar.tsx`, `messages/*.json`, `rbac.ts`는 반드시 PR 머지 후 상대팀이 최신 브랜치를 리베이스. 동시 수정 절대 금지.

---

## 8. Phase 7 스프린트 계획

| 스프린트 | 기간 | Team A (Aiden) | Team B (신규 개발자) | 목표 |
|:------:|:---:|:-------------|:------------------|:----|
| **SPR-01** | 6/14–6/17 | UPS DB Schema (migrations) | Agency 역할 모델 (RBAC + 회원가입) | DB 기반 완성 |
| **SPR-02** | 6/18–6/21 | PKG REF_NO + 창고 입고 수정 + UPS 요금 계산 엔진 | Agency 화주 관리 UI | 핵심 기능 |
| **SPR-03** | 6/22–6/25 | UPS 요율 Admin UI + 간이 송장 PDF | Agency 요율 오버라이드 UI | 요율 관리 |
| **SPR-04** | 6/26–6/29 | 오더 등록 직접배송/픽업 + 창고 출고 수정 + 회귀 테스트 | PR 통합 + 회귀 테스트 | MVP 완성 |
| **🚀 MVP** | **6/30** | 시범 운영 배포 | 시범 운영 배포 | |
| **SPR-05** | 7/1–7/7 | Pactrak Manifest API 자동 연동 | 일마감 처리 | Interface |
| **SPR-06** | 7/8–7/14 | eTrack REST 트래킹 자동화 | Agency 정산 조회 | 완결 |
| **SPR-07** | 7/15–7/19 | 통합 E2E + UAT | 통합 E2E + UAT | |
| **🚀 Go Live** | **7/20** | | | |

---

## 9. IMP 등재

| IMP# | 내용 | 담당 | 우선순위 |
|:-----|:----|:----:|:-------:|
| IMP-110 | Phase 7 UPS DB Schema (zen_ups_* 테이블 신설 + 기존 테이블 확장) | Team A | P1 |
| IMP-111 | Agency 역할 모델 (org_type + role + RBAC + 대리점 화주 계층) | Team B | P1 |
| IMP-112 | UPS 요금 계산 엔진 + 창고 처리 흐름 (REF_NO + 입고/출고) | Team A | P1 |
| IMP-113 | UPS 요율 Admin UI (Zone/제품/기본요금/유류할증/OC 관리) | Team A | P2 |
| IMP-114 | Agency 화주 관리 + 요율 오버라이드 UI | Team B | P2 |
| IMP-115 | IBC/Pactrak Interface 자동 연동 (Manifest API + eTrack) | Team A | P2 |
| IMP-116 | 일마감 처리 (출고 집계 + 매출/매입) | Team B | P3 |

---

## 10. 개정 이력

| 버전 | 일자 | 작성자 | 내용 |
|:----|:----|:------|:----|
| v1.0 | 2026-06-14 | Aiden (Claude, ZEN_CEO) | 초안 작성 — 고객 리뷰 20260609 + IBC/UPS Interface 명세 기반 Phase 7 설계 확정 |
