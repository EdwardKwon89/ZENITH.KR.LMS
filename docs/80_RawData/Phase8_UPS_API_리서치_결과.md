# Phase 8 UPS 실물 API 연동 리서치 결과

> **작성일**: 2026-06-24
> **작성자**: Dave (DeepSeek V4) — TASK-B-022 §1
> **참조 자료**:
> - `docs/80_RawData/20260609 IBC和UPS Interface.pdf`
> - `docs/80_RawData/20260609 UPS 특송 부가서비스.pdf`
> - `docs/80_RawData/20260609 UPS 특송 요금 정보.xlsx`
> - `docs/02_Analysis/An_09_통관연계_분석_검토보고서.md`
> - `docs/02_Analysis/An_12_Phase7_UPS특송서비스_설계.md`
> - 코드베이스: `src/types/ups.ts`, `src/lib/logistics/tracking.ts`, `supabase/migrations/`

---

## ① 레이블 발급 API

### Context: IBC/Pactrak → UPS 직접 API 전환

Edward (260617) 및 Aiden (260624) 확정: **IBC/Pactrak Interface 영구 제외**, UPS 직접 API 연동으로 전환.

### 제안 Endpoint: UPS Shipping API (RESTful)

| 항목 | 내용 |
|:-----|:------|
| **Endpoint** | `POST /api/shipments/v1/ship` 또는 `POST /api/orders/v1/create` |
| **Base URL (테스트)** | `https://wwwcie.ups.com` |
| **Base URL (운영)** | `https://onlinetools.ups.com` |
| **인증 방식** | OAuth 2.0 Client Credentials → `access_token` 발급 (15분~2시간 유효) |
| **API 버전** | UPS REST API (Legacy XML SOAP → REST 전환 완료) |

### Request Payload 구조 (필수 필드)

```
ShipmentRequest:
  ├─ ShipmentRequest: {
  │   Request: { RequestOption: 'validate' | 'nonvalidate' }
  │   Shipment: {
  │     Description: string
  │     Shipper: {
  │       Name, AttentionName, Phone, Email
  │       Address: { AddressLine, City, StateProvinceCode, PostalCode, CountryCode }
  │     }
  │     ShipTo: {  (동일 구조)  }
  │     ShipFrom: {  (동일 구조)  }
  │     PaymentInformation: {
  │       ShipmentCharge: {
  │         Type: '01' (Transportation)
  │         BillShipper: { AccountNumber: string }
  │       }
  │     }
  │     Service: { Code: string, Description: string }
  │     Package: [{
  │       Description: string
  │       Packaging: { Code: '02' (Customer Supplied) }
  │       Dimensions: { UnitOfMeasurement: { Code: 'CM' }, Length, Width, Height }
  │       PackageWeight: { UnitOfMeasurement: { Code: 'KG' }, Weight }
  │     }]
  │   }
  │   LabelSpecification: {
  │     LabelImageFormat: { Code: 'GIF' | 'PDF' | 'ZPL' }
  │     HTTPUserAgent: 'Mozilla/4.5'
  │   }
  │ }
  └─ Translated Text → UPS API JSON
```

### Response 구조

```
ShipmentResponse:
  ├─ ShipmentResults: {
  │   ShipmentNumber: string (운송장번호)
  │   PackageResults: [{
  │     TrackingNumber: string (개별 PKG 운송장번호)
  │     ServiceOptionsCharges: { CurrencyCode, MonetaryValue }
  │     ShippingLabel: {
  │       ImageFormat: { Code: 'PDF' | 'GIF' | 'ZPL' }
  │       GraphicImage: string (Base64)
  │     }
  │   }]
  │   BillingWeight: { UnitOfMeasurement, Weight }
  │   ShipmentCharges: { TransportationCharges, ServiceOptionsCharges, TotalCharges }
  │ }
  └─ Response: { ResponseStatus, Alert, TransactionReference }
```

### 레이블 형식

