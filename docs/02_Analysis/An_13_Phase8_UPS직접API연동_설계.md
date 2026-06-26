# An-13 — Phase 8 설계: shxk.rtb56.com UPS 레이블 연동

> **문서번호**: An-13
> **작성일**: 2026-06-24
> **최종 개정**: 2026-06-26 (v2.0)
> **작성자**: Aiden (Claude, ZEN_CEO)
> **기반**: An-12 + TASK-B-022 리서치 (`docs/80_RawData/Phase8_UPS_API_리서치_결과.md`) + Issue #119 JSJung 확인 결과
> **승인 상태**: ✅ **Edward 승인 완료 (v2.0 — 2026-06-26) — IMP-136~141 Team B 발령 확정**
> **관련 Phase**: Phase 8 (UPS 레이블 발급·트래킹)

---

## 1. 설계 배경 및 목적

### 1-1. v1.0 → v2.0 전환 사유

TASK-B-022 리서치(Dave, 2026-06-25) 및 Issue #119 JSJung 확인(2026-06-26)을 통해 실제 연동 대상이
UPS 공식 REST API가 아닌 **shxk.rtb56.com (중국 포워더 3PL 플랫폼)** 임이 확정되었다.

| 항목 | v1.0 (폐기) | v2.0 (확정) |
|:----|:-----------|:-----------|
| 연동 대상 | UPS 공식 REST API | **shxk.rtb56.com** (제3자 3PL) |
| 인증 방식 | OAuth 2.0 → access_token | **appToken + appKey** (POST body) |
| 프로토콜 | HTTPS | **HTTP** (shxk HTTPS 미지원) |
| 엔드포인트 구조 | 다중 REST 엔드포인트 | **단일 엔드포인트 + serviceMethod** |
| platform_id | 미정 (발급 필요) | **`""` 공백** (등록 불필요 — JSJung 확인) |
| shipping_method | getbasicdata 12개 (미확인) | **`getshippingmethod` 190개** (KR-UPS 16건 확정) |
| 자격증명 | UPS Client ID/Secret (미발급) | **appToken + appKey 발급 완료** |

### 1-2. Phase 7 → Phase 8 전환 사유 (유지)

| 결정 | 내용 | 결정자·일자 |
|:----|:----|:----|
| IBC/Pactrak Interface 영구 제외 | 중간 브로커 없이 shxk.rtb56.com 직접 연동 | Edward, 2026-06-17 |
| Phase 8 착수 결정 | UAT 전 UPS 레이블 발급·트래킹·인보이스 우선 개발 | Edward, 2026-06-24 |

---

## 2. 연동 아키텍처

### 2-1. API 기본 정보

| 항목 | 값 |
|:-----|:---|
| **Base URL** | `http://shxk.rtb56.com/webservice/PublicService.asmx/ServiceInterfaceUTF8` |
| **Protocol** | HTTP (shxk.rtb56.com HTTPS 미지원) |
| **Method** | POST |
| **Content-Type** | `application/x-www-form-urlencoded` |
| **인증** | `appToken` + `appKey` — POST Body 파라미터 (매 요청 포함) |
| **응답 형식** | JSON |

### 2-2. 공통 요청/응답 형식

**요청**:
```
POST /webservice/PublicService.asmx/ServiceInterfaceUTF8
Content-Type: application/x-www-form-urlencoded

appToken={token}&appKey={key}&serviceMethod={method}&paramsJson={json}
```

**응답**:
```json
{
  "success": 0 | 1 | 2,
  "cnmessage": "중문 결과 메시지",
  "enmessage": "영문 결과 메시지",
  "data": { ... }
}
```

| `success` 값 | 의미 |
|:-----------:|:-----|
| `1` | 성공 |
| `0` | 실패 |
| `2` | 중복 주문 |

### 2-3. 전체 연동 흐름

```
[ZENITH 플랫폼 — Vercel Server Action]
      │  (HTTP, Server-side only)
      ▼
[shxk.rtb56.com — 단일 엔드포인트]
      │
      ├─► createorder (order_status="P")  ──► order_id + shipping_method_no 반환
      │                                        └─► zen_ups_labels.tracking_number 저장
      │                                        └─► zen_order_packages.intl_ref_no 자동 채움
      │
      ├─► gettrackingnumber (reference_no) ──► UPS 트래킹 번호 조회
      │
      ├─► getnewlabel (reference_no)       ──► 라벨 PDF/PNG 반환 (Base64)
      │                                        └─► Supabase Storage 저장
      │
      └─► gettrack (tracking_number)       ──► 트래킹 이벤트 폴링
                                               └─► zen_ups_tracking_events 저장
```