| 형식 | 용도 | 비고 |
|:-----|:-----|:------|
| **PDF** | 화면 출력, 다운로드 | `@react-pdf` 없이 UPS가 PDF(Base64) 제공 — 저장 후 Storage 업로드 |
| **ZPL** | 열전사 프린터 | 라벨 프린터 출력용 |
| **GIF** | 브라우저 미리보기 | 경량 이미지 |

> **권장**: PDF 수신 → `Supabase Storage` `ups_labels` 버킷에 저장 → URL 참조.

### 오류 코드 및 처리 방안

| 오류 범위 | 예시 코드 | 조치 |
|:----------|:----------|:-----|
| 인증 오류 | `401`, `403` | 토큰 갱신 후 재시도 (최대 2회) |
| 검증 오류 | `400` — Invalid Address | 주소 검증 API(Address Validation) 호출 안내 |
| 서버 오류 | `500`, `502`, `503` | Exponential Backoff (3회, 1s→3s→9s) |
| Rate Limit | `429` | `Retry-After` 헤더 준수, 최대 5분 대기 |
| 비즈니스 오류 | `90000`~`99999` | 오류 코드별 사용자 메시지 매핑 |

---

## ② 트래킹 폴링 API

### 제안 Endpoint: UPS Tracking API (RESTful)

| 항목 | 내용 |
|:-----|:------|
| **Endpoint** | `GET /api/track/v1/details/{trackingNumber}` |
| **대안** | `POST /api/track/v1/details` (단건/다건) |
| **인증** | OAuth 2.0 access_token |
| **Base URL** | 레이블 발급과 동일 (`wwwcie` / `onlinetools`) |

### 이벤트 응답 구조

```json
{
  "trackResponse": {
    "shipment": [{
      "inquiryNumber": "1Z999AA10123456784",
      "shipmentType": "01",
      "candidateBookmark": null,
      "package": [{
        "trackingNumber": "1Z999AA10123456784",
        "deliveryDate": [{ "date": "20240712", "time": "14:30:00" }],
        "currentStatus": { "code": "OR", "description": "On the Way", "type": "I" },
        "activity": [{
          "date": "20240712",
          "time": "143000",
          "location": {
            "address": { "city": "Seoul", "countryCode": "KR" },
            "signedForByName": null
          },
          "status": {
            "type": "I",
            "code": "OR",
            "description": "On the Way to UPS Access Point"
          },
          "gmtDate": "20240712",
          "gmtTime": "053000",
          "gmtOffset": "09:00"
        }]
      }]
    }]
  }
}
```

### 배송 상태 코드 체계

| 코드 | 상태 | 의미 |
|:----:|:-----|:------|
| `I` | In Transit | 운송 중 |
| `D` | Delivered | 배송 완료 |
| `X` | Exception | 예외 발생 |
| `P` | Pickup | 픽업 완료 |
| `M` | Manifest | 접수 완료 |
| `OR` | On the Way | 이동 중 |
| `OD` | Out for Delivery | 배송 중 |
| `AS` | Arrived at Facility | 물류센터 도착 |
| `SF` | Departed from Facility | 물류센터 출발 |
| `KS` | Customs Clearance | 통관 진행 중 |
| `RS` | Returned to Shipper | 반송 |

> **참고**: `zen_tracking_events.event_code` 필드와 1:1 매핑 가능. 기존 `OR`→`IN_TRANSIT`, `D`→`DELIVERED` 등으로 변환.

### 권장 폴링 주기 및 Rate Limit

| 구간 | 주기 | 비고 |
|:-----|:----|:------|
| 출고 후 48시간 | **30분 간격** | 초기 경로 진입 확인 |
| 이후 ~ 7일 | **2시간 간격** | 장거리 이동 구간 |
| 7일 초과 | **6시간 간격** | 지연 감지 위주 |
| 배송 완료 | 폴링 중단 | 최종 이벤트 수신으로 종료 |

> **UPS Rate Limit**: 분당 1,000건 (Sandbox: 100건/분) — 일반 사용량에 충분.

### 구현 방안 (기존 인프라 재활용)

기존 `ITrackingProvider` 인터페이스 구현:

```typescript
class UpsTrackingProvider implements ITrackingProvider {
  name = 'UPS_TRACKING';
  
  async track(supabase: SupabaseClient, config: TrackingConfig) {
    // 1. UPS API 호출 (OAuth 토큰 갱신 포함)
    // 2. 응답 → zen_tracking_raw_logs 저장 (audit)
    // 3. 이벤트 디듀플리케이션 (event_code + event_time + location 기준)
    // 4. 신규 이벤트 → zen_tracking_events 배치 INSERT
    // 5. 최신 상태 → zen_orders.status 동기화
  }
}
```

**파일 위치**: `src/lib/logistics/providers/ups-tracking-provider.ts` (신규)

---

## ③ 인보이스 연동

### API 자동 제출 vs 수동 제출

| 방식 | 설명 | 권장 |
|:-----|:------|:----:|
| **API 자동 제출** | Ship API 호출 시 `InvoiceLineTotal`·`DescriptionOfGoods` 포함 | ✅ **권장** — UPS에서 선적 시 CI 자동 처리 |
| **수동 제출** | UPS 포털(Quantum View)에서 별도 업로드 | ❌ 번거로움, 실시간 처리 불가 |
| **Paperless Invoice API** | `POST /api/shipments/v1/ship` 내 `PaperlessDocumentImage` 활용 | 별도 검토 필요 |

### 필수 필드 목록 (Ship API 내 포함)

| 필드 | 위치 | 비고 |
|:-----|:-----|:------|
| `InvoiceLineTotal` | `Shipment.Package[].InvoiceLineTotal` | { CurrencyCode, MonetaryValue } |
| `DescriptionOfGoods` | `Shipment.Package[].Description` | 품목 설명 (영문) |
| `Documents` | `Shipment.Documents` | { Type: 'INV', Content: Base64 } |
| `MerchantAccountNumber` | `Shipment.PaymentInformation` | UPS 계정 번호 |
| `TermsOfSale` | `Shipment.InvoiceLineTotal.TermsOfSale` | DDU / DDP |
| `ReasonForExport` | `Shipment.ReasonForExport` | 'SALE', 'GIFT', 'SAMPLE', 'RETURN' |

### 인보이스 형식

| 형식 | 지원 | 비고 |
|:-----|:----:|:------|
| **PDF** | ✅ | UPS API가 Base64 PDF 반환 — 기존 `UpsInvoicePDF.tsx` 대체 가능 |
| **XML** | ✅ | EDI 방식 (대량 처리) |
| **UPS Paperless Document** | ✅ | UPS 전자문서 시스템 — 별도 업로드 불필요 |

> **기존 자산**: `UpsInvoicePDF.tsx` (`@react-pdf`)는 Phase 7에서 생성한 UI용 PDF. Phase 8에서는 UPS API가 반환하는 PDF를 저장·조회하는 방식으로 전환 권장.

---

## ④ 환경 분기

### Endpoint 구조

| 환경 | Base URL | 인증 |
|:-----|:---------|:-----|
| **테스트 (Sandbox)** | `https://wwwcie.ups.com` | 별도 Client ID/Secret |
| **운영 (Production)** | `https://onlinetools.ups.com` | 운영 Client ID/Secret |

IP 허용 목록 기반 (Edward `260624` 확인): IP·Key값만 환경별 상이, Spec은 동일.

### 제안 환경변수

```bash
# .env.local (개발/테스트)
UPS_ENVIRONMENT=sandbox
UPS_CLIENT_ID=your_sandbox_client_id
UPS_CLIENT_SECRET=your_sandbox_client_secret
UPS_ACCOUNT_NUMBER=your_test_account_number
UPS_API_BASE_URL_SANDBOX=https://wwwcie.ups.com
UPS_API_BASE_URL_PRODUCTION=https://onlinetools.ups.com

# .env.production (운영)
UPS_ENVIRONMENT=production
UPS_CLIENT_ID=your_production_client_id
UPS_CLIENT_SECRET=your_production_client_secret
UPS_ACCOUNT_NUMBER=your_prod_account_number
```