> **보안 방안 (JSJung 확정 — 옵션 A)**: shxk HTTP 통신은 Vercel Server Action 내부에서만 실행.
> 클라이언트(브라우저)에 appToken/appKey 노출 없음. VPN 터널 구성 불필요.

### 2-4. 환경 변수

```bash
# .env.local / .env.production (동일 키 사용 — shxk 환경 단일)
SHXK_BASE_URL=http://shxk.rtb56.com/webservice/PublicService.asmx/ServiceInterfaceUTF8
SHXK_APP_TOKEN=<발급 완료 — JSJung>
SHXK_APP_KEY=<발급 완료 — JSJung>
```

> 기존 `.env.local`의 `UPS_API_TOKEN` / `UPS_API_KEY` → `SHXK_APP_TOKEN` / `SHXK_APP_KEY`로 rename.

---

## 3. DB 스키마 설계

### 3-1. 신규 테이블: `zen_ups_labels`

```sql
CREATE TABLE public.zen_ups_labels (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID NOT NULL REFERENCES public.zen_orders(id) ON DELETE CASCADE,
  package_id       UUID NOT NULL REFERENCES public.zen_order_packages(id) ON DELETE CASCADE,
  reference_no     TEXT NOT NULL,              -- ZENITH 내부 참조번호 (shxk reference_no)
  tracking_number  TEXT,                       -- shxk shipping_method_no (운송장번호)
  label_format     VARCHAR(10) CHECK (label_format IN ('PDF','PNG')),
  label_data       TEXT,                       -- Base64 인코딩 라벨 데이터
  storage_path     TEXT,                       -- Supabase Storage 경로 (업로드 완료 시)
  file_size_bytes  INTEGER,
  generated_at     TIMESTAMPTZ DEFAULT NOW(),
  generated_by     UUID REFERENCES public.zen_profiles(id),
  is_voided        BOOLEAN DEFAULT FALSE,
  voided_at        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ups_labels_order_id   ON public.zen_ups_labels(order_id);
CREATE INDEX idx_ups_labels_tracking   ON public.zen_ups_labels(tracking_number);
CREATE INDEX idx_ups_labels_reference  ON public.zen_ups_labels(reference_no);
CREATE INDEX idx_ups_labels_package    ON public.zen_ups_labels(package_id);
```

### 3-2. 신규 테이블: `zen_ups_tracking_events`

```sql
CREATE TABLE public.zen_ups_tracking_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            UUID NOT NULL REFERENCES public.zen_orders(id) ON DELETE CASCADE,
  label_id            UUID REFERENCES public.zen_ups_labels(id),
  tracking_number     TEXT NOT NULL,            -- shxk server_hawbcode
  track_status        VARCHAR(10),              -- shxk 상태 코드 (NT, IN, DL, ...)
  track_status_name   TEXT,                     -- shxk 상태 중문 명칭
  destination_country VARCHAR(3),
  signatory_name      TEXT,
  event_datetime      TIMESTAMPTZ,              -- track_occur_date 파싱
  event_location      TEXT,                     -- track_location
  event_description   TEXT,                     -- track_description
  raw_response        JSONB,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ups_tracking_order    ON public.zen_ups_tracking_events(order_id);
CREATE INDEX idx_ups_tracking_no       ON public.zen_ups_tracking_events(tracking_number);
CREATE INDEX idx_ups_tracking_status   ON public.zen_ups_tracking_events(track_status);

ALTER TABLE public.zen_ups_labels          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zen_ups_tracking_events ENABLE ROW LEVEL SECURITY;
```

### 3-3. 신규 테이블: `zen_ups_shxk_country_map` (Issue #121 Aiden 확정 2026-06-26)

`getshippingmethod` 전체 190개 코드가 **목적지 국가별로 분리**됨(JSJung 실측). 동일 서비스 레벨이라도 국가가 다르면 shxk 코드가 달라지므로, `zen_ups_products`에 단순 컬럼 추가 방식(Issue #120 방안 A)은 구조적 한계가 있음. `(product_code, country_code, incoterms) → shxk_code` 3-key 매핑 테이블로 관리한다.

```sql
CREATE TABLE public.zen_ups_shxk_country_map (
  product_code  VARCHAR(20) NOT NULL REFERENCES public.zen_ups_products(product_code),
  country_code  VARCHAR(3)  NOT NULL,  -- ISO 3166-1 alpha-3 (KOR, USA, VNM...)
  incoterms     VARCHAR(3)  NOT NULL CHECK (incoterms IN ('DDU', 'DDP')),
  shxk_code     VARCHAR(20) NOT NULL,
  PRIMARY KEY (product_code, country_code, incoterms)
);
```

**KOR 초기 시드 12행** (TASK-B-027 migration 포함):

| product_code | incoterms | shxk_code |
|:-------------|:---------:|:---------:|
| `WW_EXPRESS_DOC` / `WW_EXPRESS_NONDOC` | DDU | `KRUPSEXP` |
| `WW_EXPRESS_DOC` / `WW_EXPRESS_NONDOC` | DDP | `PK0033` |
| `WW_EXPEDITED` | DDU | `KRUPSWE` |
| `WW_EXPEDITED` | DDP | `PK0034` |
| `WW_SAVER_DOC` / `WW_SAVER_NONDOC` | DDU | `FXUPS` |
| `WW_SAVER_DOC` / `WW_SAVER_NONDOC` | DDP | `PK0035` |
| `WW_FLIGHT` | DDU | `KRUPSWWEF` |
| `WW_FLIGHT` | DDP | `PK0032` |

> DOC/NON_DOC 동일 shxk 코드 허용 — shipping_method는 서비스 레벨 코드, 화물 유형은 createorder 페이로드 별도 필드 전달.
> **확장성**: 신규 국가 추가 시 INSERT만으로 대응 — 스키마 변경 불필요.

**조회 예시** (TASK-B-026 createorder Server Action):
```typescript
const { data } = await supabase
  .from('zen_ups_shxk_country_map')
  .select('shxk_code')
  .eq('product_code', productCode)
  .eq('country_code', destinationCountry)  // ISO alpha-3
  .eq('incoterms', incoterms)              // 'DDU' | 'DDP'
  .single();
```

### 3-4. 기존 테이블 연계

| 테이블 | 연계 방식 |
|:-------|:---------|
| `zen_order_packages.intl_ref_no` | createorder 응답 `shipping_method_no`로 **자동 채움** |
| `zen_order_packages.intl_ref_locked` | 레이블 발급 완료 시 `TRUE` 전환 |
| `zen_tracking_configs` | `provider_type='API'`, `provider_name='SHXK_UPS'`로 신규 등록 |
| `zen_tracking_events` | `zen_ups_tracking_events` → 정규화 변환 후 저장 |

### 3-5. Supabase Storage 구조

```
버킷: ups_labels
  └── {YYYY}/{MM}/{orderId}/
      └── {packageId}_label.pdf
```

RLS: ADMIN·MANAGER·AGENCY(소속 오더만) 읽기.

---

## 4. 모듈 구조 (신규 파일 목록)

| 파일 경로 | 유형 | 역할 |
|:---------|:----:|:----|
| `src/lib/ups/config.ts` | 신규 | SHXK Base URL + appToken/appKey 환경변수 로드 |
| `src/lib/ups/client.ts` | 신규 | shxk HTTP Client (단일 엔드포인트 fetch wrapper) |
| `src/lib/ups/order.ts` | 신규 | createorder / submitforecast / gettrackingnumber / getnewlabel |
| `src/lib/ups/tracking.ts` | 신규 | gettrack 폴링 |
| `src/lib/logistics/providers/ups-tracking-provider.ts` | 신규 | `ITrackingProvider` 구현체 (shxk gettrack 기반) |
| `src/types/ups-api.ts` | 신규 | shxk Request/Response 타입 (ShxkRequest, ShxkResponse 등) |
| `src/types/ups.ts` | **확장** | `UpsLabel`, `UpsTrackingEvent` 타입 추가 |
| `src/app/actions/operations/ups-labels.ts` | 신규 | 레이블 발급 Server Action |
| `supabase/migrations/20260626000000_ups_008_labels_tracking_shxk_map.sql` | 신규 | `zen_ups_labels` + `zen_ups_tracking_events` + `zen_ups_shxk_country_map` DDL + KOR 시드 |
| `.env.example` | **수정** | SHXK_APP_TOKEN / SHXK_APP_KEY / SHXK_BASE_URL 추가 |

---

## 5. shxk 인증 및 클라이언트 구조

v1.0의 OAuth 토큰 관리 불필요. `appToken` + `appKey`를 매 요청마다 POST body에 포함.

```typescript
// src/lib/ups/client.ts
const BASE_URL = process.env.SHXK_BASE_URL!;
const APP_TOKEN = process.env.SHXK_APP_TOKEN!;
const APP_KEY = process.env.SHXK_APP_KEY!;

export async function shxkRequest<T>(
  serviceMethod: string,
  paramsJson: object
): Promise<{ success: number; data: T; cnmessage: string; enmessage: string }> {
  const body = new URLSearchParams({
    appToken: APP_TOKEN,
    appKey: APP_KEY,
    serviceMethod,
    paramsJson: JSON.stringify(paramsJson),
  });
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const json = await res.json();
  if (json.success !== 1) {
    throw new Error(`shxk[${serviceMethod}] failed: ${json.enmessage || json.cnmessage}`);
  }
  return json;
}
```

---

## 6. 주요 API 사용 패턴

### 6-1. 주문 생성 → 레이블 발급 (createorder → getnewlabel)

```typescript
// 0단계: zen_ups_shxk_country_map 조회 — (product_code, country_code, incoterms) → shxk_code
const { data: mapRow } = await supabase
  .from('zen_ups_shxk_country_map')
  .select('shxk_code')
  .eq('product_code', order.ups_product_code)   // zen_orders.ups_product_code
  .eq('country_code', destinationCountryAlpha3) // 수하인 국가 ISO alpha-3
  .eq('incoterms', order.incoterms)             // zen_orders.incoterms ('DDU'|'DDP')
  .single();

// 1단계: 주문 생성 (order_status="P" — 즉시 예보)
const orderRes = await shxkRequest('createorder', {
  reference_no: zenOrderPackage.id,       // ZENITH 내부 UUID
  shipping_method: mapRow.shxk_code,     // zen_ups_shxk_country_map 조회 결과
  platform_id: '',                        // JSJung 확인: 공백 처리
  buyer_id: '',                           // JSJung 확인: 공백 처리
  order_status: 'P',
  shipper: { ... },
  consignee: { ... },
  invoice: [ ... ],
});
// 응답: { order_id, refrence_no, shipping_method_no }

// 2단계: 라벨 출력 (PDF)
const labelRes = await shxkRequest('getnewlabel', {
  configInfo: {
    lable_file_type: '2',          // PDF
    lable_paper_type: '1',         // 라벨지
    lable_content_type: '4',       // 라벨 + 세관신고서
    additional_info: { lable_print_datetime: 'Y' },
  },
  listorder: [{ reference_no: zenOrderPackage.id }],
});
```

### 6-2. 운송 방식 코드 목록 조회 (getshippingmethod)

```typescript
const methods = await shxkRequest('getshippingmethod', {});
// 응답: { data: [{ code, cnname, enname, note }] } — 190개
```

**KR-UPS 주요 코드 (16건 확정 — JSJung 실측)**:

| code | enname |
|:-----|:-------|
| `FXUPS` | KR-UPS-Saver |
| `KRUPSEXP` | KR-UPS-Express |
| `KRUPSWE` | KR-UPS-Expedited |
| `KRUPSWWEF` | KR-UPS-WWEF |
| `KRUPSDDP` | KRUPSDDP (CNK-DDP) |
| `KEUPSSMDDP` | KEUPSSMDDP (SM-DDP) |
| `KEUPS008` | KEUPS008 (SM-DDU) |
| `PK0032` ~ `PK0035`, `PK0049`, `PK0051` | DDP/DDU 파생형 6건 |
| `KRUPSSFLD`, `KRUPSSFQD` | 삼방 A 라벨 2건 |
| `USUPS` | UPS-CNK-DDU |

---

## 7. 트래킹 폴링 전략

| 배송 구간 | 폴링 주기 | 비고 |
|:---------|:--------:|:-----|
| 출고 후 48시간 | 30분 | 초기 경로 진입 확인 |
| 48시간 ~ 7일 | 2시간 | 장거리 이동 |
| 7일 초과 | 6시간 | 지연 감지 |
| 최종 배송 완료 | 폴링 중단 | `zen_tracking_configs.is_active = false` |

`gettrack` 응답 내 `track_status` 코드로 완료 판정:

```typescript
// ITrackingProvider 구현 (gettrack 기반)
const res = await shxkRequest('gettrack', { tracking_number });
// track_status: "DL" 등 완료 코드 시 is_active = false
```

---

## 8. 구현 순서 및 Phase 8 Task 계획

| Task ID | 담당 | 내용 (v2.1 기준) | 의존 | Issue |
|:--------|:----:|:----------------|:-----|:-----:|
| **IMP-136** | Dave (Team B) | shxk HTTP Client + config (appToken/appKey) | - | [#106](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/106) |
| **IMP-137** | Baker (Team B) | createorder + getnewlabel Server Action | IMP-136 | [#107](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/107) |
| **IMP-138** | Baker (Team B) | DB 마이그레이션 (`zen_ups_labels` + `zen_ups_tracking_events` + `zen_ups_shxk_country_map` + KOR 시드) ✅ | - | [#108](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/108) |
| **IMP-139** | Baker (Team B) | UpsTrackingProvider (gettrack 기반) + zen_ups_tracking_events 저장 | IMP-136·138 | [#109](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/109) |
| **IMP-140** | Jaison (Team B) | E2E 테스트 (createorder → getnewlabel → gettrack) | IMP-136~139 | [#110](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/110) |
| **IMP-141** | Baker (Team B) | UI — 창고 출고 화면 레이블 발급 인라인 배치 | IMP-136~138 | [#114](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/114) |

---

## 9. 리스크 및 완화 방안

| 리스크 | 영향 | 완화 |
|:-------|:-----|:-----|
| HTTP 평문 전송 | 중간자 공격 가능성 | **Vercel Server Action 격리** — 클라이언트 노출 없음 (JSJung 옵션 A 확정) |
| appToken 만료 정책 미확인 | 갑작스러운 연동 장애 | shxk 관리자에게 만료 정책 문의 후 필요 시 자동 갱신 로직 추가 |
| shipping_method 코드 변경 | 주문 생성 실패 | `getshippingmethod` 동적 조회로 코드 목록 갱신 가능 |
| 중국어 오류 메시지 | 디버깅 어려움 | `enmessage` 필드 우선 사용 + 오류 코드 매핑 테이블 구축 |
| 중복 주문 (`success: 2`) | 레이블 중복 발급 | `reference_no` 유니크 보장 (zen_ups_labels.reference_no UNIQUE 제약) |
| `createorder` 응답 `refrence_no` 오탈자 | 파싱 오류 | 리서치 문서 확인 — shxk 응답 필드명이 `refrence_no` (오탈자 그대로 사용) |

---

## 10. 승인 요청 사항

| # | 항목 | 상태 |
|:-:|:----|:-----|
| **①** | shxk HTTP 보안 방안 (옵션 A/B) | ✅ **JSJung 확정** — 옵션 A (Server Action 격리) |
| **②** | platform_id / buyer_id 처리 방식 | ✅ **JSJung 확정** — `""` 공백 전송 |
| **③** | shipping_method 코드 목록 확보 | ✅ **JSJung 확정** — `getshippingmethod` 190개, KR-UPS 16건 |
| **④** | An-13 v2.0 설계 전체 | ✅ **Edward 승인 완료 (2026-06-26)** |
| **⑤** | shxk 코드 매핑 — `zen_ups_shxk_country_map` 신규 테이블 (Issue #121) | ✅ **Aiden 승인 완료 (2026-06-26)** — 방안 A 취소, 방안 B 확정 |

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-06-24 | Aiden (Claude, ZEN_CEO) | v1.0 초안 — UPS 공식 REST API 기반 (TASK-B-022 리서치 반영) |
| 2026-06-24 | Aiden (Claude, ZEN_CEO) | v1.0 Edward 승인 완료 |
| 2026-06-25 | Aiden (Claude, ZEN_CEO) | §7 Issue 번호 추가 (IMP-136~140 GitHub Issue #106~#110) |
| 2026-06-26 | Aiden (Claude, ZEN_CEO) | **v2.0 전면 개정** — 연동 대상 shxk.rtb56.com 확정, JSJung Issue #119 ①②③ 반영. §2 아키텍처·§4 모듈·§5 인증·§8→9 리스크·§9→10 승인 전면 교체. |
| 2026-06-26 | Edward (ZEN_CEO) | **v2.0 승인 완료** — IMP-136~141 Team B 발령 확정. |
| 2026-06-26 | Aiden (Claude, ZEN_CEO) | **v2.1** — §3-3 `zen_ups_shxk_country_map` 추가 (Issue #121 JSJung 설계 변경 요청 수용). §4 migration 파일명 수정. §8 IMP-138 담당 Baker 반영. §10 ⑤ 추가. |