### 분기 로직 (제안)

```typescript
// src/lib/ups/config.ts
function getUpsBaseUrl(): string {
  const env = process.env.UPS_ENVIRONMENT || 'sandbox';
  if (env === 'production') {
    return process.env.UPS_API_BASE_URL_PRODUCTION || 'https://onlinetools.ups.com';
  }
  return process.env.UPS_API_BASE_URL_SANDBOX || 'https://wwwcie.ups.com';
}

function getUpsAuth(): { clientId: string; clientSecret: string } {
  return {
    clientId: process.env.UPS_CLIENT_ID!,
    clientSecret: process.env.UPS_CLIENT_SECRET!,
  };
}
```

### `.env.example` 업데이트 항목

```
# UPS API Configuration (Phase 8)
# UPS_ENVIRONMENT=sandbox|production
# UPS_CLIENT_ID=
# UPS_CLIENT_SECRET=
# UPS_ACCOUNT_NUMBER=
```

---

## ⑤ DB 스키마 요건 초안

### `zen_ups_labels` — 레이블 메타데이터 저장

```sql
CREATE TABLE public.zen_ups_labels (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID NOT NULL REFERENCES public.zen_orders(id) ON DELETE CASCADE,
  package_id        UUID NOT NULL REFERENCES public.zen_order_packages(id) ON DELETE CASCADE,
  tracking_number   TEXT NOT NULL,                          -- UPS 운송장번호
  label_format      VARCHAR(10) NOT NULL CHECK (label_format IN ('PDF','ZPL','GIF')),
  storage_path      TEXT NOT NULL,                          -- Supabase Storage 경로
  label_data        TEXT,                                   -- Base64 원본 (선택)
  file_size_bytes   INTEGER,
  generated_at      TIMESTAMPTZ DEFAULT NOW(),
  generated_by      UUID REFERENCES public.zen_profiles(id),
  is_voided         BOOLEAN DEFAULT FALSE,                  -- 폐기 여부
  voided_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ups_labels_order_id ON public.zen_ups_labels(order_id);
CREATE INDEX idx_ups_labels_tracking ON public.zen_ups_labels(tracking_number);
CREATE INDEX idx_ups_labels_package ON public.zen_ups_labels(package_id);
```

### `zen_ups_tracking_events` — UPS 전용 추적 이벤트

```sql
CREATE TABLE public.zen_ups_tracking_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID NOT NULL REFERENCES public.zen_orders(id) ON DELETE CASCADE,
  label_id          UUID REFERENCES public.zen_ups_labels(id),
  tracking_number   TEXT NOT NULL,                          -- UPS 운송장번호
  event_code        VARCHAR(10) NOT NULL,                   -- UPS 상태 코드 (OR, D, X, ...)
  event_desc        TEXT,                                   -- 상태 설명 (영문)
  event_type        VARCHAR(5),                              -- I, D, X, P, M
  event_date        DATE NOT NULL,
  event_time        TIME,
  location_city     TEXT,
  location_country  VARCHAR(3),
  gmt_offset        VARCHAR(6),
  raw_response      JSONB,                                  -- UPS API 원본 (audit)
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ups_tracking_events_order ON public.zen_ups_tracking_events(order_id);
CREATE INDEX idx_ups_tracking_events_tracking ON public.zen_ups_tracking_events(tracking_number);
CREATE INDEX idx_ups_tracking_events_code ON public.zen_ups_tracking_events(event_code);
CREATE INDEX idx_ups_tracking_events_date ON public.zen_ups_tracking_events(event_date);

-- RLS (ADMIN/MANAGER/SHIPPER/AGENCY 읽기)
ALTER TABLE public.zen_ups_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zen_ups_tracking_events ENABLE ROW LEVEL SECURITY;
```

### 기존 테이블 연계 방안

| 테이블 | 연계 필드 | 비고 |
|:-------|:----------|:------|
| `zen_orders` | `id` → `zen_ups_labels.order_id` | 1:N (N개 PKG → N개 레이블) |
| `zen_order_packages` | `id` → `zen_ups_labels.package_id` | PKG별 1:1, `intl_ref_no`와 tracking_number 연동 |
| `zen_order_packages.intl_ref_no` | UPS tracking_number와 동일 | 자동 발급 시 tracking_number로 채움 |
| `zen_order_packages.intl_ref_locked` | 레이블 발급 시 TRUE | 레이블 발급 = 확정 → 잠금 |
| `zen_tracking_configs` | `tracking_no` = UPS tracking_number | `provider_type = 'API'`, `provider_name = 'UPS_TRACKING'` |
| `zen_tracking_events` | `zen_ups_tracking_events` → 정규화된 이벤트 | UPS → `zen_ups_tracking_events` → `zen_tracking_events` 변환 |
| `zen_tracking_raw_logs` | UPS API 응답 JSON 저장 | 디버깅 및 감사 추적 |

> **참고**: `intl_ref_no`는 MVP에서 수동 입력. Phase 8에서는 UPS API 레이블 발급 시 `intl_ref_no = tracking_number`로 **자동 채움**.

### Supabase Storage 구조 (제안)

```
ups_labels/
  └── {YYYY}/
      └── {MM}/
          └── {orderId}/
              ├── {packageId}_label.pdf
              └── {packageId}_label.zpl  (선택)
```

> 버킷명: `ups_labels` — `invoices` 버킷 패턴과 동일. RLS: ADMIN/MANAGER/AGENCY(소속 오더만) 읽기.

---

## 종합 권장사항

### 구현 순서 (Priority)

| 순서 | 항목 | 근거 |
|:----:|:-----|:------|
| **P0** | UPS API HTTP Client + OAuth 인증 모듈 | 모든 API의 전제 조건 |
| **P1** | Label Generation API (Ship) | 핵심 기능 — 오더 출고 연계 |
| **P2** | `UpsTrackingProvider` 구현 | 기존 `ITrackingProvider` 패턴 활용 |
| **P3** | Paperless Invoice 연동 | Ship API에 포함되어 있으므로 별도 작업 최소 |
| **P4** | DB 스키마 마이그레이션 + RLS | 위 기능과 병행 가능 |

### 파일 생성/수정 목록 (제안)

| 파일 | 액션 | 설명 |
|:-----|:----:|:------|
| `src/lib/ups/config.ts` | 신규 | 환경 변수 + Base URL + OAuth Client |
| `src/lib/ups/client.ts` | 신규 | UPS HTTP Client (fetch wrapper) |
| `src/lib/ups/shipment.ts` | 신규 | Label Generation API |
| `src/lib/ups/tracking.ts` | 신규 | Tracking API |
| `src/lib/logistics/providers/ups-tracking-provider.ts` | 신규 | ITrackingProvider 구현체 |
| `src/types/ups-api.ts` | 신규 | UPS API Request/Response 타입 |
| `src/types/ups.ts` | 확장 | 기존 타입에 `UpsLabel`, `UpsTrackingEvent` 추가 |
| `supabase/migrations/20260624000000_ups_008_labels.sql` | 신규 | `zen_ups_labels` + `zen_ups_tracking_events` |
| `.env.example` | 수정 | UPS API 환경변수 추가 |

### 리스크

| 리스크 | 영향 | 완화 방안 |
|:-------|:------|:----------|
| UPS OAuth 토큰 만료 | API 호출 실패 | 자동 갱신 로직 + 만료 전 Pre-fetch |
| Rate Limit 초과 | Tracking 폴링 차단 | 지수 백오프 + 큐 기반 폴링 |
| 레이블 재발급 필요 | 기존 번호 폐기 필요 | `is_voided` 플래그 → API void 호출 |
| UPS API Spec 변경 | 연동 중단 | 버전 고정 (`v1`, `v2`) 사용 |
| IP 허용 목록 누락 | Connection Refused | 운영팀 사전 등록 확인 |
